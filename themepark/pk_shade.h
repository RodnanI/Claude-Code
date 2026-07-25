/* pk_shade.h -- materials, the neon, the monitor in the counter, and the
 * raymarcher.
 *
 * Three things here matter more than the rest:
 *
 *  - The feedback tap. The monitor in the ticket booth counter is showing the
 *    camcorder's own last finished frame, screened over a loop of an empty
 *    ferris wheel. Point the lens at it and the recursion is real: every
 *    generation picks up another set of scanlines, another pass of grain and
 *    another notch of contrast, until it comes apart on its own.
 *
 *  - Noise level of detail. Procedural noise has no mip chain, so any octave
 *    finer than a pixel turns into moire. Each octave fades to its mean once
 *    it stops being resolvable.
 *
 *  - The fog has a top. The sky over this park is black and has no stars, but
 *    the haze on the ground is lit by the neon, so silhouettes read against
 *    it. Density falls off with height, which is what separates the two.
 */
#ifndef PK_SHADE_H
#define PK_SHADE_H

#include "pk_core.h"

#define RW 480
#define RH 360
#define OW 640
#define OH 480

static unsigned char *g_feedback;   /* the last frame that went to tape */

/* fog, per scene, set once a frame */
static V3    g_fog_col  = { 0.052f, 0.056f, 0.070f };
static float g_fog_dens = 0.030f;
static float g_fog_y0   = 1.8f;
static float g_fog_hs   = 5.2f;
static float g_lightgain = 1.0f;
static float g_expo      = 1.0f;   /* the iris cannot keep up either */

/* ------------------------------------------------------------- feedback tap */
static V3 fb_bilinear(float u, float v){
    if (!g_feedback) return v3(0,0,0);
    float x = u * (OW-1), y = v * (OH-1);
    int x0 = (int)floorf(x), y0 = (int)floorf(y);
    int x1 = x0+1, y1 = y0+1;
    float fx = x-x0, fy = y-y0;
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
    if (x1 > OW-1) x1 = OW-1; if (y1 > OH-1) y1 = OH-1;
    if (x0 > OW-1) x0 = OW-1; if (y0 > OH-1) y0 = OH-1;
    const unsigned char *f = g_feedback;
    V3 c00 = v3(f[(y0*OW+x0)*3]/255.0f, f[(y0*OW+x0)*3+1]/255.0f, f[(y0*OW+x0)*3+2]/255.0f);
    V3 c10 = v3(f[(y0*OW+x1)*3]/255.0f, f[(y0*OW+x1)*3+1]/255.0f, f[(y0*OW+x1)*3+2]/255.0f);
    V3 c01 = v3(f[(y1*OW+x0)*3]/255.0f, f[(y1*OW+x0)*3+1]/255.0f, f[(y1*OW+x0)*3+2]/255.0f);
    V3 c11 = v3(f[(y1*OW+x1)*3]/255.0f, f[(y1*OW+x1)*3+1]/255.0f, f[(y1*OW+x1)*3+2]/255.0f);
    return mix3(mix3(c00,c10,fx), mix3(c01,c11,fx), fy);
}

/* ------------------------------------------- what the tape in the booth says
 * An empty ferris wheel, turning, shot on something worse than this camera and
 * copied too many times. Nine and a bit seconds long, then it starts again. */
static V3 ferris_video(float u, float v, float t)
{
    float loop = 9.30f;
    float lt = fmodf(t, loop);
    float x = (u - 0.5f)*1.3333f;
    float y = 0.5f - v;
    /* the tape in the booth has its own weave */
    x += 0.004f*sinf(lt*2.1f + y*9.0f);

    float aa = 0.0045f;
    float ink = 0.0f;                       /* how much of the wheel is here */
    float R = 0.300f;
    float cy = -0.035f;                     /* the hub sits above centre */
    float px = x, py = y - cy;
    float rr = len2f(px, py);

    /* two rims */
    ink = maxf(ink, 1.0f - smoothstepf(0.0f, aa, fabsf(rr - R) - 0.0075f));
    ink = maxf(ink, 1.0f - smoothstepf(0.0f, aa, fabsf(rr - R*0.945f) - 0.0045f));
    /* spokes, folded into sixteen */
    {
        float ang = atan2f(py, px) - lt*0.126f;         /* it is still turning */
        float sect = 2.0f*PI/16.0f;
        float fa = ang - sect*floorf(ang/sect + 0.5f);
        float sy = rr*sinf(fa);
        float sx = rr*cosf(fa);
        float sp = sdBox2(sx - R*0.5f, sy, R*0.5f, 0.0028f);
        if (sx > 0.0f) ink = maxf(ink, 1.0f - smoothstepf(0.0f, aa, sp));
    }
    /* the hub */
    ink = maxf(ink, 1.0f - smoothstepf(0.0f, aa, rr - 0.022f));
    /* empty cars round the rim */
    {
        float ang = atan2f(py, px) - lt*0.126f;
        float sect = 2.0f*PI/14.0f;
        float k = floorf(ang/sect + 0.5f);
        float a2 = k*sect + lt*0.126f;
        float gx = px - cosf(a2)*R, gy = py - sinf(a2)*R;
        float car = sdBox2(gx, gy + 0.030f, 0.0165f, 0.0125f);
        ink = maxf(ink, 1.0f - smoothstepf(0.0f, aa, car));
        float yoke = sdBox2(gx, gy + 0.014f, 0.0022f, 0.016f);
        ink = maxf(ink, 1.0f - smoothstepf(0.0f, aa, yoke));
    }
    /* the A frames and the ground it stands on */
    {
        float l1 = sdBox2((px - py*0.30f) + 0.075f, py + 0.20f, 0.0055f, 0.24f);
        float l2 = sdBox2((px + py*0.30f) - 0.075f, py + 0.20f, 0.0055f, 0.24f);
        ink = maxf(ink, 1.0f - smoothstepf(0.0f, aa, minf(l1, l2)));
        float gnd = fabsf(y + 0.40f) - 0.0035f;
        ink = maxf(ink, (1.0f - smoothstepf(0.0f, aa*2.0f, gnd))*0.55f);
    }

    /* the picture: a dead sky, a lit-up structure, nothing else in the park */
    V3 sky = v3(0.035f, 0.042f, 0.062f);
    sky = scl(sky, 1.0f + 0.55f*(0.5f - v));
    V3 lamp = v3(0.92f, 0.86f, 0.62f);
    V3 c = mix3(sky, lamp, ink*0.92f);
    /* a wash of light off the structure into the haze around it */
    c = add(c, scl(v3(0.16f, 0.14f, 0.10f), expf(-fabsf(rr - R)*7.0f)*0.55f));

    /* it is a tape of a tape */
    float sl = 0.5f + 0.5f*cosf(v*260.0f*PI);
    c = scl(c, 0.86f + 0.22f*sl);
    float n = fh3((int)(u*420.0f), (int)(v*320.0f), (int)(t*54.0f));
    c = add(c, scl(v3(1,1,1), (n - 0.5f)*0.085f));
    /* the splice, every time round */
    float sp = lt/loop;
    if (sp > 0.982f){
        float k = (sp - 0.982f)/0.018f;
        c = scl(c, 1.0f - 0.85f*k);
        c = add(c, scl(v3(1,1,1), 0.30f*fh3((int)(u*200.0f), (int)(v*200.0f), (int)(t*90.0f))*k));
    }
    float bar = fractf(v - lt*0.23f);
    c = scl(c, 1.0f + 0.10f*expf(-bar*bar*120.0f));
    return c;
}

