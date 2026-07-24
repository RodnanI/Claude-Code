/* bk_main.c -- camera choreography, the tape, and the frame loop.
 *
 * Writes raw rgb24 frames to stdout at OW x OH, FPS frames a second, and a
 * sidecar file of footstep/event times for the sound pass.
 *
 *   cc -O2 -ffast-math -fopenmp bk_main.c -o bk_render -lm
 */
#include "bk_core.h"
#include "bk_shade.h"
#include <omp.h>

#define FPS      24.0f
#define DUR      300.0f
#define NFRAMES  ((int)(DUR*FPS))
#define WARMUP   64            /* frames burned to charge the feedback loop */

/* ------------------------------------------------------------- the timeline */
#define T_CRT_END     20.0f
#define T_WANDER_END  92.0f
#define T_TRANS_END  112.0f
#define T_DOOR_END   128.0f
#define T_PAN_END    158.0f
#define T_ENT_END    172.0f
#define T_TURN_END   176.0f
#define T_SPR1_END   228.0f
#define T_SPR0_END   284.0f
#define T_VOID_END   292.0f

/* --------------------------------------------------------------------- paths */
#define PMAX 64
typedef struct {
    V3 p[PMAX];
    float cum[PMAX];
    int n;
    float total;
} Path;

static void path_build(Path *P, const float *cells, int npts){
    P->n = npts;
    for (int i = 0; i < npts; i++)
        P->p[i] = v3(CW(cells[i*2]), 0.0f, CW(cells[i*2+1]));
    P->cum[0] = 0.0f;
    for (int i = 1; i < npts; i++)
        P->cum[i] = P->cum[i-1] + len3(sub(P->p[i], P->p[i-1]));
    P->total = P->cum[npts-1];
}
static V3 path_raw(const Path *P, float s){
    if (s <= 0) return P->p[0];
    if (s >= P->total) return P->p[P->n-1];
    int i = 0;
    while (i+1 < P->n && P->cum[i+1] < s) i++;
    float seg = P->cum[i+1] - P->cum[i];
    float u = seg > 1e-5f ? (s - P->cum[i])/seg : 0.0f;
    return mix3(P->p[i], P->p[i+1], u);
}
/* box filter along arc length -- rounds the corners into something a body
 * could actually walk */
static V3 path_at(const Path *P, float s, float r){
    V3 a = path_raw(P, s - r);
    V3 b = path_raw(P, s - r*0.5f);
    V3 c = path_raw(P, s);
    V3 d = path_raw(P, s + r*0.5f);
    V3 e = path_raw(P, s + r);
    V3 sum = add(add(scl(a,0.12f), scl(b,0.24f)), add(scl(c,0.28f), add(scl(d,0.24f), scl(e,0.12f))));
    return sum;
}

static Path pWander, pTrans, pRun1, pRun0;

/* time knots: (time, vertex index) pairs; arc position eases between them */
typedef struct { float t; int vi; } Knot;
static float knot_s(const Path *P, const Knot *k, int nk, float t){
    if (t <= k[0].t) return P->cum[k[0].vi];
    if (t >= k[nk-1].t) return P->cum[k[nk-1].vi];
    int i = 0;
    while (i+1 < nk && k[i+1].t < t) i++;
    float u = (t - k[i].t)/(k[i+1].t - k[i].t);
    return mixf(P->cum[k[i].vi], P->cum[k[i+1].vi], ease(u));
}

/* --------------------------------------------------------------- the camera */
typedef struct {
    V3 pos;
    float yaw, pitch, roll, fov;
    float shake;      /* handheld amplitude */
    float speed;      /* m/s, drives the gait */
    float bob;        /* gait amplitude scale */
    int   surface;    /* 0 carpet 1 concrete 2 grating */
    int   running;
} Cam;

static void lookat_yp(V3 from, V3 to, float *yaw, float *pitch){
    V3 d = sub(to, from);
    *yaw = atan2f(d.x, d.z);
    *pitch = atan2f(d.y, sqrtf(d.x*d.x + d.z*d.z));
}
static float angwrap(float a){
    while (a >  PI) a -= 2*PI;
    while (a < -PI) a += 2*PI;
    return a;
}
static float angmix(float a, float b, float t){ return a + angwrap(b-a)*t; }

/* a bell that rises, holds and falls -- used for glances */
static float glance_w(float t, float t0, float t1){
    if (t < t0 - 0.9f || t > t1 + 1.1f) return 0.0f;
    float in  = smoothstepf(t0 - 0.9f, t0 + 0.35f, t);
    float out = 1.0f - smoothstepf(t1 - 0.2f, t1 + 1.1f, t);
    return satf(minf(in, out));
}
/* blend the current heading toward a point of interest */
static void glance(Cam *c, float t, float t0, float t1, V3 target){
    float w = glance_w(t, t0, t1);
    if (w <= 0.0f) return;
    float ty, tp;
    lookat_yp(c->pos, target, &ty, &tp);
    c->yaw   = angmix(c->yaw, ty, w);
    c->pitch = mixf(c->pitch, tp, w);
}

/* handheld drift: nobody holds a camcorder still */
static void handheld(Cam *c, float t){
    float a = c->shake;
    if (a <= 0.0001f) return;
    c->yaw   += (fbm2(t*0.83f, 1.7f, 3) - 0.5f) * 0.155f * a;
    c->pitch += (fbm2(t*0.71f, 5.3f, 3) - 0.5f) * 0.115f * a;
    c->roll  += (fbm2(t*0.54f, 9.1f, 3) - 0.5f) * 0.190f * a;
    c->pos.x += (fbm2(t*0.95f, 21.f, 2) - 0.5f) * 0.035f * a;
    c->pos.y += (fbm2(t*1.11f, 31.f, 2) - 0.5f) * 0.030f * a;
    c->pos.z += (fbm2(t*0.88f, 41.f, 2) - 0.5f) * 0.035f * a;
    /* fine tremor */
    c->yaw   += sinf(t*23.1f)*0.0035f*a + sinf(t*37.7f)*0.0018f*a;
    c->pitch += sinf(t*19.4f)*0.0030f*a + sinf(t*41.3f)*0.0015f*a;
}

/* --------- the camera's resting pose: lying on the carpet, facing the tube */
static const V3  REST_POS   = { 0.16f, 0.128f, 1.36f };
static const float REST_ROLL = -1.33f;   /* about -76 degrees: it fell over */
static float rest_yaw, rest_pitch;

