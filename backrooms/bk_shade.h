/* bk_shade.h -- materials, lighting, the CRT feedback tap, and the raymarcher. */
#ifndef BK_SHADE_H
#define BK_SHADE_H

#include "bk_core.h"

/* internal render resolution and final tape resolution */
#define RW 480
#define RH 360
#define OW 640
#define OH 480

/* previous finished frame -- this is what the television is showing */
static unsigned char *g_feedback;
static float g_tv_gain = 1.0f;      /* tube brightness, wobbles with the room */
static float g_lightflick = 1.0f;   /* global mains flicker */

/* bilinear tap into the last frame we sent to tape */
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

/* The tube. Feeding the camera's own output back in is what builds the tunnel:
 * every generation picks up another set of scanlines, another pass of noise and
 * another notch of contrast, so depth falls away into grain. */
static V3 crt_image(float u, float v, float t){
    /* glass curvature */
    float dx = u-0.5f, dy = v-0.5f;
    float r2 = dx*dx + dy*dy;
    float k = 1.0f - 0.13f*r2;
    float su = 0.5f + dx*k, sv = 0.5f + dy*k;

    if (su < 0.005f || su > 0.995f || sv < 0.005f || sv > 0.995f)
        return v3(0.012f, 0.012f, 0.016f);       /* inside the bezel */

    V3 c = fb_bilinear(su, sv);

    /* per-generation degradation */
    c = scl(c, 1.06f * g_tv_gain);
    c.x = c.x*1.06f - 0.020f;
    c.y = c.y*1.05f - 0.018f;
    c.z = c.z*1.02f - 0.014f;                    /* phosphor runs a touch cool */

    /* aperture grille + scanlines belonging to *this* generation */
    float line = 0.5f + 0.5f*cosf(sv * OH * 1.15f * PI);
    c = scl(c, 0.80f + 0.28f*line);
    float grille = 0.5f + 0.5f*cosf(su * OW * 0.9f * PI);
    c = mul(c, v3(1.0f + 0.06f*grille, 1.0f - 0.03f*grille, 1.0f + 0.04f*grille));

    /* tube noise */
    float n = fh3((int)(su*900.0f), (int)(sv*700.0f), (int)(t*60.0f));
    c = add(c, scl(v3(1,1,1.06f), (n-0.5f)*0.075f));

    /* horizontal retrace bar drifting up the tube */
    float bar = fmodf(sv - t*0.11f, 1.0f); if (bar < 0) bar += 1.0f;
    c = scl(c, 1.0f + 0.16f*expf(-bar*bar*160.0f));

    /* corner falloff of the tube itself */
    c = scl(c, 1.0f - 0.55f*r2);

    c.x = maxf(c.x, 0.0f); c.y = maxf(c.y, 0.0f); c.z = maxf(c.z, 0.0f);
    return c;
}

/* untuned-channel snow, for the arcade cabinet */
static V3 snow(float u, float v, float t, float tint){
    int sx = (int)(u*300.0f), sy = (int)(v*220.0f), st = (int)(t*72.0f);
    float n = fh3(sx, sy, st);
    float n2 = fh3(sx/3, sy, st*7+3);
    float s = 0.22f + 0.85f*n*n + 0.12f*n2;
    /* rolling band */
    float band = fmodf(v*1.4f - t*0.5f, 1.0f); if (band < 0) band += 1;
    s *= 1.0f + 0.5f*expf(-band*band*90.0f);
    return v3(s*(1.0f-0.10f*tint), s*(1.0f-0.04f*tint), s*(1.0f+0.16f*tint));
}

/* -------------------------------------------------------------- mains lights */
/* Fluorescent tubes never sit still: each fitting gets its own phase, and a
 * couple of them are on their way out. */
static float panel_flicker(int qx, int qz, float t){
    float seed = fh2(qx*31+7, qz*17+3);
    float f = 0.90f + 0.10f*sinf(t*120.0f*PI + seed*6.28f);   /* mains ripple */
    if (seed > 0.86f){                                        /* a dying tube */
        float s = noise2(t*7.0f + seed*40.0f, seed*13.0f);
        f *= (s > 0.42f) ? 1.0f : 0.18f;
        f *= 0.75f + 0.25f*noise2(t*31.0f, seed*7.0f);
    } else if (seed > 0.68f){
        f *= 0.86f + 0.16f*noise2(t*4.0f + seed*20.0f, 1.7f);
    }
    return f * g_lightflick;
}

