/* hl_main.c -- Backrooms grand hotel: the operator, the tape, and the frame loop.
 *
 * Writes raw rgb24 frames to stdout at OW x OH, FPS a second, and a sidecar
 * file of footfall and event times for the sound pass to hang itself on.
 *
 *   cc -O3 -ffast-math -fopenmp hl_main.c -o hl_render -lm
 */
#include "hl_core.h"
#include "hl_shade.h"
#include <omp.h>

#define FPS      24.0f
#define DUR      300.0f
#define NFRAMES  ((int)(DUR*FPS))
#define WARMUP   64            /* frames burned to charge the feedback loop */

/* ------------------------------------------------------------- the timeline */
#define T_PICKUP   5.00f    /* somebody picks the camera up off the carpet   */
#define T_ZOOM    13.00f    /* and starts stabbing the zoom at the tube      */
#define T_BREAK   16.60f    /* the security feed stops being a picture       */
#define T_STAND   20.00f    /* they stand up and start walking               */
#define T_MALL    72.00f    /* the atrium                                    */
#define T_ARCADE  91.00f    /* the mouth of it, and they stop walking       */
#define T_PIANO  121.50f
#define T_ESC    148.00f    /* the escalator                                 */
#define T_SILENT 178.00f    /* everything stops. The ballroom.               */
#define T_STARE  180.50f
#define T_WARP   198.00f    /* twenty seconds in which nothing holds still    */
#define T_LUNGE  218.00f    /* the twitch, and it comes                      */
#define T_RUN    219.40f    /* velvet hallways                               */
#define T_STAIR  248.00f
#define T_SERV   272.00f    /* the service floor                             */
#define T_VOID   289.50f    /* the carpet stops being loaded                 */
#define T_LAND   292.50f

/* the tape's own damage, driven separately from the picture */
static float g_invert  = 0.0f;
static float g_stretch = 0.0f;
static float g_chroma  = 0.0f;

/* where it is lying when the tape starts, and where it lands at the end */
static const V3 REST_POS  = { -0.545f, 0.129f, 1.930f };
static const V3 REST_AIM  = { -1.140f, 0.905f, 5.700f };
static const float REST_ROLL = -0.660f;
static float rest_yaw, rest_pitch;

/* --------------------------------------------------------------------- paths */
#define PMAX 48
typedef struct { int n; V3 pt[PMAX]; float cum[PMAX]; float len; } Path;
static void path_build(Path *P, const float *xz, int n)
{
    P->n = n;
    for (int i = 0; i < n; i++) P->pt[i] = v3(xz[i*2], 0.0f, xz[i*2+1]);
    P->cum[0] = 0.0f;
    for (int i = 1; i < n; i++) P->cum[i] = P->cum[i-1] + len3(sub(P->pt[i], P->pt[i-1]));
    P->len = P->cum[P->n-1];
}
static void path_build_cells(Path *P, const float *cells, int n)
{
    float w[PMAX*2];
    for (int i = 0; i < n; i++){ w[i*2] = CW(cells[i*2]); w[i*2+1] = CW(cells[i*2+1]); }
    path_build(P, w, n);
}
static V3 path_raw(const Path *P, float s)
{
    if (s <= 0.0f) return P->pt[0];
    if (s >= P->len) return P->pt[P->n-1];
    int i = 0;
    while (i+1 < P->n-1 && P->cum[i+1] < s) i++;
    float seg = P->cum[i+1] - P->cum[i];
    float t = seg > 1e-5f ? (s - P->cum[i])/seg : 0.0f;
    return mix3(P->pt[i], P->pt[i+1], t);
}
/* corners get rounded, because nobody walks into one and pivots on the spot */
static V3 path_at(const Path *P, float s, float r)
{
    V3 a = path_raw(P, s - r), b = path_raw(P, s), c = path_raw(P, s + r);
    V3 m = add(scl(b, 0.5f), scl(add(a, c), 0.25f));
    V3 a2 = path_raw(P, s - r*0.45f), c2 = path_raw(P, s + r*0.45f);
    return add(scl(m, 0.62f), scl(add(a2, c2), 0.19f));
}

static Path pCorr, pMall, pRun, pServ;

/* s(t): the operator accelerates, walks, stops to look, and later runs */
typedef struct { float t, s; } Knot;
static float knot_s(const Knot *k, int nk, float t)
{
    if (t <= k[0].t) return k[0].s;
    for (int i = 0; i + 1 < nk; i++){
        if (t <= k[i+1].t){
            float u = (t - k[i].t)/maxf(k[i+1].t - k[i].t, 1e-4f);
            return mixf(k[i].s, k[i+1].s, ease(u));
        }
    }
    return k[nk-1].s;
}
/* the guest floor, out of the lobby and along */
static const Knot WK[] = {
    { 20.0f,  0.0f }, { 23.0f,  2.4f }, { 30.0f, 10.6f }, { 34.0f, 13.0f },
    { 36.5f, 13.4f }, { 44.0f, 21.8f }, { 48.0f, 25.6f }, { 50.5f, 26.1f },
    { 58.0f, 34.9f }, { 63.0f, 40.6f }, { 66.0f, 41.4f }, { 72.0f, 48.6f },
};
#define NWK ((int)(sizeof(WK)/sizeof(WK[0])))
/* the promenade: they slow down for the things worth slowing down for */
/* Integrated from a speed profile -- slow near the things worth slowing for,
 * about 1.5 m/s otherwise -- rather than guessed. Guessed knots put the arcade
 * glance thirty metres past the arcade and had the operator covering the last
 * leg of the promenade at six metres a second. */
static const Knot MK[] = {
    {  72.00f,   0.00f }, {  74.50f,   1.34f }, {  77.00f,   5.08f },
    {  79.50f,   9.22f }, {  82.00f,  13.36f }, {  84.50f,  17.50f },
    {  87.00f,  21.38f }, {  89.49f,  24.14f }, {  92.00f,  25.82f },
    {  94.50f,  27.10f }, {  97.02f,  28.50f }, {  99.49f,  30.58f },
    { 102.00f,  33.96f }, { 104.50f,  37.82f }, { 106.99f,  40.58f },
    { 109.48f,  42.30f }, { 111.99f,  43.86f }, { 114.49f,  46.10f },
    { 117.00f,  49.64f }, { 119.50f,  53.04f }, { 121.98f,  55.08f },
    { 124.49f,  56.48f }, { 127.01f,  57.98f }, { 129.50f,  60.36f },
    { 132.00f,  64.08f }, { 134.51f,  68.22f }, { 137.00f,  72.36f },
    { 139.50f,  76.50f }, { 142.00f,  80.64f }, { 144.50f,  84.68f },
    { 148.00f,  86.95f },
};
#define NMK ((int)(sizeof(MK)/sizeof(MK[0])))
/* and this is what running away looks like: no pauses in it at all */
static const Knot RK[] = {
    { 219.4f,  0.0f }, { 221.0f,  4.6f }, { 232.0f, 51.0f }, { 240.0f, 84.0f },
    { 248.0f, 116.0f },
};
#define NRK ((int)(sizeof(RK)/sizeof(RK[0])))
static const Knot SK[] = {
    { 272.0f,  0.0f }, { 274.0f,  8.0f }, { 284.0f, 51.0f }, { 289.5f, 74.0f },
};
#define NSK ((int)(sizeof(SK)/sizeof(SK[0])))