/* The tube in the counter. */
static V3 crt_image(float u, float v, float t)
{
    float dx = u-0.5f, dy = v-0.5f;
    float r2 = dx*dx + dy*dy;
    float k = 1.0f - 0.15f*r2;
    float su = 0.5f + dx*k, sv = 0.5f + dy*k;
    if (su < 0.004f || su > 0.996f || sv < 0.004f || sv > 0.996f)
        return v3(0.010f, 0.010f, 0.014f);

    V3 base = ferris_video(su, sv, t);
    V3 fb   = fb_bilinear(su, sv);

    /* screen the camera's own picture over the tape: both stay legible, and
     * the nesting is genuine -- it is last frame, not a trick */
    float fbg = 0.94f + 0.28f*g_feed_break;
    V3 c;
    c.x = 1.0f - (1.0f - satf(base.x*0.66f))*(1.0f - satf(fb.x*fbg));
    c.y = 1.0f - (1.0f - satf(base.y*0.66f))*(1.0f - satf(fb.y*fbg));
    c.z = 1.0f - (1.0f - satf(base.z*0.66f))*(1.0f - satf(fb.z*fbg));

    /* per-generation degradation */
    c = scl(c, 1.05f * g_crt_gain);
    c.x = c.x*1.07f - 0.019f;
    c.y = c.y*1.05f - 0.017f;
    c.z = c.z*1.02f - 0.013f;

    float line = 0.5f + 0.5f*cosf(sv * OH * 1.15f * PI);
    c = scl(c, 0.80f + 0.28f*line);
    float grille = 0.5f + 0.5f*cosf(su * OW * 0.9f * PI);
    c = mul(c, v3(1.0f + 0.07f*grille, 1.0f - 0.03f*grille, 1.0f + 0.05f*grille));

    float n = fh3((int)(su*900.0f), (int)(sv*700.0f), (int)(t*60.0f));
    c = add(c, scl(v3(1,1,1.06f), (n-0.5f)*0.075f));

    float bar = fractf(sv - t*0.11f);
    c = scl(c, 1.0f + 0.16f*expf(-bar*bar*160.0f));

    /* Overdriven, the loop stops being a picture. The chroma goes first: the
     * colour-under carrier loses lock and the tube paints hue instead. */
    if (g_feed_break > 0.001f){
        float b = g_feed_break;
        float hn = fh3((int)(su*260.0f), (int)(sv*200.0f) - (int)(t*23.0f), (int)(t*30.0f));
        float hn2 = fh3((int)(su*60.0f), (int)(sv*420.0f), (int)(t*47.0f));
        float ph = hn*6.28f + sv*22.0f + t*3.1f;
        V3 rain = v3(0.5f + 0.5f*cosf(ph),
                     0.5f + 0.5f*cosf(ph + 2.094f),
                     0.5f + 0.5f*cosf(ph + 4.189f));
        float amt = b*b*(0.62f + 0.38f*hn2);
        c = scl(c, 1.0f - 0.66f*b);
        c = mix3(c, scl(rain, 1.02f), satf(amt));
        /* torn dark bands walking through it, and it tears sideways */
        float bnd = fh3((int)(sv*120.0f), (int)(t*38.0f), 3);
        if (bnd < 0.26f) c = scl(c, 1.0f - 0.62f*b);
        c = scl(c, 1.0f + 0.55f*b*(hn2 - 0.42f));
    }

    c = scl(c, 1.0f - 0.50f*r2);
    c.x = maxf(c.x, 0.0f); c.y = maxf(c.y, 0.0f); c.z = maxf(c.z, 0.0f);
    return c;
}

/* --------------------------------------------------------------------- neon */
static const V3 NEON_PAL[6] = {
    { 1.00f, 0.24f, 0.62f },   /* magenta  */
    { 0.28f, 0.92f, 1.00f },   /* cyan     */
    { 1.00f, 0.66f, 0.16f },   /* amber    */
    { 1.00f, 0.22f, 0.16f },   /* red      */
    { 0.40f, 1.00f, 0.42f },   /* green    */
    { 1.00f, 0.92f, 0.72f },   /* white-ish*/
};
static inline V3 neon_col(int qx, int qz, int s){
    return NEON_PAL[ih2(qx*13+s, qz*7+1, 6)];
}
/* Tubes are gas and iron. They ripple at twice the mains, some of them stutter,
 * and one in eight is on its way out. */
static float neon_flicker(int qx, int qz, float t)
{
    float seed = fh2(qx*31+7, qz*17+3);
    float f = 0.90f + 0.10f*sinf(t*120.0f*PI + seed*6.28f);
    if (seed > 0.885f){
        float s = noise2(t*6.0f + seed*40.0f, seed*13.0f);
        f *= (s > 0.44f) ? 1.0f : 0.10f;
        f *= 0.70f + 0.30f*noise2(t*29.0f, seed*7.0f);
    } else if (seed > 0.70f){
        f *= 0.84f + 0.18f*noise2(t*3.5f + seed*20.0f, 1.7f);
    }
    /* the starter in a couple of them never did settle */
    if (seed > 0.62f && seed < 0.70f)
        f *= (sinf(t*47.0f + seed*20.0f) > -0.3f) ? 1.0f : 0.55f;
    return f * g_neon_gain;
}

typedef struct { V3 pos, col; float k; } Lamp;

/* the sign on face s of block (qx,qz), in world space */
static inline V3 sign_pos(int qx, int qz, int s){
    float wx = CW((float)qx), wz = CW((float)qz);
    float o = CELL*0.5f + 0.30f;
    if (s == 0) return v3(wx + o, 3.62f, wz);
    if (s == 1) return v3(wx - o, 3.62f, wz);
    if (s == 2) return v3(wx, 3.62f, wz + o);
    return v3(wx, 3.62f, wz - o);
}