typedef struct { V3 pos, col; float k; } Lamp;   /* k: inverse-square softening */

/* collect the fittings that matter for this shading point */
static int gather_lamps(V3 p, Lamp *out, int maxn){
    int n = 0;
    float t = g_time;
    if (g_scene == SC_ROOM || g_scene == SC_LEVEL0 || g_scene == SC_TRANS){
        int cx = WC(p.x), cz = WC(p.z);
        for (int dz = -2; dz <= 2 && n < maxn; dz++)
            for (int dx = -2; dx <= 2 && n < maxn; dx++){
                int qx = cx+dx, qz = cz+dz;
                if (solid(G0, qx, qz)) continue;
                if (((qx*7 + qz*13) % 3) != 0) continue;
                float f = panel_flicker(qx, qz, t);
                Lamp L; L.pos = v3(CW((float)qx), WALLH-0.10f, CW((float)qz));
                L.col = scl(v3(1.00f, 0.97f, 0.80f), 2.15f*f);
                L.k = 0.055f; out[n++] = L;
            }
        /* the fittings lying face-up on the carpet throw light at the ceiling */
        if (n < maxn && g_scene != SC_ROOM){
            float d = fabsf(p.x-P_FLOORLIT.x) + fabsf(p.z-P_FLOORLIT.z);
            if (d < 14.0f){
                Lamp L; L.pos = v3(P_FLOORLIT.x, 0.34f, P_FLOORLIT.z);
                L.col = scl(v3(0.95f, 0.99f, 0.92f), 3.30f*panel_flicker(999, 3, t));
                L.k = 0.055f; out[n++] = L;
            }
        }
        /* the television is the brightest thing in its room */
        if (n < maxn){
            float d = len3(sub(p, P_TV));
            if (d < 9.0f){
                Lamp L; L.pos = add(P_TV, v3(0,0.02f,0.35f));
                L.col = scl(v3(0.62f, 0.72f, 1.0f), 1.5f*g_tv_gain);
                L.k = 0.055f; out[n++] = L;
            }
        }
        if (n < maxn && g_scene != SC_ROOM){
            float d = fabsf(p.x-P_ARCADE.x) + fabsf(p.z-P_ARCADE.z);
            if (d < 10.0f){
                Lamp L; L.pos = add(P_ARCADE, v3(0, 1.30f, 0.45f));
                L.col = scl(v3(0.55f, 0.68f, 1.0f), 1.1f);
                L.k = 0.055f; out[n++] = L;
            }
        }
    } else if (g_scene == SC_LEVEL1){
        int cx = WC(p.x), cz = WC(p.z);
        for (int dz = -2; dz <= 2 && n < maxn; dz++)
            for (int dx = -2; dx <= 2 && n < maxn; dx++){
                int qx = cx+dx, qz = cz+dz;
                if (solid(G1, qx, qz)) continue;
                if (((qx*5 + qz*11) % 2) != 0) continue;
                float f = panel_flicker(qx+101, qz+57, t);
                Lamp L; L.pos = v3(CW((float)qx), WALLH1-0.40f, CW((float)qz));
                L.col = scl(v3(1.00f, 0.93f, 0.74f), 2.20f*f);
                L.k = 0.055f; out[n++] = L;
            }
    } else if (g_scene == SC_ATRIUM){
        float zc = 22.0f * floorf(p.z/22.0f + 0.5f);
        float yc = 22.0f * floorf(p.y/22.0f + 0.5f);
        for (int j = -1; j <= 1 && n < maxn; j++)
            for (int i = -1; i <= 1 && n < maxn; i++)
                for (int s = 0; s < 2 && n < maxn; s++){
                    Lamp L;
                    L.pos = v3(s ? ATR_HX-1.2f : -ATR_HX+1.2f, yc + j*22.0f + 1.55f, zc + i*22.0f);
                    L.col = scl(v3(1.0f, 0.95f, 0.80f),
                                6.5f*panel_flicker((int)(zc)+i*7+s*3, (int)yc+j*5, g_time));
                    L.k = 0.0100f; out[n++] = L;   /* long strips, slow falloff */
                }
    }
    return n;
}

/* -------------------------------------------------------------- surface look */
static float g_shade_dist = 0.0f;   /* distance to the shading point */

/* Procedural noise has no mip chain, so anything finer than a pixel turns into
 * moire. Fade each octave toward its mean once it stops being resolvable. */