/* --------------------------------------------------------------- the camera */
typedef struct {
    V3 pos; float yaw, pitch, roll, fov, bob, speed;
    int running, surface;
} Cam;
static void lookat_yp(V3 from, V3 to, float *yaw, float *pitch)
{
    V3 d = sub(to, from);
    *yaw = atan2f(d.x, d.z);
    *pitch = atan2f(d.y, len2f(d.x, d.z));
}
static float angwrap(float a){
    while (a >  PI) a -= 2.0f*PI;
    while (a < -PI) a += 2.0f*PI;
    return a;
}
static float angmix(float a, float b, float t){ return a + angwrap(b-a)*t; }
static float glance_w(float t, float t0, float t1)
{
    float u = satf((t - t0)/maxf(t1 - t0, 1e-4f));
    return sinf(u*PI);
}
/* look at a thing for a while, then look back at where you are going */
static void glance(Cam *c, float t, float t0, float t1, V3 target, float amt)
{
    if (t < t0 - 0.4f || t > t1 + 0.4f) return;
    float w = glance_w(t, t0, t1)*amt;
    if (w <= 0.001f) return;
    float y, p;
    lookat_yp(c->pos, target, &y, &p);
    c->yaw = angmix(c->yaw, y, w);
    c->pitch = mixf(c->pitch, p, w);
}
/* nobody holds one of these still */
static void handheld(Cam *c, float t)
{
    float amp = c->running ? 2.35f : 1.0f;
    c->yaw   += (fbm_loop(t, 0.83f, 1.7f, 3) - 0.5f)*0.075f*amp;
    c->pitch += (fbm_loop(t, 0.71f, 5.3f, 3) - 0.5f)*0.058f*amp;
    c->roll  += (fbm_loop(t, 0.61f, 9.1f, 3) - 0.5f)*0.070f*amp;
    c->yaw   += (fbm_loop(t, 3.30f, 2.9f, 2) - 0.5f)*0.013f*amp;
    c->pitch += (fbm_loop(t, 3.70f, 7.1f, 2) - 0.5f)*0.011f*amp;
}

/* -------------------------------------------------- what the thing in the silk
 * is doing. It does not move while anybody is looking at it, until it does. */
static void figure_script(float t)
{
    g_fig_vis = 0.0f; g_fig_twitch = 0.0f; g_fig_contort = 0.0f;
    g_fig_pos = v3(0.0f, 0.0f, -1.30f);
    g_fig_yaw = 2.62f;                          /* three-quarters away */
    if (t < T_SILENT - 0.5f) return;
    g_fig_vis = 1.0f;

    if (t < T_WARP){
        /* it turns its face to the lens, and it takes eighteen seconds to do it */
        float u = satf((t - (T_STARE + 1.2f))/(T_WARP - T_STARE - 3.0f));
        /* not smoothly: in four movements, none of which you catch beginning */
        float st = 0.0f;
        const float SW[4] = { 0.10f, 0.34f, 0.62f, 0.88f };
        for (int i = 0; i < 4; i++)
            st += 0.25f*smoothstepf(SW[i], SW[i] + 0.045f, u);
        g_fig_yaw = mixf(2.62f, 0.02f, st);
        g_fig_twitch = 0.04f*smoothstepf(0.55f, 1.0f, u);
    } else if (t < T_LUNGE){
        g_fig_yaw = 0.02f;
        float u = satf((t - T_WARP)/(T_LUNGE - T_WARP));
        g_fig_twitch = 0.06f + 0.34f*u*u;
        g_fig_contort = 0.10f*u*u;
        /* it is nearer than it was, and nobody saw it move */
        float step = 0.0f;
        const float SP[3] = { 0.28f, 0.55f, 0.82f };
        for (int i = 0; i < 3; i++) step += smoothstepf(SP[i], SP[i] + 0.020f, u);
        g_fig_pos = v3(0.0f, 0.0f, -1.30f + step*1.05f);
    } else {
        /* the snap, and then it comes */
        float u = satf((t - T_LUNGE)/1.30f);
        g_fig_twitch = 1.0f;
        g_fig_contort = ease(u);
        float glide = (t > T_LUNGE + 0.30f) ? powf(satf((t - T_LUNGE - 0.30f)/1.00f), 1.6f) : 0.0f;
        g_fig_pos = v3(0.0f, 0.0f, 1.85f + glide*5.20f);
        if (t >= T_RUN){
            /* on the velvet floors it is behind them, and it stays behind them */
            g_fig_vis = 1.0f;
            g_fig_contort = 1.0f;
        }
    }
}