static int gather_lamps(V3 p, Lamp *out, int maxn)
{
    int n = 0;
    float t = g_time;
    if (g_scene == SC_BOOTH || g_scene == SC_MIDWAY || g_scene == SC_PLAZA){
        int cx = WC(p.x), cz = WC(p.z);
        /* every neon sign within a couple of blocks */
        for (int dz = -2; dz <= 2 && n < maxn; dz++)
            for (int dx = -2; dx <= 2 && n < maxn; dx++){
                int qx = cx+dx, qz = cz+dz;
                if (!solidg(&GM, qx, qz)) continue;
                for (int s = 0; s < 4 && n < maxn; s++){
                    int nx = qx + ((s==0)-(s==1)), nz = qz + ((s==2)-(s==3));
                    if (solidg(&GM, nx, nz)) continue;
                    V3 sp = sign_pos(qx, qz, s);
                    V3 d = sub(sp, p);
                    if (dot(d,d) > 400.0f) continue;
                    Lamp L; L.pos = sp;
                    L.col = scl(neon_col(qx, qz, s), 1.35f*neon_flicker(qx*3+s, qz, t));
                    L.k = 0.075f; out[n++] = L;
                }
            }
        /* the sodium globes at the crossings */
        {
            float px = CW(1.0f) + LAMP_OX, pz = CW(1.0f) + LAMP_OX;
            float bx = floorf((p.x - px)/21.0f + 0.5f);
            float bz = floorf((p.z - pz)/24.0f + 0.5f);
            for (int j = -1; j <= 1 && n < maxn; j++)
                for (int i = -1; i <= 1 && n < maxn; i++){
                    V3 lp = v3(px + (bx+i)*21.0f, 4.46f, pz + (bz+j)*24.0f);
                    V3 d = sub(lp, p);
                    if (dot(d,d) > 900.0f) continue;
                    Lamp L; L.pos = lp;
                    L.col = scl(v3(1.00f, 0.72f, 0.36f),
                                4.10f*neon_flicker((int)(bx+i)*97+5, (int)(bz+j)*61+3, t));
                    L.k = 0.026f; out[n++] = L;
                }
        }
        /* the ticket booth's own sign, and the tube in its counter */
        if (n < maxn){
            V3 sp = add(P_BOOTH, v3(0.0f, 3.86f, -1.6f));
            sp.z = P_BOOTH.z + 1.6f;
            if (len3(sub(sp, p)) < 24.0f){
                Lamp L; L.pos = sp;
                L.col = scl(v3(1.00f, 0.42f, 0.30f), 1.90f*neon_flicker(701, 3, t));
                L.k = 0.055f; out[n++] = L;
            }
        }
        if (n < maxn && len3(sub(P_CRT, p)) < 4.5f){
            Lamp L; L.pos = add(P_CRT, v3(0.0f, 0.03f, 0.10f));
            L.col = scl(v3(0.55f, 0.68f, 1.00f), 0.42f*g_crt_gain);
            L.k = 0.20f; out[n++] = L;
        }
        /* the two floodlight masts on the plaza */
        for (int i = 0; i < 2 && n < maxn; i++){
            V3 lp = add(i ? P_FLOOD2 : P_FLOOD1, v3(0.0f, 9.20f, 0.35f));
            V3 d = sub(lp, p);
            if (dot(d,d) > 2400.0f) continue;
            Lamp L; L.pos = lp;
            L.col = scl(v3(1.00f, 0.94f, 0.82f), 3.05f*neon_flicker(881+i*13, 17, t));
            L.k = 0.0165f; out[n++] = L;
        }
        /* two fittings still alive under the arena canopy */
        if (g_scene == SC_PLAZA)
            for (int s = 0; s < 2 && n < maxn; s++){
                V3 lp = add(P_ARENA, v3(s ? 3.6f : -3.6f, 4.20f, 0.0f));
                if (len3(sub(lp, p)) > 34.0f) continue;
                Lamp L; L.pos = lp;
                L.col = scl(v3(0.86f, 0.92f, 1.00f), 1.70f*neon_flicker(311+s, 7, t));
                L.k = 0.050f; out[n++] = L;
            }
    } else if (g_scene == SC_FUN){
        int cx = WC(p.x), cz = WC(p.z);
        for (int dz = -2; dz <= 2 && n < maxn; dz++)
            for (int dx = -2; dx <= 2 && n < maxn; dx++){
                int qx = cx+dx, qz = cz+dz;
                if (solidg(&GF, qx, qz)) continue;
                if (((qx*5 + qz*11) % 2) != 0) continue;
                Lamp L; L.pos = v3(CW((float)qx), FUN_H - 0.18f, CW((float)qz));
                V3 c = NEON_PAL[ih2(qx, qz, 6)];
                L.col = scl(c, 3.10f*neon_flicker(qx+201, qz+57, t));
                L.k = 0.062f; out[n++] = L;
            }
    } else if (g_scene == SC_MIRROR){
        int cx = WC(p.x), cz = WC(p.z);
        for (int dz = -2; dz <= 2 && n < maxn; dz++)
            for (int dx = -2; dx <= 2 && n < maxn; dx++){
                int qx = cx+dx, qz = cz+dz;
                if (((qx*3 + qz*5) % 3) != 0) continue;
                Lamp L; L.pos = v3(CW((float)qx), MZ_H - 0.12f, CW((float)qz));
                V3 c = mix3(v3(1.0f,0.85f,0.55f), NEON_PAL[ih2(qx,qz,6)], 0.35f);
                L.col = scl(c, 2.35f*neon_flicker(qx+401, qz+97, t));
                L.k = 0.085f; out[n++] = L;
            }
    }
    return n;
}

/* lamps as seen from the camera -- filled once a frame, used for the haze */
static Lamp  g_cam_lamps[24];
static int   g_cam_nlamps = 0;

/* -------------------------------------------------------------- surface look */
static float g_shade_dist = 0.0f;

static inline float lod_w(float f){
    float px = g_shade_dist*0.0035f + 1e-4f;
    float a = f*px*0.55f;
    return 1.0f/(1.0f + a*a*a);
}
static float noise3_lod(V3 p, float f){
    float w = lod_w(f);
    if (w < 0.004f) return 0.5f;
    return mixf(0.5f, noise3(scl(p, f)), w);
}
static float fbm3_lod(V3 p, int oct, float f0){
    float a = 0.5f, s = 0.0f, f = f0;
    for (int i = 0; i < oct; i++){ s += a*noise3_lod(p, f); f *= 2.03f; a *= 0.5f; }
    return s;
}
static float fbm2_lod(float x, float y, int oct, float f0){
    return fbm3_lod(v3(x, y, 3.3f), oct, f0);
}
/* a stripe that stops being a stripe when it is finer than a pixel */
static float stripe_lod(float x, float per, float duty){
    float w = lod_w(1.0f/per);
    float s = fractf(x/per) < duty ? 1.0f : 0.0f;
    return mixf(duty, s, w);
}

/* text fitted into a sign panel, centred, aspect preserved */
static float text_fit(const char *s, float x, float y, float halfw, float halfh, int *cout)
{
    int L = (int)strlen(s);
    if (L <= 0) return 0.0f;
    float A = (6.0f*L - 1.0f)/7.0f;
    float w, h;
    if (A > halfw/halfh){ w = halfw*0.94f; h = w/A; }
    else                { h = halfh*0.88f; w = h*A; }
    float u = (x + w)/(2.0f*w), v = (h - y)/(2.0f*h);
    if (cout){
        float W = 6.0f*L - 1.0f;
        int ci = (int)(satf(u)*W/6.0f);
        *cout = ci < 0 ? 0 : (ci >= L ? L-1 : ci);
    }
    if (u < 0.0f || u > 1.0f || v < 0.0f || v > 1.0f) return 0.0f;
    return text_mask(s, u, v);
}

/* which block, which face, and where on it -- for the neon on the midway */
static void sign_local(V3 p, V3 n, int *qx, int *qz, int *face, float *lx, float *ly)
{
    V3 b = sub(p, scl(n, 0.45f));
    int cx = WC(b.x), cz = WC(b.z);
    int s;
    if (fabsf(n.x) > fabsf(n.z)) s = n.x > 0.0f ? 0 : 1;
    else                        s = n.z > 0.0f ? 2 : 3;
    V3 q = sub(p, v3(CW((float)cx), 0.0f, CW((float)cz)));
    float L;
    if (s == 0) L = -q.z;
    else if (s == 1) L =  q.z;
    else if (s == 2) L =  q.x;
    else L = -q.x;
    *qx = cx; *qz = cz; *face = s; *lx = L; *ly = q.y;
}

