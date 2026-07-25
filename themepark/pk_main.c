/* pk_main.c -- the operator, the timeline, and the tape.
 *
 * Writes raw rgb24 frames to stdout at OW x OH, FPS a second, and a sidecar
 * file of footstep and event times for the sound pass.
 *
 *   cc -O3 -ffast-math -fopenmp pk_main.c -o pk_render -lm
 */
#include "pk_core.h"
#include "pk_shade.h"
#include <omp.h>

#define FPS      24.0f
#define DUR      300.0f
#define NFRAMES  ((int)(DUR*FPS))
#define WARMUP   64            /* frames burned to charge the feedback loop */

/* ------------------------------------------------------------- the timeline */
#define T_BOOTH    20.0f       /* the camera is picked up off the asphalt      */
#define T_WANDER  144.0f       /* two minutes of park                          */
#define T_FREEZE  146.0f       /* the calliope drops an octave and stops       */
#define T_STOP    151.0f       /* they stop walking                            */
#define T_STARE   171.0f       /* twenty seconds of it not moving              */
#define T_DIST    181.5f       /* the twitch, and the footage coming apart     */
#define T_LUNGE   185.5f       /* the snap, the rush, the turn                 */
#define T_CHASE   283.0f
#define T_VOID    291.0f

/* chase segment boundaries */
#define T_C1      208.0f       /* midway alleys      */
#define T_C2      233.0f       /* funhouse           */
#define T_C3      253.0f       /* hall of mirrors    */

/* ------------------------------------------------------------------ the park */
static const V3 REST_POS  = { -6.95f, 0.128f, -71.70f };
static const float REST_ROLL = -1.33f;
static float rest_yaw, rest_pitch;

/* the mascot's post, and where the camera stands to look at it */
#define JEST_X  PLAZA_X
#define JEST_Z  (PLAZA_Z + 3.4f)
#define STARE_R 7.90f

/* post-process state, per frame */
static float g_invert  = 0.0f;    /* the colours turn over  */
static float g_stretch = 0.0f;    /* perspective stops being perspective */
static float g_chroma  = 0.0f;    /* extra colour-under damage */

/* --------------------------------------------------------------------- paths */
#define PMAX 32
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
/* box filter along arc length: rounds the corners into something a body could
 * actually run round */
static V3 path_at(const Path *P, float s, float r){
    V3 a = path_raw(P, s - r);
    V3 b = path_raw(P, s - r*0.5f);
    V3 c = path_raw(P, s);
    V3 d = path_raw(P, s + r*0.5f);
    V3 e = path_raw(P, s + r);
    return add(add(scl(a,0.12f), scl(b,0.24f)), add(scl(c,0.28f), add(scl(d,0.24f), scl(e,0.12f))));
}
/* the chase loop closes on itself, so arc length wraps */
static V3 loop_at(const Path *P, float s, float r){
    float t = fmodf(s, P->total);
    if (t < 0) t += P->total;
    V3 a = path_raw(P, fmodf(t - r + P->total, P->total));
    V3 b = path_raw(P, fmodf(t - r*0.5f + P->total, P->total));
    V3 c = path_raw(P, t);
    V3 d = path_raw(P, fmodf(t + r*0.5f, P->total));
    V3 e = path_raw(P, fmodf(t + r, P->total));
    return add(add(scl(a,0.12f), scl(b,0.24f)), add(scl(c,0.28f), add(scl(d,0.24f), scl(e,0.12f))));
}

static Path pWander, pRunA, pLoop, pFun, pMaze;

/* (time, arc length) knots; arc position eases between them, so the operator
 * accelerates, walks, and stops to look at things */
typedef struct { float t, s; } Knot;
static float knot_s(const Knot *k, int nk, float t){
    if (t <= k[0].t) return k[0].s;
    if (t >= k[nk-1].t) return k[nk-1].s;
    int i = 0;
    while (i+1 < nk && k[i+1].t < t) i++;
    float u = (t - k[i].t)/(k[i+1].t - k[i].t);
    return mixf(k[i].s, k[i+1].s, ease(u));
}
static const Knot WK[] = {
    { 20.0f,   0.0f}, { 36.0f,  26.4f}, { 48.5f,  47.4f}, { 55.0f,  58.2f},
    { 60.0f,  58.2f},                                    /* the carousel      */
    { 72.5f,  79.0f}, { 76.5f,  79.0f},                  /* the buried track  */
    { 86.5f,  95.4f}, { 99.0f, 116.4f}, {109.5f, 133.9f},
    {113.5f, 133.9f},                                    /* the popcorn cart  */
    {128.5f, 158.4f}, {146.0f, 178.0f}, {T_STOP, 181.2f}
};
#define NWK ((int)(sizeof(WK)/sizeof(WK[0])))