/* ------------------------------------------------------------- the whole shot */
static void shot_camera(float t, Cam *c)
{
    memset(c, 0, sizeof *c);
    c->fov = 0.905f;               /* about 52 degrees across */
    c->bob = 1.0f;
    c->surface = 0;
    g_corr_style = 0;

    /* ---------------------------------------------------- the lobby, and the end */
    if (t < T_STAND || t >= T_LAND){
        g_scene = SC_LOBBY;
        V3 crt_t = add(P_CRT, v3(0.0f, 0.012f, -0.13f));
        (void)crt_t;

        if (t >= T_LAND){
            /* it lands, bounces once, and comes to rest exactly where it began */
            float u = satf((t - T_LAND)/1.70f);
            float set = ease(satf((t - T_LAND - 1.30f)/2.10f));
            V3 air = v3(REST_POS.x - 0.62f, 1.42f, REST_POS.z + 0.75f);
            c->pos = mix3(air, REST_POS, ease(u));
            c->pos.y += (1.0f - u)*0.0f + 0.115f*sinf(satf(u*1.25f)*PI)*(1.0f - u);
            /* the bounce */
            if (t > T_LAND + 0.55f && t < T_LAND + 1.05f){
                float b = sinf((t - T_LAND - 0.55f)/0.50f*PI);
                c->pos.y += b*0.075f;
            }
            float ry, rp;
            lookat_yp(c->pos, REST_AIM, &ry, &rp);
            c->yaw   = angmix(ry - 0.85f*(1.0f - set), ry, set);
            c->pitch = mixf(rp + 0.55f*(1.0f - set), rp, set);
            c->roll  = mixf(REST_ROLL - 1.45f*(1.0f - set), REST_ROLL, set);
            /* it is lying on the floor and it is not being held */
            c->bob = 0.0f;
            float shake = (1.0f - set)*(1.0f - set);
            c->yaw   += (fbm2(t*7.3f, 1.1f, 2) - 0.5f)*1.10f*shake;
            c->pitch += (fbm2(t*6.7f, 4.3f, 2) - 0.5f)*0.85f*shake;
            c->roll  += (fbm2(t*5.9f, 8.7f, 2) - 0.5f)*1.30f*shake;
            /* the same idle the opening has, so the two ends of the tape agree */
            c->yaw   += (fbm_loop(t, 0.9f, 3.1f, 2) - 0.5f)*0.006f*set;
            c->pitch += (fbm_loop(t, 1.1f, 6.3f, 2) - 0.5f)*0.005f*set;
            c->pos.y = maxf(c->pos.y, REST_POS.y);
            return;
        }

        if (t < T_PICKUP){
            /* on its side on the carpet, looking at the desk */
            c->pos = REST_POS;
            c->yaw = rest_yaw; c->pitch = rest_pitch; c->roll = REST_ROLL;
            c->bob = 0.0f;
            /* the deck is running and the tape is moving past the head */
            c->yaw   += (fbm_loop(t, 0.9f, 3.1f, 2) - 0.5f)*0.006f;
            c->pitch += (fbm_loop(t, 1.1f, 6.3f, 2) - 0.5f)*0.005f;
            return;
        }
        /* picked up: it comes off the floor in somebody's hand */
        float lift = ease(satf((t - T_PICKUP)/1.55f));
        V3 knee = v3(-0.85f, 1.055f, 2.62f);
        c->pos = mix3(REST_POS, knee, lift);
        c->pos.y += 0.075f*sinf(satf((t - T_PICKUP)/1.55f)*PI)*lift;
        c->roll = mixf(REST_ROLL, 0.045f, ease(satf((t - T_PICKUP)/1.90f)));
        /* they walk an arc across the front of the desk while they look at it */
        if (t > T_PICKUP + 1.4f){
            float u = satf((t - T_PICKUP - 1.4f)/(T_ZOOM - T_PICKUP - 1.4f));
            float a = -0.30f + u*0.92f;
            float rad = 3.30f - u*0.55f;
            V3 arc = v3(P_DESK.x + sinf(a)*rad*0.72f - 1.30f,
                        1.055f + 0.055f*sinf(u*5.1f),
                        P_DESK.z - cosf(a)*rad);
            c->pos = mix3(c->pos, arc, ease(satf((t - T_PICKUP - 1.4f)/1.1f)));
        }
        /* leaning in for the zoom */
        if (t > T_ZOOM){
            float u = ease(satf((t - T_ZOOM)/2.30f));
            V3 near = v3(P_CRT.x + 0.30f, 1.245f, P_CRT.z - 1.42f);
            c->pos = mix3(c->pos, near, u);
        }
        if (t > 18.9f){
            /* and back off it, on their way up */
            float u = ease(satf((t - 18.9f)/(T_STAND - 18.9f)));
            V3 up = v3(-1.60f, 1.455f, 1.85f);
            c->pos = mix3(c->pos, up, u);
        }
        {
            /* it comes up off the carpet still pointing at the desk, and they
             * bring the tube into the middle of the frame as they stand */
            float ay, ap, by, bp;
            lookat_yp(c->pos, REST_AIM, &ay, &ap);
            lookat_yp(c->pos, add(P_CRT, v3(0.0f, 0.012f, -0.13f)), &by, &bp);
            float w = ease(satf((t - T_PICKUP - 0.55f)/1.60f));
            c->yaw = angmix(ay, by, w);
            c->pitch = mixf(ap, bp, w);
        }
        /* what they look at on the way round */
        glance(c, t, 6.6f,  9.4f,  v3(5.05f, 1.05f, 1.30f), 0.92f);   /* a cart      */
        glance(c, t, 9.6f, 11.4f,  v3(8.15f, 3.40f, -1.40f), 0.88f);  /* a column    */
        glance(c, t, 11.5f,12.6f,  v3(0.0f, 4.05f, 8.90f), 0.70f);    /* the key wall*/
        /* the zoom: six jabs at the tunnel in the glass */
        if (t > T_ZOOM){
            float z = 0.0f;
            const float J[6] = { 13.25f, 14.05f, 14.80f, 15.55f, 16.35f, 17.15f };
            for (int i = 0; i < 6; i++){
                float u = (t - J[i])/0.62f;
                if (u > 0.0f && u < 1.0f) z = maxf(z, sinf(u*PI)*(0.62f + 0.06f*i));
            }
            if (t > 17.8f) z = maxf(z, 0.80f*(1.0f - smoothstepf(17.8f, 19.4f, t)));
            c->fov = mixf(0.905f, 0.175f, z);
        }
        c->bob = 0.30f;
        return;
    }

    /* ------------------------------------------------------- the guest floors */
    if (t < T_MALL){
        g_scene = SC_CORR; g_corr_style = 0;
        float s = knot_s(WK, NWK, t);
        float sp = (knot_s(WK, NWK, t + 0.05f) - knot_s(WK, NWK, t - 0.05f))/0.10f;
        V3 pos = path_at(&pCorr, s, 1.45f);
        V3 ahead = path_at(&pCorr, s + 2.30f, 1.45f);
        c->pos = v3(pos.x, 1.615f, pos.z);
        c->speed = sp; c->surface = 0;
        lookat_yp(c->pos, v3(ahead.x, 1.585f, ahead.z), &c->yaw, &c->pitch);
        /* the things a person looks at in a corridor like this one */
        glance(c, t, 24.4f, 26.6f, v3(CW(3.6f), 1.735f, CW(6.4f)), 0.80f);
        glance(c, t, 31.2f, 33.4f, v3(CW(0.5f), 1.240f, CW(13.0f)), 0.85f);
        glance(c, t, 35.0f, 36.4f, v3(CW(2.0f), CORR_H - 0.55f, CW(15.5f)), 0.70f);
        glance(c, t, 40.5f, 42.6f, v3(CW(6.4f), 1.100f, CW(12.6f)), 0.78f);
        glance(c, t, 46.0f, 47.8f, v3(CW(11.5f), 1.735f, CW(15.4f)), 0.72f);
        glance(c, t, 52.5f, 54.8f, v3(CW(15.6f), 1.240f, CW(18.4f)), 0.80f);
        glance(c, t, 60.0f, 61.8f, v3(CW(14.0f), CORR_H - 0.60f, CW(21.5f)), 0.62f);
        glance(c, t, 66.5f, 68.5f, v3(CW(17.4f), 1.500f, CW(20.0f)), 0.70f);
        return;
    }

    /* ------------------------------------------------------------- the atrium */
    if (t < T_SILENT){
        g_scene = SC_MALL;
        c->surface = 1;
        if (t < T_ESC){
            float s = knot_s(MK, NMK, t);
            float sp = (knot_s(MK, NMK, t + 0.05f) - knot_s(MK, NMK, t - 0.05f))/0.10f;
            V3 pos = path_at(&pMall, s, 2.20f);
            V3 ahead = path_at(&pMall, s + 3.40f, 2.20f);
            c->pos = v3(pos.x, 1.630f, pos.z);
            c->speed = sp;
            lookat_yp(c->pos, v3(ahead.x, 1.600f, ahead.z), &c->yaw, &c->pitch);
            /* up into the well, at a fountain, into the arcade, at the piano */
            glance(c, t,  73.0f,  77.0f, v3(26.0f, 14.5f, 1.0f), 0.85f);   /* the well */
            glance(c, t,  78.0f,  81.5f, v3(27.0f, 1.90f, 13.2f), 0.72f);   /* a window */
            glance(c, t,  84.0f,  87.5f, v3(19.0f, 1.65f, -12.8f), 0.72f);  /* a clock  */
            glance(c, t, T_ARCADE, 99.5f, v3(ARC_X, 1.55f, ARC_ZB + 5.4f), 0.94f);
            glance(c, t, 102.5f, 107.5f, v3(4.0f, 1.05f, 0.0f), 0.84f);     /* the water*/
            glance(c, t, 110.0f, 113.5f, v3(-4.0f, 8.60f, 11.0f), 0.62f);   /* upstairs */
            glance(c, t, 116.0f, 119.0f, v3(-9.0f, 1.60f, -12.8f), 0.66f);
            glance(c, t, T_PIANO, 127.5f, v3(PIANO_X, 1.05f, PIANO_Z + 1.35f), 0.92f);
            glance(c, t, 131.0f, 134.0f, v3(-14.0f, 1.70f, 13.0f), 0.62f);
            glance(c, t, 138.0f, 142.0f, v3(-28.0f, 1.05f, 0.0f), 0.70f);   /* the water*/
            glance(c, t, 143.5f, 147.5f, v3(ESC_X + 7.0f, 4.60f, ESC_Z), 0.88f);
            return;
        }
        /* on the escalator, going up, for as long as it goes */
        float u = (t - T_ESC);
        /* d starts negative, so the first two seconds are spent crossing the
         * landing from exactly where the walk left off, and there is no jump */
        float d = u*0.760f - 2.054f;
        float ca = cosf(ESC_ANG), sa = sinf(ESC_ANG);
        c->pos = v3(ESC_X + d*ca + 0.10f, maxf(d, 0.0f)*sa + 1.615f,
                    ESC_Z + 0.055f*sinf(u*0.42f));
        c->speed = 0.0f; c->bob = 0.22f;
        /* they look up it, then over the side at what is down there, then up */
        float ay = ESC_ANG;
        V3 fwd = v3(ESC_X + (d + 8.0f)*ca, maxf(d + 8.0f, 0.0f)*sa + 0.35f, ESC_Z);
        lookat_yp(c->pos, fwd, &c->yaw, &c->pitch);
        (void)ay;
        /* over the side at the promenade dropping away, then the levels going
         * past, then back up it into whatever the top of it is */
        glance(c, t, T_ESC + 5.0f,  T_ESC + 11.0f,
               v3(ESC_X + d*ca + 5.0f, 0.0f, ESC_Z - 10.0f), 0.86f);
        glance(c, t, T_ESC + 13.0f, T_ESC + 18.0f,
               v3(ESC_X + d*ca + 9.0f, maxf(d,0.0f)*sa + 1.0f, 13.2f), 0.74f);
        glance(c, t, T_ESC + 20.0f, T_ESC + 25.0f,
               v3(ESC_X + d*ca - 6.0f, maxf(d,0.0f)*sa + 5.0f, -13.2f), 0.68f);
        glance(c, t, T_ESC + 27.0f, T_ESC + 31.5f,
               v3(ESC_X + (d + 14.0f)*ca, maxf(d + 14.0f, 0.0f)*sa + 6.0f, ESC_Z), 0.85f);
        return;
    }

    /* ----------------------------------------------------------- the ballroom */
    if (t < T_RUN){
        g_scene = SC_BALL;
        c->surface = 2;
        float u = t - T_SILENT;
        /* they walked in and they have stopped walking */
        float in = ease(satf(u/2.20f));
        V3 a = v3(0.55f, 1.630f, 9.90f), b = v3(0.30f, 1.630f, 7.35f);
        c->pos = mix3(a, b, in);
        c->speed = (1.0f - in)*1.05f;
        /* and then the camera cannot leave it alone: it circles, slowly */
        if (t > T_STARE){
            float w = (t - T_STARE);
            float ang = -0.055f*w - 0.010f*w*sinf(w*0.31f);
            float rad = 8.55f - 0.075f*w;
            V3 ctr = g_fig_pos;
            c->pos = v3(ctr.x + sinf(ang)*rad*0.42f, 1.630f + 0.030f*sinf(w*0.47f),
                        ctr.z + cosf(ang)*rad);
            c->speed = 0.34f;
            if (t > T_LUNGE){
                /* it is coming and they are backing off it */
                float k = satf((t - T_LUNGE)/1.40f);
                c->pos.z += k*1.60f;
                c->speed = 2.4f*k;
                c->bob = 1.0f + k;
            }
        }
        V3 head = add(g_fig_pos, v3(0.0f, 3.115f, 0.0f));
        lookat_yp(c->pos, head, &c->yaw, &c->pitch);
        /* before they see it, they are looking at the room */
        if (t < T_STARE){
            float w = 1.0f - ease(satf((u - 0.9f)/1.5f));
            float y2, p2;
            lookat_yp(c->pos, v3(-9.0f, 6.60f, -6.0f), &y2, &p2);
            c->yaw = angmix(c->yaw, y2, w*0.85f);
            c->pitch = mixf(c->pitch, p2, w*0.85f);
        }
        /* and when it starts, they cannot hold it steady any more */
        if (t > T_WARP){
            float k = satf((t - T_WARP)/(T_LUNGE - T_WARP));
            c->yaw   += (fbm2(t*1.9f, 3.3f, 3) - 0.5f)*0.10f*k;
            c->pitch += (fbm2(t*2.1f, 7.7f, 3) - 0.5f)*0.085f*k;
            c->roll  += (fbm2(t*1.5f, 5.5f, 3) - 0.5f)*0.16f*k;
        }
        if (t > T_LUNGE){
            float k = satf((t - T_LUNGE)/0.9f);
            c->roll += 0.30f*k*sinf(t*9.1f);
        }
        return;
    }

    /* -------------------------------------------------------- the velvet halls */
    if (t < T_STAIR){
        g_scene = SC_CHASE; g_corr_style = 1;
        c->running = 1; c->surface = 0; c->bob = 1.0f;
        float s = knot_s(RK, NRK, t);
        float sp = (knot_s(RK, NRK, t + 0.05f) - knot_s(RK, NRK, t - 0.05f))/0.10f;
        V3 pos = path_at(&pRun, s, 1.30f);
        V3 ahead = path_at(&pRun, s + 3.10f, 1.30f);
        c->pos = v3(pos.x, 1.545f, pos.z);
        c->speed = sp;
        lookat_yp(c->pos, v3(ahead.x, 1.480f, ahead.z), &c->yaw, &c->pitch);
        /* twice, they look back, and twice they should not have */
        for (int i = 0; i < 2; i++){
            float t0 = (i == 0) ? 226.5f : 240.5f;
            float w = glance_w(t, t0, t0 + 1.9f);
            if (w > 0.001f){
                V3 back = path_at(&pRun, s - 6.5f, 1.30f);
                float y2, p2;
                lookat_yp(c->pos, v3(back.x, 1.90f, back.z), &y2, &p2);
                c->yaw = angmix(c->yaw, y2, w*0.92f);
                c->pitch = mixf(c->pitch, p2, w*0.92f);
                c->roll += w*0.22f;
            }
        }
        /* and the lift lobby they go past at speed */
        glance(c, t, 231.0f, 232.4f, v3(pos.x + 2.2f, 1.60f, pos.z + 2.2f), 0.42f);
        return;
    }

    /* ----------------------------------------------------------- the stairwell */
    if (t < T_SERV){
        g_scene = SC_STAIR;
        c->running = 1; c->surface = 3; c->bob = 1.0f;
        float u = t - T_STAIR;
        float acc = ease(satf(u/1.7f));
        /* the eye rides the helix itself: angle first, height from the angle,
         * so it is always one and a half metres above the tread it is on */
        float pitchr = ST_RISE*ST_NS;
        float a = 1.15f - 1.545f*(u - (1.0f - acc)*0.85f);
        float rad = 2.55f + 0.09f*sinf(u*0.9f);
        float y = pitchr*(a/(2.0f*PI));
        c->pos = v3(cosf(a)*rad, y + 1.560f, sinf(a)*rad);
        c->speed = 3.8f*acc;
        /* looking down the four steps in front of them */
        float a2 = a - 0.86f;
        V3 look = v3(cosf(a2)*2.62f, pitchr*(a2/(2.0f*PI)) + 0.42f, sinf(a2)*2.62f);
        lookat_yp(c->pos, look, &c->yaw, &c->pitch);
        /* once, up the middle of it, at what is coming down after them */
        float w = glance_w(t, 258.5f, 260.6f);
        if (w > 0.001f){
            float y2, p2;
            float a3 = a + 1.75f;
            lookat_yp(c->pos, v3(cosf(a3)*2.55f, y + 4.20f, sinf(a3)*2.55f), &y2, &p2);
            c->yaw = angmix(c->yaw, y2, w*0.88f);
            c->pitch = mixf(c->pitch, p2, w*0.88f);
        }
        c->roll += 0.16f*sinf(u*1.7f);
        return;
    }

    /* -------------------------------------------------------- the service floor */
    if (t < T_VOID){
        g_scene = SC_CHASE; g_corr_style = 2;
        c->running = 1; c->surface = 4; c->bob = 1.0f;
        float s = knot_s(SK, NSK, t);
        float sp = (knot_s(SK, NSK, t + 0.05f) - knot_s(SK, NSK, t - 0.05f))/0.10f;
        V3 pos = path_at(&pServ, s, 1.10f);
        V3 ahead = path_at(&pServ, s + 3.20f, 1.10f);
        c->pos = v3(pos.x, 1.520f, pos.z);
        c->speed = sp;
        lookat_yp(c->pos, v3(ahead.x, 1.430f, ahead.z), &c->yaw, &c->pitch);
        /* the last few metres, when they see there is no floor left */
        if (t > T_VOID - 3.2f){
            float k = satf((t - (T_VOID - 3.2f))/3.2f);
            c->pitch -= k*0.58f;
            c->roll  += k*0.20f*sinf(t*7.3f);
        }
        return;
    }

    /* ----------------------------------------------------------- and no floor */
    g_scene = SC_VOID;
    c->pos = v3(0.0f, -6.0f*(t - T_VOID), 0.0f);
    c->bob = 0.0f;
    float u = (t - T_VOID)/(T_LAND - T_VOID);
    c->yaw   = 2.9f*u*u*4.0f;
    c->pitch = -0.9f + 3.4f*u*u;
    c->roll  = 5.5f*u*u;
}