static V3 mat_albedo(int mat, V3 p, V3 n, float *spec, float *emis)
{
    *spec = 0.0f; *emis = 0.0f;
    float hf = expf(-g_shade_dist*0.045f);
    switch (mat){

    case M_ASPHALT: {
        /* laid badly, patched worse, and sticky */
        float agg  = noise3_lod(p, 190.0f)*0.30f + noise3_lod(p, 62.0f)*0.24f;
        float patch= smoothstepf(0.46f, 0.62f, fbm2_lod(p.x*0.30f, p.z*0.30f, 4, 1.0f));
        V3 c = v3(0.112f, 0.110f, 0.116f);
        c = scl(c, 0.66f + 0.62f*agg);
        c = mix3(c, v3(0.052f, 0.050f, 0.054f), patch*0.75f);      /* tar */
        /* the sheen: something was spilled here and never came up */
        float tack = smoothstepf(0.50f, 0.74f, fbm2_lod(p.x*0.55f + 9.0f, p.z*0.55f, 4, 0.7f));
        *spec = 0.10f + 0.62f*tack;
        c = mix3(c, v3(0.062f, 0.060f, 0.058f), tack*0.35f);
        /* gum, trodden flat */
        {
            float gx = rep1(p.x, 1.30f), gz = rep1(p.z, 1.30f);
            int   ix = (int)repi(p.x, 1.30f), iz = (int)repi(p.z, 1.30f);
            if (fh2(ix, iz) > 0.72f){
                float rr = len2f(gx - (fh2(ix,iz+7)-0.5f)*0.7f, gz - (fh2(ix+3,iz)-0.5f)*0.7f);
                c = mix3(c, v3(0.135f, 0.130f, 0.122f), (1.0f - smoothstepf(0.03f, 0.06f, rr))*0.8f);
            }
        }
        /* kerb paint, mostly gone */
        {
            float u = fabsf(rep1(p.x - CW(1.0f), 21.0f));
            float lane = 1.0f - smoothstepf(0.05f, 0.09f, fabsf(u - 4.60f));
            lane *= smoothstepf(0.35f, 0.62f, noise2(p.z*0.7f, 4.0f));
            c = mix3(c, v3(0.42f, 0.40f, 0.30f), lane*0.55f*hf);
        }
        /* and popcorn, further from the cart than anyone would carry it */
        {
            float dd = len2f(p.x - P_POPCORN.x, p.z - P_POPCORN.z);
            float amt = expf(-dd*0.42f);
            float k = noise3_lod(p, 52.0f);
            c = mix3(c, v3(0.66f, 0.60f, 0.45f), satf((k - 0.70f)*5.0f)*amt*0.85f);
        }
        return c;
    }
    case M_BOOTH: {
        /* painted ply. It was two colours once. */
        float grain = noise3_lod(v3(p.x*1.0f, p.y*9.0f, p.z*1.0f), 8.0f);
        /* one painted band at waist height, and a dado below it. Not stripes. */
        float band = smoothstepf(1.02f, 1.10f, p.y) - smoothstepf(1.46f, 1.54f, p.y);
        float dado = 1.0f - smoothstepf(0.94f, 1.02f, p.y);
        V3 c = v3(0.505f, 0.470f, 0.410f);
        c = mix3(c, v3(0.330f, 0.140f, 0.150f), band*0.85f);
        c = mix3(c, v3(0.225f, 0.205f, 0.180f), dado*0.80f);
        c = scl(c, 0.74f + 0.32f*grain);
        /* rust weeping out of every fixing */
        float rust = smoothstepf(0.50f, 0.78f, fbm3_lod(p, 4, 1.1f));
        float streak = smoothstepf(0.55f, 0.95f,
                        mixf(0.5f, noise2(p.x*7.0f + p.z*7.0f, p.y*0.30f), lod_w(7.0f)));
        c = mix3(c, v3(0.290f, 0.150f, 0.075f), maxf(rust*0.55f, streak*0.5f));
        /* damp climbing the bottom of the panel */
        c = mix3(c, v3(0.115f, 0.105f, 0.090f), smoothstepf(0.55f, 0.03f, p.y)*0.75f);
        *spec = 0.06f;
        return c;
    }
    case M_AWNING: {
        /* canvas, in stripes, gone to pink and grey */
        float u = (fabsf(n.x) > 0.5f) ? p.z : p.x;
        if (fabsf(n.y) > 0.75f) u = p.x + p.z;
        float s = stripe_lod(u, 0.34f, 0.5f);
        V3 a = v3(0.520f, 0.185f, 0.205f);
        V3 b = v3(0.700f, 0.665f, 0.610f);
        V3 c = mix3(a, b, s);
        float dirt = fbm3_lod(p, 4, 1.6f);
        c = scl(c, 0.62f + 0.52f*dirt);
        c = mix3(c, v3(0.180f, 0.170f, 0.140f),
                 smoothstepf(0.56f, 0.86f, fbm3_lod(add(p,v3(7,0,3)), 3, 0.7f))*0.55f);
        *spec = 0.04f;
        return c;
    }
    case M_COUNTER: {
        float w = noise3_lod(p, 70.0f);
        V3 c = scl(v3(0.360f, 0.330f, 0.290f), 0.74f + 0.36f*w);
        c = mix3(c, v3(0.150f, 0.140f, 0.125f),
                 smoothstepf(0.52f, 0.80f, fbm3_lod(p, 3, 2.2f))*0.6f);
        *spec = 0.28f;
        return c;
    }
    case M_SHELF: { *spec = 0.08f; return scl(v3(0.230f, 0.215f, 0.190f), 0.8f + 0.4f*noise3_lod(p, 40.0f)); }
    case M_PLUSH: {
        /* fur, matted, and colours nobody would choose */
        int ix = (int)floorf(p.x*1.6f), iz = (int)floorf(p.z*1.6f);
        float h = fh2(ix*7+3, iz*11+5);
        V3 c;
        if (h < 0.25f)      c = v3(0.62f, 0.42f, 0.52f);
        else if (h < 0.45f) c = v3(0.44f, 0.52f, 0.36f);
        else if (h < 0.65f) c = v3(0.66f, 0.58f, 0.32f);
        else if (h < 0.85f) c = v3(0.36f, 0.44f, 0.58f);
        else                c = v3(0.60f, 0.34f, 0.30f);
        float fur = noise3_lod(p, 150.0f)*0.5f + noise3_lod(p, 55.0f)*0.32f;
        c = scl(c, 0.52f + 0.62f*fur);
        c = mix3(c, v3(0.18f, 0.17f, 0.15f),
                 smoothstepf(0.50f, 0.82f, fbm3_lod(p, 3, 3.0f))*0.55f);   /* dust */
        *spec = 0.03f;
        return c;
    }
    case M_NEONSIGN: {
        int qx, qz, s; float lx, ly;
        sign_local(p, n, &qx, &qz, &s, &lx, &ly);
        const char *word = SIGN_WORDS[ih2(qx*17+s*3, qz*29+7, 8)];
        int ci = 0;
        float halfw = CELL*0.5f - 0.30f;
        float m = text_fit(word, lx, ly - 3.62f, halfw, 0.40f, &ci);
        V3 col = neon_col(qx, qz, s);
        float f = neon_flicker(qx*3+s, qz, g_time);
        /* the odd letter goes on its own */
        float lf = fh3(qx*5+s, qz*3, ci*13);
        if (lf > 0.90f){
            float g = noise2(g_time*8.0f + lf*30.0f, ci*3.0f);
            f *= (g > 0.45f) ? 1.0f : 0.06f;
        }
        if (m > 0.5f){
            *emis = 2.9f*f;
            return col;
        }
        /* the dark glass behind the tube, with the tube's glow on it */
        *emis = 0.22f*f;
        return scl(col, 0.30f);
    }
    case M_TICKETSIGN: {
        V3 q = sub(p, add(P_BOOTH, v3(0.0f, 3.86f, 0.0f)));
        int ci = 0;
        float m = text_fit("TICKETS", q.x, q.y, 1.78f, 0.40f, &ci);
        float f = neon_flicker(701, 3, g_time);
        float lf = fh2(ci*13+1, 5);
        if (lf > 0.82f){
            float g = noise2(g_time*7.0f + lf*30.0f, ci*3.0f);
            f *= (g > 0.42f) ? 1.0f : 0.05f;
        }
        if (m > 0.5f){ *emis = 3.1f*f; return v3(1.00f, 0.36f, 0.26f); }
        *emis = 0.20f*f;
        return v3(0.26f, 0.10f, 0.08f);
    }
    case M_SIGNBACK: { *spec = 0.12f; return scl(v3(0.085f, 0.082f, 0.086f), 0.8f + 0.4f*noise3_lod(p, 60.0f)); }
    case M_CRTBODY: {
        float n1 = noise3_lod(p, 220.0f);
        *spec = 0.20f;
        return scl(v3(0.215f, 0.205f, 0.185f), 0.82f + 0.30f*n1);
    }
    case M_CRTSCREEN: {
        V3 c = sub(p, P_CRT);
        V3 r = rotX(c, -CRT_TILT);
        float u = r.x/CRT_HW*0.5f + 0.5f;
        float v = 0.5f - r.y/CRT_HH*0.5f;
        *emis = 1.0f;
        return crt_image(u, v, g_time);
    }
    case M_KIOSK: {
        /* the booth itself: heavy panel steel, and the rust has won */
        float grain = fbm3_lod(p, 4, 1.4f);
        float rib = stripe_lod(p.x*1.0f + p.z*0.02f, 0.62f, 0.86f);
        V3 base = v3(0.300f, 0.285f, 0.255f);
        V3 c = scl(base, 0.68f + 0.40f*grain);
        c = scl(c, 0.90f + 0.16f*rib);
        /* long stains hanging off every seam and bolt */
        float st = smoothstepf(0.46f, 0.90f,
                    mixf(0.5f, noise2(p.x*4.6f + p.z*3.1f, p.y*0.22f), lod_w(4.6f)));
        float top = smoothstepf(5.6f, 2.0f, p.y);
        c = mix3(c, v3(0.325f, 0.150f, 0.062f), satf(st*top)*0.80f);
        float rust = smoothstepf(0.52f, 0.80f, fbm3_lod(p, 4, 2.6f));
        c = mix3(c, v3(0.240f, 0.115f, 0.055f), rust*0.55f);
        c = mix3(c, v3(0.090f, 0.082f, 0.072f), smoothstepf(0.70f, 0.05f, p.y)*0.7f);
        *spec = 0.10f;
        return c;
    }
    case M_RUSTMETAL: {
        float r = fbm3_lod(p, 4, 3.2f);
        V3 c = mix3(v3(0.255f, 0.130f, 0.062f), v3(0.400f, 0.215f, 0.105f), r);
        c = scl(c, 0.70f + 0.44f*noise3_lod(p, 90.0f));
        *spec = 0.08f;
        return c;
    }
    case M_PAINTMETAL: {
        float chip = smoothstepf(0.56f, 0.70f, fbm3_lod(p, 3, 6.0f));
        V3 c = mix3(v3(0.480f, 0.180f, 0.170f), v3(0.260f, 0.135f, 0.070f), chip);
        c = scl(c, 0.74f + 0.34f*noise3_lod(p, 110.0f));
        *spec = 0.22f;
        return c;
    }
    case M_WOOD: {
        float g = noise3_lod(v3(p.x*0.6f, p.y*22.0f, p.z*22.0f), 3.0f);
        float g2 = noise3_lod(p, 26.0f);
        V3 c = v3(0.230f, 0.180f, 0.130f);
        c = scl(c, 0.62f + 0.55f*g + 0.22f*g2);
        c = mix3(c, v3(0.135f, 0.120f, 0.105f),
                 smoothstepf(0.52f, 0.84f, fbm3_lod(p, 3, 1.4f))*0.55f);
        *spec = 0.05f;
        return c;
    }
    case M_TIE: {
        float g = noise3_lod(p, 34.0f);
        *spec = 0.03f;
        return scl(v3(0.105f, 0.092f, 0.082f), 0.7f + 0.5f*g);
    }
    case M_CONCRETE: {
        float g = fbm3_lod(p, 4, 1.7f);
        float fine = noise3_lod(p, 95.0f);
        V3 c = scl(v3(0.205f, 0.203f, 0.198f), 0.66f + 0.42f*g + 0.14f*fine);
        float seam = smoothstepf(0.03f, 0.0f, fabsf(rep1(p.y + 0.4f, 1.10f)));
        c = scl(c, 1.0f - 0.26f*seam*hf);
        *spec = 0.05f;
        return c;
    }
    case M_RAILSTEEL: {
        float w = noise3_lod(p, 130.0f);
        float rust = smoothstepf(0.58f, 0.84f, fbm3_lod(p, 3, 4.0f));
        V3 c = mix3(v3(0.235f, 0.238f, 0.250f), v3(0.205f, 0.115f, 0.062f), rust);
        *spec = 0.55f*(1.0f - rust*0.7f);
        return scl(c, 0.80f + 0.34f*w);
    }
    case M_STEEL: {
        float chip = smoothstepf(0.54f, 0.72f, fbm3_lod(p, 3, 4.0f));
        V3 c = mix3(v3(0.150f, 0.150f, 0.145f), v3(0.155f, 0.088f, 0.050f), chip*0.8f);
        *spec = 0.20f;
        return scl(c, 0.76f + 0.34f*noise3_lod(p, 100.0f));
    }
    case M_CANOPY: {
        /* the carousel top: stripes running down from the crown */
        V3 q = rotY(sub(p, P_CAROUSEL), -g_carousel_ang);
        float a = atan2f(q.z, q.x);
        float s = stripe_lod(a*(24.0f/(2.0f*PI)) + 100.0f, 1.0f, 0.5f);
        V3 c = mix3(v3(0.560f, 0.185f, 0.195f), v3(0.680f, 0.630f, 0.560f), s);
        c = scl(c, 0.62f + 0.48f*fbm3_lod(p, 3, 2.0f));
        c = mix3(c, v3(0.185f, 0.175f, 0.150f),
                 smoothstepf(0.54f, 0.86f, fbm3_lod(add(p,v3(3,1,7)), 3, 0.9f))*0.6f);
        *spec = 0.10f;
        return c;
    }
    case M_CARDECK: {
        V3 q = rotY(sub(p, P_CAROUSEL), -g_carousel_ang);
        float rr = len2f(q.x, q.z);
        float board = stripe_lod(rr, 0.22f, 0.88f);
        float a = atan2f(q.z, q.x);
        float rad = stripe_lod(a*(32.0f/(2.0f*PI)), 1.0f, 0.5f);
        V3 c = mix3(v3(0.250f, 0.205f, 0.155f), v3(0.310f, 0.270f, 0.205f), rad);
        c = scl(c, 0.72f + 0.30f*board + 0.28f*noise3_lod(p, 60.0f));
        *spec = 0.14f;
        return c;
    }
    case M_BRASS: {
        float w = noise3_lod(p, 160.0f);
        float tar = smoothstepf(0.45f, 0.80f, fbm3_lod(p, 3, 5.0f));
        V3 c = mix3(v3(0.640f, 0.500f, 0.230f), v3(0.235f, 0.215f, 0.135f), tar);
        *spec = 0.60f*(1.0f - tar*0.6f);
        return scl(c, 0.80f + 0.30f*w);
    }
    case M_POPCORN: {
        float k1 = noise3_lod(p, 90.0f);
        float k2 = noise3_lod(p, 260.0f);
        V3 c = v3(0.760f, 0.700f, 0.520f);
        c = scl(c, 0.60f + 0.52f*k1 + 0.26f*k2);
        c = mix3(c, v3(0.560f, 0.430f, 0.215f), smoothstepf(0.55f, 0.85f, k1)*0.45f);
        *spec = 0.06f;
        return c;
    }
    case M_CARTBODY: {
        float s = stripe_lod(p.y, 0.20f, 0.5f);
        V3 c = mix3(v3(0.520f, 0.140f, 0.130f), v3(0.700f, 0.660f, 0.600f), s);
        c = scl(c, 0.72f + 0.34f*noise3_lod(p, 80.0f));
        *spec = 0.30f;
        return c;
    }
    case M_GLASS: {
        float sm = smoothstepf(0.45f, 0.80f, fbm3_lod(p, 3, 8.0f));
        *spec = 0.80f;
        return scl(v3(0.120f, 0.135f, 0.130f), 0.6f + 0.8f*sm);
    }
    case M_GONDOLA: {
        int i = (int)floorf(p.y*0.5f + p.x*0.3f);
        V3 c = NEON_PAL[ih2(i, 3, 6)];
        c = scl(c, 0.30f);
        c = scl(c, 0.68f + 0.40f*fbm3_lod(p, 3, 3.0f));
        *spec = 0.22f;
        return c;
    }
    case M_ARENAFLOOR: {
        /* steel plate, and forty years of arcs scrubbed into it */
        V3 q = sub(p, P_ARENA);
        float pl = stripe_lod(q.x*0.5f, 1.0f, 0.94f)*stripe_lod(q.z*0.5f, 1.0f, 0.94f);
        float arc = 0.0f;
        for (int i = 0; i < 3; i++){
            float cxx = (fh1(i*5+1)-0.5f)*9.0f, czz = (fh1(i*5+2)-0.5f)*6.0f;
            float rr = len2f(q.x-cxx, q.z-czz);
            arc = maxf(arc, 1.0f - smoothstepf(0.10f, 0.5f, fabsf(rr - (1.6f + i*1.1f))));
        }
        V3 c = v3(0.180f, 0.178f, 0.185f);
        c = scl(c, 0.68f + 0.34f*noise3_lod(p, 140.0f) + 0.16f*pl);
        c = mix3(c, v3(0.300f, 0.298f, 0.305f), arc*0.55f*hf);
        *spec = 0.34f;
        return c;
    }
    case M_BUMPERCAR: {
        int i = (int)floorf(p.x*0.31f + p.z*0.53f);
        V3 c = NEON_PAL[ih2(i*7, 11, 6)];
        c = scl(c, 0.34f);
        float dust = smoothstepf(0.48f, 0.82f, fbm3_lod(p, 3, 2.6f));
        c = mix3(c, v3(0.150f, 0.145f, 0.135f), dust*0.62f);
        *spec = 0.34f*(1.0f - dust*0.6f);
        return c;
    }
    case M_BUMPERWALL: {
        float s = stripe_lod(p.x*0.7f + p.z*0.7f, 0.46f, 0.5f);
        V3 c = mix3(v3(0.430f, 0.150f, 0.140f), v3(0.560f, 0.520f, 0.460f), s);
        c = scl(c, 0.70f + 0.34f*fbm3_lod(p, 3, 3.0f));
        *spec = 0.18f;
        return c;
    }
    /* ---------------------------------------------------------- the mascot */
    case M_JSUIT: {
        V3 q = rotY(sub(p, g_jest_pos), -g_jest_yaw);
        /* harlequin: diamonds on the diagonal, in two colours that clash */
        float u = (q.x + q.z)*5.2f, v = (q.y - q.x*0.15f)*5.2f;
        float dm = fabsf(fractf(u + v) - 0.5f) + fabsf(fractf(u - v) - 0.5f);
        float k = smoothstepf(0.48f, 0.52f, dm);
        V3 a = v3(0.400f, 0.088f, 0.170f);          /* dried crimson */
        V3 b = v3(0.238f, 0.282f, 0.108f);          /* bile green    */
        V3 c = mix3(a, b, k);
        float wear = fbm3_lod(p, 4, 5.0f);
        c = scl(c, 0.62f + 0.52f*wear);
        /* mildew, and the nap worn off wherever a hand ever touched it */
        c = mix3(c, v3(0.132f, 0.128f, 0.108f),
                 smoothstepf(0.46f, 0.82f, fbm3_lod(add(p,v3(11,3,5)), 3, 1.8f))*0.68f);
        c = mix3(c, v3(0.205f, 0.200f, 0.168f),
                 smoothstepf(0.58f, 0.86f, fbm3_lod(add(p,v3(2,9,4)), 3, 7.0f))*0.45f);
        /* it has been standing outdoors a long time */
        c = mix3(c, v3(0.140f, 0.125f, 0.100f), smoothstepf(0.60f, 0.06f, q.y)*0.6f);
        *spec = 0.07f;
        return c;
    }
    case M_JFACE: {
        V3 q = rotY(sub(p, g_jest_pos), -g_jest_yaw);
        V3 h = rotZ(sub(q, jest_head_c()), g_jest_contort*0.62f);
        V3 c = v3(0.660f, 0.628f, 0.575f);          /* greasepaint, gone off */
        float craze = fbm3_lod(p, 4, 34.0f);
        c = scl(c, 0.70f + 0.36f*craze);
        /* it has been rained on for years: the paint has lifted and gone grey */
        c = mix3(c, v3(0.245f, 0.230f, 0.205f), smoothstepf(0.58f, 0.80f, craze)*0.62f);
        c = mix3(c, v3(0.300f, 0.290f, 0.250f),
                 smoothstepf(0.50f, 0.86f, fbm3_lod(add(p, v3(3,7,1)), 3, 2.6f))*0.45f);
        float front = h.z > 0.04f ? 1.0f : 0.0f;
        /* the grin. Painted on, and wider than a mouth goes. */
        if (front){
            float mx = h.x, my = h.y + 0.132f;
            float curve = my + 0.34f*mx*mx - 0.014f;
            float band = fabsf(curve) - 0.0225f;
            float wide = 1.0f - smoothstepf(0.148f, 0.180f, fabsf(mx));
            float m = (1.0f - smoothstepf(0.0f, 0.009f, band))*wide;
            c = mix3(c, v3(0.235f, 0.032f, 0.042f), m*0.94f);
            /* the corners keep going up after the mouth has stopped */
            float t1 = len2f(fabsf(mx) - 0.165f, my + 0.030f) - 0.030f;
            c = mix3(c, v3(0.205f, 0.028f, 0.038f),
                     (1.0f - smoothstepf(0.0f, 0.009f, t1))*0.88f);
            /* and teeth were painted in, badly */
            float tb = fabsf(curve + 0.004f) - 0.010f;
            float tk = fractf(mx*22.0f) < 0.62f ? 1.0f : 0.0f;
            c = mix3(c, v3(0.520f, 0.495f, 0.440f),
                     (1.0f - smoothstepf(0.0f, 0.006f, tb))*wide*tk*0.75f);
        }
        /* brows: one arched, one flat, because a person painted them */
        if (front){
            float b1 = fabsf(h.y - 0.150f - 0.85f*(h.x+0.101f)*(h.x+0.101f)) - 0.012f;
            float m1 = (1.0f - smoothstepf(0.0f, 0.008f, b1))
                     * (1.0f - smoothstepf(0.058f, 0.080f, fabsf(h.x + 0.101f)));
            float b2 = fabsf(h.y - 0.118f + 0.22f*(h.x - 0.112f)) - 0.011f;
            float m2 = (1.0f - smoothstepf(0.0f, 0.008f, b2))
                     * (1.0f - smoothstepf(0.062f, 0.086f, fabsf(h.x - 0.112f)));
            c = mix3(c, v3(0.075f, 0.062f, 0.055f), maxf(m1, m2)*0.92f);
        }
        /* a diamond of colour under each eye, and it has run */
        if (front && h.y < 0.02f){
            float t1 = fabsf(h.x + 0.101f) + fabsf(h.y + 0.048f)*0.62f - 0.052f;
            float m = 1.0f - smoothstepf(0.0f, 0.014f, t1);
            float run = (1.0f - smoothstepf(0.0f, 0.16f, -h.y - 0.05f))
                      * (1.0f - smoothstepf(0.014f, 0.030f, fabsf(h.x + 0.101f)));
            c = mix3(c, v3(0.185f, 0.070f, 0.190f), maxf(m, run*0.7f)*0.80f);
        }
        /* the nose is the only part anyone ever repainted */
        if (len3(sub(h, JNOSE_P)) < JNOSE_R + 0.006f){
            c = v3(0.395f, 0.082f, 0.062f);
            c = scl(c, 0.78f + 0.34f*craze);
            *spec = 0.26f;
            return c;
        }
        *spec = 0.14f;
        return c;
    }
    case M_JEYE: {
        V3 q = rotY(sub(p, g_jest_pos), -g_jest_yaw);
        V3 h = rotZ(sub(q, jest_head_c()), g_jest_contort*0.62f);
        /* which one is this? They do not match. */
        float d1 = len3(sub(h, JEYE_L));
        float d2 = len3(sub(h, JEYE_R));
        int   left = d1 < d2;
        V3 ctr = left ? JEYE_L : JEYE_R;
        V3 e = sub(h, ctr);
        /* porcelain, crazed, with a painted iris aimed dead ahead */
        V3 c = v3(0.835f, 0.820f, 0.780f);
        c = scl(c, 0.84f + 0.22f*noise3_lod(p, 420.0f));
        c = mix3(c, v3(0.500f, 0.470f, 0.420f),
                 smoothstepf(0.56f, 0.84f, fbm3_lod(p, 3, 16.0f))*0.40f);
        float rr = len2f(e.x, e.y);
        V3 iris = left ? v3(0.115f, 0.205f, 0.290f) : v3(0.235f, 0.150f, 0.062f);
        float ir = left ? 0.030f : 0.045f;
        if (e.z > 0.0f){
            /* one of them is not looking in quite the same direction */
            float ox = left ? 0.0f : 0.008f, oy = left ? 0.004f : -0.006f;
            float r2 = len2f(e.x - ox, e.y - oy);
            c = mix3(c, iris, 1.0f - smoothstepf(ir, ir + 0.005f, r2));
            c = mix3(c, v3(0.014f, 0.013f, 0.016f),
                     1.0f - smoothstepf(ir*0.44f, ir*0.44f + 0.004f, r2));
            /* the rim of the socket it was pushed into */
            c = mix3(c, v3(0.100f, 0.085f, 0.078f),
                     smoothstepf((left?JEYE_LR:JEYE_RR)*0.90f,
                                 (left?JEYE_LR:JEYE_RR)*1.02f, rr)*0.85f);
        }
        /* and the left one is cracked */
        if (left){
            float cr = fabsf(e.y - 0.35f*e.x - 0.014f) - 0.0018f;
            c = mix3(c, v3(0.36f, 0.34f, 0.32f), 1.0f - smoothstepf(0.0f, 0.0009f, cr));
        }
        *spec = 0.90f;
        return c;
    }
    case M_JBELL: {
        float tar = smoothstepf(0.44f, 0.78f, fbm3_lod(p, 3, 9.0f));
        V3 c = mix3(v3(0.560f, 0.470f, 0.210f), v3(0.200f, 0.190f, 0.125f), tar);
        *spec = 0.55f*(1.0f - tar*0.55f);
        return c;
    }
    case M_JRUFF: {
        V3 c = v3(0.395f, 0.372f, 0.325f);
        c = scl(c, 0.62f + 0.46f*noise3_lod(p, 120.0f));
        c = mix3(c, v3(0.145f, 0.132f, 0.112f),
                 smoothstepf(0.40f, 0.78f, fbm3_lod(p, 3, 4.0f))*0.78f);
        *spec = 0.05f;
        return c;
    }
    /* ------------------------------------------------------- the funhouse */
    case M_FUNWALL: {
        float u = (fabsf(n.x) > 0.5f) ? p.z : p.x;
        float diag = (u*1.7f + p.y*1.1f);
        float s = stripe_lod(diag, 0.62f, 0.5f);
        int band = (int)floorf(diag/0.62f);
        V3 a = NEON_PAL[ih2(band, 3, 6)];
        V3 b = NEON_PAL[ih2(band+1, 9, 6)];
        V3 c = mix3(scl(a, 0.40f), scl(b, 0.28f), s);
        c = scl(c, 0.70f + 0.44f*fbm3_lod(p, 4, 2.4f));
        /* it is all chipped, and there is bare board under it */
        float chip = smoothstepf(0.58f, 0.70f, fbm3_lod(add(p,v3(4,2,9)), 3, 5.0f));
        c = mix3(c, v3(0.175f, 0.150f, 0.120f), chip*0.70f);
        c = mix3(c, v3(0.098f, 0.090f, 0.080f), smoothstepf(0.50f, 0.02f, p.y)*0.6f);
        *spec = 0.10f;
        return c;
    }
    case M_FUNFLOOR: {
        float ch = stripe_lod(p.x*0.9f + p.z*0.9f, 0.55f, 0.5f);
        V3 c = mix3(v3(0.205f, 0.178f, 0.195f), v3(0.265f, 0.245f, 0.215f), ch);
        c = scl(c, 0.70f + 0.40f*noise3_lod(p, 90.0f));
        *spec = 0.22f;
        return c;
    }
    case M_FUNCEIL: {
        *spec = 0.02f;
        return scl(v3(0.115f, 0.105f, 0.120f), 0.7f + 0.5f*noise3_lod(p, 40.0f));
    }
    case M_MIRRORFRAME: {
        float tar = smoothstepf(0.42f, 0.80f, fbm3_lod(p, 3, 6.0f));
        V3 c = mix3(v3(0.480f, 0.380f, 0.180f), v3(0.180f, 0.165f, 0.120f), tar);
        *spec = 0.42f;
        return c;
    }
    case M_FLOODLAMP: {
        *emis = 3.4f*neon_flicker(881, 17, g_time);
        return v3(1.00f, 0.96f, 0.86f);
    }
    case M_BULB: {
        int bx = (int)floorf((p.x - (CW(1.0f)+LAMP_OX))/21.0f + 0.5f);
        int bz = (int)floorf((p.z - (CW(1.0f)+LAMP_OX))/24.0f + 0.5f);
        float f = neon_flicker(bx*97+5, bz*61+3, g_time);
        *emis = 2.6f*f;
        return v3(1.00f, 0.78f, 0.44f);
    }
    case M_LAMPPOST: {
        float r = fbm3_lod(p, 3, 4.0f);
        V3 c = mix3(v3(0.115f, 0.112f, 0.108f), v3(0.235f, 0.130f, 0.070f), r*0.7f);
        *spec = 0.16f;
        return c;
    }
    case M_TARP: {
        float w = fbm3_lod(p, 4, 2.2f);
        V3 c = scl(v3(0.145f, 0.140f, 0.128f), 0.66f + 0.50f*w);
        *spec = 0.06f;
        return c;
    }
    case M_TICKETGRILLE: { *spec = 0.30f; return v3(0.105f, 0.100f, 0.098f); }
    case M_VOIDTEX: {
        /* nothing is loaded here */
        float ck = (fractf(p.x*0.5f) < 0.5f) != (fractf(p.z*0.5f) < 0.5f) ? 1.0f : 0.0f;
        *emis = 0.85f;
        return mix3(v3(0.02f,0.0f,0.03f), v3(0.85f, 0.0f, 0.85f), ck);
    }
    default: return v3(0.4f, 0.4f, 0.4f);
    }
}