/* --------------------------------------------------------------- the camera */
typedef struct {
    V3 pos;
    float yaw, pitch, roll, fov;
    float shake, speed, bob;
    int   surface;       /* 0 asphalt 1 board floor 2 steel */
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

static float glance_w(float t, float t0, float t1){
    if (t < t0 - 0.9f || t > t1 + 1.1f) return 0.0f;
    float in  = smoothstepf(t0 - 0.9f, t0 + 0.35f, t);
    float out = 1.0f - smoothstepf(t1 - 0.2f, t1 + 1.1f, t);
    return satf(minf(in, out));
}
static void glance(Cam *c, float t, float t0, float t1, V3 target){
    float w = glance_w(t, t0, t1);
    if (w <= 0.0f) return;
    float ty, tp;
    lookat_yp(c->pos, target, &ty, &tp);
    c->yaw   = angmix(c->yaw, ty, w);
    c->pitch = mixf(c->pitch, tp, w);
}
static void handheld(Cam *c, float t){
    float a = c->shake;
    if (a <= 0.0001f) return;
    c->yaw   += (fbm2(t*0.83f, 1.7f, 3) - 0.5f) * 0.155f * a;
    c->pitch += (fbm2(t*0.71f, 5.3f, 3) - 0.5f) * 0.115f * a;
    c->roll  += (fbm2(t*0.54f, 9.1f, 3) - 0.5f) * 0.190f * a;
    c->pos.x += (fbm2(t*0.95f, 21.f, 2) - 0.5f) * 0.035f * a;
    c->pos.y += (fbm2(t*1.11f, 31.f, 2) - 0.5f) * 0.030f * a;
    c->pos.z += (fbm2(t*0.88f, 41.f, 2) - 0.5f) * 0.035f * a;
    c->yaw   += sinf(t*23.1f)*0.0035f*a + sinf(t*37.7f)*0.0018f*a;
    c->pitch += sinf(t*19.4f)*0.0030f*a + sinf(t*41.3f)*0.0015f*a;
}

/* where the mascot is standing, or coming from. Set before the camera, because
 * the camera looks at it and it looks back at the camera. */
static void mascot_script(float t)
{
    g_jest_vis = 0.0f;
    g_jest_contort = 0.0f;
    g_jest_twitch = 0.0f;
    g_jest_pos = v3(JEST_X, 0.0f, JEST_Z);

    if (t >= T_FREEZE - 8.0f && t < T_DIST){
        g_jest_vis = 1.0f;
        /* dead still. Nothing moves, which is the whole problem. */
        if (t > T_STARE){
            /* the twitch: one wrong frame, then another */
            float u = t - T_STARE;
            float tw = 0.0f;
            if (u < 0.22f) tw = 1.0f;
            else if (u > 1.9f && u < 2.05f) tw = 1.0f;
            else if (u > 4.1f && u < 4.4f) tw = 0.8f;
            else tw = 0.10f + 0.35f*satf((u - 5.0f)/6.0f)*(fh1((int)(t*14.0f)) > 0.6f ? 1.0f : 0.0f);
            g_jest_twitch = tw;
            g_jest_contort = 0.10f*satf((u - 6.0f)/4.5f);
        }
    } else if (t >= T_DIST && t < T_LUNGE){
        g_jest_vis = 1.0f;
        float u = t - T_DIST;
        /* the snap, and then it is not where it was */
        g_jest_contort = ease(satf(u/0.55f));
        g_jest_twitch = 1.0f - ease(satf(u/0.9f));
        float rush = ease(satf((u - 0.55f)/1.55f));
        V3 from = v3(JEST_X, 0.0f, JEST_Z);
        V3 to   = v3(JEST_X + 0.7f, 0.0f, JEST_Z - 7.1f);   /* into the lens */
        g_jest_pos = mix3(from, to, rush);
        g_jest_pos.y = 0.28f*sinf(rush*PI*3.4f)*(1.0f - rush*0.4f);   /* it bounds */
    }
    /* and then it is behind them, for the rest of the tape */
    else if (t >= T_LUNGE && t < T_CHASE){
        g_jest_vis = 1.0f;
        g_jest_contort = 1.0f;
        g_jest_pos = v3(JEST_X, 0.0f, JEST_Z);   /* overwritten by the chase */
    }
}

static void shot_camera(float t, Cam *c)
{
    memset(c, 0, sizeof(*c));
    c->fov = 52.0f; c->shake = 1.0f; c->bob = 0.0f; c->surface = 0;

    /* ============================================================ 0 - 20 s
     * Lying on the asphalt in front of the ticket booth, pointed at a monitor
     * in the counter that is showing what the camera can see. */
    if (t < T_BOOTH){
        g_scene = SC_BOOTH;
        V3 look = add(P_CRT, v3(0.0f, 0.012f, 0.10f));
        if (t < 5.4f){
            c->pos = REST_POS;
            c->yaw = rest_yaw; c->pitch = rest_pitch; c->roll = REST_ROLL;
            c->fov = 57.0f;
            c->shake = 0.035f;
            c->roll += 0.010f*sinf(t*0.6f);       /* the asphalt is soft, and warm */
        } else if (t < 7.2f){
            /* a hand takes it off the ground */
            float u = ease((t-5.4f)/1.8f);
            V3 up = v3(REST_POS.x + 0.30f, 1.06f, REST_POS.z + 0.52f);
            c->pos = mix3(REST_POS, up, u);
            c->pos.y += 0.12f*sinf(u*PI)*1.3f;
            float ty, tp; lookat_yp(c->pos, look, &ty, &tp);
            c->yaw = angmix(rest_yaw, ty, u);
            c->pitch = mixf(rest_pitch, tp, u);
            c->roll = mixf(REST_ROLL, -0.22f, u) + 0.17f*sinf(u*PI*2.3f);
            c->shake = 0.35f + 2.7f*sinf(u*PI);
        } else if (t < 13.0f){
            /* walking an arc across the front of the booth, looking it over:
             * the roof, the rust, the barred window, and back to the monitor */
            float u = (t - 7.2f)/5.8f;
            float ang = mixf(0.42f, -0.72f, ease(u)) + 0.07f*sinf(t*1.5f);
            float rad = mixf(2.35f, 1.62f, ease(u)) + 0.10f*sinf(t*0.9f);
            float hgt = mixf(1.16f, 0.92f, ease(u)) + 0.045f*sinf(t*1.2f);
            V3 pivot = add(P_BOOTH, v3(0.0f, 0.0f, 2.5f));
            c->pos = v3(pivot.x + sinf(ang)*rad, hgt, pivot.z + cosf(ang)*rad);
            lookat_yp(c->pos, look, &c->yaw, &c->pitch);
            c->roll = -0.11f + 0.11f*sinf(t*0.8f);
            c->shake = 0.95f;
            c->fov = 50.0f + 5.0f*sinf(t*0.7f);
            /* up at the roof, and the sign, on the way past */
            glance(c, t,  8.4f,  9.4f, add(P_BOOTH, v3(-0.6f, 6.4f, 1.4f)));
            glance(c, t, 10.4f, 11.2f, add(P_BOOTH, v3(0.0f, 3.86f, 1.55f)));
        } else if (t < 17.6f){
            /* leaning in and stabbing the zoom rocker at the tunnel */
            float seg = t - 13.0f;
            float ang = -0.72f + 0.30f*sinf(t*1.15f);
            float rad = 1.16f + 0.20f*sinf(t*2.1f);
            V3 pivot = add(P_BOOTH, v3(0.0f, 0.0f, 2.5f));
            c->pos = v3(pivot.x + sinf(ang)*rad, 0.86f + 0.06f*sinf(t*1.9f),
                        pivot.z + cosf(ang)*rad);
            lookat_yp(c->pos, add(look, v3(0.012f*sinf(t*3.1f), 0.0f, 0.0f)), &c->yaw, &c->pitch);
            c->roll = -0.09f + 0.13f*sinf(t*1.4f);
            c->shake = 1.30f;
            /* the rocker is being jabbed, not swept */
            float z;
            if      (seg < 0.8f) z = mixf(0.0f, 0.92f, ease(seg/0.8f));
            else if (seg < 1.4f) z = 0.92f;
            else if (seg < 2.0f) z = mixf(0.92f, 0.14f, ease((seg-1.4f)/0.6f));
            else if (seg < 2.5f) z = mixf(0.14f, 0.78f, ease((seg-2.0f)/0.5f));
            else if (seg < 3.1f) z = 0.78f + 0.11f*sinf(seg*9.0f);
            else if (seg < 3.7f) z = mixf(0.78f, 1.0f, ease((seg-3.1f)/0.6f));
            else                 z = 1.0f;
            c->fov = mixf(52.0f, 10.5f, z);
            c->shake *= (1.0f + z*2.3f);
        } else {
            /* standing up, and turning to face the midway */
            float u = ease((t - 17.6f)/2.4f);
            V3 pivot = add(P_BOOTH, v3(0.0f, 0.0f, 2.5f));
            V3 a = v3(pivot.x + sinf(-0.72f)*1.16f, 0.86f, pivot.z + cosf(-0.72f)*1.16f);
            V3 b = v3(CW(29.0f), 1.62f, CW(8.2f));
            c->pos = mix3(a, b, u);
            c->pos.y = mixf(0.86f, 1.62f, ease(satf((t-17.6f)/1.7f)));
            float y0, p0; lookat_yp(c->pos, look, &y0, &p0);
            c->yaw = angmix(y0, 0.0f, ease(satf((t-18.1f)/1.9f)));
            c->pitch = mixf(p0, -0.045f, ease(satf((t-18.0f)/2.0f)));
            c->roll = mixf(-0.09f, -0.03f, u);
            c->shake = 1.55f - 0.5f*u;
            c->fov = mixf(10.5f, 52.0f, ease(satf((t-17.6f)/1.1f)));
            c->speed = 1.1f*u;
            c->bob = 0.5f*u;
        }
        return;
    }

    /* ========================================================== 20 - 151 s
     * The park. Nothing in it is wrong enough to run from. */
    if (t < T_STOP){
        g_scene = (t > T_WANDER) ? SC_PLAZA : SC_MIDWAY;
        float s  = knot_s(WK, NWK, t);
        float s2 = knot_s(WK, NWK, t + 0.1f);
        c->speed = (s2 - s)/0.1f;
        V3 p  = path_at(&pWander, s, 1.45f);
        V3 fw = sub(path_at(&pWander, s + 0.8f, 1.45f), path_at(&pWander, s - 0.8f, 1.45f));
        c->pos = v3(p.x, 1.62f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.050f;
        c->shake = 1.0f; c->bob = 1.0f; c->surface = 0;

        /* the things you look at, and cannot account for */
        glance(c, t,  26.0f,  31.0f, v3(-70.5f, 15.0f, -55.5f));   /* something in the fog */
        glance(c, t,  40.0f,  45.0f, v3( 22.0f,  2.10f, -43.5f));  /* the row of booths    */
        glance(c, t,  49.5f,  52.5f, v3( 13.5f,  1.55f, -37.0f));  /* behind a stall       */
        glance(c, t,  56.0f,  63.5f, v3( 24.0f,  3.10f, -33.0f));  /* the carousel, reversed */
        glance(c, t,  66.5f,  69.0f, v3( -7.5f, 13.0f, -19.5f));   /* and a wheel, over the roofs */
        glance(c, t,  73.0f,  79.5f, v3(  2.2f,  2.70f, -12.5f));  /* the track, and the concrete */
        glance(c, t,  88.5f,  91.5f, v3( 13.5f,  0.10f,   2.0f));  /* something on the ground */
        glance(c, t, 101.0f, 105.0f, v3( 55.5f, 12.0f,   4.5f));   /* a loop, out in the fog */
        glance(c, t, 110.0f, 116.5f, v3( 36.2f,  1.30f,  26.5f));  /* the popcorn cart     */
        glance(c, t, 122.0f, 126.0f, v3( 34.5f,  3.40f,  30.0f));  /* signs, all the same  */
        glance(c, t, 133.0f, 137.0f, v3( 24.0f,  2.20f,  38.0f));
        /* a look back down the midway, because of nothing */
        {
            float w = glance_w(t, 95.0f, 96.6f);
            if (w > 0) c->yaw = angmix(c->yaw, c->yaw + 2.45f, w);
        }
        /* and then the plaza opens, and there is something standing in it */
        if (t > T_FREEZE - 4.0f){
            float w = glance_w(t, T_FREEZE - 3.0f, T_STOP);
            if (w > 0){
                float ty, tp;
                lookat_yp(c->pos, v3(JEST_X, 1.10f, JEST_Z), &ty, &tp);
                c->yaw = angmix(c->yaw, ty, w*0.92f);
                c->pitch = mixf(c->pitch, tp, w*0.92f);
            }
            c->shake = 1.0f - 0.42f*satf((t - T_FREEZE)/4.0f);
        }
        return;
    }

    /* ========================================================= 151 - 171 s
     * It is a costume. It is standing still. It is looking at the camera. */
    if (t < T_STARE){
        g_scene = SC_PLAZA;
        float u = (t - T_STOP)/(T_STARE - T_STOP);
        /* a cautious arc round it -- never closing, never quite turning away */
        float ang = PI + 0.62f*sinf(u*PI*1.35f) - 0.22f*u;
        float rad = mixf(STARE_R, 5.55f, ease(satf(u*1.15f))) + 0.16f*sinf(u*PI*3.0f);
        c->pos = v3(JEST_X + sinf(ang)*rad, 1.615f, JEST_Z + cosf(ang)*rad);
        /* the zoom creeps in, because the operator needs it not to be a person */
        float z = 0.28f*ease(satf(u/0.16f));
        if (u > 0.24f) z = 0.28f + 0.34f*ease(satf((u - 0.24f)/0.30f));
        if (u > 0.64f) z = 0.62f + 0.38f*ease(satf((u - 0.64f)/0.28f));
        z = satf(z);
        float ty, tp;
        /* and it rides up to the head as it tightens */
        lookat_yp(c->pos, v3(JEST_X, mixf(1.12f, 1.58f, z), JEST_Z), &ty, &tp);
        c->yaw = ty; c->pitch = tp;
        c->fov = mixf(50.0f, 17.5f, z);
        c->shake = 0.62f + 1.55f*satf(z);
        c->speed = (rad < 7.4f && u < 0.9f) ? 0.42f : 0.0f;
        c->bob = 0.22f;
        c->surface = 0;
        return;
    }

    /* ========================================================= 171 - 181.5
     * It twitched. After that the tape stops agreeing with itself. */
    if (t < T_DIST){
        g_scene = SC_PLAZA;
        float u = (t - T_STARE)/(T_DIST - T_STARE);
        float ang = PI - 0.22f + 0.30f*sinf(u*PI*0.9f) + 0.10f*sinf(t*0.7f);
        float rad = 5.55f + 0.75f*u + 0.22f*sinf(t*0.6f);
        c->pos = v3(JEST_X + sinf(ang)*rad, 1.615f - 0.05f*u, JEST_Z + cosf(ang)*rad);
        float ty, tp;
        lookat_yp(c->pos, v3(JEST_X, 1.52f, JEST_Z), &ty, &tp);
        /* they cannot hold it steady and cannot look away */
        c->yaw = ty + 0.045f*sinf(t*7.3f)*u + 0.09f*(fbm2(t*1.7f, 3.0f, 3) - 0.5f);
        c->pitch = tp + 0.030f*sinf(t*5.1f)*u;
        c->roll = 0.10f*sinf(t*0.9f)*u + 0.06f*sinf(t*11.0f)*u*u;
        c->fov = mixf(17.5f, 36.0f, ease(satf((u - 0.08f)/0.55f)));
        c->shake = 1.55f + 2.3f*u;
        c->speed = 0.0f; c->bob = 0.10f;
        c->surface = 0;
        return;
    }

    /* ========================================================= 181.5 - 185.5
     * It comes. */
    if (t < T_LUNGE){
        g_scene = SC_PLAZA;
        float u = t - T_DIST;
        float ang = PI - 0.22f;
        float rad = 6.30f;
        V3 stand = v3(JEST_X + sinf(ang)*rad, 1.60f, JEST_Z + cosf(ang)*rad);
        (void)0;
        if (u < 1.75f){
            /* rooted. It is closing and the picture is coming apart. */
            c->pos = add(stand, v3(0.0f, -0.10f*ease(satf((u-0.9f)/0.85f)), -0.34f*ease(satf((u-0.7f)/1.0f))));
            float ty, tp;
            lookat_yp(c->pos, add(g_jest_pos, v3(0.0f, 1.10f, 0.0f)), &ty, &tp);
            c->yaw = ty + 0.11f*sinf(u*29.0f)*satf(u*2.0f);
            c->pitch = tp + 0.07f*sinf(u*23.0f);
            c->roll = 0.14f*sinf(u*17.0f);
            c->fov = mixf(36.0f, 64.0f, ease(satf((u - 0.35f)/1.1f)));
            c->shake = 4.2f;
            c->speed = 0.0f; c->bob = 0.2f;
        } else {
            /* the whip-round. The picture becomes a smear of neon. */
            float k = ease(satf((u - 1.75f)/1.15f));
            c->pos = add(stand, v3(0.0f, -0.10f, -0.34f - 1.9f*k));
            float ty, tp;
            lookat_yp(stand, add(v3(JEST_X, 0.0f, JEST_Z - 7.1f), v3(0,1.1f,0)), &ty, &tp);
            c->yaw = ty + k*(PI + 0.62f) - 0.62f*ease(satf((u - 2.6f)/0.9f));
            c->pitch = mixf(tp, -0.14f, k) + 0.15f*sinf(k*PI*2.0f);
            c->roll = 0.46f*sinf(k*PI*1.6f);
            c->fov = mixf(64.0f, 70.0f, k);
            c->shake = 5.6f;
            c->speed = 4.2f*k; c->bob = 1.5f;
        }
        c->surface = 0;
        return;
    }

    /* ========================================================= 185.5 - 208
     * Running. The midway repeats, and repeats. */
    if (t < T_C1){
        g_scene = SC_MIDWAY;
        float u = (t - T_LUNGE)/(T_C1 - T_LUNGE);
        float spd = 5.55f;
        float s = spd*(t - T_LUNGE)*(0.62f + 0.38f*ease(satf(u*6.0f)))
                + 0.55f*sinf(u*PI*5.0f);
        V3 p  = path_at(&pRunA, s, 2.0f);
        V3 fw = sub(path_at(&pRunA, s + 1.5f, 2.0f), path_at(&pRunA, s - 1.5f, 2.0f));
        c->pos = v3(p.x, 1.53f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.085f + 0.06f*sinf(t*3.1f);
        c->speed = spd*(0.62f + 0.38f*ease(satf(u*6.0f)));
        c->shake = 3.5f; c->bob = 2.5f; c->running = 1; c->surface = 0;
        c->fov = 70.0f;
        /* it is behind them, and it is keeping up */
        {
            V3 b = path_at(&pRunA, s - mixf(7.5f, 4.6f, u), 2.0f);
            g_jest_pos = v3(b.x, 0.0f, b.z);
            g_jest_vis = 1.0f; g_jest_contort = 1.0f;
        }
        float g = maxf(glance_w(t, 192.0f, 193.2f), glance_w(t, 203.0f, 204.4f));
        if (g > 0){ c->yaw = angmix(c->yaw, c->yaw + PI*0.88f, g); c->shake = 4.4f; }
        return;
    }

    /* ========================================================= 208 - 233
     * Inside, where the walls are painted and none of them are straight. */
    if (t < T_C2){
        g_scene = SC_FUN;
        float u = (t - T_C1)/(T_C2 - T_C1);
        float spd = 4.85f;
        float s = spd*(t - T_C1) + 0.5f*sinf(u*PI*7.0f);
        V3 p  = path_at(&pFun, s, 1.7f);
        V3 fw = sub(path_at(&pFun, s + 1.3f, 1.7f), path_at(&pFun, s - 1.3f, 1.7f));
        c->pos = v3(p.x, 1.50f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.075f + 0.07f*sinf(t*3.4f);
        /* the floor in here is not level, and it changes its mind */
        c->roll = 0.20f*sinf(s*0.11f) + 0.09f*sinf(s*0.31f);
        c->speed = spd;
        c->shake = 3.7f; c->bob = 2.6f; c->running = 1; c->surface = 1;
        c->fov = 74.0f;
        {
            V3 b = path_at(&pFun, s - 5.4f, 1.7f);
            g_jest_pos = v3(b.x, 0.0f, b.z);
            g_jest_vis = 1.0f; g_jest_contort = 1.0f;
        }
        float g = maxf(glance_w(t, 214.0f, 215.0f), glance_w(t, 227.0f, 228.3f));
        if (g > 0){ c->yaw = angmix(c->yaw, c->yaw + PI*0.90f, g); c->shake = 4.6f; }
        return;
    }

    /* ========================================================= 233 - 253
     * The mirror maze. There are more of them in here than there are of it. */
    if (t < T_C3){
        g_scene = SC_MIRROR;
        float u = (t - T_C2)/(T_C3 - T_C2);
        float spd = 4.55f;
        float s = spd*(t - T_C2) + 0.4f*sinf(u*PI*9.0f);
        V3 p  = path_at(&pMaze, s, 1.5f);
        V3 fw = sub(path_at(&pMaze, s + 1.2f, 1.5f), path_at(&pMaze, s - 1.2f, 1.5f));
        c->pos = v3(p.x, 1.51f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.06f + 0.07f*sinf(t*3.6f);
        c->roll = 0.07f*sinf(s*0.4f);
        c->speed = spd;
        c->shake = 3.9f; c->bob = 2.6f; c->running = 1; c->surface = 1;
        c->fov = 72.0f;
        {
            V3 b = path_at(&pMaze, s - 4.2f, 1.5f);
            g_jest_pos = v3(b.x, 0.0f, b.z);
            g_jest_vis = 1.0f; g_jest_contort = 1.0f;
        }
        float g = maxf(glance_w(t, 239.0f, 240.2f), glance_w(t, 248.5f, 249.8f));
        if (g > 0){ c->yaw = angmix(c->yaw, c->yaw + PI*0.92f, g); c->shake = 4.8f; }
        return;
    }

    /* ========================================================= 253 - 283
     * Back out onto a midway. It is the same midway. It is always the same
     * midway. */
    if (t < T_CHASE){
        g_scene = SC_MIDWAY;
        float u = (t - T_C3)/(T_CHASE - T_C3);
        float spd = 5.35f + 0.55f*u;
        float s = 93.0f + spd*(t - T_C3) + 0.6f*sinf(u*PI*6.0f);
        V3 p  = loop_at(&pLoop, s, 2.0f);
        V3 fw = sub(loop_at(&pLoop, s + 1.5f, 2.0f), loop_at(&pLoop, s - 1.5f, 2.0f));
        c->pos = v3(p.x, 1.53f, p.z);
        c->yaw = atan2f(fw.x, fw.z);
        c->pitch = -0.09f + 0.075f*sinf(t*3.3f);
        c->speed = spd;
        c->shake = 3.8f; c->bob = 2.7f; c->running = 1; c->surface = 0;
        c->fov = 72.0f;
        {
            V3 b = loop_at(&pLoop, s - mixf(4.4f, 2.9f, u), 2.0f);
            g_jest_pos = v3(b.x, 0.0f, b.z);
            g_jest_vis = 1.0f; g_jest_contort = 1.0f;
        }
        float g = maxf(maxf(glance_w(t, 259.0f, 260.2f), glance_w(t, 268.5f, 269.9f)),
                       glance_w(t, 278.0f, 279.6f));
        if (g > 0){ c->yaw = angmix(c->yaw, c->yaw + PI*0.94f, g); c->shake = 5.0f; }
        if (t > 279.0f){ c->shake = 4.6f; c->bob = 3.1f; }
        return;
    }

    /* ========================================================= 283 - 291
     * The asphalt stops being loaded. */
    if (t < T_VOID){
        g_scene = SC_VOID;
        float u = (t - T_CHASE)/(T_VOID - T_CHASE);
        c->pos = v3(0.0f, -24.0f*u*u, 0.0f);
        c->yaw = 3.6f*u + 0.8f*sinf(t*2.3f);
        c->pitch = -0.4f + 2.8f*u + 0.55f*sinf(t*1.7f);
        c->roll = 6.0f*u*u + 0.9f*sinf(t*3.1f);
        c->fov = mixf(72.0f, 92.0f, u);
        c->shake = 5.2f;
        return;
    }

    /* ========================================================= 291 - 300
     * It lands where it started, and the tape has been here before. */
    {
        g_scene = SC_BOOTH;
        float u = t - T_VOID;
        if (u < 1.25f){
            float k = u/1.25f;
            c->pos = mix3(v3(REST_POS.x - 1.1f, 3.4f, REST_POS.z + 1.7f),
                          v3(REST_POS.x, 0.44f, REST_POS.z + 0.32f), k*k);
            c->yaw = rest_yaw + 3.8f*(1.0f-k*k) + 0.62f;
            c->pitch = mixf(1.20f, -0.14f, k*k);
            c->roll = mixf(3.6f, REST_ROLL - 0.95f, k*k);
            c->fov = mixf(92.0f, 60.0f, k);
            c->shake = 5.2f*(1.0f-k) + 1.0f;
        } else if (u < 2.55f){
            /* it hits, bounces once, and rolls onto its side */
            float k = ease((u - 1.25f)/1.30f);
            V3 a = v3(REST_POS.x, 0.44f, REST_POS.z + 0.32f);
            c->pos = mix3(a, REST_POS, k);
            c->pos.y += 0.21f*sinf(satf((u-1.25f)/0.55f)*PI)*(1.0f - k*0.4f);
            c->yaw = angmix(rest_yaw + 0.62f, rest_yaw, k);
            c->pitch = mixf(-0.14f, rest_pitch, k);
            c->roll = mixf(REST_ROLL - 0.95f, REST_ROLL, k) + 0.23f*sinf((u-1.25f)*11.0f)*(1.0f-k);
            c->fov = mixf(60.0f, 52.0f, k);
            c->shake = 3.3f*(1.0f-k) + 0.30f;
        } else {
            /* settled, in the same place, at the same angle, as at 0:00 */
            float k = satf((u - 2.55f)/2.6f);
            c->pos = REST_POS;
            c->yaw = rest_yaw; c->pitch = rest_pitch; c->roll = REST_ROLL;
            c->fov = 52.0f;
            c->shake = mixf(0.30f, 0.035f, k);
            c->roll += 0.010f*sinf((t - 300.0f)*0.6f);   /* matches t = 0 exactly */
        }
        return;
    }
}

/* --------------------------------------------------------- tape degradation */
static float glitch_level(float t)
{
    float g = 0.10f;
    float r = fbm2(t*0.35f, 3.7f, 3);
    if (r > 0.66f) g += (r - 0.66f)*2.6f;
    float r2 = fh1((int)(t*1.7f));
    if (r2 > 0.955f) g += 0.55f;

    struct { float a, b, amp; } B[] = {
        {  13.0f,  18.2f, 0.42f },   /* the feed being driven into the ground */
        {  17.4f,  20.4f, 0.80f },
        { 145.4f, 147.2f, 0.60f },   /* the music drops an octave and stops   */
        { 170.8f, 172.4f, 0.55f },   /* the twitch                            */
        { 176.4f, 177.1f, 0.62f },   /* the distortion, in hits               */
        { 178.9f, 179.7f, 0.72f },
        { 181.3f, 182.0f, 0.80f },
        { 183.0f, 183.6f, 0.72f },
        { 185.1f, 186.1f, 0.78f },
        { 207.6f, 209.2f, 0.85f },   /* the cut into the funhouse             */
        { 232.6f, 234.2f, 0.85f },
        { 252.6f, 254.2f, 0.85f },
        { 282.2f, 291.6f, 1.00f },   /* no floor                              */
        { 290.9f, 292.6f, 0.95f },
    };
    for (unsigned i = 0; i < sizeof(B)/sizeof(B[0]); i++){
        if (t > B[i].a && t < B[i].b){
            float u = (t - B[i].a)/(B[i].b - B[i].a);
            g += B[i].amp * powf(sinf(satf(u)*PI), 0.45f);
        }
    }
    if (t > T_STARE && t < T_LUNGE + 1.5f) g += 0.20f;
    if (t > T_LUNGE && t < T_CHASE) g += 0.16f + 0.14f*satf(fbm2(t*1.6f, 8.1f, 2)*2.0f - 0.9f);
    if (t > T_CHASE && t < T_VOID) g = 1.0f;
    return satf(g);
}

/* ---------------------------------------------------------------- OSD glyphs */
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
            float d = sqrtf((float)((x-cx)*(x-cx) + (y-cy)*(y-cy)));
            float w = satf(r - d) * a;
            if (w <= 0) continue;
            float *p = buf + (y*OW + x)*3;
            p[0] = mixf(p[0], col.x, w);
            p[1] = mixf(p[1], col.y, w);
            p[2] = mixf(p[2], col.z, w);
        }
}

/* ------------------------------------------------------------------- buffers */
#define BW (OW/4)
#define BH (OH/4)
static float  scene_buf[RW*RH*3];
static float  warp_buf[OW*OH*3];
static float  bloom_a[BW*BH*3];
static float  bloom_b[BW*BH*3];
static unsigned char out_buf[OW*OH*3];
static unsigned char fb_buf[OW*OH*3];

/* ---------------------------------------------------------------- the bloom
 * Neon in fog is mostly halo. The camcorder's optics are cheap and its CCD
 * blooms, and this is the single biggest thing that sells the park as lit. */
static void bloom_pass(float amount)
{
    const float thr = 0.52f;
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < BH; y++)
        for (int x = 0; x < BW; x++){
            float acc[3] = {0,0,0};
            for (int j = 0; j < 4; j++)
                for (int i = 0; i < 4; i++){
                    const float *s = warp_buf + ((y*4+j)*OW + (x*4+i))*3;
                    for (int ch = 0; ch < 3; ch++) acc[ch] += s[ch];
                }
            float *d = bloom_a + (y*BW+x)*3;
            for (int ch = 0; ch < 3; ch++){
                float v = acc[ch]/16.0f;
                d[ch] = maxf(v - thr, 0.0f)/(1.0f - thr);
            }
        }
    /* two separable passes, wide */
    static const float K[9] = {0.028f,0.055f,0.098f,0.148f,0.172f,0.148f,0.098f,0.055f,0.028f};
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < BH; y++)
        for (int x = 0; x < BW; x++){
            float acc[3] = {0,0,0};
            for (int k = 0; k < 9; k++){
                int q = x + (k-4)*2; if (q < 0) q = 0; if (q >= BW) q = BW-1;
                const float *s = bloom_a + (y*BW+q)*3;
                for (int ch = 0; ch < 3; ch++) acc[ch] += s[ch]*K[k];
            }
            float *d = bloom_b + (y*BW+x)*3;
            for (int ch = 0; ch < 3; ch++) d[ch] = acc[ch];
        }
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < BH; y++)
        for (int x = 0; x < BW; x++){
            float acc[3] = {0,0,0};
            for (int k = 0; k < 9; k++){
                int q = y + (k-4)*2; if (q < 0) q = 0; if (q >= BH) q = BH-1;
                const float *s = bloom_b + (q*BW+x)*3;
                for (int ch = 0; ch < 3; ch++) acc[ch] += s[ch]*K[k];
            }
            float *d = bloom_a + (y*BW+x)*3;
            for (int ch = 0; ch < 3; ch++) d[ch] = acc[ch];
        }
    /* back up, bilinear, and add */
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < OH; y++)
        for (int x = 0; x < OW; x++){
            float bx = (x + 0.5f)/4.0f - 0.5f, by = (y + 0.5f)/4.0f - 0.5f;
            int x0 = (int)floorf(bx), y0 = (int)floorf(by);
            float fx = bx - x0, fy = by - y0;
            int x1 = x0+1, y1 = y0+1;
            if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
            if (x1 > BW-1) x1 = BW-1; if (y1 > BH-1) y1 = BH-1;
            if (x0 > BW-1) x0 = BW-1; if (y0 > BH-1) y0 = BH-1;
            float *o = warp_buf + (y*OW+x)*3;
            for (int ch = 0; ch < 3; ch++){
                float a = bloom_a[(y0*BW+x0)*3+ch], b = bloom_a[(y0*BW+x1)*3+ch];
                float c = bloom_a[(y1*BW+x0)*3+ch], d = bloom_a[(y1*BW+x1)*3+ch];
                float v = mixf(mixf(a,b,fx), mixf(c,d,fx), fy);
                o[ch] += v*amount;
            }
        }
}