/* --------------------------------------------------------- tape degradation */
static float glitch_level(float t)
{
    float g = 0.095f;
    float r = fbm_loop(t, 0.35f, 3.7f, 3);
    if (r > 0.66f) g += (r - 0.66f)*2.6f;
    float r2 = fh1((int)(t*1.7f));
    if (r2 > 0.955f) g += 0.55f;

    struct { float a, b, amp; } B[] = {
        {  13.0f,  17.0f, 0.42f },   /* the feed being driven into the ground */
        {  16.4f,  17.6f, 0.50f },
        {  19.1f,  20.3f, 0.88f },
        {  71.4f,  72.8f, 0.85f },   /* the cut into the atrium               */
        { 177.3f, 178.9f, 0.90f },   /* the cut into the ballroom, and silence */
        { 197.6f, 198.9f, 0.60f },
        { 202.4f, 203.1f, 0.62f },   /* the distortion, in hits               */
        { 206.9f, 207.7f, 0.72f },
        { 211.3f, 212.0f, 0.80f },
        { 215.0f, 215.6f, 0.72f },
        { 217.9f, 219.1f, 0.85f },   /* the snap                              */
        { 218.9f, 220.4f, 0.95f },   /* and the cut into the velvet halls     */
        { 247.4f, 249.0f, 0.85f },   /* the stairwell                         */
        { 271.4f, 273.0f, 0.85f },   /* the service floor                     */
        { 288.4f, 290.4f, 1.00f },   /* no floor                              */
        { 291.9f, 293.6f, 0.95f },   /* it lands                              */
    };
    for (unsigned i = 0; i < sizeof(B)/sizeof(B[0]); i++){
        if (t > B[i].a && t < B[i].b){
            float u = (t - B[i].a)/(B[i].b - B[i].a);
            g += B[i].amp * powf(sinf(satf(u)*PI), 0.45f);
        }
    }
    if (t > T_STARE && t < T_LUNGE + 1.5f) g += 0.20f;
    if (t > T_WARP && t < T_LUNGE) g += 0.16f;
    if (t > T_RUN && t < T_VOID) g += 0.17f + 0.14f*satf(fbm2(t*1.6f, 8.1f, 2)*2.0f - 0.9f);
    if (t >= T_VOID && t < T_LAND) g = 1.0f;
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
 * A tungsten filament behind cut glass, in haze, is mostly halo. The camera's
 * optics are cheap and its CCD blooms, and this is the single biggest thing
 * that sells the place as lit rather than painted. */
static void bloom_pass(float amount)
{
    const float thr = 0.66f;
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
                d[ch] = minf(maxf(v - thr, 0.0f)/(1.0f - thr), 2.2f);
            }
        }
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
            float k = 1.0f + 0.072f*r2 + 0.042f*r2*r2;
            /* space stops being the shape it was */
            if (st > 0.001f){
                k += st*(1.42f*r2 - 0.30f);
                dx *= 1.0f + st*0.32f*sinf(v*7.0f + t*1.3f);
                dy *= 1.0f - st*0.24f*sinf(u*5.0f - t*1.1f);
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

    /* --- the halo round every filament in the building --- */
    bloom_pass(0.40f + 0.26f*satf(g_invert));

    /* --- the colours turn over ---
     * A straight 1-c on a scene this dark gives a white frame with nothing in
     * it. The chroma goes first and goes all the way: every colour becomes its
     * opposite while the luma, and therefore the picture, survives. Only on the
     * hard hits does the whole thing go negative. */
    if (g_invert > 0.001f){
        float inv = g_invert;
        #pragma omp parallel for schedule(static)
        for (int y = 0; y < OH; y++)
            for (int x = 0; x < OW; x++){
                float *p = warp_buf + (y*OW+x)*3;
                float b = 0.5f + 0.5f*sinf((float)y*0.09f + t*3.1f);
                float wc = satf(inv*(0.82f + 0.28f*b));
                float wl = satf(inv*inv*(0.55f + 0.45f*b));
                float r = p[0], g = p[1], bl = p[2];
                float lum = 0.299f*r + 0.587f*g + 0.114f*bl;
                float nl  = mixf(lum, (1.02f - lum)*0.60f, wl);
                float dl  = nl - lum;
                p[0] = mixf(r,  2.0f*lum - r,  wc) + dl;
                p[1] = mixf(g,  2.0f*lum - g,  wc) + dl;
                p[2] = mixf(bl, 2.0f*lum - bl, wc) + dl;
            }
    }

    /* --- character generator: burned in before the tape ever saw it --- */
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
        /* the counter was zeroed at the head of this segment, so it wraps with
         * the tape and the last frame reads what the first one reads */
        int tot = (int)fmodf(t, DUR);
        char ctr[24];
        snprintf(ctr, sizeof ctr, "0:%02d:%02d", tot/60, tot%60);
        draw_text(warp_buf, OW-150, OH-58, ctr, white, 0.90f, 2);
        draw_text(warp_buf, OW-152, OH-34, "NOV 12 1987", white, 0.90f, 2);
        if (gl > 0.55f && (frame & 4))
            draw_text(warp_buf, 40, OH-34, "TRACKING", white, 0.85f, 2);
    }

    /* --- the tape: head tracking, colour-under, noise, scanlines ---
     * Head jitter is *correlated* down the field. White noise per line combs
     * the picture into confetti; a smooth wave with a little grit on top looks
     * like a tape. */
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
            yv += n*(0.030f + 0.080f*dark + 0.13f*gl*gl) + n2*(0.012f + 0.05f*gl);
            iv += (fh3(x/7, y, frame*23+1) - 0.5f)*(0.030f + 0.13f*gl + 0.22f*g_chroma);
            qv += (fh3(x/7, y+91, frame*29+7) - 0.5f)*(0.030f + 0.13f*gl + 0.22f*g_chroma);
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

            /* head switching noise, along the bottom edge */
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
    float ghost = 0.125f + 0.16f*gl;
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < OH; y++){
        for (int x = 0; x < OW; x++){
            float *s = warp_buf + (y*OW+x)*3;
            const unsigned char *pv = fb_buf + (y*OW+x)*3;
            float u = (x+0.5f)/OW - 0.5f, v = (y+0.5f)/OH - 0.5f;
            float r2 = u*u + v*v;
            float vig = 1.0f - 0.50f*r2 - 0.30f*r2*r2;
            for (int ch = 0; ch < 3; ch++){
                float c = s[ch];
                c = mixf(c, pv[ch]/255.0f, ghost);
                c *= vig;
                c = 0.040f + c*0.960f;
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
    int f0 = 0, f1 = NFRAMES, foff = 0, warm = WARMUP, dump = 0, matmode = 0;
    const char *evpath = "events.txt";
    for (int i = 1; i < argc; i++){
        if (!strcmp(argv[i], "-dump")) dump = 1;
        else if (!strcmp(argv[i], "-mat")) matmode = 1;
        else if (!strcmp(argv[i], "-r") && i+2 < argc){ f0 = atoi(argv[i+1]); f1 = atoi(argv[i+2]); i += 2; }
        else if (!strcmp(argv[i], "-o") && i+1 < argc){ foff = atoi(argv[i+1]); i++; }
        else if (!strcmp(argv[i], "-w") && i+1 < argc){ warm = atoi(argv[i+1]); i++; }
        else if (!strcmp(argv[i], "-e") && i+1 < argc){ evpath = argv[i+1]; i++; }
    }
    (void)f0;

    build_hotel();

    /* the guest floor: down a hallway, across, down, across. Every junction is
     * the junction they just left. */
    static const float corr_c[] = {
        2, 2.6f,  2, 14,  14, 14,  14, 20,  20, 20,  20, 26,  26, 26
    };
    /* the promenade, walked from the far end back toward the escalator */
    static const float mall_c[] = {
        34, -2.0f,  28, 3.6f,  22, -1.4f,  17, -4.0f,  13.2f, -7.4f,
        9.5f, -4.6f,  4, 5.2f,  -1, -1.0f,  -5.4f, -4.6f,  -10, -1.4f,
        -16, 2.8f,  -22, 6.6f,  -27, 6.2f,  -29.6f, 4.3f,  -27.2f, 4.3f
    };
    static const float run_c[] = {
        20, 26,  20, 38,  32, 38,  32, 44,  38, 44,  38, 56,  44, 56,  44, 44,
        50, 44,  50, 32
    };
    static const float serv_c[] = {
        26, 8,  26, 26,  38, 26,  38, 32
    };
    path_build_cells(&pCorr, corr_c, sizeof(corr_c)/8);
    path_build(&pMall, mall_c, sizeof(mall_c)/8);
    path_build_cells(&pRun, run_c, sizeof(run_c)/8);
    path_build_cells(&pServ, serv_c, sizeof(serv_c)/8);

    lookat_yp(REST_POS, REST_AIM, &rest_yaw, &rest_pitch);

    g_feedback = fb_buf;
    memset(fb_buf, 0, sizeof(fb_buf));
    /* -dump replays the whole camera path without rendering, which is also the
     * cheapest way to produce the sidecar the sound pass needs */
    evf = fopen(evpath, "w");

    float gait = 0.0f;
    int   last_step = 0;
    double t_start = omp_get_wtime();

    for (int f = -warm; f < f1; f++){
        float t = (f < 0) ? foff/FPS : (f + foff)/FPS;
        g_time = (f < 0) ? (f + foff)/FPS : t;

        /* ---- the state of the building at this instant ---- */
        g_crt_gain  = 1.0f + 0.035f*sinf(w_loop(7.3f)*t) + 0.02f*fbm_loop(t, 3.1f, 2.0f, 2);
        g_lamp_gain = 1.0f;
        g_lightgain = 1.0f;
        g_expo = 1.0f;
        g_warp = 0.0f; g_slide = 0.0f; g_swing = 0.0f;
        g_invert = 0.0f; g_stretch = 0.0f; g_chroma = 0.0f;
        g_void_mix = 0.0f; g_glassfall = 0.0f;
        g_piano_t = t; g_esc_t = t;

        /* the operator playing with the zoom, and the feed losing the picture */
        if (t < 21.0f){
            float z = smoothstepf(13.1f, 17.4f, t);
            g_feed_break = z*z;
            if (t > 18.4f) g_feed_break *= 1.0f - smoothstepf(18.4f, 20.4f, t)*0.86f;
        } else if (t > 292.0f){
            g_feed_break = 0.50f*(1.0f - smoothstepf(294.0f, 297.5f, t));
        } else {
            g_feed_break = 0.0f;
        }

        /* the music stops, and the building notices before anybody else does */
        if (t > T_SILENT - 0.8f && t < T_WARP){
            g_lamp_gain = 0.78f + 0.09f*sinf(t*2.1f) + 0.05f*sinf(t*13.0f);
            g_lightgain = 0.90f;
        }
        /* and then nothing behaves */
        if (t >= T_WARP && t < T_LUNGE + 1.4f){
            float u = satf((t - T_WARP)/(T_LUNGE - T_WARP));
            float k = maxf(u*u, (t >= T_LUNGE) ? 1.0f : 0.0f);
            g_warp    = 0.80f*k;
            g_slide   = 1.00f*satf(k*1.25f);
            g_swing   = satf(k*1.30f);
            g_invert  = 0.70f*satf(k*1.15f - 0.10f);
            g_stretch = 0.82f*k;
            g_chroma  = 0.26f*k;
            const float FL[5] = { 202.55f, 207.05f, 211.42f, 215.06f, 218.32f };
            for (int fi = 0; fi < 5; fi++)
                if (t > FL[fi] && t < FL[fi] + 0.27f) g_invert = 0.97f;
            g_lamp_gain = (0.78f + 0.85f*k) * (1.0f + 0.32f*k*sinf(t*23.0f));
            g_lightgain = 0.90f + 0.85f*k;
            g_expo = 1.0f + 0.50f*k;
            if ((t > 207.4f && t < 207.62f) || (t > 214.1f && t < 214.34f)){
                g_lamp_gain *= 0.05f; g_lightgain = 0.10f;
            }
        }
        /* the distortion does not switch off when they run, it drains */
        if (t >= T_RUN && t < T_RUN + 9.0f){
            float k = 1.0f - smoothstepf(T_RUN, T_RUN + 9.0f, t);
            g_warp = 0.26f*k; g_invert = 0.42f*k; g_stretch = 0.32f*k; g_chroma = 0.18f*k;
            g_swing = 0.75f*k; g_slide = 0.45f*k;
        }
        /* the chandeliers keep swinging for the rest of the run */
        if (t >= T_RUN && t < T_STAIR) g_swing = maxf(g_swing, 0.55f);
        /* and they start letting go of their drops */
        if (t >= T_RUN && t < T_STAIR)
            g_glassfall = smoothstepf(T_RUN, T_RUN + 4.0f, t);
        /* the last of it: the carpet stops being loaded */
        if (t > 283.0f && t < T_VOID) g_void_mix = smoothstepf(283.0f, T_VOID, t)*0.96f;
        if (t >= T_VOID) g_void_mix = 1.0f;

        figure_script(t);

        Cam c;
        shot_camera(t, &c);

        /* the air, per room */
        g_fog_up = 0;
        switch (g_scene){
            case SC_MALL:
                g_fog_col = v3(0.1620f, 0.1520f, 0.1380f);
                g_fog_dens = 0.0330f; g_fog_y0 = 4.5f; g_fog_hs = 6.0f; g_fog_up = 1;
                break;
            case SC_LOBBY:
                g_fog_col = v3(0.0400f, 0.0335f, 0.0330f);
                g_fog_dens = 0.0170f; g_fog_y0 = 99.0f; break;
            case SC_BALL:
                g_fog_col = v3(0.0430f, 0.0330f, 0.0345f);
                g_fog_dens = 0.0195f; g_fog_y0 = 99.0f; break;
            case SC_STAIR:
                g_fog_col = v3(0.0370f, 0.0330f, 0.0310f);
                g_fog_dens = 0.0330f; g_fog_y0 = 99.0f; break;
            default:
                g_fog_col = (g_corr_style == 2) ? v3(0.0345f, 0.0355f, 0.0350f)
                          : (g_corr_style == 1) ? v3(0.0450f, 0.0300f, 0.0325f)
                                                : v3(0.0425f, 0.0360f, 0.0330f);
                g_fog_dens = (g_corr_style == 2) ? 0.0300f : 0.0245f;
                g_fog_y0 = 99.0f; break;
        }
        if (g_warp > 0.001f)
            g_fog_col = mix3(g_fog_col, v3(0.072f, 0.028f, 0.062f), g_warp*0.60f);

        /* gait: bob, sway, roll into the sway, and the footfalls the sound pass
         * will hang itself on, so feet land on the frames the camera bobs on */
        if (f >= 0 && c.speed > 0.02f){
            float stride = c.running ? (1.42f + 0.06f*c.speed) : (0.74f + 0.05f*c.speed);
            gait += (c.speed/stride)/FPS;
            int s = (int)floorf(gait);
            if (s != last_step){
                last_step = s;
                if (evf) fprintf(evf, "STEP %.4f %d %d\n", t, c.surface, c.running);
            }
        }
        float bobv = c.bob * (c.running ? 0.052f : 0.018f);
        float bobl = c.bob * (c.running ? 0.066f : 0.025f);
        c.pos.y += bobv * cosf(gait*2.0f*PI);
        {
            V3 rightv = v3(cosf(c.yaw), 0, -sinf(c.yaw));
            float sway = bobl * sinf(gait*PI);
            c.pos = add(c.pos, scl(rightv, sway));
            c.roll += (c.running ? 0.072f : 0.019f) * c.bob * sinf(gait*PI);
            c.pitch += (c.running ? 0.028f : 0.006f) * c.bob * cosf(gait*2.0f*PI + 0.8f);
        }
        handheld(&c, t);

        /* never let them end up inside the building */
        if (g_scene != SC_VOID){
            for (int it = 0; it < 4; it++){
                float d = map_collide(c.pos);
                if (d > 0.34f) break;
                V3 p = c.pos;
                const float e = 0.02f;
                V3 g = v3(map_collide(v3(p.x+e,p.y,p.z)) - map_collide(v3(p.x-e,p.y,p.z)),
                          0.0f,
                          map_collide(v3(p.x,p.y,p.z+e)) - map_collide(v3(p.x,p.y,p.z-e)));
                float gl2 = len3(g);
                if (gl2 < 1e-5f) break;
                c.pos = add(c.pos, scl(scl(g, 1.0f/gl2), (0.34f - d) + 0.01f));
            }
        }

        if (dump){
            printf("%7.3f  sc=%d  pos %8.3f %6.3f %8.3f  clear %6.3f\n",
                   t, g_scene, c.pos.x, c.pos.y, c.pos.z, map_collide(c.pos));
            continue;
        }

        /* ---- the lamps this frame, once, for the haze ---- */
        g_cam_nlamps = gather_lamps(c.pos, g_cam_lamps, 26);
        for (int i = 0; i < g_cam_nlamps; i++)
            g_cam_lamps[i].pos = sub(g_cam_lamps[i].pos, c.pos);

        /* ---- the frame ---- */
        V3 fwd = v3(sinf(c.yaw)*cosf(c.pitch), sinf(c.pitch), cosf(c.yaw)*cosf(c.pitch));
        V3 r0 = norm3(cross3(v3(0,1,0), fwd));
        V3 u0 = cross3(fwd, r0);
        float cr = cosf(c.roll), sr = sinf(c.roll);
        V3 rv = add(scl(r0, cr), scl(u0, sr));
        V3 uv = sub(scl(u0, cr), scl(r0, sr));
        float th = tanf(c.fov*0.5f);
        float aspect = (float)RW/(float)RH;

        #pragma omp parallel for schedule(dynamic, 4)
        for (int y = 0; y < RH; y++){
            for (int x = 0; x < RW; x++){
                float px = ((x + 0.5f)/RW*2.0f - 1.0f)*th*aspect;
                float py = (1.0f - (y + 0.5f)/RH*2.0f)*th;
                V3 rd = norm3(add(fwd, add(scl(rv, px), scl(uv, py))));
                float hd;
                float *o = scene_buf + (y*RW + x)*3;
                if (matmode){
                    /* -mat: what material is at each pixel, straight out, so a
                     * surface misbehaving can be named instead of guessed at */
                    float t2 = 0.0202f; int mat = M_NONE, hitm = 0;
                    for (int k = 0; k < 220; k++){
                        V3 pp = add(c.pos, scl(rd, t2));
                        float dd = map_scene(pp, &mat);
                        if (dd < 0.0011f*t2 + 0.0011f){ hitm = 1; break; }
                        t2 += dd*0.92f;
                        if (t2 > 130.0f) break;
                    }
                    float v = hitm ? (float)mat/255.0f : 0.0f;
                    o[0] = o[1] = o[2] = v;
                    continue;
                }
                V3 col = trace(c.pos, rd, &hd, 0);
                o[0] = col.x; o[1] = col.y; o[2] = col.z;
            }
        }

        if (matmode){
            for (int y = 0; y < OH; y++) for (int x = 0; x < OW; x++){
                int sx = x*RW/OW, sy = y*RH/OH;
                unsigned char v = (unsigned char)(scene_buf[(sy*RW+sx)*3]*255.0f + 0.5f);
                out_buf[(y*OW+x)*3] = out_buf[(y*OW+x)*3+1] = out_buf[(y*OW+x)*3+2] = v;
            }
        } else vhs_process(t);
        memcpy(fb_buf, out_buf, sizeof(fb_buf));
        if (f >= 0){
            fwrite(out_buf, 1, sizeof(out_buf), stdout);
            if ((f % 120) == 0){
                double el = omp_get_wtime() - t_start;
                fprintf(stderr, "\r frame %5d/%d  %5.1f s  %.2f fps   ",
                        f, f1, el, (f + warm + 1)/maxf((float)el, 1e-3f));
                fflush(stderr);
            }
        }
    }
    if (evf) fclose(evf);
    fprintf(stderr, "\n");
    return 0;
}