/* -------------------------------------------------------------------- fog */
static float fog_tau(V3 ro, V3 rd, float t)
{
    const int NS = 4;
    float tau = 0.0f, dt = t/(float)NS;
    for (int i = 0; i < NS; i++){
        float y = ro.y + rd.y*(dt*(i + 0.5f));
        float e = (y > g_fog_y0) ? expf(-(y - g_fog_y0)/g_fog_hs) : 1.0f;
        tau += e*dt;
    }
    return tau*g_fog_dens;
}
/* the haze picks up the neon and hands it back as a halo */
static V3 haze_glow(V3 rd, float t)
{
    V3 acc = v3(0,0,0);
    for (int i = 0; i < g_cam_nlamps; i++){
        V3 d = g_cam_lamps[i].pos;
        V3 l = norm3(d);
        float s = dot(rd, l);
        if (s <= 0.0f) continue;
        float dist = len3(d);
        if (dist > t + 6.0f) continue;
        float s2 = s*s, s4 = s2*s2, s8 = s4*s4, s16 = s8*s8;
        float lobe = s16*s8;                    /* ~ s^24 */
        float reach = satf(minf(t, dist)/maxf(dist, 0.6f));
        float atten = 1.0f/(1.0f + 0.030f*dist*dist);
        acc = add(acc, scl(g_cam_lamps[i].col, lobe*atten*reach*0.85f));
    }
    return acc;
}