/* ------------------------------------------------------------------ the tape */
static void vhs_process(float t)
{
    float gl = glitch_level(t);
    int frame = (int)(t*FPS);

    /* --- lens, and the picture laid onto the raster --- */
    float st = g_stretch;
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < OH; y++){
        for (int x = 0; x < OW; x++){
            float u = (x + 0.5f)/OW, v = (y + 0.5f)/OH;
            float dx = u - 0.5f, dy = v - 0.5f;
            float r2 = dx*dx + dy*dy;
            float k = 1.0f + 0.075f*r2 + 0.045f*r2*r2;
            /* space stops being the shape it was */
            if (st > 0.001f){
                k += st*(1.35f*r2 - 0.28f);
                dx *= 1.0f + st*0.30f*sinf(v*7.0f + t*1.3f);
                dy *= 1.0f - st*0.22f*sinf(u*5.0f - t*1.1f);
            }
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

    /* --- the halo round every tube in the park --- */
    bloom_pass(0.62f + 0.30f*satf(g_invert));

    /* --- the colours turn over ---
     * Straight 1-c on a night scene gives a white frame with nothing in it.
     * The chroma goes first and goes all the way -- every colour becomes its
     * opposite while the luma, and therefore the picture, survives. Only on
     * the hard hits does the whole thing go negative. */
    if (g_invert > 0.001f){
        float inv = g_invert;
        #pragma omp parallel for schedule(static)
        for (int y = 0; y < OH; y++)
            for (int x = 0; x < OW; x++){
                float *p = warp_buf + (y*OW+x)*3;
                float b = 0.5f + 0.5f*sinf((float)y*0.09f + t*3.1f);
                float wc = satf(inv*(0.80f + 0.30f*b));       /* hue, flipped   */
                float wl = satf(inv*inv*(0.55f + 0.45f*b));   /* luma, later    */
                float r = p[0], g = p[1], bl = p[2];
                float lum = 0.299f*r + 0.587f*g + 0.114f*bl;
                float nl  = mixf(lum, (1.02f - lum)*0.60f, wl);
                float dl  = nl - lum;
                p[0] = mixf(r,  2.0f*lum - r,  wc) + dl;
                p[1] = mixf(g,  2.0f*lum - g,  wc) + dl;
                p[2] = mixf(bl, 2.0f*lum - bl, wc) + dl;
            }
    }

    /* --- character generator: burned in before the tape sees it --- */
    {
        int blink = ((int)(t*1.0f)) & 1;
        V3 white = v3(1.02f, 1.02f, 0.98f);
        if (blink) draw_disc(warp_buf, 42, 30, 4.2f, v3(1.05f, 0.35f, 0.25f), 0.92f);
        draw_text(warp_buf, 52, 24, "REC", white, 0.92f, 2);
        draw_text(warp_buf, OW-104, 24, "SP", white, 0.85f, 2);
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
        int tot = (int)(t) + 22*3600 + 51*60 + 46;
        int hh = (tot/3600) % 24, mm = (tot/60) % 60, ss = tot % 60;
        int pm = hh >= 12; int h12 = hh % 12; if (h12 == 0) h12 = 12;
        char clock[32];
        snprintf(clock, sizeof clock, "%2d:%02d:%02d %s", h12, mm, ss, pm ? "PM" : "AM");
        draw_text(warp_buf, OW-166, OH-58, clock, white, 0.90f, 2);
        draw_text(warp_buf, OW-152, OH-34, "SEP 09 1994", white, 0.90f, 2);
        if (gl > 0.55f && (frame & 4))
            draw_text(warp_buf, 40, OH-34, "TRACKING", white, 0.85f, 2);
    }

    /* --- the tape: tracking, chroma, noise, scanlines --- */
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

        float band = fh2(frame, y/6);
        float wob  = (noise2((float)y*0.105f, (float)frame*0.73f) - 0.5f)*2.0f;
        float fine = (fh2(frame*13+7, y) - 0.5f)*2.0f;
        float shift = wob*(1.1f + 7.5f*gl*gl) + fine*(0.35f + 1.2f*gl);
        if (band > 0.94f - 0.26f*gl) shift += (fh2(frame*5+3, y/6) - 0.5f) * 52.0f * gl;
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
        int CDELAY = 4 + (int)(g_chroma*7.0f);
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

            float n = fh3(x*3+1, y*7+3, frame*11+5) - 0.5f;
            float n2 = fh3(x/3, y, frame*17+9) - 0.5f;
            float dark = 1.0f - satf(yv*1.6f);
            yv += n*(0.030f + 0.075f*dark + 0.13f*gl*gl) + n2*(0.012f + 0.05f*gl);
            iv += (fh3(x/7, y, frame*23+1) - 0.5f)*(0.030f + 0.13f*gl + 0.22f*g_chroma);
            qv += (fh3(x/7, y+91, frame*29+7) - 0.5f)*(0.030f + 0.13f*gl + 0.22f*g_chroma);
            /* the chroma gain runs away when the tape is in trouble */
            if (g_chroma > 0.001f){ iv *= 1.0f + g_chroma*1.5f; qv *= 1.0f + g_chroma*1.5f; }

            float dseed = fh3(x/26, y, frame*31+3);
            if (dseed > 0.99977f - 0.0035f*gl) yv += 0.85f;
            float dseed2 = fh2(frame*37+13, y);
            if (dseed2 > 0.99935f - 0.030f*gl){
                float px = fmodf(fh2(frame, y)*OW, (float)OW);
                if (fabsf(x - px) < 26.0f) yv = mixf(yv, 0.92f, 0.75f);
            }

            float sl = fieldy ? 0.90f : 1.045f;
            yv *= sl;

            if (y > OH-13){
                float k = (y - (OH-13))/13.0f;
                float nn = fh3(x, y, frame*41+7);
                yv = mixf(yv, 0.28f + 0.62f*nn, satf(k*1.25f));
                iv *= 0.15f; qv *= 0.15f;
            }

            row[x*3]   = yv + 0.956f*iv + 0.621f*qv;
            row[x*3+1] = yv - 0.272f*iv - 0.647f*qv;
            row[x*3+2] = yv - 1.106f*iv + 1.703f*qv;
        }
        memcpy(warp_buf + y*OW*3, row, sizeof(float)*OW*3);
    }

    /* --- ghosting off the previous field, vignette, quantise --- */
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
                c = mixf(c, pv[ch]/255.0f, ghost);
                c *= vig;
                c = 0.042f + c*0.958f;
                c = satf(c);
                out_buf[(y*OW+x)*3+ch] = (unsigned char)(c*255.0f + 0.5f);
            }
        }
    }
}