static void shot_camera(float t, Cam *c){
    memset(c, 0, sizeof(*c));
    c->fov = 52.0f; c->shake = 1.0f; c->bob = 0.0f; c->surface = 0;

    /* ============================================================ 0 - 20 s
     * The camcorder is on the floor where it was set down, aimed at a
     * television that is showing what the camcorder can see. */
    if (t < T_CRT_END){
        g_scene = SC_ROOM;
        if (t < 5.6f){
            /* lying still. only the tape moves. */
            c->pos = REST_POS;
            c->yaw = rest_yaw; c->pitch = rest_pitch; c->roll = REST_ROLL;
            c->shake = 0.035f;
            c->fov = 52.0f;
            /* it settles a hair as the carpet gives */
            c->roll += 0.010f*sinf(t*0.6f);
        } else if (t < 7.4f){
            /* a hand takes it: swung up, badly, roll unwinding */
            float u = ease((t-5.6f)/1.8f);
            V3 up = v3(0.42f, 1.02f, 1.02f);
            c->pos = mix3(REST_POS, up, u);
            c->pos.y += 0.10f*sinf(u*PI)*1.4f;               /* overshoot */
            float ty, tp; lookat_yp(c->pos, add(P_TV, v3(0,0.02f,0.24f)), &ty, &tp);
            c->yaw = angmix(rest_yaw, ty, u);
            c->pitch = mixf(rest_pitch, tp, u);
            c->roll = mixf(REST_ROLL, -0.24f, u) + 0.16f*sinf(u*PI*2.3f);
            c->shake = 0.35f + 2.6f*sinf(u*PI);
            c->fov = 52.0f;
        } else if (t < 12.6f){
            /* walking a slow arc around the cart, watching the tunnel in the
             * glass swing and bend as the angle changes */
            float u = (t - 7.4f)/5.2f;
            float ang = mixf(0.30f, -0.92f, ease(u)) + 0.06f*sinf(t*1.7f);
            float rad = mixf(1.34f, 0.96f, ease(u)) + 0.05f*sinf(t*0.9f);
            float hgt = mixf(1.02f, 0.86f, ease(u)) + 0.035f*sinf(t*1.3f);
            c->pos = v3(P_TV.x + sinf(ang)*rad, hgt, P_TV.z + cosf(ang)*rad);
            lookat_yp(c->pos, add(P_TV, v3(0.0f, 0.02f, 0.22f)), &c->yaw, &c->pitch);
            c->roll = -0.13f + 0.10f*sinf(t*0.8f);
            c->shake = 0.85f;
            c->fov = 50.0f + 5.0f*sinf(t*0.7f);
        } else if (t < 16.6f){
            /* leaning in and punching the zoom rocker at the snow */
            float u = (t - 12.6f)/4.0f;
            float ang = -0.92f + 0.34f*sinf(t*1.15f);
            float rad = 0.74f + 0.16f*sinf(t*2.1f);
            c->pos = v3(P_TV.x + sinf(ang)*rad, 0.80f + 0.05f*sinf(t*1.9f), P_TV.z + cosf(ang)*rad);
            lookat_yp(c->pos, add(P_TV, v3(0.02f*sinf(t*3.1f), 0.02f, 0.22f)), &c->yaw, &c->pitch);
            c->roll = -0.10f + 0.13f*sinf(t*1.4f);
            c->shake = 1.35f;
            /* the rocker is being stabbed, not swept */
            float z = 0.0f;
            float seg = t - 12.6f;
            if      (seg < 0.7f) z = mixf(0.0f, 0.95f, ease(seg/0.7f));
            else if (seg < 1.3f) z = 0.95f;
            else if (seg < 1.9f) z = mixf(0.95f, 0.18f, ease((seg-1.3f)/0.6f));
            else if (seg < 2.35f) z = mixf(0.18f, 0.72f, ease((seg-1.9f)/0.45f));
            else if (seg < 2.9f) z = 0.72f + 0.10f*sinf(seg*9.0f);
            else if (seg < 3.4f) z = mixf(0.72f, 1.0f, ease((seg-2.9f)/0.5f));
            else                 z = mixf(1.0f, 0.06f, ease((seg-3.4f)/0.6f));
            c->fov = mixf(52.0f, 11.0f, z);
            c->shake *= (1.0f + z*2.2f);        /* zoom magnifies every twitch */
        } else {
            /* standing up, backing off, turning toward the door */
            float u = ease((t - 16.6f)/3.4f);
            V3 a = v3(P_TV.x + sinf(-0.92f)*0.74f, 0.80f, P_TV.z + cosf(-0.92f)*0.74f);
            V3 b = v3(CW(32.0f), 1.62f, CW(33.0f));
            c->pos = mix3(a, b, u);
            c->pos.y = mixf(0.80f, 1.62f, ease(satf((t-16.6f)/2.2f)));
            float y0, p0; lookat_yp(c->pos, add(P_TV, v3(0,0.02f,0.22f)), &y0, &p0);
            float y1 = 0.0f, p1 = -0.045f;      /* facing up the corridor (+z) */
            c->yaw = angmix(y0, y1, ease(satf((t-17.6f)/2.4f)));
            c->pitch = mixf(p0, p1, ease(satf((t-17.4f)/2.6f)));
            c->roll = mixf(-0.10f, -0.035f, u);
            c->shake = 1.5f - 0.5f*u;
            c->fov = mixf(52.0f, 52.0f, u);
            c->speed = 1.0f*u;
            c->bob = 0.5f*u;
        }
        return;
    }

    /* ========================================================== 20 - 92 s
     * Level 0. Walking. Nothing here is right, but nothing is wrong enough
     * to run from yet. */
    if (t < T_WANDER_END){
        g_scene = SC_LEVEL0;
        static const Knot K[] = {
            {20.0f,0},{27.0f,1},{31.0f,2},{36.5f,3},{42.0f,4},{48.5f,5},
            {53.5f,6},{56.5f,7},{61.0f,8},{65.5f,9},{71.0f,10},{77.0f,11},
            {80.0f,12},{85.5f,13},{89.0f,14},{92.0f,15}
        };
        float s = knot_s(&pWander, K, 16, t);
        float s2 = knot_s(&pWander, K, 16, t + 0.1f);
        c->speed = (s2 - s)/0.1f;
        V3 p = path_at(&pWander, s, 1.35f);
        V3 fw = sub(path_at(&pWander, s + 0.7f, 1.35f), path_at(&pWander, s - 0.7f, 1.35f));
        c->pos = v3(p.x, 1.62f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.055f;
        c->roll = 0.0f;
        c->shake = 1.0f;
        c->bob = 1.0f;
        c->surface = 0;

        /* the things you notice, and cannot explain */
        glance(c, t, 32.5f, 36.0f, v3(3.35f, 1.95f, -13.5f));   /* the high doorway */
        glance(c, t, 40.3f, 42.2f, v3(-7.0f,  1.60f, -16.5f));  /* peek round the corner */
        glance(c, t, 49.5f, 53.2f, v3(-10.5f, 0.12f, -16.6f));  /* lights on the floor */
        glance(c, t, 64.2f, 66.0f, v3(-22.5f, 1.60f, -6.0f));   /* peek before turning */
        glance(c, t, 76.2f, 80.2f, v3(-21.4f, 1.34f,  4.50f));  /* the arcade cabinet */
        glance(c, t, 88.4f, 92.0f, v3(-15.0f, 0.03f, 17.55f));  /* the black puddle */
        /* an unprompted look back down the corridor -- did something move? */
        {
            float w = glance_w(t, 58.6f, 60.0f);
            if (w > 0) c->yaw = angmix(c->yaw, c->yaw + 2.35f, w);
        }
        return;
    }

    /* ========================================================= 92 - 112 s
     * The wallpaper simply stops, and the building underneath shows through. */
    if (t < T_TRANS_END){
        g_scene = SC_TRANS;
        static const Knot K[] = { {92.0f,0},{98.0f,1},{104.0f,2},{109.0f,3},{112.0f,4} };
        float s = knot_s(&pTrans, K, 5, t);
        float s2 = knot_s(&pTrans, K, 5, t + 0.1f);
        c->speed = (s2 - s)/0.1f;
        V3 p = path_at(&pTrans, s, 1.2f);
        V3 fw = sub(path_at(&pTrans, s + 0.7f, 1.2f), path_at(&pTrans, s - 0.7f, 1.2f));
        c->pos = v3(p.x, 1.62f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.05f;
        c->shake = 1.05f; c->bob = 1.0f;
        c->surface = (c->pos.x > g_concrete_x) ? 1 : 0;
        glance(c, t,  99.5f, 101.6f, v3(-5.6f, 1.95f, 15.05f));  /* where the paper ends */
        glance(c, t, 104.4f, 106.4f, v3( 2.0f, 2.62f, 15.25f));  /* the pipe run */
        glance(c, t, 110.0f, 112.0f, v3(12.0f, 1.10f, 16.50f));  /* the door */
        return;
    }

    /* ======================================================== 112 - 128 s
     * Through the door, and the building turns out to have no bottom. */
    if (t < T_DOOR_END){
        g_scene = SC_ATRIUM;
        if (t < 116.5f){
            float u = ease(satf((t - 112.0f)/4.5f));
            c->pos = mix3(v3(-25.55f, 1.60f, 0.0f), v3(-23.9f, 1.62f, 0.55f), u);
            c->yaw = mixf(1.571f, 1.40f, u);
            c->pitch = mixf(-0.06f, 0.02f, u);
            c->shake = 1.5f + 1.9f*expf(-(t-112.4f)*(t-112.4f)*7.0f); /* shoving it open */
            c->speed = 0.9f; c->bob = 0.9f; c->surface = 1;
        } else if (t < 122.0f){
            float u = ease((t - 116.5f)/5.5f);
            c->pos = mix3(v3(-23.9f, 1.62f, 0.55f), v3(-23.3f, 1.62f, 3.1f), u);
            c->yaw = mixf(1.40f, 1.62f, u);
            c->pitch = mixf(0.02f, -0.30f, u);       /* looking over the rail */
            c->shake = 1.35f; c->speed = 0.55f; c->bob = 0.7f; c->surface = 2;
        } else {
            /* over the rail, because there is no other way to see the bottom */
            float u = ease((t - 122.0f)/6.0f);
            c->pos = v3(mixf(-23.3f, -22.75f, u), mixf(1.62f, 1.58f, u), 3.1f + 0.35f*u);
            c->yaw = mixf(1.62f, 1.50f, u) + 0.05f*sinf(t*0.5f);
            c->pitch = mixf(-0.30f, -0.80f, u);      /* down, and down, and down */
            c->shake = 1.25f; c->speed = 0.06f; c->bob = 0.25f; c->surface = 2;
            c->fov = mixf(52.0f, 46.0f, u);
        }
        return;
    }

    /* ======================================================== 128 - 158 s
     * A slow pan across something too big to be indoors. */
    if (t < T_PAN_END){
        g_scene = SC_ATRIUM;
        float u = (t - T_PAN_END + 30.0f)/30.0f;      /* 0..1 */
        float back = ease(satf((u - 0.06f)/0.34f));
        c->pos = v3(mixf(-22.75f, -22.95f, back) + 0.04f*sinf(t*0.31f),
                    mixf(1.58f, 1.62f, back), 3.45f + 0.55f*u);
        /* the pan: down the shaft, out across the drop, and up the far side */
        float yaw;
        if (u < 0.34f)      yaw = mixf(1.30f, 0.42f, ease(u/0.34f));
        else if (u < 0.68f) yaw = mixf(0.42f, 1.66f, ease((u-0.34f)/0.34f));
        else                yaw = mixf(1.66f, 2.05f, ease((u-0.68f)/0.32f));
        float pit;
        if (u < 0.28f)      pit = mixf(-0.80f, -0.12f, ease(u/0.28f));
        else if (u < 0.55f) pit = mixf(-0.12f,  0.34f, ease((u-0.28f)/0.27f));
        else if (u < 0.80f) pit = mixf( 0.34f, -0.30f, ease((u-0.55f)/0.25f));
        else                pit = mixf(-0.30f,  0.02f, ease((u-0.80f)/0.20f));
        c->yaw = yaw; c->pitch = pit;
        c->shake = 1.15f; c->speed = 0.05f; c->bob = 0.2f;
        c->fov = 46.0f;
        c->surface = 2;
        /* the moment the room noise stops, the operator freezes */
        if (t > 150.0f) c->shake = 1.15f - 0.55f*satf((t-150.0f)/2.0f);
        return;
    }

    /* ======================================================== 158 - 172 s
     * There is something on the other catwalk. */
    if (t < T_ENT_END){
        g_scene = SC_ATRIUM;
        float u = (t - 158.0f)/14.0f;
        c->pos = v3(-23.3f, 1.615f, 4.0f);
        float ey, ep;
        lookat_yp(c->pos, v3(CAT_X-0.3f, 1.55f, g_entity_z), &ey, &ep);
        c->yaw   = angmix(2.05f, ey, ease(satf((t-158.0f)/3.0f)));
        c->pitch = mixf(0.02f, ep, ease(satf((t-158.0f)/3.0f)));
        /* the zoom goes in because the operator needs it not to be a person */
        float z;
        if (t < 161.0f) z = 0.0f;
        else if (t < 164.5f) z = ease((t-161.0f)/3.5f)*0.62f;
        else if (t < 166.0f) z = 0.62f;
        else z = 0.62f + 0.38f*ease(satf((t-166.0f)/3.5f));
        c->fov = mixf(46.0f, 15.0f, z);
        c->shake = 0.55f + 1.25f*z;      /* long lens, unsteady hands */
        c->speed = 0.0f; c->bob = 0.12f;
        c->surface = 2;
        (void)u;
        return;
    }

    /* ======================================================== 172 - 176 s
     * It notices. */
    if (t < T_TURN_END){
        g_scene = SC_ATRIUM;
        float ey, ep;
        V3 pos = v3(-23.3f, 1.615f, 4.0f);
        lookat_yp(pos, v3(CAT_X-0.3f, 1.55f, g_entity_z), &ey, &ep);
        if (t < 173.0f){
            float u = (t-172.0f);
            c->pos = pos;
            c->yaw = ey + 0.09f*sinf(u*34.0f);
            c->pitch = ep + 0.05f*sinf(u*29.0f);
            c->fov = mixf(15.0f, 30.0f, ease(satf(u/0.7f)));   /* yanked wide */
            c->shake = 4.0f;
            c->roll = 0.10f*sinf(u*21.0f);
        } else {
            /* the whip-round. the picture becomes a smear. */
            float u = ease(satf((t-173.0f)/1.05f));
            c->pos = add(pos, v3(0.0f, -0.06f*sinf(u*PI), -0.25f*u));
            c->yaw = ey + u*(PI + 0.55f) - 0.55f*ease(satf((t-173.9f)/0.9f));
            c->pitch = mixf(ep, -0.16f, u) + 0.13f*sinf(u*PI*2.0f);
            c->roll = 0.42f*sinf(u*PI*1.6f);
            c->fov = mixf(30.0f, 62.0f, u);
            c->shake = 5.5f;
            c->speed = 3.0f*u; c->bob = 1.4f;
        }
        c->surface = 2;
        return;
    }

    /* ======================================================== 176 - 228 s
     * Running. The service level goes on for longer than it should. */
    if (t < T_SPR1_END){
        g_scene = SC_LEVEL1;
        float dur = T_SPR1_END - T_TURN_END;
        float u = (t - T_TURN_END)/dur;
        /* out of the blocks, then flat out, with a stumble or two */
        float w = u*(0.60f + 0.40f*ease(satf(u*5.0f))) + 0.016f*sinf(u*PI*5.0f);
        float s  = pRun1.total * satf(w);
        float w2 = (u + 0.002f)*(0.60f + 0.40f*ease(satf((u+0.002f)*5.0f)))
                 + 0.016f*sinf((u+0.002f)*PI*5.0f);
        float s2 = pRun1.total * satf(w2);
        V3 p  = path_at(&pRun1, s, 1.9f);
        V3 fw = sub(path_at(&pRun1, s + 1.4f, 1.9f), path_at(&pRun1, s - 1.4f, 1.9f));
        c->speed = (s2 - s)/(0.002f*dur);
        c->pos = v3(p.x, 1.53f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.10f + 0.06f*sinf(t*3.1f);
        c->shake = 3.4f; c->bob = 2.5f; c->running = 1; c->surface = 1;
        c->fov = 66.0f;
        /* two glances back over the shoulder, because of the footsteps */
        {
            float g1 = glance_w(t, 189.0f, 190.1f);
            float g2 = glance_w(t, 212.5f, 213.6f);
            float g = maxf(g1, g2);
            if (g > 0) { c->yaw = angmix(c->yaw, c->yaw + PI*0.86f, g); c->shake = 4.2f; }
        }
        return;
    }

    /* ======================================================== 228 - 284 s
     * Back into the yellow. It is the same corridor. It is always the same
     * corridor. */
    if (t < T_SPR0_END){
        g_scene = SC_LEVEL0;
        float dur = T_SPR0_END - T_SPR1_END;
        float u = (t - T_SPR1_END)/dur;
        float w  = u + 0.014f*sinf(u*PI*6.0f);
        float w2 = (u+0.002f) + 0.014f*sinf((u+0.002f)*PI*6.0f);
        float s  = pRun0.total * satf(w);
        float s2 = pRun0.total * satf(w2);
        V3 p  = path_at(&pRun0, s, 1.9f);
        V3 fw = sub(path_at(&pRun0, s + 1.4f, 1.9f), path_at(&pRun0, s - 1.4f, 1.9f));
        c->pos = v3(p.x, 1.53f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.09f + 0.07f*sinf(t*3.3f);
        c->speed = (s2 - s)/(0.002f*dur);
        c->shake = 3.6f; c->bob = 2.6f; c->running = 1; c->surface = 0;
        c->fov = 68.0f;
        {
            float g1 = glance_w(t, 244.0f, 245.0f);
            float g2 = glance_w(t, 266.0f, 267.2f);
            float g3 = glance_w(t, 279.0f, 280.4f);
            float g = maxf(g1, maxf(g2, g3));
            if (g > 0) { c->yaw = angmix(c->yaw, c->yaw + PI*0.90f, g); c->shake = 4.6f; }
        }
        /* legs going at the end */
        if (t > 276.0f){ c->shake = 4.4f; c->bob = 3.0f; }
        return;
    }

    /* ======================================================== 284 - 292 s
     * The floor stops being there. */
    if (t < T_VOID_END){
        g_scene = SC_VOID;
        float u = (t - T_SPR0_END)/(T_VOID_END - T_SPR0_END);
        c->pos = v3(0, -20.0f*u*u, 0);
        c->yaw = 3.4f*u + 0.7f*sinf(t*2.3f);
        c->pitch = -0.5f + 2.6f*u + 0.5f*sinf(t*1.7f);
        c->roll = 5.5f*u*u + 0.8f*sinf(t*3.1f);
        c->fov = mixf(68.0f, 88.0f, u);
        c->shake = 5.0f;
        c->speed = 0.0f; c->bob = 0.0f;
        return;
    }

    /* ======================================================== 292 - 300 s
     * It lands where it started. The tape has been here before. */
    {
        g_scene = SC_ROOM;
        float u = (t - T_VOID_END);
        if (u < 1.15f){
            /* the drop back in */
            float k = u/1.15f;
            c->pos = mix3(v3(REST_POS.x - 0.9f, 3.1f, REST_POS.z + 1.5f),
                          v3(REST_POS.x, 0.42f, REST_POS.z + 0.30f), k*k);
            c->yaw = rest_yaw + 3.6f*(1.0f-k*k) + 0.6f;
            c->pitch = mixf(1.15f, -0.15f, k*k);
            c->roll = mixf(3.4f, REST_ROLL - 0.9f, k*k);
            c->fov = mixf(88.0f, 60.0f, k);
            c->shake = 5.0f*(1.0f-k) + 1.0f;
        } else if (u < 2.45f){
            /* it hits, bounces once, and rolls onto its side */
            float k = ease((u - 1.15f)/1.30f);
            V3 a = v3(REST_POS.x, 0.42f, REST_POS.z + 0.30f);
            c->pos = mix3(a, REST_POS, k);
            c->pos.y += 0.20f*sinf(satf((u-1.15f)/0.55f)*PI)*(1.0f-k*0.4f);
            c->yaw = angmix(rest_yaw + 0.6f, rest_yaw, k);
            c->pitch = mixf(-0.15f, rest_pitch, k);
            c->roll = mixf(REST_ROLL - 0.9f, REST_ROLL, k) + 0.22f*sinf((u-1.15f)*11.0f)*(1.0f-k);
            c->fov = mixf(60.0f, 52.0f, k);
            c->shake = 3.2f*(1.0f-k) + 0.30f;
        } else {
            /* settled. exactly where the tape began. */
            float k = satf((u - 2.45f)/2.4f);
            c->pos = REST_POS;
            c->yaw = rest_yaw; c->pitch = rest_pitch; c->roll = REST_ROLL;
            c->fov = 52.0f;
            c->shake = mixf(0.30f, 0.035f, k);
            c->roll += 0.010f*sinf((t - 300.0f)*0.6f);   /* matches t=0 */
        }
        return;
    }
}

/* --------------------------------------------------------- tape degradation */
/* how badly the heads are tracking, 0..1 */
static float glitch_level(float t){
    float g = 0.10f;
    /* the tape has been played a lot; it drops out on its own */
    float r = fbm2(t*0.35f, 3.7f, 3);
    if (r > 0.66f) g += (r - 0.66f)*2.6f;
    float r2 = fh1((int)(t*1.7f));
    if (r2 > 0.955f) g += 0.55f;

    /* scripted hits */
    struct { float a, b, amp; } B[] = {
        {  19.6f,  20.5f, 0.55f },   /* standing up */
        { 111.6f, 112.9f, 0.70f },   /* through the door */
        { 149.8f, 150.7f, 0.45f },   /* the room noise stops */
        { 157.8f, 158.5f, 0.40f },
        { 171.9f, 179.5f, 1.00f },   /* the screech */
        { 175.6f, 176.9f, 0.95f },
        { 227.4f, 229.0f, 0.85f },
        { 283.4f, 292.4f, 1.00f },   /* no floor */
        { 291.8f, 293.4f, 0.95f },
    };
    for (unsigned i = 0; i < sizeof(B)/sizeof(B[0]); i++){
        if (t > B[i].a && t < B[i].b){
            float u = (t - B[i].a)/(B[i].b - B[i].a);
            float env = sinf(satf(u)*PI);
            env = powf(env, 0.45f);
            g += B[i].amp * env;
        }
    }
    if (t > 176.0f && t < 284.0f) g += 0.16f + 0.14f*satf(fbm2(t*1.6f, 8.1f, 2)*2.0f - 0.9f);
    if (t > 284.0f && t < 292.0f) g = 1.0f;
    return satf(g);
}

/* ---------------------------------------------------------------- OSD glyphs */
static const char *GLYPH[][7] = {
/*0*/ {".###.","#...#","#..##","#.#.#","##..#","#...#",".###."},
/*1*/ {"..#..",".##..","..#..","..#..","..#..","..#..",".###."},
/*2*/ {".###.","#...#","....#","...#.","..#..",".#...","#####"},
/*3*/ {"#####","...#.","..#..","...#.","....#","#...#",".###."},
/*4*/ {"...#.","..##.",".#.#.","#..#.","#####","...#.","...#."},
/*5*/ {"#####","#....","####.","....#","....#","#...#",".###."},
/*6*/ {"..##.",".#...","#....","####.","#...#","#...#",".###."},
/*7*/ {"#####","....#","...#.","..#..",".#...",".#...",".#..."},
/*8*/ {".###.","#...#","#...#",".###.","#...#","#...#",".###."},
/*9*/ {".###.","#...#","#...#",".####","....#","...#.",".##.."},
/*A*/ {"..#..",".#.#.","#...#","#...#","#####","#...#","#...#"},
/*B*/ {"####.","#...#","#...#","####.","#...#","#...#","####."},
/*C*/ {".####","#....","#....","#....","#....","#....",".####"},
/*D*/ {"####.","#...#","#...#","#...#","#...#","#...#","####."},
/*E*/ {"#####","#....","#....","####.","#....","#....","#####"},
/*F*/ {"#####","#....","#....","####.","#....","#....","#...."},
/*G*/ {".####","#....","#....","#..##","#...#","#...#",".###."},
/*H*/ {"#...#","#...#","#...#","#####","#...#","#...#","#...#"},
/*I*/ {".###.","..#..","..#..","..#..","..#..","..#..",".###."},
/*J*/ {"..###","...#.","...#.","...#.","...#.","#..#.",".##.."},
/*K*/ {"#...#","#..#.","#.#..","##...","#.#..","#..#.","#...#"},
/*L*/ {"#....","#....","#....","#....","#....","#....","#####"},
/*M*/ {"#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"},
/*N*/ {"#...#","##..#","#.#.#","#..##","#...#","#...#","#...#"},
/*O*/ {".###.","#...#","#...#","#...#","#...#","#...#",".###."},
/*P*/ {"####.","#...#","#...#","####.","#....","#....","#...."},
/*Q*/ {".###.","#...#","#...#","#...#","#.#.#","#..#.",".##.#"},
/*R*/ {"####.","#...#","#...#","####.","#.#..","#..#.","#...#"},
/*S*/ {".####","#....","#....",".###.","....#","....#","####."},
/*T*/ {"#####","..#..","..#..","..#..","..#..","..#..","..#.."},
/*U*/ {"#...#","#...#","#...#","#...#","#...#","#...#",".###."},
/*V*/ {"#...#","#...#","#...#","#...#","#...#",".#.#.","..#.."},
/*W*/ {"#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"},
/*X*/ {"#...#","#...#",".#.#.","..#..",".#.#.","#...#","#...#"},
/*Y*/ {"#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."},
/*Z*/ {"#####","....#","...#.","..#..",".#...","#....","#####"},
/*sp*/{".....",".....",".....",".....",".....",".....","....."},
/*: */{".....","..#..","..#..",".....","..#..","..#..","....."},
/*. */{".....",".....",".....",".....",".....","..#..","..#.."},
/*- */{".....",".....",".....","#####",".....",".....","....."},
};
static int glyph_index(char ch){
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'A' && ch <= 'Z') return 10 + (ch - 'A');
    if (ch >= 'a' && ch <= 'z') return 10 + (ch - 'a');
    if (ch == ':') return 37;
    if (ch == '.') return 38;
    if (ch == '-') return 39;
    return 36;
}
/* draws into the pre-tape buffer so the text picks up the tape's noise */
static void draw_text(float *buf, int x0, int y0, const char *s, V3 col, float a, int sc){
    for (const char *p = s; *p; p++){
        int gi = glyph_index(*p);
        for (int r = 0; r < 7; r++){
            const char *row = GLYPH[gi][r];
            for (int q = 0; q < 5; q++){
                if (row[q] != '#') continue;
                for (int dy = 0; dy < sc; dy++) for (int dx = 0; dx < sc; dx++){
                    int X = x0 + q*sc + dx, Y = y0 + r*sc + dy;
                    if (X < 0 || X >= OW || Y < 0 || Y >= OH) continue;
                    float *d = buf + (Y*OW + X)*3;
                    d[0] = mixf(d[0], col.x, a);
                    d[1] = mixf(d[1], col.y, a);
                    d[2] = mixf(d[2], col.z, a);
                }
            }
        }
        x0 += 6*sc;
    }
}
static void draw_disc(float *buf, int cx, int cy, float r, V3 col, float a){
    for (int y = cy-(int)r-1; y <= cy+(int)r+1; y++)
        for (int x = cx-(int)r-1; x <= cx+(int)r+1; x++){
            if (x < 0 || x >= OW || y < 0 || y >= OH) continue;
            float d = sqrtf((x-cx)*(x-cx) + (y-cy)*(y-cy));
            float w = satf(r - d) * a;
            if (w <= 0) continue;
            float *p = buf + (y*OW + x)*3;
            p[0] = mixf(p[0], col.x, w);
            p[1] = mixf(p[1], col.y, w);
            p[2] = mixf(p[2], col.z, w);
        }
}

/* ------------------------------------------------------------------- buffers */
static float  scene_buf[RW*RH*3];
static float  warp_buf[OW*OH*3];
static unsigned char out_buf[OW*OH*3];
static unsigned char fb_buf[OW*OH*3];

/* ------------------------------------------------------------------ the tape */
static void vhs_process(float t){
    float gl = glitch_level(t);
    int frame = (int)(t*FPS);

    /* --- geometry: lens, then the picture is laid onto the raster --- */
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < OH; y++){
        for (int x = 0; x < OW; x++){
            float u = (x + 0.5f)/OW, v = (y + 0.5f)/OH;
            float dx = u - 0.5f, dy = v - 0.5f;
            float r2 = dx*dx + dy*dy;
            float k = 1.0f + 0.075f*r2 + 0.045f*r2*r2;    /* cheap lens */
            float su = 0.5f + dx*k, sv = 0.5f + dy*k;
            float sx = su*RW - 0.5f, sy = sv*RH - 0.5f;
            float *o = warp_buf + (y*OW + x)*3;
            if (sx < 0 || sy < 0 || sx > RW-1.001f || sy > RH-1.001f){
                o[0] = o[1] = o[2] = 0.0f; continue;
            }
            int x0 = (int)sx, y0 = (int)sy;
            float fx = sx-x0, fy = sy-y0;
            int x1 = x0+1 < RW ? x0+1 : x0, y1 = y0+1 < RH ? y0+1 : y0;
            for (int ch = 0; ch < 3; ch++){
                float a = scene_buf[(y0*RW+x0)*3+ch], b = scene_buf[(y0*RW+x1)*3+ch];
                float c = scene_buf[(y1*RW+x0)*3+ch], d = scene_buf[(y1*RW+x1)*3+ch];
                o[ch] = mixf(mixf(a,b,fx), mixf(c,d,fx), fy);
            }
        }
    }

    /* --- character generator: burned in before the tape sees it --- */
    {
        int blink = ((int)(t*1.0f)) & 1;
        V3 white = v3(1.02f, 1.02f, 0.98f);
        if (blink) draw_disc(warp_buf, 42, 30, 4.2f, v3(1.05f, 0.35f, 0.25f), 0.92f);
        draw_text(warp_buf, 52, 24, "REC", white, 0.92f, 2);
        draw_text(warp_buf, OW-104, 24, "SP", white, 0.85f, 2);
        /* battery, quietly dying */
        for (int i = 0; i < 3; i++){
            int on = (i < 2) || (((int)(t*2.0f)) & 1);
            V3 c = on ? white : v3(0.25f,0.25f,0.25f);
            for (int yy = 26; yy < 36; yy++) for (int xx = 0; xx < 7; xx++){
                int X = OW-72 + i*9 + xx;
                if (X < 0 || X >= OW) continue;
                float *p = warp_buf + (yy*OW + X)*3;
                p[0] = mixf(p[0], c.x, 0.8f); p[1] = mixf(p[1], c.y, 0.8f); p[2] = mixf(p[2], c.z, 0.8f);
            }
        }
        /* clock: starts at 11:47:03 PM and keeps its own poor time */
        int tot = (int)(t) + 11*3600 + 47*60 + 3;
        int hh = (tot/3600) % 24, mm = (tot/60) % 60, ss = tot % 60;
        int pm = hh >= 12; int h12 = hh % 12; if (h12 == 0) h12 = 12;
        char clock[32], date[32];
        snprintf(clock, sizeof clock, "%2d:%02d:%02d %s", h12, mm, ss, pm ? "PM" : "AM");
        snprintf(date, sizeof date, "AUG 13 1996");
        draw_text(warp_buf, OW-166, OH-58, clock, white, 0.90f, 2);
        draw_text(warp_buf, OW-152, OH-34, date,  white, 0.90f, 2);
        if (gl > 0.55f && (frame & 4))
            draw_text(warp_buf, 40, OH-34, "TRACKING", white, 0.85f, 2);
    }

    /* --- the tape itself: tracking, chroma, noise, scanlines --- */
    float vroll = 0.0f;
    if (gl > 0.45f){
        float rr = fh1(frame*3+11);
        if (rr > 0.55f) vroll = (fh1(frame*7+5) - 0.5f) * 240.0f * (gl - 0.45f);
    }
    static float prev_lock = 0.0f;
    prev_lock = prev_lock*0.6f + vroll*0.4f;

    #pragma omp parallel for schedule(static)
    for (int y = 0; y < OH; y++){
        float row[OW*3];
        float Y[OW], I[OW], Q[OW];

        /* per-line head tracking error */
        float band = fh2(frame, y/6);
        float lineerr = (fh2(frame*13+7, y) - 0.5f) * 2.0f;
        float shift = lineerr * (0.9f + 9.0f*gl*gl);
        if (band > 0.92f - 0.30f*gl) shift += (fh2(frame*5+3, y/6) - 0.5f) * 70.0f * gl;
        /* a torn band that walks down the picture */
        float tearpos = fmodf(t*0.37f + fh1(frame/24)*3.0f, 1.6f) - 0.3f;
        float td = fabsf((float)y/OH - tearpos);
        if (td < 0.035f) shift += (0.035f-td)*900.0f*(0.25f + gl);

        float yy = y + prev_lock;
        int ys = (int)floorf(yy);
        float fy = yy - ys;

        for (int x = 0; x < OW; x++){
            float sx = x + shift;
            int x0 = (int)floorf(sx);
            float fx = sx - x0;
            for (int ch = 0; ch < 3; ch++){
                float acc = 0.0f;
                for (int j = 0; j < 4; j++){
                    int qx = x0 + (j&1), qy = ys + (j>>1);
                    float wgt = ((j&1)?fx:1-fx) * ((j>>1)?fy:1-fy);
                    if (qx < 0 || qx >= OW || qy < 0 || qy >= OH) continue;
                    acc += warp_buf[(qy*OW+qx)*3+ch]*wgt;
                }
                row[x*3+ch] = acc;
            }
        }
        /* RGB -> YIQ */
        for (int x = 0; x < OW; x++){
            float r = row[x*3], g = row[x*3+1], b = row[x*3+2];
            Y[x] = 0.299f*r + 0.587f*g + 0.114f*b;
            I[x] = 0.596f*r - 0.274f*g - 0.322f*b;
            Q[x] = 0.211f*r - 0.523f*g + 0.312f*b;
        }
        /* colour-under: chroma bandwidth is a fraction of luma, and it lags */
        float Ib[OW], Qb[OW];
        const int CR = 9;
        for (int x = 0; x < OW; x++){
            float si = 0, sq = 0, w = 0;
            for (int j = -CR; j <= CR; j++){
                int q = x + j; if (q < 0) q = 0; if (q >= OW) q = OW-1;
                float ww = 1.0f - fabsf((float)j)/(CR+1);
                si += I[q]*ww; sq += Q[q]*ww; w += ww;
            }
            Ib[x] = si/w; Qb[x] = sq/w;
        }
        const int CDELAY = 4;
        /* luma: soften, then put back the overshoot the recorder invents */
        float Yb[OW];
        for (int x = 0; x < OW; x++){
            int a = x > 0 ? x-1 : 0, b = x < OW-1 ? x+1 : OW-1;
            int a2 = x > 2 ? x-3 : 0, b2 = x < OW-3 ? x+3 : OW-1;
            float soft = 0.24f*Y[a] + 0.40f*Y[x] + 0.24f*Y[b] + 0.06f*Y[a2] + 0.06f*Y[b2];
            float over = (Y[x] - 0.5f*(Y[a2] + Y[b2]));
            Yb[x] = soft + over*0.34f;
        }
        int fieldy = (y + frame) & 1;
        for (int x = 0; x < OW; x++){
            int cx = x - CDELAY; if (cx < 0) cx = 0;
            float yv = Yb[x], iv = Ib[cx], qv = Qb[cx];

            /* tape noise: worse in the shadows, worse when tracking is bad */
            float n = fh3(x*3+1, y*7+3, frame*11+5) - 0.5f;
            float n2 = fh3(x/3, y, frame*17+9) - 0.5f;
            float dark = 1.0f - satf(yv*1.6f);
            yv += n*(0.030f + 0.075f*dark + 0.21f*gl*gl) + n2*(0.012f + 0.07f*gl);
            iv += (fh3(x/7, y, frame*23+1) - 0.5f)*(0.030f + 0.23f*gl);
            qv += (fh3(x/7, y+91, frame*29+7) - 0.5f)*(0.030f + 0.23f*gl);

            /* dropouts: the oxide is not all there any more */
            float dseed = fh3(x/26, y, frame*31+3);
            if (dseed > 0.99977f - 0.0035f*gl) yv += 0.85f;
            float dseed2 = fh2(frame*37+13, y);
            if (dseed2 > 0.99935f - 0.030f*gl){
                float px = fmodf(fh2(frame, y)*OW + x*0.0f, (float)OW);
                if (fabsf(x - px) < 26.0f) yv = mixf(yv, 0.92f, 0.75f);
            }

            /* scanline structure */
            float sl = fieldy ? 0.90f : 1.045f;
            yv *= sl;

            /* head-switching mess along the bottom edge */
            if (y > OH-13){
                float k = (y - (OH-13))/13.0f;
                float nn = fh3(x, y, frame*41+7);
                yv = mixf(yv, 0.28f + 0.62f*nn, satf(k*1.25f));
                iv *= 0.15f; qv *= 0.15f;
            }

            float r = yv + 0.956f*iv + 0.621f*qv;
            float g = yv - 0.272f*iv - 0.647f*qv;
            float b = yv - 1.106f*iv + 1.703f*qv;
            row[x*3] = r; row[x*3+1] = g; row[x*3+2] = b;
        }
        memcpy(warp_buf + y*OW*3, row, sizeof(float)*OW*3);
    }

    /* --- composite: ghosting off the previous field, vignette, quantise --- */
    float ghost = 0.13f + 0.16f*gl;
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < OH; y++){
        for (int x = 0; x < OW; x++){
            float *s = warp_buf + (y*OW+x)*3;
            const unsigned char *pv = fb_buf + (y*OW+x)*3;
            float u = (x+0.5f)/OW - 0.5f, v = (y+0.5f)/OH - 0.5f;
            float r2 = u*u + v*v;
            float vig = 1.0f - 0.52f*r2 - 0.30f*r2*r2;
            for (int ch = 0; ch < 3; ch++){
                float c = s[ch];
                c = mixf(c, pv[ch]/255.0f, ghost);      /* tape smear */
                c *= vig;
                c = 0.042f + c*0.958f;                  /* lifted video black */
                c = satf(c);
                out_buf[(y*OW+x)*3+ch] = (unsigned char)(c*255.0f + 0.5f);
            }
        }
    }
}

/* --------------------------------------------------------------------- main */
static FILE *evf;

int main(int argc, char **argv){
    int f0 = 0, f1 = NFRAMES, foff = 0, warm = WARMUP;
    const char *evpath = "events.txt";
    for (int i = 1; i < argc; i++){
        if (!strcmp(argv[i], "-r") && i+2 < argc){ f0 = atoi(argv[i+1]); f1 = atoi(argv[i+2]); i += 2; }
        else if (!strcmp(argv[i], "-o") && i+1 < argc){ foff = atoi(argv[i+1]); i++; }
        else if (!strcmp(argv[i], "-w") && i+1 < argc){ warm = atoi(argv[i+1]); i++; }
        else if (!strcmp(argv[i], "-e") && i+1 < argc){ evpath = argv[i+1]; i++; }
    }

    build_levels();

    /* camera paths, in cell coordinates */
    static const float wander_c[] = {
        32,33, 32,30, 32,28.6f, 32,28.6f, 32,26, 29.2f,26, 29.2f,26, 28,26,
        26,26, 24,26, 24,29, 24,32, 24,32, 24,35, 24,37, 25,37
    };
    static const float trans_c[] = { 25,37, 28,37, 31,37, 33.5f,37, 35.0f,37 };
    static const float run1_c[] = {
        51,37, 45,37, 45,31, 39,31, 39,25, 33,25, 33,19, 27,19,
        27,25, 21,25, 21,31, 27,31, 27,37, 21,37, 15,37
    };
    static const float run0_c[] = {
        40,40, 40,34, 40,28, 34,28, 28,28, 28,22, 22,22, 22,28,
        16,28, 16,34, 22,34, 22,40, 28,40, 34,40, 40,40, 40,34
    };
    path_build(&pWander, wander_c, sizeof(wander_c)/8);
    path_build(&pTrans,  trans_c,  sizeof(trans_c)/8);
    path_build(&pRun1,   run1_c,   sizeof(run1_c)/8);
    path_build(&pRun0,   run0_c,   sizeof(run0_c)/8);

    lookat_yp(REST_POS, add(P_TV, v3(0.0f, 0.02f, 0.22f)), &rest_yaw, &rest_pitch);

    g_feedback = fb_buf;
    memset(fb_buf, 0, sizeof(fb_buf));

    evf = fopen(evpath, "w");

    float gait = 0.0f;
    int   last_step = 0;
    double t_start = omp_get_wtime();

    for (int f = -warm; f < f1; f++){
        float t = (f < 0) ? foff/FPS : (f + foff)/FPS;
        g_time = (f < 0) ? (f + foff)/FPS : t;

        Cam c;
        /* scene globals that the shading needs */
        g_entity_z = -22.0f;
        g_entity_vis = 0.0f;
        if (t >= 152.0f && t < 179.0f) g_entity_vis = 1.0f;
        if (t >= 176.0f) g_entity_vis = 0.0f;
        g_lightflick = 1.0f;
        if (t > 150.0f && t < 176.0f) g_lightflick = 0.85f + 0.15f*sinf(t*3.0f);
        if (t > 283.0f && t < 284.0f) g_lightflick = 1.0f - 0.9f*(t - 283.0f);
        g_door_ang = 1.58f * ease(satf((t - 112.35f)/1.75f));
        g_void_glow = (t >= T_SPR0_END) ? expf(-(t - T_SPR0_END)*0.55f) : 0.0f;
        g_tv_gain = 1.0f + 0.035f*sinf(t*7.3f) + 0.02f*fbm2(t*3.1f, 2.0f, 2);

        shot_camera(t, &c);

        /* gait: bob, sway, and the footfall times the sound pass will need */
        if (f >= 0 && c.speed > 0.02f){
            float stride = c.running ? (1.42f + 0.06f*c.speed) : (0.74f + 0.05f*c.speed);
            gait += (c.speed/stride)/FPS;
            int s = (int)floorf(gait*1.0f);
            if (s != last_step){
                last_step = s;
                if (evf) fprintf(evf, "STEP %.4f %d %d\n", t, c.surface, c.running);
            }
        }
        float bobv = c.bob * (c.running ? 0.055f : 0.019f);
        float bobl = c.bob * (c.running ? 0.070f : 0.026f);
        c.pos.y += bobv * cosf(gait*2.0f*PI);
        {
            V3 rightv = v3(cosf(c.yaw), 0, -sinf(c.yaw));
            float sway = bobl * sinf(gait*PI);
            c.pos = add(c.pos, scl(rightv, sway));
            c.roll += (c.running ? 0.075f : 0.020f) * c.bob * sinf(gait*PI);
            c.pitch += (c.running ? 0.030f : 0.006f) * c.bob * cosf(gait*2.0f*PI + 0.8f);
        }
        handheld(&c, t);

        /* never let the operator end up inside a wall */
        if (g_scene == SC_ROOM || g_scene == SC_LEVEL0 || g_scene == SC_TRANS || g_scene == SC_LEVEL1){
            for (int it = 0; it < 4; it++){
                float d = map_collide(c.pos);
                if (d > 0.42f) break;
                V3 p = c.pos;
                const float e = 0.02f;
                V3 g = v3(map_collide(v3(p.x+e,p.y,p.z)) - map_collide(v3(p.x-e,p.y,p.z)), 0.0f,
                          map_collide(v3(p.x,p.y,p.z+e)) - map_collide(v3(p.x,p.y,p.z-e)));
                g = norm3(g);
                c.pos = add(c.pos, scl(g, (0.42f - d)));
            }
        }

        /* ---- build the ray basis ---- */
        V3 fwd = v3(cosf(c.pitch)*sinf(c.yaw), sinf(c.pitch), cosf(c.pitch)*cosf(c.yaw));
        V3 wup = v3(0,1,0);
        V3 right = norm3(cross3(fwd, wup));
        V3 up = cross3(right, fwd);
        float cr = cosf(c.roll), sr = sinf(c.roll);
        V3 R = add(scl(right, cr), scl(up, sr));
        V3 U = add(scl(right, -sr), scl(up, cr));

        float fovy = c.fov * PI/180.0f;
        float ty = tanf(fovy*0.5f);
        float tx = ty * (float)RW/(float)RH;
        /* sub-pixel jitter -- the tape smear turns it into free antialiasing */
        float jx = (fh1(f*2+1) - 0.5f), jy = (fh1(f*2+7) - 0.5f);

        V3 ro = c.pos;
        #pragma omp parallel for schedule(dynamic, 4)
        for (int y = 0; y < RH; y++){
            for (int x = 0; x < RW; x++){
                float sxn = ((x + 0.5f + jx)/RW)*2.0f - 1.0f;
                float syn = 1.0f - ((y + 0.5f + jy)/RH)*2.0f;
                V3 rd = norm3(add(add(scl(R, sxn*tx), scl(U, syn*ty)), fwd));
                float hd;
                V3 col = trace(ro, rd, &hd);
                /* filmic-ish knee, then the camcorder's own gamma */
                col.x = col.x/(1.0f+col.x*0.72f);
                col.y = col.y/(1.0f+col.y*0.72f);
                col.z = col.z/(1.0f+col.z*0.72f);
                col.x = powf(satf(col.x), 0.80f);
                col.y = powf(satf(col.y), 0.80f);
                col.z = powf(satf(col.z), 0.80f);
                /* CCD colour: warm, and it cannot hold the yellows */
                float lum = 0.3f*col.x + 0.59f*col.y + 0.11f*col.z;
                col = mix3(col, v3(lum,lum,lum), -0.12f);
                col.x *= 1.045f; col.z *= 0.965f;
                float *o = scene_buf + (y*RW+x)*3;
                o[0] = col.x; o[1] = col.y; o[2] = col.z;
            }
        }

        vhs_process(t);
        memcpy(fb_buf, out_buf, sizeof(out_buf));

        if (f >= f0){
            fwrite(out_buf, 1, sizeof(out_buf), stdout);
        }
        if (f >= 0 && (f % 48) == 0){
            double el = omp_get_wtime() - t_start;
            double done = (f + warm + 1);
            double tot = (f1 + warm);
            fprintf(stderr, "\rframe %5d/%d  %5.1f%%  %.2fs/f  eta %5.1f min   ",
                    f, f1, 100.0*f/f1, el/done, (tot-done)*(el/done)/60.0);
            fflush(stderr);
        }
    }
    if (evf) fclose(evf);
    fprintf(stderr, "\ndone in %.1f min\n", (omp_get_wtime()-t_start)/60.0);
    return 0;
}