static V3 trace(V3 ro, V3 rd, float *hitdist, int depth);

static V3 shade_hit(V3 p, V3 rd, V3 n, int mat, float dist, int depth)
{
    g_shade_dist = dist;
    float spec, emis;
    V3 alb = mat_albedo(mat, p, n, &spec, &emis);

    V3 col;
    if (mat == M_MIRROR){
        /* the maze only works if the glass really is looking at the room */
        V3 rr = sub(rd, scl(n, 2.0f*dot(n, rd)));
        V3 refl;
        if (depth < 2){
            float hd;
            refl = trace(add(p, scl(n, 0.022f)), norm3(rr), &hd, depth+1);
        } else {
            refl = scl(g_fog_col, 0.9f);
        }
        /* silvering gone patchy, and nobody has cleaned it */
        float dust = smoothstepf(0.42f, 0.86f, fbm3_lod(p, 4, 3.0f));
        float dead = smoothstepf(0.74f, 0.90f, fbm3_lod(add(p, v3(9,2,4)), 3, 1.2f));
        V3 tint = v3(0.800f, 0.880f, 0.825f);
        col = mul(refl, scl(tint, 0.96f - 0.28f*dust));
        col = mix3(col, v3(0.075f, 0.080f, 0.076f), dead*0.8f);
        /* a smear of specular off the surface itself */
        Lamp lamps[20];
        int nl = gather_lamps(p, lamps, 20);
        for (int i = 0; i < nl; i++){
            V3 ld = sub(lamps[i].pos, p);
            float d2 = dot(ld, ld);
            V3 l = scl(ld, 1.0f/sqrtf(maxf(d2,1e-6f)));
            V3 h = norm3(sub(l, rd));
            float sh = powf(maxf(dot(n,h), 0.0f), 90.0f);
            col = add(col, scl(lamps[i].col, sh*0.55f/(1.0f + 0.04f*d2)));
        }
    } else if (emis < 0.0f){
        col = v3(0.003f, 0.003f, 0.004f);
    } else if (emis > 0.0f){
        col = scl(alb, emis);
        /* even a lit sign catches a little of the light around it */
        col = add(col, scl(alb, 0.10f));
    } else {
        Lamp lamps[22];
        int nl = gather_lamps(p, lamps, 22);
        V3 acc = v3(0,0,0);
        for (int i = 0; i < nl; i++){
            V3 ld = sub(lamps[i].pos, p);
            float d2 = dot(ld, ld);
            float d = sqrtf(d2);
            V3 l = scl(ld, 1.0f/maxf(d, 1e-4f));
            float ndl = dot(n, l);
            float diff = maxf(ndl, 0.0f)*0.88f + 0.12f*satf(ndl*0.5f+0.5f);
            float atten = 1.0f/(1.0f + lamps[i].k*d2);
            V3 contrib = scl(lamps[i].col, diff*atten);
            if (spec > 0.001f){
                V3 h = norm3(sub(l, rd));
                float sh = powf(maxf(dot(n,h), 0.0f), 24.0f + spec*100.0f);
                contrib = add(contrib, scl(lamps[i].col, sh*spec*atten*1.8f));
            }
            acc = add(acc, contrib);
        }
        /* ambient: a black sky gives nothing back, so this is the haze and
         * whatever the asphalt bounces */
        V3 amb;
        if (g_scene == SC_FUN){
            amb = scl(v3(0.100f, 0.090f, 0.110f), 0.85f + 0.15f*satf(n.y));
        } else if (g_scene == SC_MIRROR){
            amb = scl(v3(0.105f, 0.098f, 0.088f), 0.85f + 0.15f*satf(n.y));
        } else {
            float up = satf(n.y*0.5f + 0.5f);
            amb = scl(v3(0.031f, 0.034f, 0.045f), 0.35f + 0.85f*up);   /* the haze */
            amb = add(amb, scl(v3(0.026f, 0.025f, 0.024f), satf(-n.y)*0.9f));
        }
        acc = add(acc, scl(amb, g_lightgain));
        col = mul(alb, acc);

        float ao = calc_ao(p, n);
        col = scl(col, 0.34f + 0.66f*ao);
    }
    return col;
}