/* --------------------------------------------------------------------- main */
static FILE *evf;

int main(int argc, char **argv)
{
    int f0 = 0, f1 = NFRAMES, foff = 0, warm = WARMUP, dump = 0;
    const char *evpath = "events.txt";
    for (int i = 1; i < argc; i++){
        if (!strcmp(argv[i], "-dump")) dump = 1;
        else if (!strcmp(argv[i], "-r") && i+2 < argc){ f0 = atoi(argv[i+1]); f1 = atoi(argv[i+2]); i += 2; }
        else if (!strcmp(argv[i], "-o") && i+1 < argc){ foff = atoi(argv[i+1]); i++; }
        else if (!strcmp(argv[i], "-w") && i+1 < argc){ warm = atoi(argv[i+1]); i++; }
        else if (!strcmp(argv[i], "-e") && i+1 < argc){ evpath = argv[i+1]; i++; }
    }

    build_park();

    static const float wander_c[] = {
        29,8.2f, 29,17, 36,17, 36,33, 43,33, 43,47, 36,50
    };
    /* the spur out of the plaza, and then the loop that comes back on itself */
    static const float runa_c[] = {
        36,50, 36,41, 22,41, 22,25, 36,25, 36,41, 22,41
    };
    static const float loop_c[] = {
        36,41, 22,41, 22,25, 36,25, 36,41
    };
    static const float fun_c[] = {
        10,10, 10,20, 18,20, 18,12, 26,12, 26,24, 16,24, 16,32,
        28,32, 28,40, 20,40, 12,40, 12,30, 6,30, 6,20
    };
    static const float maze_c[] = {
        26,26, 26,32, 32,32, 32,26, 38,26, 38,34, 30,34, 30,38, 38,38
    };
    path_build(&pWander, wander_c, sizeof(wander_c)/8);
    path_build(&pRunA,   runa_c,   sizeof(runa_c)/8);
    path_build(&pLoop,   loop_c,   sizeof(loop_c)/8);
    path_build(&pFun,    fun_c,    sizeof(fun_c)/8);
    path_build(&pMaze,   maze_c,   sizeof(maze_c)/8);

    lookat_yp(REST_POS, add(P_CRT, v3(0.0f, 0.012f, 0.10f)), &rest_yaw, &rest_pitch);

    g_feedback = fb_buf;
    memset(fb_buf, 0, sizeof(fb_buf));

    evf = fopen(evpath, "w");

    float gait = 0.0f;
    int   last_step = 0;
    double t_start = omp_get_wtime();

    for (int f = -warm; f < f1; f++){
        float t = (f < 0) ? foff/FPS : (f + foff)/FPS;
        g_time = (f < 0) ? (f + foff)/FPS : t;

        /* ---- the state of the world at this instant ---- */
        g_carousel_ang = -t*0.335f;              /* the wrong way round */
        g_popcorn_t    = t;
        g_crt_gain     = 1.0f + 0.035f*sinf(t*7.3f) + 0.02f*fbm2(t*3.1f, 2.0f, 2);
        g_neon_gain    = 1.0f;
        g_lightgain    = 1.0f;
        g_warp = 0.0f; g_invert = 0.0f; g_stretch = 0.0f; g_chroma = 0.0f;
        g_expo = 1.0f;
        g_void_mix = 0.0f;

        /* the operator playing with the feed, and the feed losing */
        if (t < 21.0f){
            float z = smoothstepf(13.4f, 17.9f, t);
            g_feed_break = z*z;
            if (t > 18.6f) g_feed_break *= 1.0f - smoothstepf(18.6f, 20.6f, t)*0.88f;
        } else if (t > 289.0f){
            g_feed_break = 0.55f*(1.0f - smoothstepf(292.4f, 296.0f, t));
        } else {
            g_feed_break = 0.0f;
        }

        /* the calliope stops, and the neon feels it */
        if (t > T_FREEZE - 0.6f && t < T_DIST){
            g_neon_gain = 0.74f + 0.10f*sinf(t*2.3f) + 0.06f*sinf(t*13.0f);
            g_lightgain = 0.88f;
        }
        /* and then nothing behaves */
        if (t >= T_STARE && t < T_LUNGE){
            float u = satf((t - T_STARE)/(T_DIST - T_STARE));
            float post = (t >= T_DIST) ? 1.0f : 0.0f;
            float k = maxf(u*u, post);
            g_warp    = 0.85f*k;
            g_invert  = 0.72f*satf(k*1.15f - 0.10f);
            g_stretch = 0.80f*k;
            g_chroma  = 0.26f*k;
            /* and it turns right over, for a quarter of a second at a time */
            const float FL[5] = { 176.55f, 179.05f, 181.42f, 183.06f, 185.32f };
            for (int fi = 0; fi < 5; fi++)
                if (t > FL[fi] && t < FL[fi] + 0.27f) g_invert = 0.97f;
            g_neon_gain = (0.74f + 0.9f*k) * (1.0f + 0.35f*k*sinf(t*23.0f));
            g_lightgain = 0.88f + 0.9f*k;
            g_expo = 1.0f + 0.55f*k;
            /* it flickers off entirely, twice */
            if ((t > 179.4f && t < 179.62f) || (t > 183.1f && t < 183.34f)){
                g_neon_gain *= 0.05f; g_lightgain = 0.10f;
            }
        }
        /* the distortion does not switch off when they run, it drains */
        if (t >= T_LUNGE && t < T_LUNGE + 9.0f){
            float k = 1.0f - smoothstepf(T_LUNGE, T_LUNGE + 9.0f, t);
            g_warp = 0.30f*k; g_invert = 0.44f*k; g_stretch = 0.34f*k; g_chroma = 0.18f*k;
        }
        /* the last of the chase: the ground starts to go */
        if (t > 276.0f && t < T_CHASE) g_void_mix = smoothstepf(276.0f, T_CHASE, t)*0.95f;
        if (t >= T_CHASE) g_void_mix = 1.0f;

        /* fog, per scene -- set after the scene is known, below */
        mascot_script(t);

        Cam c;
        shot_camera(t, &c);

        /* the park's air, and the two indoor rooms that have none */
        if (g_scene == SC_FUN){
            g_fog_col = v3(0.058f, 0.050f, 0.066f); g_fog_dens = 0.030f;
            g_fog_y0 = 99.0f; g_fog_hs = 5.0f;
        } else if (g_scene == SC_MIRROR){
            g_fog_col = v3(0.062f, 0.058f, 0.052f); g_fog_dens = 0.024f;
            g_fog_y0 = 99.0f; g_fog_hs = 5.0f;
        } else {
            g_fog_col = v3(0.0455f, 0.0495f, 0.0640f);
            g_fog_dens = 0.0335f;
            g_fog_y0 = 2.2f; g_fog_hs = 5.6f;
            /* the fog thickens through the tape */
            g_fog_dens *= 1.0f + 0.30f*smoothstepf(20.0f, 150.0f, t);
        }
        if (g_warp > 0.001f) g_fog_col = mix3(g_fog_col, v3(0.075f, 0.030f, 0.065f), g_warp*0.6f);

        /* gait: bob, sway, and the footfalls the sound pass will need */
        if (f >= 0 && c.speed > 0.02f){
            float stride = c.running ? (1.48f + 0.06f*c.speed) : (0.76f + 0.05f*c.speed);
            gait += (c.speed/stride)/FPS;
            int s = (int)floorf(gait);
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

        /* never let them end up inside the scenery */
        if (g_scene != SC_VOID){
            for (int it = 0; it < 4; it++){
                float d = map_collide(c.pos);
                if (d > 0.40f) break;
                V3 p = c.pos;
                const float e = 0.02f;
                V3 g = v3(map_collide(v3(p.x+e,p.y,p.z)) - map_collide(v3(p.x-e,p.y,p.z)), 0.0f,
                          map_collide(v3(p.x,p.y,p.z+e)) - map_collide(v3(p.x,p.y,p.z-e)));
                g = norm3(g);
                c.pos = add(c.pos, scl(g, (0.40f - d)));
            }
        }

        /* it is looking at the lens, wherever the lens has got to */
        if (g_jest_vis > 0.0f){
            V3 d = sub(c.pos, g_jest_pos);
            g_jest_yaw = atan2f(d.x, d.z);
            /* while it is chasing them it faces the way it is going */
            if (t >= T_LUNGE && t < T_CHASE) g_jest_yaw = atan2f(d.x, d.z);
        }

        /* A five minute render is a slow way to find out that the operator
         * spent four seconds walking through a booth. */
        if (dump){
            if (f >= 0){
                float cl = (g_scene == SC_VOID) ? 9.0f : map_collide(c.pos);
                printf("%7.3f sc=%d pos=%8.2f %5.2f %8.2f yaw=%7.3f clear=%6.2f%s\n",
                       t, g_scene, c.pos.x, c.pos.y, c.pos.z, c.yaw, cl,
                       cl < 0.30f ? "  <<< CLIP" : "");
            }
            continue;
        }

        /* ---- the ray basis ---- */
        V3 fwd = v3(cosf(c.pitch)*sinf(c.yaw), sinf(c.pitch), cosf(c.pitch)*cosf(c.yaw));
        V3 wup = v3(0,1,0);
        V3 right = norm3(cross3(fwd, wup));
        V3 up = cross3(right, fwd);
        float cr = cosf(c.roll), sr = sinf(c.roll);
        V3 R = add(scl(right, cr), scl(up, sr));
        V3 U = add(scl(right, -sr), scl(up, cr));

        float fovy = c.fov * PI/180.0f;
        float ty = tanf(fovy*0.5f) * (1.0f - 0.22f*g_stretch);
        float tx = ty * (float)RW/(float)RH * (1.0f + 0.80f*g_stretch);
        float jx = (fh1(f*2+1) - 0.5f), jy = (fh1(f*2+7) - 0.5f);

        V3 ro = c.pos;

        /* the neon, as seen from here -- for the haze. Relative to the camera. */
        {
            Lamp tmp[24];
            int n = gather_lamps(ro, tmp, 24);
            for (int i = 0; i < n; i++){
                g_cam_lamps[i].pos = sub(tmp[i].pos, ro);
                g_cam_lamps[i].col = scl(tmp[i].col, 0.030f);
                g_cam_lamps[i].k = tmp[i].k;
            }
            g_cam_nlamps = n;
        }

        #pragma omp parallel for schedule(dynamic, 4)
        for (int y = 0; y < RH; y++){
            for (int x = 0; x < RW; x++){
                float sxn = ((x + 0.5f + jx)/RW)*2.0f - 1.0f;
                float syn = 1.0f - ((y + 0.5f + jy)/RH)*2.0f;
                V3 rd = norm3(add(add(scl(R, sxn*tx), scl(U, syn*ty)), fwd));
                float hd;
                V3 col = trace(ro, rd, &hd, 0);
                if (g_expo != 1.0f) col = scl(col, g_expo);
                col.x = col.x/(1.0f+col.x*0.72f);
                col.y = col.y/(1.0f+col.y*0.72f);
                col.z = col.z/(1.0f+col.z*0.72f);
                col.x = powf(satf(col.x), 0.80f);
                col.y = powf(satf(col.y), 0.80f);
                col.z = powf(satf(col.z), 0.80f);
                float lum = 0.3f*col.x + 0.59f*col.y + 0.11f*col.z;
                col = mix3(col, v3(lum,lum,lum), -0.10f);
                col.x *= 1.035f; col.z *= 0.975f;
                float *o = scene_buf + (y*RW+x)*3;
                o[0] = col.x; o[1] = col.y; o[2] = col.z;
            }
        }

        vhs_process(t);
        memcpy(fb_buf, out_buf, sizeof(out_buf));

        if (f >= f0) fwrite(out_buf, 1, sizeof(out_buf), stdout);
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