static inline float lod_w(float f){
    float px = g_shade_dist*0.0035f + 1e-4f;    /* world units across one pixel */
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

static V3 mat_albedo(int mat, V3 p, V3 n, float *spec, float *emis){
    *spec = 0.0f; *emis = 0.0f;
    float hf = expf(-g_shade_dist*0.055f);   /* high-frequency detail survival */
    switch (mat){

    case M_CARPET: {
        /* mono-yellow commercial carpet, damp and stained through */
        float fine = noise3_lod(p, 260.0f)*0.34f + noise3_lod(p, 74.0f)*0.22f;
        float grime = fbm3_lod(p, 4, 1.15f);
        float damp  = smoothstepf(0.44f, 0.70f, fbm3_lod(add(p, v3(21,0,13)), 4, 0.52f));
        V3 c = v3(0.415f, 0.352f, 0.180f);
        c = scl(c, 0.62f + 0.52f*fine + 0.44f*grime);
        c = mix3(c, v3(0.135f, 0.115f, 0.070f), damp*0.80f);   /* wet patches */
        *spec = damp*0.30f;
        /* traffic-worn track down the middle of the corridors */
        c = scl(c, 0.86f + 0.22f*noise3_lod(p, 3.1f));
        return c;
    }
    case M_WALLPAPER: {
        /* the yellow. vertical damask stripes, water damage, and paper
         * letting go of the wall in sheets */
        float h = p.y;
        float u = (fabsf(n.x) > 0.5f) ? p.z : p.x;
        float stripe = 0.5f + 0.5f*sinf(u*22.0f)*hf;
        float strip = floorf(u/0.56f);                 /* the paper came in rolls */
        float seam = smoothstepf(0.020f, 0.0f, fabsf(fmodf(u + 400.0f, 0.56f) - 0.28f));
        float dam = noise2(u*3.4f, h*2.6f);
        V3 c = v3(0.700f, 0.632f, 0.362f);
        c = scl(c, 0.94f + 0.07f*stripe + 0.10f*dam);
        c = scl(c, 0.955f + 0.09f*fh1((int)strip));    /* rolls never match */
        c = scl(c, 1.0f - 0.22f*seam*hf);
        /* mildew climbing out of the carpet */
        float rise = smoothstepf(0.85f, 0.02f, h) * (0.55f + 0.45f*noise2(u*1.7f, 3.0f));
        c = mix3(c, v3(0.255f, 0.215f, 0.130f), rise*0.7f);
        /* ceiling stains */
        c = mix3(c, v3(0.40f, 0.34f, 0.19f), smoothstepf(2.3f, 3.0f, h)*0.45f*noise2(u*2.0f, 9.0f));
        /* peeling: paper curls away, bare plaster underneath */
        float peel = fbm2(u*0.85f, h*0.85f + 4.0f, 3);
        if (peel > 0.545f){
            float e = smoothstepf(0.545f, 0.600f, peel);
            V3 plaster = v3(0.335f, 0.315f, 0.290f);
            c = mix3(c, plaster, e);
            c = scl(c, 1.0f - 0.38f*smoothstepf(0.535f, 0.565f, peel)*(1.0f-e)); /* shadow at the curl */
        }
        if (h < 0.13f) c = scl(v3(0.30f, 0.26f, 0.16f), 0.9f + 0.2f*dam);  /* skirting */
        *spec = 0.03f;
        return c;
    }
    case M_CEILTILE: {
        float gx = fabsf(fmodf(p.x, 1.5f) - 0.75f);
        float gz = fabsf(fmodf(p.z, 1.5f) - 0.75f);
        float grid = smoothstepf(0.70f, 0.745f, maxf(gx, gz)) * hf;
        float perf = noise3_lod(p, 190.0f);
        V3 c = v3(0.805f, 0.775f, 0.665f);
        c = scl(c, 1.0f - 0.14f*hf + 0.20f*perf*hf);
        c = mix3(c, v3(0.34f, 0.29f, 0.18f), smoothstepf(0.55f, 0.85f, fbm2_lod(p.x, p.z, 3, 0.5f))*0.7f);
        c = mix3(c, v3(0.22f, 0.21f, 0.19f), grid);
        return c;
    }
    case M_FLUORO: {
        float f = panel_flicker(WC(p.x), WC(p.z), g_time);
        if (g_scene == SC_LEVEL1) f = panel_flicker(WC(p.x)+101, WC(p.z)+57, g_time);
        if (g_scene == SC_ATRIUM) f = panel_flicker((int)(p.z), 5, g_time);
        *emis = 2.3f*f;
        return v3(1.0f, 0.975f, 0.86f);
    }
    case M_FLOORLIGHT: {
        float f = panel_flicker(999, 3, g_time);
        if (n.y > 0.55f) { *emis = 1.55f*f; return v3(0.98f, 1.0f, 0.95f); }
        return v3(0.42f, 0.42f, 0.40f);   /* the housing, showing its back */
    }
    case M_TVBODY: {
        float n1 = noise3_lod(p, 130.0f);
        *spec = 0.16f;
        return scl(v3(0.235f, 0.222f, 0.198f), 0.85f + 0.25f*n1);
    }
    case M_TVSCREEN: {
        V3 q = sub(p, P_TV);
        float u = q.x/0.245f*0.5f + 0.5f;
        float v = 0.5f - (q.y-0.015f)/0.185f*0.5f;
        *emis = 1.0f;
        return crt_image(u, v, g_time);
    }
    case M_CART: { *spec = 0.30f; return v3(0.30f, 0.30f, 0.315f); }
    case M_ARCADE: {
        float n1 = fbm3_lod(p, 3, 2.0f);
        *spec = 0.10f;
        return scl(v3(0.170f, 0.158f, 0.192f), 0.7f + 0.5f*n1);
    }
    case M_ARCSCREEN: {
        V3 q = sub(p, P_ARCADE);
        float cs = cosf(ARC_ROT), sn = sinf(ARC_ROT);
        V3 r = v3(q.x*cs - q.z*sn, q.y, q.x*sn + q.z*cs);
        float u = r.x/0.27f*0.5f + 0.5f;
        float v = 0.5f - (r.y-1.30f)/0.21f*0.5f;
        *emis = 1.0f;
        return scl(snow(u, v, g_time, 0.7f), 1.15f);
    }
    case M_BLACKLIQ: {
        /* it has a surface, and it does not move */
        *spec = 0.85f;
        return v3(0.008f, 0.008f, 0.010f);
    }
    case M_CONCRETE: {
        float g = fbm3_lod(p, 4, 1.6f);
        float fine = noise3_lod(p, 95.0f);
        V3 c = v3(0.335f, 0.335f, 0.328f);
        c = scl(c, 0.66f + 0.42f*g + 0.14f*fine);
        /* form-tie marks and shuttering seams */
        float seam = smoothstepf(0.03f, 0.0f, fabsf(fmodf(p.y + 100.0f, 1.22f) - 0.61f));
        c = scl(c, 1.0f - 0.30f*seam*hf);
        /* streaks of leachate under the pipe runs */
        float st = smoothstepf(0.55f, 0.9f, mixf(0.5f, noise2(p.x*6.0f + p.z*6.0f, 0.4f), lod_w(6.0f)))
                 * smoothstepf(2.8f, 1.2f, p.y);
        c = mix3(c, v3(0.19f, 0.20f, 0.19f), st*0.55f);
        *spec = 0.05f;
        return c;
    }
    case M_CFLOOR: {
        float g = fbm3_lod(p, 4, 1.1f);
        float fine = noise3_lod(p, 150.0f);
        V3 c = scl(v3(0.245f, 0.245f, 0.240f), 0.66f + 0.44f*g + 0.16f*fine);
        float wet = smoothstepf(0.52f, 0.78f, fbm3_lod(add(p, v3(10,0,30)), 4, 0.30f));
        c = mix3(c, v3(0.085f, 0.088f, 0.095f), wet*0.85f);
        *spec = wet*0.55f;
        return c;
    }
    case M_PIPE: {
        float pat = fbm3_lod(p, 3, 5.0f);
        V3 cu = v3(0.470f, 0.245f, 0.115f);
        V3 patina = v3(0.180f, 0.330f, 0.290f);
        V3 c = mix3(cu, patina, smoothstepf(0.42f, 0.70f, pat));
        *spec = 0.45f;
        return c;
    }
    case M_DOOR: {
        float n1 = noise3_lod(p, 40.0f);
        float rust = smoothstepf(0.5f, 0.8f, fbm3_lod(p, 3, 3.0f));
        V3 c = mix3(v3(0.30f, 0.31f, 0.32f), v3(0.32f, 0.19f, 0.10f), rust);
        *spec = 0.35f;
        return scl(c, 0.85f + 0.3f*n1);
    }
    case M_GRATE: {
        /* open steel grating: you can see the drop through it */
        float gx = fabsf(fmodf(p.x*38.0f + 200.0f, 1.0f) - 0.5f);
        float gz = fabsf(fmodf(p.z*13.0f + 200.0f, 1.0f) - 0.5f);
        float bar = 1.0f - smoothstepf(0.07f, 0.15f, minf(gx, gz));
        bar = mixf(0.45f, bar, hf);
        V3 c = scl(v3(0.30f, 0.295f, 0.285f), 0.55f + 0.55f*bar);
        *spec = 0.28f;
        return c;
    }
    case M_RAIL: { *spec = 0.34f; return v3(0.215f, 0.215f, 0.226f); }
    case M_TILE: {
        /* Level 37: small white tiles, endless, going green at the grout */
        float u = p.x*4.0f, w = p.z*4.0f;
        float gu = fabsf(fmodf(u, 1.0f) - 0.5f), gw = fabsf(fmodf(w, 1.0f) - 0.5f);
        float grout = smoothstepf(0.40f, 0.47f, maxf(gu, gw)) * hf;
        V3 c = v3(0.82f, 0.83f, 0.80f);
        c = scl(c, 1.0f - 0.07f*hf + 0.14f*hf*fh2((int)floorf(u), (int)floorf(w)));
        c = mix3(c, v3(0.44f, 0.50f, 0.44f), grout*0.75f);
        c = mix3(c, v3(0.52f, 0.58f, 0.50f), smoothstepf(0.5f, 0.85f, fbm2_lod(p.x, p.z, 3, 0.3f))*0.5f);
        *spec = 0.18f;
        return c;
    }
    case M_WATER: { *spec = 0.55f; return v3(0.185f, 0.255f, 0.238f); }
    case M_ENTITY: {
        /* no albedo, no highlight. it is a hole in the picture. */
        *emis = -1.0f;
        return v3(0,0,0);
    }
    case M_VOIDHOLE: {
        /* whatever is on the other side of the door does not reflect light */
        float n1 = noise3_lod(p, 22.0f);
        *spec = 0.0f;
        return scl(v3(0.020f, 0.019f, 0.018f), 0.6f + 0.8f*n1);
    }
    case M_FARWALL: {
        float g = fbm3_lod(p, 4, 0.35f);
        V3 c = scl(v3(0.255f, 0.250f, 0.245f), 0.60f + 0.55f*g);
        return c;
    }
    default: return v3(0.5f, 0.5f, 0.5f);
    }
}

/* fog colour and density per level */
static void fog_params(V3 *col, float *dens){
    switch (g_scene){
    case SC_ROOM:
    case SC_LEVEL0: *col = v3(0.168f, 0.148f, 0.088f); *dens = 0.0165f; break;
    case SC_TRANS:  *col = v3(0.130f, 0.122f, 0.092f); *dens = 0.0190f; break;
    case SC_LEVEL1: *col = v3(0.112f, 0.114f, 0.118f); *dens = 0.0190f; break;
    case SC_ATRIUM: *col = v3(0.130f, 0.138f, 0.158f); *dens = 0.0112f; break;
    default:        *col = v3(0.0f, 0.0f, 0.0f);       *dens = 0.10f;   break;
    }
}

/* --------------------------------------------------------------- raymarching */
static V3 shade_hit(V3 p, V3 rd, int mat, float dist){
    g_shade_dist = dist;
    V3 n = calc_normal(p);
    float spec, emis;
    V3 alb = mat_albedo(mat, p, n, &spec, &emis);

    V3 col;
    if (emis < 0.0f){                 /* the silhouette */
        col = v3(0.004f, 0.004f, 0.006f);
    } else if (emis > 0.0f){
        col = scl(alb, emis);
    } else {
        Lamp lamps[26];
        int nl = gather_lamps(p, lamps, 26);
        V3 acc = v3(0,0,0);
        for (int i = 0; i < nl; i++){
            V3 ld = sub(lamps[i].pos, p);
            float d2 = dot(ld, ld);
            float d = sqrtf(d2);
            V3 l = scl(ld, 1.0f/maxf(d, 1e-4f));
            float ndl = dot(n, l);
            float diff = maxf(ndl, 0.0f)*0.86f + 0.14f*satf(ndl*0.5f+0.5f);
            float atten = 1.0f/(1.0f + lamps[i].k*d2);
            V3 contrib = scl(lamps[i].col, diff*atten);
            if (spec > 0.001f){
                V3 h = norm3(sub(l, rd));
                float sh = powf(maxf(dot(n,h), 0.0f), 28.0f + spec*90.0f);
                contrib = add(contrib, scl(lamps[i].col, sh*spec*atten*1.6f));
            }
            acc = add(acc, contrib);
        }
        /* a little bounce so the corners are not pitch black */
        V3 amb;
        if (g_scene == SC_ATRIUM){
            float up = satf(n.y*0.5f + 0.5f);
            amb = scl(v3(0.335f, 0.352f, 0.392f), 0.55f + 0.75f*up);
            /* upwelling glow off all that white tile far below */
            amb = add(amb, scl(v3(0.185f, 0.196f, 0.188f), satf(-n.y)*0.9f));
            /* Level 37 keeps its own lights on, whatever they are */
            amb = add(amb, scl(v3(0.92f, 0.95f, 0.90f), smoothstepf(-44.0f, -62.0f, p.y)*0.95f));
        } else {
            amb = scl(v3(0.405f, 0.362f, 0.240f), 0.88f + 0.12f*satf(n.y*0.5f+0.5f));
            /* the carpet throws its colour back at the ceiling tiles */
            amb = add(amb, scl(v3(1.420f, 1.255f, 0.790f), satf(-n.y)));
            if (g_scene == SC_LEVEL1){
                amb = scl(v3(0.248f, 0.256f, 0.272f), 0.82f + 0.18f*satf(n.y));
                amb = add(amb, scl(v3(0.300f, 0.302f, 0.310f), satf(-n.y)));
            }
        }
        acc = add(acc, amb);
        col = mul(alb, acc);

        float ao = calc_ao(p, n);
        col = scl(col, 0.42f + 0.58f*ao);
    }

    /* atmosphere */
    V3 fc; float fd;
    fog_params(&fc, &fd);
    float f = 1.0f - expf(-dist*fd);
    if (mat == M_ENTITY) f *= 0.55f;     /* it stays darker than it should */
    col = mix3(col, fc, satf(f));
    return col;
}

/* how much of the corridor is still visible above, while falling */
static float g_void_glow = 0.0f;

/* returns radiance; sets *hitdist */
static V3 trace(V3 ro, V3 rd, float *hitdist){
    if (g_scene == SC_VOID){
        *hitdist = 1e9f;
        /* the light you fell out of, receding */
        float up = satf(rd.y);
        float core = powf(up, 9.0f) * g_void_glow;
        float halo = powf(up, 2.2f) * g_void_glow * 0.14f;
        return add(scl(v3(0.62f, 0.55f, 0.32f), core), scl(v3(0.14f, 0.13f, 0.10f), halo));
    }
    float t = 0.02f;
    float tmax = (g_scene == SC_ATRIUM) ? 380.0f : 70.0f;
    int mat = M_NONE;
    int maxsteps = (g_scene == SC_ATRIUM) ? 210 : 96;
    float d = 0.0f;
    /* Steel grating is mostly holes. Looking down through it is the only way
     * the drop reads at all, so slots let the ray carry on. */
    for (int seg = 0; seg < 3; seg++){
        int hit = 0;
        for (int i = 0; i < maxsteps; i++){
            V3 p = add(ro, scl(rd, t));
            d = map_scene(p, &mat);
            if (d < 0.0011f*t + 0.0012f){ hit = 1; break; }
            t += d * 0.92f;
            if (t > tmax) break;
        }
        if (!hit || t > tmax || mat != M_GRATE) break;
        V3 p = add(ro, scl(rd, t));
        /* bars have depth: at a grazing angle you see steel, not sky */
        float thr = 0.11f + 0.40f*(1.0f - satf(fabsf(rd.y)*2.4f));
        float gx = fabsf(fmodf(p.x*38.0f + 200.0f, 1.0f) - 0.5f);
        float gz = fabsf(fmodf(p.z*13.0f + 200.0f, 1.0f) - 0.5f);
        if (minf(gx, gz) <= thr) break;
        t += 0.17f;                       /* through the slot */
    }
    *hitdist = t;
    /* Rays that run out of steps are grazing a wall, not missing it. Shading
     * them anyway keeps the step budget from drawing contour lines across
     * every large surface. */
    if (t > tmax){
        V3 fc; float fd;
        fog_params(&fc, &fd);
        if (g_scene == SC_ATRIUM){
            /* looking straight up the shaft: a far-off ceiling glow */
            float up = satf(rd.y);
            return add(scl(fc, 0.9f), scl(v3(0.10f, 0.10f, 0.09f), up*up*1.6f));
        }
        return fc;
    }
    V3 p = add(ro, scl(rd, t));
    return shade_hit(p, rd, mat, t);
}

#endif /* BK_SHADE_H */