/* the ground, which is a plane and therefore not in the field */
static void ground_material(int *mat, float *dummy)
{
    (void)dummy;
    if (g_scene == SC_FUN) *mat = M_FUNFLOOR;
    else if (g_scene == SC_MIRROR) *mat = M_FUNFLOOR;
    else *mat = M_ASPHALT;
}

/* is the floor still there at this point? */
static float floor_hole(V3 p)
{
    if (g_void_mix <= 0.001f) return 0.0f;
    float n = fbm2(p.x*0.14f, p.z*0.14f, 4);
    float thr = 0.62f - g_void_mix*0.50f;
    return smoothstepf(thr, thr - 0.09f, n) * satf(g_void_mix*1.6f);
}

static V3 void_look(V3 rd, float seed)
{
    /* nothing is loaded down there. Static, and slabs of checker sliding past. */
    int sx = (int)(rd.x*520.0f + seed*31.0f);
    int sy = (int)(rd.y*520.0f - seed*17.0f);
    float n = fh3(sx, sy, (int)(g_time*64.0f));
    float n2 = fh3(sx/3, sy/2, (int)(g_time*23.0f) + 7);
    float s = 0.10f + 0.62f*n*n + 0.22f*n2*n2;
    V3 c = v3(s*0.95f, s*0.96f, s*1.06f);
    /* the missing texture, on planes that are not really there */
    float pl = fractf(rd.y*3.0f + g_time*0.9f + seed);
    if (pl < 0.14f){
        float u = rd.x*7.0f + g_time*0.4f, v = rd.z*7.0f;
        float ck = (fractf(u) < 0.5f) != (fractf(v) < 0.5f) ? 1.0f : 0.0f;
        V3 miss = mix3(v3(0.03f, 0.0f, 0.04f), v3(0.72f, 0.0f, 0.74f), ck);
        c = mix3(c, miss, (1.0f - pl/0.14f)*0.85f);
    }
    return c;
}

static V3 trace(V3 ro, V3 rd, float *hitdist, int depth)
{
    if (g_scene == SC_VOID){
        *hitdist = 1e9f;
        return void_look(rd, 0.0f);
    }

    float tmax;
    int   maxsteps;
    int   has_ceil = 0;
    float ceily = 0.0f;
    switch (g_scene){
        case SC_FUN:    tmax = 40.0f;  maxsteps = 110; has_ceil = 1; ceily = FUN_H; break;
        case SC_MIRROR: tmax = 46.0f;  maxsteps = 120; has_ceil = 1; ceily = MZ_H;  break;
        default:        tmax = 118.0f; maxsteps = 150; break;
    }
    if (depth > 0){ tmax *= 0.75f; maxsteps = 70; }

    /* the floor and, indoors, the ceiling: solved, not marched */
    float tpl = 1e9f; int plmat = M_NONE; float plsign = 1.0f;
    if (rd.y < -1e-5f){
        float tt = -ro.y/rd.y;
        if (tt > 0.02f){ tpl = tt; ground_material(&plmat, 0); plsign = 1.0f; }
    }
    if (has_ceil && rd.y > 1e-5f){
        float tt = (ceily - ro.y)/rd.y;
        if (tt > 0.02f && tt < tpl){
            tpl = tt; plmat = (g_scene == SC_FUN) ? M_FUNCEIL : M_FUNCEIL; plsign = -1.0f;
        }
    }
    /* the floor may have stopped being there */
    float hole = 0.0f;
    if (plsign > 0.0f && tpl < 1e8f && g_void_mix > 0.001f){
        V3 gp = add(ro, scl(rd, tpl));
        hole = floor_hole(gp);
        if (hole > 0.55f) tpl = 1e9f;
    }

    float tlim = minf(tmax, tpl);
    float t = 0.0202f;
    int mat = M_NONE, hit = 0;
    float stepk = (g_warp > 0.001f) ? 0.72f : 0.92f;
    for (int i = 0; i < maxsteps; i++){
        V3 p = add(ro, scl(rd, t));
        float d = map_scene(p, &mat);
        if (d < 0.0011f*t + 0.0012f){ hit = 1; break; }
        t += d * stepk;
        if (t > tlim) break;
    }

    V3 col; float dist;
    if (hit && t <= tlim){
        V3 p = add(ro, scl(rd, t));
        col = shade_hit(p, rd, calc_normal(p), mat, t, depth);
        dist = t;
    } else if (tpl < tmax){
        /* the plane */
        V3 p = add(ro, scl(rd, tpl));
        V3 n = v3(0.0f, plsign, 0.0f);
        int m = plmat;
        col = shade_hit(p, rd, n, m, tpl, depth);
        if (hole > 0.0f)
            col = mix3(col, scl(void_look(rd, p.x + p.z), 0.55f), satf(hole*1.6f));
        dist = tpl;
    } else {
        /* a sky with nothing in it */
        col = v3(0.0f, 0.0f, 0.0f);
        dist = tmax;
    }

    /* atmosphere, and the neon burning a hole in it */
    float tau = fog_tau(ro, rd, minf(dist, tmax));
    float T = expf(-tau);
    col = add(scl(col, T), scl(g_fog_col, (1.0f - T)*g_lightgain));
    if (depth == 0 && g_scene != SC_FUN && g_scene != SC_MIRROR)
        col = add(col, scl(haze_glow(rd, minf(dist, tmax)), 1.0f - T*0.35f));

    *hitdist = dist;
    return col;
}

#endif /* PK_SHADE_H */
