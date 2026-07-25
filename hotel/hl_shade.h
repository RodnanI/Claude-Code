/* hl_shade.h -- materials, the light, the monitor on the desk, and the marcher.
 *
 * Every surface in the hotel is a function. There are no textures: the carpet
 * medallion, the damask, the marble veining, the oak figure, the melted faces
 * in the frames and the attract mode on every cabinet screen are all evaluated
 * per pixel from noise and a handful of shapes.
 *
 * Three things here are worth knowing:
 *
 *  - The monitor on the reception desk samples the *previous finished frame* of
 *    the tape. Point the lens at it and the recursion is real: each generation
 *    picks up another set of scanlines, another pass of grain and another notch
 *    of contrast, so the tunnel comes apart on its own. Driven hard, the
 *    security feed does not go to white -- it loses the picture and falls back
 *    to the radar green the phosphor was built for.
 *
 *  - The fog in the atrium works the other way up. Density *rises* with height,
 *    integrated along the ray, so the escalator can climb into a ceiling that
 *    is never there.
 *
 *  - Mirrors and shop glass trace real rays. The glass traces two: one carried
 *    through it and one off it, which is the only way a boutique looks like it
 *    has anything behind the window.
 */
#ifndef HL_SHADE_H
#define HL_SHADE_H

#define RW 480
#define RH 360
#define OW 640
#define OH 480

static unsigned char *g_feedback;   /* the last frame that went to tape */

static V3    g_fog_col  = { 0.048f, 0.044f, 0.050f };
static float g_fog_dens = 0.024f;
static float g_fog_y0   = 99.0f;
static float g_fog_hs   = 5.0f;
static int   g_fog_up   = 0;        /* the atrium: thicker the higher you look */
static float g_lightgain = 1.0f;
static float g_expo      = 1.0f;
static float g_shade_dist = 0.0f;

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

/* --------------------------------------------- what the desk monitor is doing
 * A house security feed: the camera it is wired to is this one, so the picture
 * it shows contains the picture it shows. Over the top, the character generator
 * the recorder burned in, which is the only thing on the tube that is stable. */
static V3 sec_overlay(V3 c, float u, float v, float t)
{
    /* camera number and a running count, in the corners */
    float ink = text_mask("CAM 04 LOBBY", (u - 0.055f)/0.40f, (v - 0.055f)/0.062f);
    int sec = (int)t;
    char tc[24];
    snprintf(tc, sizeof tc, "%02d-%02d-%02d", (sec/3600)%24, (sec/60)%60, sec%60);
    ink = maxf(ink, text_mask(tc, (u - 0.615f)/0.335f, (v - 0.882f)/0.062f));
    c = add(c, scl(v3(0.62f, 0.95f, 0.66f), ink*0.85f));
    /* the graticule the installer left switched on */
    float gx = fabsf(fractf(u*8.0f) - 0.5f), gy = fabsf(fractf(v*6.0f) - 0.5f);
    float grid = (1.0f - smoothstepf(0.470f, 0.496f, gx)) * 0.0f
               + (gx > 0.478f ? 1.0f : 0.0f) + (gy > 0.478f ? 1.0f : 0.0f);
    c = add(c, scl(v3(0.10f, 0.20f, 0.12f), satf(grid)*0.16f));
    return c;
}
/* and when the feed gives up: the radar sweep the tube was built to draw */
static V3 radar_green(float u, float v, float t)
{
    float x = (u - 0.5f)*1.3333f, y = 0.5f - v;
    float r = len2f(x, y);
    float a = atan2f(y, x);
    float sweep = a - t*2.35f;
    sweep = sweep - 6.2832f*floorf(sweep/6.2832f + 0.5f);   /* -pi..pi behind the head */
    float trail = expf(-fabsf(sweep)*1.35f);
    if (sweep > 0.12f) trail *= 0.06f;
    V3 ph = v3(0.055f, 0.900f, 0.230f);                     /* P1 phosphor */
    float g = 0.026f + 1.10f*trail*smoothstepf(0.52f, 0.46f, r);
    /* range rings and bearing spokes */
    float ring = 0.0f;
    for (int i = 1; i <= 4; i++)
        ring = maxf(ring, 1.0f - smoothstepf(0.0f, 0.006f, fabsf(r - i*0.105f)));
    ring *= 0.22f;
    float spoke = 1.0f - smoothstepf(0.0f, 0.03f, fabsf(fractf(a/6.2832f*12.0f) - 0.5f) - 0.47f);
    ring = maxf(ring, spoke*0.14f);
    g += ring*smoothstepf(0.50f, 0.44f, r);
    /* returns: things out there that are not moving, and the noise they sit in */
    for (int i = 0; i < 9; i++){
        float ba = 6.2832f*fh1(i*7+3), br = 0.07f + 0.40f*fh1(i*13+5);
        float bx = cosf(ba)*br, by = sinf(ba)*br;
        float d = len2f(x-bx, y-by);
        float lit = expf(-d*d*2600.0f);
        float seen = expf(-fabsf(sweep + 0.0f)*1.1f);
        g += lit*(0.25f + 0.75f*seen)*0.70f;
    }
    float n = fh3((int)(u*300.0f), (int)(v*230.0f), (int)(t*70.0f));
    g += (n - 0.5f)*0.17f;
    /* the raster it is drawn on, and the flyback */
    g *= 0.80f + 0.30f*(0.5f + 0.5f*cosf(v*OH*1.1f*PI));
    V3 c = scl(ph, maxf(g, 0.0f)*0.58f);
    c = add(c, scl(v3(0.02f, 0.09f, 0.03f), 0.30f));
    return c;
}
static V3 crt_image(float u, float v, float t)
{
    float dx = u-0.5f, dy = v-0.5f;
    float r2 = dx*dx + dy*dy;
    float k = 1.0f - 0.16f*r2;
    float su = 0.5f + dx*k, sv = 0.5f + dy*k;
    if (su < 0.004f || su > 0.996f || sv < 0.004f || sv > 0.996f)
        return v3(0.008f, 0.010f, 0.009f);

    V3 fb = fb_bilinear(su, sv);
    /* The feed is monochrome, the way a house system was, and it is green.
     * Loop gain has to come out under one: at 1.02 the tunnel pins to a flat
     * rectangle inside ten generations, and there is no recursion left to see.
     * At about 0.93 it nests for a dozen generations and then goes to black,
     * which is what a feed of a feed actually looks like. */
    float y = 0.299f*fb.x + 0.587f*fb.y + 0.114f*fb.z;
    V3 c = v3(y*0.52f, y*1.28f, y*0.63f);
    c = scl(c, 1.02f * g_crt_gain);
    c.y = c.y*1.02f - 0.008f;
    /* the ceiling: bright values compress instead of climbing, so the middle of
     * the tunnel blooms out the way video feedback does and then stops */
    {
        float mx = maxf(c.x, maxf(c.y, c.z));
        if (mx > 0.60f)
            c = scl(c, (0.60f + 0.36f*(1.0f - expf(-(mx - 0.60f)*2.1f)))/mx);
    }
    c = sec_overlay(c, su, sv, t);

    float line = 0.5f + 0.5f*cosf(sv * OH * 1.15f * PI);
    c = scl(c, 0.80f + 0.28f*line);
    float n = fh3((int)(su*900.0f), (int)(sv*700.0f), (int)(t*60.0f));
    c = add(c, scl(v3(0.6f,1.0f,0.7f), (n-0.5f)*0.070f));
    float bar = fractf(sv - t*0.09f);
    c = scl(c, 1.0f + 0.14f*expf(-bar*bar*160.0f));

    /* driven far enough, the sync goes and the tube falls back to radar */
    if (g_feed_break > 0.001f){
        float b = g_feed_break;
        V3 rad = radar_green(su, sv, t*1.0f);
        /* it does not cut -- it tears through, in bands, and the picture rolls */
        float roll = fractf(sv + t*0.31f*b);
        float bnd = fh3((int)(sv*90.0f), (int)(t*26.0f), 3);
        float amt = satf(b*b*(0.80f + 0.45f*bnd));
        c = scl(c, 1.0f - 0.72f*b);
        c = mix3(c, rad, amt);
        if (bnd < 0.22f) c = scl(c, 1.0f - 0.55f*b);
        c = scl(c, 1.0f + 0.40f*b*(roll - 0.45f));
        float hn = fh3((int)(su*240.0f), (int)(sv*180.0f) - (int)(t*19.0f), (int)(t*33.0f));
        c = add(c, scl(v3(0.10f, 0.75f, 0.20f), b*b*(hn - 0.42f)*0.55f));
    }
    c = scl(c, 1.0f - 0.52f*r2);
    c.x = maxf(c.x, 0.0f); c.y = maxf(c.y, 0.0f); c.z = maxf(c.z, 0.0f);
    return c;
}

/* ---------------------------------------------------------------- the lamps */
typedef struct { V3 pos, col; float k; } Lamp;
static Lamp  g_cam_lamps[26];
static int   g_cam_nlamps = 0;

static inline float lamp_flicker(int a, int b, float t)
{
    /* the wiring in this place has not been right for a long time */
    float f = 0.86f + 0.14f*sinf(w_loop(5.3f + 2.1f*fh2(a,b))*t + fh2(a,b+7)*6.28f);
    f *= 0.94f + 0.06f*fbm_loop(t, 3.1f, 2.0f + fh2(a+3,b)*10.0f, 2);
    float dip = fh3(a, b, ((int)(t*2.6f)) % (int)(TAPE_DUR*2.6f));
    if (dip > 0.977f) f *= 0.22f;
    else if (dip > 0.955f) f *= 0.62f;
    return f;
}
static int gather_lamps(V3 p, Lamp *out, int maxn)
{
    int n = 0;
    V3 tung = v3(1.000f, 0.760f, 0.446f);       /* candle lamps, and old ones */
    if (g_scene == SC_CORR || g_scene == SC_CHASE){
        if (g_corr_style == 2){
            /* the service floor is lit by a fluorescent every third cell */
            int px = WC(p.x), pz = WC(p.z);
            for (int oz = -1; oz <= 1; oz++)
                for (int ox = -1; ox <= 1; ox++){
                    int cx = px+ox, cz = pz+oz;
                    if (solidg(&GC, cx, cz)) continue;
                    if ((((cx+cz) % 3) + 3) % 3) continue;
                    if (n >= maxn) break;
                    out[n].pos = v3(CW((float)cx), CORR_H - 0.30f, CW((float)cz));
                    out[n].col = scl(v3(0.86f, 0.95f, 0.84f),
                                     1.35f*g_lamp_gain*lamp_flicker(cx, cz, g_time));
                    out[n].k = 0.16f; n++;
                }
        } else {
            /* the chandeliers, from the lattices they hang on: the nearest
             * fitting of each family, and the next one along in each axis */
            for (int i = 0; i < 3; i++){
                float sc = CHF[i].sc;
                float ox = (i == 1) ? CW(0.0f) : CW(2.0f);
                float oz = (i == 0) ? CW(0.0f) : CW(2.0f);
                float bx = repi(p.x - ox, CHF[i].px);
                float bz = repi(p.z - oz, CHF[i].pz);
                float sx = (p.x - (ox + bx*CHF[i].px)) > 0.0f ? 1.0f : -1.0f;
                float sz = (p.z - (oz + bz*CHF[i].pz)) > 0.0f ? 1.0f : -1.0f;
                for (int a = 0; a <= 1; a++)
                    for (int b = 0; b <= 1; b++){
                        if (n >= maxn) break;
                        float ix = bx + a*sx, iz = bz + b*sz;
                        out[n].pos = v3(ox + ix*CHF[i].px,
                                        CORR_H - 1.04f*sc - 0.235f*sc,
                                        oz + iz*CHF[i].pz);
                        float fl = lamp_flicker((int)ix*7 + i, (int)iz*11, g_time);
                        out[n].col = scl(tung, (1.30f*sc)*g_lamp_gain*fl);
                        out[n].k = 0.052f; n++;
                    }
            }
            /* and the sconces on the four faces of the cell it is standing in */
            int px = WC(p.x), pz = WC(p.z);
            const int DX[4] = { 1,-1, 0, 0 }, DZ[4] = { 0, 0, 1,-1 };
            for (int f = 0; f < 4 && n < maxn-1; f++){
                int cx = px + DX[f], cz = pz + DZ[f];
                if (!solidg(&GC, cx, cz)) continue;
                int face = (f == 0) ? 1 : (f == 1) ? 0 : (f == 2) ? 3 : 2;
                float h = fh3(cx*7 + face, cz*13, 91);
                if (g_corr_style == 1 && h < 0.34f){
                    /* a lift dial, which is the only light a lift lobby gives */
                    out[n].pos = v3(CW((float)cx) - DX[f]*(CELL*0.5f + 0.06f), 2.52f,
                                    CW((float)cz) - DZ[f]*(CELL*0.5f + 0.06f));
                    out[n].col = scl(v3(1.0f, 0.62f, 0.22f), 0.42f*g_lamp_gain);
                    out[n].k = 0.55f; n++;
                    continue;
                }
                if (fh3(cx*11, cz*5 + face, 37) <= 0.30f) continue;
                for (int s = -1; s <= 1 && n < maxn; s += 2){
                    float along = s*0.855f;
                    float wx = CW((float)cx) - DX[f]*(CELL*0.5f + 0.13f);
                    float wz = CW((float)cz) - DZ[f]*(CELL*0.5f + 0.13f);
                    if (DX[f]) wz += along; else wx += along;
                    out[n].pos = v3(wx, 2.245f, wz);
                    out[n].col = scl(tung, 0.95f*g_lamp_gain*lamp_flicker(cx*3+s, cz, g_time));
                    out[n].k = 0.20f; n++;
                }
            }
        }
    } else if (g_scene == SC_LOBBY){
        const float CX[3] = { 0.0f, -7.60f, 7.60f };
        const float CZ[3] = { 1.60f, -6.40f, -6.40f };
        const float CS[3] = { 1.95f, 1.30f, 1.30f };
        for (int i = 0; i < 3 && n < maxn; i++){
            out[n].pos = v3(CX[i], LOB_H - 1.04f*CS[i] - 0.235f*CS[i], CZ[i]);
            out[n].col = scl(tung, 1.85f*CS[i]*g_lamp_gain*lamp_flicker(i*13, 5, g_time));
            out[n].k = 0.026f; n++;
        }
        /* the key wall is lit from under its cornice */
        if (n < maxn){
            out[n].pos = v3(0.0f, 3.05f, 8.05f);
            out[n].col = scl(tung, 1.05f*g_lamp_gain);
            out[n].k = 0.10f; n++;
        }
        /* and the tube itself throws green on the desk */
        if (n < maxn){
            out[n].pos = add(P_CRT, v3(0.0f, 0.02f, -0.20f));
            out[n].col = scl(v3(0.34f, 1.00f, 0.44f), (0.40f + 0.55f*g_feed_break)*g_crt_gain);
            out[n].k = 2.20f; n++;
        }
    } else if (g_scene == SC_MALL){
        /* the shopfront fascias are the only thing lighting the promenade */
        float bi = repi(p.x, BAY);
        for (int i = -1; i <= 1; i++){
            float cx = (bi + i)*BAY;
            for (int lv = 0; lv < 3; lv++){
                float base = (lv == 0) ? 0.0f : (lv == 1 ? LVL1 : LVL2);
                if (fabsf(p.y - base) > 9.0f) continue;
                for (int s = -1; s <= 1 && n < maxn; s += 2){
                    out[n].pos = v3(cx, base + 3.88f, s*(MALL_WALK - 0.35f));
                    float fl = lamp_flicker((int)(bi+i)*5 + lv, s, g_time);
                    V3 tint = v3(1.00f, 0.86f + 0.10f*fh2((int)(bi+i), lv), 0.62f);
                    out[n].col = scl(tint, 2.55f*g_lamp_gain*fl);
                    out[n].k = 0.042f; n++;
                }
            }
        }
        /* the shop interiors, so there is something behind the glass */
        for (int i = -1; i <= 1; i++){
            float cx = (bi + i)*BAY;
            for (int lv = 0; lv < 3; lv++){
                float base = (lv == 0) ? 0.0f : (lv == 1 ? LVL1 : LVL2);
                if (fabsf(p.y - base) > 6.0f) continue;
                for (int sd = -1; sd <= 1 && n < maxn; sd += 2){
                    out[n].pos = v3(cx, base + 2.55f, sd*(MALL_WALK + 1.70f));
                    out[n].col = scl(v3(1.00f, 0.90f, 0.72f),
                                     0.88f*g_lamp_gain*lamp_flicker((int)(bi+i)*3 + lv, sd+7, g_time));
                    out[n].k = 0.095f; n++;
                }
            }
        }
        /* the escalator's own skirt lighting, which is all there is up there */
        if (n < maxn - 1){
            float ca = cosf(ESC_ANG), sa = sinf(ESC_ANG);
            float dalong = (p.x - ESC_X)*ca + p.y*sa;
            for (int k = 0; k <= 1 && n < maxn; k++){
                float dd = dalong + (k ? 5.5f : -3.0f);
                if (dd < -1.0f) dd = -1.0f;
                out[n].pos = v3(ESC_X + dd*ca, dd*sa + 0.90f, ESC_Z + (k ? 0.62f : -0.62f));
                out[n].col = scl(v3(0.86f, 0.84f, 0.90f), 1.05f*g_lamp_gain);
                out[n].k = 0.16f; n++;
            }
        }
        /* the arcade, spilling out of its mouth */
        if (n < maxn && fabsf(p.x - ARC_X) < 26.0f && p.z < 2.0f){
            out[n].pos = v3(ARC_X, 1.90f, ARC_ZI - 1.60f);
            out[n].col = scl(v3(0.52f, 0.68f, 1.00f), 5.20f*g_lamp_gain);
            out[n].k = 0.022f; n++;
        }
        if (n < maxn && fabsf(p.x - ARC_X) < 12.0f && p.z < ARC_ZI + 1.0f){
            out[n].pos = v3(ARC_X, 1.55f, ARC_ZB + 5.20f);
            out[n].col = scl(v3(0.48f, 0.64f, 1.00f), 4.60f*g_lamp_gain);
            out[n].k = 0.024f; n++;
        }
    } else if (g_scene == SC_BALL){
        for (int i = 0; i < 3 && n < maxn; i++){
            float sc = (i == 1) ? 2.75f : 2.15f;
            out[n].pos = v3(-8.60f + 8.60f*i, BAL_H - 1.04f*sc - 0.235f*sc, 0.0f);
            out[n].col = scl(tung, 3.1f*g_lamp_gain*lamp_flicker(i*7, 3, g_time));
            out[n].k = 0.020f; n++;
        }
    } else if (g_scene == SC_STAIR){
        /* a lamp on the shaft wall every fifth tread, going down as far as it goes */
        float pitch = ST_RISE*ST_NS, sect = 2.0f*PI/ST_NS;
        float phi = atan2f(p.z, p.x);
        float w = floorf((p.y/pitch) - phi/(2.0f*PI) + 0.5f);
        float A = phi + 2.0f*PI*w;
        float i0 = floorf(A/(sect*5.0f) + 0.5f);
        for (int k = -1; k <= 1 && n < maxn; k++){
            float ii = (i0 + k)*5.0f;
            float aa = ii*sect;
            out[n].pos = v3(cosf(aa)*(ST_R - 0.42f), ST_RISE*ii + 1.95f, sinf(aa)*(ST_R - 0.42f));
            out[n].col = scl(tung, 1.85f*g_lamp_gain*lamp_flicker((int)ii, 2, g_time));
            out[n].k = 0.085f; n++;
        }
    }
    return n;
}

/* ------------------------------------------------------ detail, band-limited
 * Procedural noise has no mip chain, so any octave finer than a pixel turns
 * into moire. Every pattern here fades toward its own mean once it stops being
 * resolvable, which is why the carpet does not boil at the end of a corridor. */
static inline float lod_px(void){ return maxf(g_shade_dist*0.00235f, 1e-5f); }
static inline float lod_fade(float period){ return smoothstepf(1.7f, 3.6f, period/lod_px()); }
static float noise3_f(V3 p, float freq){
    return mixf(0.5f, noise3(scl(p, freq)), lod_fade(1.0f/freq));
}
static float fbm3_f(V3 p, float freq, int oct){
    float a = 0.5f, s = 0.0f, per = 1.0f/freq;
    V3 q = scl(p, freq);
    for (int i = 0; i < oct; i++){
        s += a*mixf(0.5f, noise3(q), lod_fade(per));
        q = scl(q, 2.03f); a *= 0.5f; per *= 0.5f;
    }
    return s;
}
static float fbm2_f(float x, float y, float freq, int oct){
    return fbm3_f(v3(x, y, 3.7f/freq), freq, oct);
}
/* a hard edge, fading to its duty cycle when it is finer than a pixel */
static float step_f(float e0, float e1, float x, float period, float duty){
    return mixf(duty, smoothstepf(e0, e1, x), lod_fade(period));
}
/* when the building stops holding still, the patterns leave the surfaces */
static V3 slide_p(V3 p)
{
    if (g_slide <= 0.001f) return p;
    float k = g_slide;
    float a = fbm3(v3(p.x*0.28f, p.y*0.32f, g_time*0.52f), 3) - 0.5f;
    float b = fbm3(v3(p.z*0.30f + 7.0f, p.y*0.27f, g_time*0.44f + 2.0f), 3) - 0.5f;
    return v3(p.x + k*1.05f*a, p.y + k*(1.55f*b - g_time*0.42f), p.z + k*1.05f*a);
}
/* recover the frame of a corridor wall from the point and its normal: which
 * solid cell it belongs to, and how far along the face it is */
static void wall_local(V3 p, V3 n, float *along, int *cx, int *cz, int *isx)
{
    int ix = fabsf(n.x) > fabsf(n.z);
    float ox = ix ? (n.x > 0.0f ? -0.30f : 0.30f) : 0.0f;
    float oz = ix ? 0.0f : (n.z > 0.0f ? -0.30f : 0.30f);
    int qx = WC(p.x + ox), qz = WC(p.z + oz);
    *cx = qx; *cz = qz; *isx = ix;
    if (ix) *along = (n.x > 0.0f) ? (p.z - CW((float)qz)) : -(p.z - CW((float)qz));
    else    *along = (n.z > 0.0f) ? -(p.x - CW((float)qx)) : (p.x - CW((float)qx));
}

/* ------------------------------------------------- a face that did not survive
 * The sitter is painted the way they were painted. Then everything below the
 * brow is sampled through a downward displacement that grows as it falls, so
 * the features slide off the skull and run into the collar. */
static V3 portrait_paint(float u, float v, int seed)
{
    float craq = fbm2_f(u*1.3f + seed, v*1.3f, 26.0f, 3);
    V3 ground = mix3(v3(0.052f, 0.040f, 0.028f), v3(0.088f, 0.066f, 0.040f), craq);
    ground = scl(ground, 1.0f - 0.45f*satf(len2f(u, v)*0.9f));
    /* the varnish has gone brown in rings */
    ground = scl(ground, 0.85f + 0.30f*fbm2_f(u*0.7f, v*0.7f, 1.6f, 3));

    /* how far this height has run. Nothing above the brow has moved. */
    float melt = smoothstepf(0.52f, -0.95f, v);
    melt *= 0.55f + 0.60f*fbm2_f(u*2.1f + seed*3, v*0.55f, 2.4f, 3);
    float mu = u + 0.10f*melt*(fbm2_f(u*3.0f, v*1.1f + seed, 3.1f, 2) - 0.5f);
    float mv = v + 0.62f*melt;                 /* sampled from further up */

    V3 c = ground;
    /* the shoulders and the collar */
    float sh = 1.0f - smoothstepf(0.0f, 0.05f,
                 len2f(u*0.62f, (v + 0.86f)*1.35f) - 0.60f);
    c = mix3(c, v3(0.045f, 0.036f, 0.030f), sh);
    float col = 1.0f - smoothstepf(0.0f, 0.04f, len2f(u*1.5f, (v + 0.50f)*2.6f) - 0.30f);
    c = mix3(c, v3(0.500f, 0.462f, 0.400f), col*0.85f*(1.0f - melt*0.75f));

    /* the head, which has begun to slump */
    float hw = 0.315f*(1.0f + 0.42f*melt);
    float hh = 0.415f;
    float head = len2f(mu/hw, (mv - 0.235f)/hh) - 1.0f;
    float hm = 1.0f - smoothstepf(0.0f, 0.035f, head);
    V3 skin = mix3(v3(0.415f, 0.318f, 0.252f), v3(0.520f, 0.408f, 0.325f),
                   fbm2_f(mu*4.0f, mv*4.0f, 7.0f, 2));
    /* lit from the sitter's left, the way they all were */
    skin = scl(skin, 0.62f + 0.55f*satf(0.5f - mu*1.4f));
    c = mix3(c, skin, hm);
    /* hair, or a bonnet, over the top of it */
    float hair = 1.0f - smoothstepf(0.0f, 0.05f,
                   len2f(u/(hw*1.30f), (v - 0.335f)/(hh*1.15f)) - 1.0f);
    hair *= smoothstepf(0.18f, 0.42f, v + 0.30f*fbm2_f(u*3.0f, v*3.0f, 4.0f, 2));
    c = mix3(c, scl(v3(0.075f, 0.058f, 0.045f), 0.7f + 0.6f*fbm2_f(u*6.0f, v*6.0f, 9.0f, 2)), hair);

    if (hm > 0.02f){
        /* the eyes: two sockets, and they have run into each other */
        for (int s = -1; s <= 1; s += 2){
            float ex = mu - s*0.128f, ey = mv - 0.300f;
            float smear = melt*1.30f;
            float e = len2f(ex/(0.062f*(1.0f + smear*0.8f)), ey/(0.036f*(1.0f + smear*3.4f)));
            float em = 1.0f - smoothstepf(0.75f, 1.15f, e);
            c = mix3(c, v3(0.055f, 0.042f, 0.038f), em*hm*0.92f);
            float br = 1.0f - smoothstepf(0.80f, 1.20f,
                        len2f(ex/0.088f, (ey - 0.070f)/0.020f));
            c = mix3(c, v3(0.100f, 0.076f, 0.058f), br*hm*0.55f);
        }
        /* the mouth, which is now most of the lower half of the face */
        float mx = mu, my = mv - 0.075f;
        float mo = len2f(mx/(0.098f*(1.0f + melt*1.1f)), my/(0.030f*(1.0f + melt*5.0f)));
        c = mix3(c, v3(0.115f, 0.058f, 0.052f), (1.0f - smoothstepf(0.70f, 1.25f, mo))*hm*0.88f);
        /* the nose is a highlight and a shadow, and both have slid */
        float nz = 1.0f - smoothstepf(0.55f, 1.05f, len2f((mx - 0.014f)/0.030f, (my - 0.130f)/0.085f));
        c = add(c, scl(v3(0.070f, 0.055f, 0.042f), nz*hm*(1.0f - melt*0.6f)));
    }
    /* and it is running down over the collar in strings */
    float drip = 0.0f;
    {
        float dn = fbm2_f(u*7.0f + seed*5, 0.0f, 6.0f, 2);
        float reach = -0.10f - 0.95f*dn;
        drip = smoothstepf(reach - 0.10f, reach + 0.16f, v) * (1.0f - smoothstepf(0.10f, 0.30f, v));
        drip *= smoothstepf(0.62f, 0.80f, fbm2_f(u*11.0f + seed, v*0.6f, 9.0f, 2)) * 1.5f;
    }
    c = mix3(c, scl(skin, 0.72f), satf(drip)*0.85f);
    return c;
}
/* what a cabinet is playing to an empty room */
static V3 cab_screen(float u, float v, float t, int seed)
{
    int kind = (int)(fh1(seed*7+1)*3.0f) % 3;
    V3 c = v3(0.010f, 0.012f, 0.022f);
    if (kind == 0){
        /* a maze, and something going round it on its own */
        float gx = fractf(u*9.0f), gy = fractf(v*7.0f);
        int   ix = (int)(u*9.0f), iy = (int)(v*7.0f);
        float wall = (fh2(ix*13+seed, iy*7) > 0.42f) ? 1.0f : 0.0f;
        float line = (1.0f - smoothstepf(0.06f, 0.12f, fabsf(gx-0.5f)))
                   * (1.0f - smoothstepf(0.06f, 0.12f, fabsf(gy-0.5f)));
        c = add(c, scl(v3(0.10f, 0.22f, 0.95f), wall*(0.35f + 0.65f*line)*0.55f));
        float dot = (fh2(ix*5, iy*11) > 0.55f) ? 1.0f : 0.0f;
        c = add(c, scl(v3(0.95f, 0.85f, 0.35f), dot*(1.0f-wall)*0.45f
                   *(1.0f - smoothstepf(0.10f, 0.20f, len2f(gx-0.5f, gy-0.5f)))));
        float px = fractf(t*0.21f + fh1(seed)*3.0f), py = 0.5f + 0.34f*sinf(t*0.9f);
        c = add(c, scl(v3(1.0f, 0.92f, 0.20f),
                 (1.0f - smoothstepf(0.02f, 0.055f, len2f(u-px, v-py)))*1.6f));
    } else if (kind == 1){
        /* a starfield, and a ship nobody is flying */
        for (int i = 0; i < 26; i++){
            float sx = fractf(fh1(i*3+seed) + t*(0.05f + 0.16f*fh1(i*7)));
            float sy = fh1(i*11+seed*3);
            float b = 0.4f + 0.6f*fh1(i*5);
            c = add(c, scl(v3(0.8f, 0.86f, 1.0f),
                     (1.0f - smoothstepf(0.004f, 0.012f, len2f(u-sx, v-sy)))*b));
        }
        float sy2 = 0.5f + 0.22f*sinf(t*0.7f + seed);
        float tri = fabsf(v - sy2)*3.4f + (u - 0.16f)*1.0f;
        c = add(c, scl(v3(0.20f, 1.00f, 0.55f),
                 (1.0f - smoothstepf(0.0f, 0.03f, tri - 0.04f))
                *(1.0f - smoothstepf(0.10f, 0.13f, fabsf(u - 0.20f)))*1.3f));
        c = add(c, scl(v3(0.9f, 0.3f, 0.2f), (fractf(t*3.0f) < 0.3f && u > 0.24f && u < 0.85f
                 && fabsf(v - sy2) < 0.012f) ? 1.2f : 0.0f));
    } else {
        /* rows of them, coming down */
        float march = floorf(t*1.6f);
        float ox = 0.10f + 0.055f*(fractf(march*0.5f) < 0.5f ? 1.0f : 0.0f);
        float oy = 0.10f + 0.030f*fmodf(march, 5.0f);
        float gx = fractf((u - ox)*7.0f), gy = fractf((v - oy)*5.0f);
        int   ix = (int)((u - ox)*7.0f), iy = (int)((v - oy)*5.0f);
        if (u > ox && v > oy && iy < 4 && ix < 7){
            float body = (1.0f - smoothstepf(0.28f, 0.36f, len2f(gx-0.5f, (gy-0.5f)*1.7f)));
            V3 col = (iy == 0) ? v3(0.95f,0.35f,0.85f) : (iy < 2) ? v3(0.35f,0.95f,0.85f)
                                                                  : v3(0.45f,0.95f,0.35f);
            c = add(c, scl(col, body*0.95f));
        }
        float bx = 0.5f + 0.36f*sinf(t*1.1f);
        c = add(c, scl(v3(0.4f, 1.0f, 0.4f),
                 (1.0f - smoothstepf(0.0f, 0.02f, sdBox2(u-bx, v-0.93f, 0.055f, 0.016f)))*1.1f));
    }
    c = add(c, v3(0.048f, 0.082f, 0.170f));
    /* the tube it is on */
    c = scl(c, 0.78f + 0.30f*(0.5f + 0.5f*cosf(v*420.0f*PI)));
    c = add(c, scl(v3(0.6f,0.7f,1.0f), (fh3((int)(u*300.0f), (int)(v*240.0f), (int)(t*40.0f))-0.5f)*0.10f));
    return c;
}
/* Lettering fades to its own coverage once the strokes stop being resolvable.
 * Without this, a backlit fascia thirty metres down the promenade turns into a
 * picket fence of clipped primaries. */
static float text_lod(float ink, float stroke){
    return mixf(0.30f, ink, lod_fade(stroke));
}
/* a dial: a white face, roman ticks, and two hands that are not right */
static V3 dial_paint(float u, float v, int seed, float *emis)
{
    float r = len2f(u, v);
    if (r > 1.0f){ *emis = 0.0f; return v3(0.30f, 0.28f, 0.24f); }
    V3 c = mix3(v3(0.760f, 0.726f, 0.640f), v3(0.620f, 0.575f, 0.470f),
                fbm2_f(u*2.0f + seed, v*2.0f, 3.0f, 3));
    c = scl(c, 1.0f - 0.22f*r*r);
    /* the chapter ring */
    float a = atan2f(v, u);
    float tick = fabsf(fractf(a/6.2832f*60.0f) - 0.5f);
    float minute = (1.0f - smoothstepf(0.36f, 0.46f, tick))
                 * smoothstepf(0.80f, 0.84f, r)*(1.0f - smoothstepf(0.90f, 0.93f, r));
    float tick5 = fabsf(fractf(a/6.2832f*12.0f) - 0.5f);
    float hour = (1.0f - smoothstepf(0.30f, 0.42f, tick5))
               * smoothstepf(0.70f, 0.75f, r)*(1.0f - smoothstepf(0.90f, 0.94f, r));
    c = mix3(c, v3(0.075f, 0.065f, 0.055f), satf(minute*0.75f + hour));
    /* the hands. Every clock in the building has its own idea. */
    float t1 = 6.2832f*fh1(seed*13+1), t2 = 6.2832f*fh1(seed*7+5);
    for (int h = 0; h < 2; h++){
        float ang = h ? t2 : t1;
        float len = h ? 0.82f : 0.55f;
        float w   = h ? 0.030f : 0.046f;
        float hx = u*cosf(ang) + v*sinf(ang);
        float hy = -u*sinf(ang) + v*cosf(ang);
        float d = sdBox2(hx - len*0.5f, hy, len*0.5f, w);
        c = mix3(c, v3(0.055f, 0.048f, 0.042f), 1.0f - smoothstepf(0.0f, 0.018f, d));
    }
    c = mix3(c, v3(0.10f, 0.09f, 0.08f), 1.0f - smoothstepf(0.030f, 0.045f, r));
    *emis = 0.0f;
    return c;
}

/* ---------------------------------------------------------------- the surfaces */
static V3 mat_albedo(int mat, V3 p, V3 n, float *spec, float *emis)
{
    *spec = 0.0f; *emis = 0.0f;
    switch (mat){

    /* ------------------------------------------------------------- floors */
    case M_CARPET: case M_CARTDECK: case M_DAIS: {
        V3 sp = slide_p(p);
        float per = 1.240f;
        float cx = sp.x/per, cz = sp.z/per;
        int   colm = (int)floorf(cx);
        float zz = cz + ((colm & 1) ? 0.5f : 0.0f);
        float fx = fractf(cx) - 0.5f, fz = fractf(zz) - 0.5f;
        float r = len2f(fx, fz), a = atan2f(fz, fx);
        V3 ground = v3(0.1520f, 0.0225f, 0.0320f);
        V3 gold   = v3(0.1850f, 0.1180f, 0.0430f);
        V3 dark   = v3(0.0730f, 0.0120f, 0.0185f);
        /* an eight-lobed medallion, a ring round it, and a fleur at the corners */
        float lobe = 0.208f + 0.062f*cosf(a*8.0f);
        float med  = 1.0f - step_f(lobe - 0.014f, lobe + 0.014f, r, per, 0.20f);
        float hole = 1.0f - step_f(0.088f, 0.104f, r, per, 0.05f);
        float ring = (1.0f - step_f(0.0f, 0.016f, fabsf(r - 0.330f) - 0.014f, per, 0.10f));
        float cor  = 1.0f - step_f(0.0f, 0.020f,
                        len2f(fabsf(fx) - 0.5f, fabsf(fz) - 0.5f) - 0.098f, per, 0.06f);
        V3 c = ground;
        c = mix3(c, dark, satf(med)*0.85f);
        c = mix3(c, gold, satf(hole + ring*0.9f + cor*0.8f)*0.80f);
        /* the pile, and the traffic that has been over it */
        float pile = fbm3_f(p, 34.0f, 3);
        c = scl(c, 0.74f + 0.52f*pile);
        float wear = fbm3_f(add(p, v3(11,0,3)), 0.16f, 4);
        c = scl(c, 0.80f + 0.34f*wear);
        c = mix3(c, scl(c, 0.66f), satf((fbm3_f(add(p, v3(3,7,1)), 0.55f, 3) - 0.56f)*3.0f)*0.7f);
        if (mat == M_CARTDECK || mat == M_DAIS) c = scl(c, 0.88f);
        *spec = 0.015f;
        return c;
    }
    case M_MARBLEFLOOR: {
        float tp = 1.180f;
        float gx = fabsf(fractf(p.x/tp) - 0.5f), gz = fabsf(fractf(p.z/tp) - 0.5f);
        float grout = maxf(step_f(0.470f, 0.492f, gx, tp, 0.05f),
                           step_f(0.470f, 0.492f, gz, tp, 0.05f));
        int   ix = (int)floorf(p.x/tp), iz = (int)floorf(p.z/tp);
        float shade = 0.86f + 0.24f*fh2(ix*13, iz*7);
        /* veining, following its own direction in every slab */
        float ang = 6.2832f*fh2(ix*5, iz*11);
        float vx = p.x*cosf(ang) + p.z*sinf(ang);
        float vz = -p.x*sinf(ang) + p.z*cosf(ang);
        float vein = fbm2_f(vx*0.9f, vz*3.6f, 1.5f, 4);
        float vk = satf(1.0f - fabsf(vein - 0.52f)*11.0f);
        V3 c = mix3(v3(0.395f, 0.375f, 0.345f), v3(0.492f, 0.470f, 0.438f),
                    fbm2_f(p.x, p.z, 1.1f, 3));
        c = mix3(c, v3(0.245f, 0.230f, 0.235f), vk*0.72f);
        c = scl(c, shade);
        /* a dark inlay band running the length of the promenade */
        float band = 1.0f - step_f(0.0f, 0.030f, fabsf(fabsf(p.z) - 4.60f) - 0.130f, 0.3f, 0.0f);
        c = mix3(c, v3(0.088f, 0.070f, 0.062f), band*0.9f);
        c = mix3(c, v3(0.300f, 0.286f, 0.268f), grout*0.85f);
        c = scl(c, 0.82f + 0.30f*fbm3_f(p, 0.28f, 3));
        *spec = 0.42f*(1.0f - grout*0.7f);
        return c;
    }
    case M_PARQUET: {
        /* herringbone, and a radial inlay where the floor was meant to be seen */
        float bl = 0.400f, bw = 0.088f;
        float u = p.x, v = p.z;
        float d1 = (u + v)*0.7071f, d2 = (u - v)*0.7071f;
        int   blk = ((int)floorf(d1/bl) + (int)floorf(d2/bl)) & 1;
        float su = blk ? d1 : d2, sv = blk ? d2 : d1;
        float e1 = fabsf(fractf(su/bw) - 0.5f), e2 = fabsf(fractf(sv/bl) - 0.5f);
        float seam = maxf(step_f(0.430f, 0.492f, e1, bw, 0.10f),
                          step_f(0.455f, 0.492f, e2, bl, 0.06f));
        int   bi = (int)floorf(su/bw), bj = (int)floorf(sv/bl);
        float tone = 0.80f + 0.42f*fh2(bi*17, bj*5);
        float grain = fbm2_f(su*1.0f, sv*7.0f, 6.0f, 3);
        V3 c = mix3(v3(0.148f, 0.086f, 0.044f), v3(0.232f, 0.146f, 0.076f), grain);
        c = scl(c, tone);
        float rr = len2f(p.x, p.z);
        float inl = 1.0f - step_f(0.0f, 0.035f, fabsf(rr - 5.60f) - 0.110f, 0.4f, 0.0f);
        inl = maxf(inl, 1.0f - step_f(0.0f, 0.035f, fabsf(rr - 5.05f) - 0.045f, 0.4f, 0.0f));
        c = mix3(c, v3(0.062f, 0.038f, 0.026f), inl*0.85f);
        c = mix3(c, v3(0.060f, 0.036f, 0.022f), seam*0.75f);
        /* wax, and the dust on it */
        float dust = satf(fbm3_f(p, 0.42f, 4)*1.5f - 0.45f);
        c = mix3(c, v3(0.150f, 0.140f, 0.128f), dust*0.30f);
        *spec = 0.52f*(1.0f - dust*0.75f)*(1.0f - seam*0.6f);
        return c;
    }
    case M_SERVFLOOR: {
        float sc = fbm3_f(p, 3.2f, 4);
        V3 c = mix3(v3(0.098f, 0.098f, 0.094f), v3(0.150f, 0.148f, 0.140f), sc);
        float scuff = satf(fbm3_f(add(p, v3(4,1,9)), 0.9f, 3)*1.7f - 0.55f);
        c = scl(c, 0.80f + 0.35f*scuff);
        *spec = 0.16f;
        return c;
    }
    /* ------------------------------------------------------------ ceilings */
    case M_CEILING: {
        /* coffers, and a plaster rose under every fitting */
        float per = CELL;
        float fx = fabsf(fractf(p.x/per) - 0.5f), fz = fabsf(fractf(p.z/per) - 0.5f);
        float rail = maxf(step_f(0.380f, 0.430f, fx, per, 0.2f),
                          step_f(0.380f, 0.430f, fz, per, 0.2f));
        V3 c = mix3(v3(0.360f, 0.334f, 0.288f), v3(0.470f, 0.444f, 0.396f), rail);
        /* the stain that comes through every ceiling in this building */
        float st = fbm3_f(v3(p.x, 0.0f, p.z), 0.19f, 4);
        c = mix3(c, v3(0.215f, 0.176f, 0.128f), satf((st - 0.50f)*2.6f)*0.80f);
        c = scl(c, 0.86f + 0.26f*fbm3_f(v3(p.x, 0.0f, p.z), 1.7f, 3));
        if (g_scene == SC_CORR || g_scene == SC_CHASE){
            float bd = 1e9f;
            for (int i = 0; i < 3; i++){
                float ox = (i == 1) ? CW(0.0f) : CW(2.0f);
                float oz = (i == 0) ? CW(0.0f) : CW(2.0f);
                float lx = rep1(p.x - ox, CHF[i].px), lz = rep1(p.z - oz, CHF[i].pz);
                bd = minf(bd, len2f(lx, lz)/CHF[i].sc);
            }
            float rose = 1.0f - step_f(0.0f, 0.03f, bd - 0.52f, 0.3f, 0.0f);
            float rr2 = 1.0f - step_f(0.0f, 0.03f, fabsf(bd - 0.38f) - 0.05f, 0.3f, 0.0f);
            c = mix3(c, v3(0.500f, 0.472f, 0.418f), rose*0.6f);
            c = mix3(c, v3(0.300f, 0.276f, 0.238f), rr2*0.7f);
        }
        *spec = 0.02f;
        return c;
    }
    case M_MALLCEIL: {
        V3 c = mix3(v3(0.045f, 0.046f, 0.050f), v3(0.078f, 0.079f, 0.084f), fbm3_f(p, 0.7f, 3));
        /* deck ribs, if you can see that far up */
        float rib = 1.0f - step_f(0.0f, 0.05f, fabsf(fractf(p.x/1.6f) - 0.5f) - 0.40f, 1.6f, 0.0f);
        c = scl(c, 0.85f + 0.30f*rib);
        *spec = 0.05f;
        return c;
    }
    /* -------------------------------------------------------------- joinery */
    case M_OAK: case M_DOOR: case M_CLOCKCASE: case M_MAHOGANY: {
        float red = (mat == M_MAHOGANY) ? 1.0f : (mat == M_CLOCKCASE) ? 0.55f : 0.0f;
        V3 lo = mix3(v3(0.0620f, 0.0345f, 0.0200f), v3(0.1030f, 0.0330f, 0.0195f), red);
        V3 hi = mix3(v3(0.1160f, 0.0685f, 0.0395f), v3(0.1880f, 0.0715f, 0.0410f), red);
        /* the grain runs up the stiles: stretched in y, tight across */
        float g1 = fbm3_f(v3(p.x*4.6f, p.y*0.42f, p.z*4.6f), 1.0f, 4);
        float g2 = noise3_f(v3(p.x*17.0f, p.y*1.4f, p.z*17.0f), 1.0f);
        float fig = satf(0.55f*g1 + 0.45f*g2);
        V3 c = mix3(lo, hi, fig);
        /* ray fleck, the way quartersawn oak does it */
        float fl = satf((noise3_f(v3(p.x*30.0f, p.y*2.2f, p.z*30.0f), 1.0f) - 0.62f)*5.0f);
        c = mix3(c, scl(hi, 1.35f), fl*0.30f);
        if (mat == M_DOOR){
            /* four panels, a kick plate, and the varnish worn off round the handle */
            float along; int cx, cz, isx;
            wall_local(p, n, &along, &cx, &cz, &isx);
            float ph = p.y;
            float pu = fabsf(along) - 0.180f;
            float inpanel = (1.0f - smoothstepf(0.0f, 0.02f, pu - 0.135f));
            float band = smoothstepf(0.16f, 0.19f, ph)*(1.0f - smoothstepf(0.93f, 0.96f, ph));
            band = maxf(band, smoothstepf(1.06f, 1.09f, ph)*(1.0f - smoothstepf(1.92f, 1.95f, ph)));
            float rec = inpanel*band;
            c = scl(c, 0.80f + 0.34f*rec);
            float kick = 1.0f - smoothstepf(0.26f, 0.29f, ph);
            c = mix3(c, v3(0.240f, 0.180f, 0.078f), kick*0.85f);
            float hand = 1.0f - smoothstepf(0.06f, 0.16f, len2f(along - 0.408f, ph - 1.010f));
            c = scl(c, 1.0f + 0.35f*hand);
        }
        *spec = (mat == M_MAHOGANY) ? 0.60f : 0.34f;
        *spec *= 0.55f + 0.55f*satf(fbm3_f(p, 0.7f, 3));
        return c;
    }
    case M_WALLPAPER: {
        V3 sp = slide_p(p);
        /* damask: an ogee frame with a palmette in it, on a half-drop repeat */
        float per = 0.520f;
        float u = (fabsf(n.x) > fabsf(n.z)) ? sp.z : sp.x;
        float cu = u/per, cv = sp.y/per*0.78f;
        int   colm = (int)floorf(cu);
        float vv = cv + ((colm & 1) ? 0.5f : 0.0f);
        float fu = fractf(cu) - 0.5f, fv = fractf(vv) - 0.5f;
        float ogee = fabsf(fu) + 0.62f*fabsf(fv) - 0.30f*cosf(fv*6.2832f)*0.5f;
        float frame = 1.0f - step_f(0.0f, 0.030f, fabsf(ogee) - 0.045f, per, 0.16f);
        float pal = 0.0f;
        {
            float a = atan2f(fv, fu*1.35f);
            float rr = len2f(fu*1.35f, fv);
            float lobe = 0.115f + 0.052f*cosf(a*5.0f + 1.57f);
            pal = 1.0f - step_f(lobe - 0.012f, lobe + 0.012f, rr, per, 0.12f);
        }
        V3 ground = v3(0.0880f, 0.0430f, 0.0330f);
        V3 motif  = v3(0.1650f, 0.1160f, 0.0530f);
        V3 c = mix3(ground, motif, satf(frame*0.85f + pal*0.75f));
        /* the paper has been up a long time: sun, damp from the top, seams */
        float damp = satf(fbm3_f(p, 0.24f, 4)*1.6f - 0.55f);
        c = mix3(c, v3(0.135f, 0.108f, 0.070f), damp*0.55f);
        c = scl(c, 0.86f + 0.28f*fbm3_f(p, 2.4f, 3));
        float seam = 1.0f - step_f(0.0f, 0.006f, fabsf(fractf(u/0.530f) - 0.5f) - 0.492f, 0.53f, 0.0f);
        c = scl(c, 1.0f - 0.20f*seam);
        c = scl(c, 1.0f - 0.30f*smoothstepf(2.30f, 2.78f, p.y));
        *spec = 0.05f;
        return c;
    }
    case M_MOLDING: case M_PILASTER: case M_SHOPFIT: {
        V3 base = (mat == M_SHOPFIT) ? v3(0.115f, 0.108f, 0.098f)
                                     : v3(0.372f, 0.348f, 0.302f);
        float grub = fbm3_f(p, 0.85f, 4);
        V3 c = scl(base, 0.78f + 0.40f*grub);
        c = mix3(c, scl(base, 0.52f), satf((fbm3_f(add(p,v3(2,5,1)), 3.4f, 3) - 0.58f)*3.0f)*0.5f);
        if (mat == M_PILASTER){
            /* fluting on the shaft, gold on the capital */
            float u = (fabsf(n.x) > fabsf(n.z)) ? p.z : p.x;
            float fl = 1.0f - step_f(0.0f, 0.02f, fabsf(fractf(u/0.075f) - 0.5f) - 0.30f, 0.075f, 0.4f);
            c = scl(c, 0.82f + 0.26f*fl);
            if (p.y > 7.86f) c = mix3(c, v3(0.430f, 0.318f, 0.110f), 0.75f);
        }
        *spec = 0.10f;
        return c;
    }
    case M_BASEBOARD: {
        V3 c = v3(0.058f, 0.038f, 0.030f);
        c = scl(c, 0.75f + 0.45f*fbm3_f(p, 3.0f, 3));
        float scuff = satf(fbm3_f(add(p, v3(7,2,4)), 6.0f, 3)*1.8f - 0.65f);
        c = mix3(c, v3(0.140f, 0.126f, 0.112f), scuff*0.55f);
        *spec = 0.14f;
        return c;
    }
    case M_VELVETWALL: case M_DRAPE: {
        V3 sp = slide_p(p);
        float u = (fabsf(n.x) > fabsf(n.z)) ? sp.z : sp.x;
        V3 deep = (mat == M_DRAPE) ? v3(0.0940f, 0.0150f, 0.0270f) : v3(0.0760f, 0.0160f, 0.0290f);
        /* the nap: it goes light where it is bent toward you */
        float fold = 0.5f + 0.5f*cosf(u*11.5f);
        float fine = fbm3_f(p, 5.5f, 3);
        V3 c = scl(deep, 0.55f + 0.95f*fold*fold);
        c = scl(c, 0.82f + 0.34f*fine);
        /* dust, in the folds, where it always is */
        c = mix3(c, v3(0.105f, 0.088f, 0.082f), satf((1.0f - fold)*fbm3_f(p, 0.8f, 3)*1.4f - 0.35f)*0.35f);
        /* velvet lit at a glance is mostly rim */
        float rim = powf(1.0f - satf(fabsf(dot(n, v3(0,1,0)))), 1.0f);
        c = scl(c, 0.85f + 0.30f*rim);
        *spec = 0.06f;
        return c;
    }
    case M_MARBLE: case M_PIER: case M_FOUNTSTONE: {
        float vein = fbm3_f(v3(p.x*0.9f, p.y*0.30f, p.z*0.9f), 1.4f, 4);
        float vk = satf(1.0f - fabsf(vein - 0.50f)*9.0f);
        V3 c = mix3(v3(0.475f, 0.452f, 0.418f), v3(0.585f, 0.560f, 0.520f), fbm3_f(p, 0.8f, 3));
        c = mix3(c, v3(0.255f, 0.240f, 0.238f), vk*0.68f);
        if (mat == M_FOUNTSTONE){
            /* it has been wet for years */
            float wet = satf((0.95f - p.y)*1.2f);
            c = scl(c, 0.62f + 0.30f*(1.0f - wet));
            float stain = fbm3_f(v3(p.x*2.0f, p.y*0.5f, p.z*2.0f), 1.1f, 4);
            c = mix3(c, v3(0.115f, 0.126f, 0.098f), satf((stain - 0.44f)*2.4f)*wet*0.85f);
            *spec = 0.20f + 0.35f*wet;
            return c;
        }
        c = scl(c, 0.84f + 0.28f*fbm3_f(p, 0.35f, 3));
        *spec = 0.34f;
        return c;
    }
    case M_CINDER: {
        float bh = 0.195f, bl = 0.395f;
        float row = floorf(p.y/bh);
        float off = ((int)row & 1) ? 0.5f : 0.0f;
        float u = (fabsf(n.x) > fabsf(n.z)) ? p.z : p.x;
        float ex = fabsf(fractf(u/bl + off) - 0.5f), ey = fabsf(fractf(p.y/bh) - 0.5f);
        float joint = maxf(step_f(0.440f, 0.490f, ex, bl, 0.08f),
                          step_f(0.410f, 0.480f, ey, bh, 0.12f));
        V3 c = v3(0.238f, 0.240f, 0.230f);
        c = scl(c, 0.80f + 0.36f*fh2((int)floorf(u/bl + off), (int)row));
        c = scl(c, 0.84f + 0.30f*fbm3_f(p, 8.0f, 3));
        c = mix3(c, v3(0.175f, 0.176f, 0.170f), joint*0.8f);
        *spec = 0.05f;
        return c;
    }
    /* ---------------------------------------------------------------- metal */
    case M_BRASS: case M_BRASSDULL: case M_MIRRORFRAME: case M_CHANDARM:
    case M_SCONCE: case M_LAMPBASE: case M_KEYTAG: case M_PLANTPOT:
    case M_HANDRAIL: case M_CART: {
        float tarn = fbm3_f(p, 2.6f, 4);
        V3 bright = v3(0.760f, 0.590f, 0.265f);
        V3 dulled = v3(0.230f, 0.180f, 0.098f);
        float k = satf((tarn - 0.36f)*2.1f);
        if (mat == M_BRASSDULL) k = satf(k*1.5f + 0.28f);
        V3 c = mix3(bright, dulled, k);
        /* handled brass stays bright where hands go */
        if (mat == M_HANDRAIL) c = mix3(c, bright, satf(n.y)*0.55f);
        c = scl(c, 0.80f + 0.36f*fbm3_f(p, 11.0f, 3));
        *spec = 0.90f*(1.0f - 0.60f*k);
        return c;
    }
    case M_BRASSRUST: case M_ESCSIDE: case M_ESCSTEP: case M_STEEL: case M_CONDUIT: {
        float r = fbm3_f(p, 1.9f, 4);
        float rust = satf((r - 0.42f)*2.6f);
        V3 metal = (mat == M_ESCSIDE || mat == M_STEEL || mat == M_CONDUIT)
                     ? v3(0.300f, 0.305f, 0.315f) : v3(0.520f, 0.400f, 0.185f);
        V3 ox = mix3(v3(0.230f, 0.098f, 0.038f), v3(0.330f, 0.170f, 0.070f), fbm3_f(p, 7.0f, 3));
        V3 c = mix3(metal, ox, rust);
        /* it weeps downward out of every fixing */
        float weep = satf(fbm3_f(v3(p.x*3.0f, p.y*0.30f, p.z*3.0f), 1.0f, 4)*1.8f - 0.62f);
        c = mix3(c, scl(ox, 0.75f), weep*0.70f);
        c = scl(c, 0.82f + 0.32f*fbm3_f(p, 14.0f, 2));
        *spec = 0.55f*(1.0f - rust*0.80f);
        return c;
    }
    case M_GILT: {
        float wear = fbm3_f(p, 5.0f, 4);
        V3 gold = v3(0.700f, 0.520f, 0.185f);
        V3 gesso = v3(0.310f, 0.278f, 0.230f);
        V3 c = mix3(gold, gesso, satf((wear - 0.52f)*3.2f));
        /* the carving catches it */
        float carve = 0.5f + 0.5f*sinf((p.x + p.y + p.z)*44.0f);
        c = scl(c, 0.84f + 0.30f*carve);
        *spec = 0.72f;
        return c;
    }
    case M_ESCRAIL: {
        V3 c = v3(0.052f, 0.050f, 0.054f);
        c = scl(c, 0.85f + 0.30f*fbm3_f(p, 20.0f, 2));
        *spec = 0.30f;
        return c;
    }
    case M_PIPE: {
        V3 c = mix3(v3(0.400f, 0.386f, 0.348f), v3(0.245f, 0.230f, 0.205f), fbm3_f(p, 4.0f, 3));
        float wrap = 1.0f - step_f(0.0f, 0.02f, fabsf(fractf((p.x + p.z + p.y*2.0f)/0.13f) - 0.5f) - 0.42f, 0.13f, 0.2f);
        c = scl(c, 0.86f + 0.26f*wrap);
        *spec = 0.08f;
        return c;
    }
    /* -------------------------------------------------------------- the tube */
    case M_CRTBODY: case M_CRTBEZEL: {
        V3 base = (mat == M_CRTBEZEL) ? v3(0.104f, 0.098f, 0.086f) : v3(0.238f, 0.222f, 0.186f);
        /* the plastic has gone yellow, and it went unevenly */
        float yel = fbm3_f(p, 3.0f, 3);
        V3 c = mix3(base, mul(base, v3(1.22f, 1.05f, 0.72f)), yel);
        c = scl(c, 0.88f + 0.22f*fbm3_f(p, 40.0f, 2));
        /* vents in the top */
        if (n.y > 0.6f){
            float sl = 1.0f - step_f(0.0f, 0.004f, fabsf(fractf(p.z/0.016f) - 0.5f) - 0.30f, 0.016f, 0.3f);
            c = scl(c, 1.0f - 0.55f*sl);
        }
        *spec = 0.22f;
        return c;
    }
    case M_CRTSCREEN: {
        V3 q = crt_local(p);
        /* -q.x, so the burned-in caption on the feed is not mirrored */
        float u = 0.5f - q.x/(2.0f*CRT_HW);
        float v = 0.5f - q.y/(2.0f*CRT_HH);
        V3 c = crt_image(u, v, g_time);
        *emis = 0.82f;
        return c;
    }
    /* --------------------------------------------------------------- light */
    case M_BULB: {
        float f = lamp_flicker((int)(p.x*3.1f), (int)(p.z*3.1f), g_time);
        *emis = 1.30f*f*g_lamp_gain;
        return v3(1.000f, 0.792f, 0.510f);
    }
    case M_SHADE: {
        float f = lamp_flicker((int)(p.x*3.1f), (int)(p.z*3.1f), g_time);
        *emis = 0.44f*f*g_lamp_gain;
        return v3(1.000f, 0.870f, 0.700f);
    }
    case M_CRYSTAL: {
        /* cut glass, so it is mostly the light that is in it */
        float fac = 0.5f + 0.5f*sinf(p.x*140.0f)*sinf(p.y*140.0f)*sinf(p.z*140.0f);
        *emis = (0.155f + 0.185f*fac)*g_lamp_gain;
        *spec = 0.95f;
        return v3(0.930f, 0.900f, 0.840f);
    }
    /* ------------------------------------------------------------- pictures */
    case M_PORTRAIT: {
        float along; int cx, cz, isx;
        wall_local(p, n, &along, &cx, &cz, &isx);
        float u = along/0.294f, v = (p.y - 1.735f)/0.384f;
        int seed = (int)(uhash((uint32_t)(cx*7919 + cz*104729)) & 255U);
        V3 c = portrait_paint(u, -v, seed);
        *spec = 0.16f;
        return c;
    }
    case M_CANVASBACK: { *spec = 0.02f; return v3(0.130f, 0.115f, 0.092f); }
    case M_NUMPLATE: {
        float along; int cx, cz, isx;
        wall_local(p, n, &along, &cx, &cz, &isx);
        float u = (along + 0.070f)/0.140f, v = (p.y - 1.766f)/(-0.058f);
        char num[8];
        int fl = 2 + (int)(uhash((uint32_t)(cx*31 + cz*17)) % 7U);
        int rm = 1 + (int)(uhash((uint32_t)(cx*7 + cz*13 + 5)) % 24U);
        snprintf(num, sizeof num, "%d%02d", fl, rm);
        float ink = text_lod(text_mask(num, u, v), 0.015f);
        V3 c = mix3(v3(0.560f, 0.430f, 0.190f), v3(0.075f, 0.058f, 0.030f), ink);
        c = scl(c, 0.85f + 0.28f*fbm3_f(p, 30.0f, 2));
        *spec = 0.70f*(1.0f - ink*0.6f);
        return c;
    }
    case M_LEDGER: {
        V3 c = v3(0.480f, 0.452f, 0.398f);
        float ln = 1.0f - step_f(0.0f, 0.002f, fabsf(fractf(p.z/0.022f) - 0.5f) - 0.44f, 0.022f, 0.1f);
        c = scl(c, 1.0f - 0.35f*ln);
        c = scl(c, 0.82f + 0.30f*fbm3_f(p, 6.0f, 3));
        *spec = 0.10f;
        return c;
    }
    /* ---------------------------------------------------------- the shopfronts */
    case M_SHOPSIGN: {
        float lx = rep1(p.x, BAY);
        int   bi = bay_index(p.x);
        float base = (p.y < LVL1) ? 0.0f : (p.y < LVL2 ? LVL1 : LVL2);
        float u = (lx + (BAY*0.5f - 0.32f))/(2.0f*(BAY*0.5f - 0.32f));
        float v = 1.0f - ((p.y - base) - (3.88f - 0.300f))/0.600f;
        const char *nm = SHOPNAME[(int)(uhash((uint32_t)(bi*2654435761U)) % 10U)];
        float ink = text_lod(text_mask(nm, (u - 0.5f)/0.86f + 0.5f,
                                       (v - 0.5f)/0.52f + 0.5f), 0.086f);
        V3 lit = v3(1.000f, 0.905f, 0.700f);
        V3 box = v3(0.230f, 0.200f, 0.148f);
        /* a couple of the tubes have gone, and one is on its way */
        float on = 1.0f;
        int st = (int)(uhash((uint32_t)(bi*40503U + 7U)) % 10U);
        if (st == 0) on = 0.06f;
        else if (st == 1) on = (fh3(bi, (int)(g_time*9.0f), 3) > 0.42f) ? 1.0f : 0.10f;
        float f = lamp_flicker(bi*5, (int)(base*10.0f), g_time);
        *emis = (0.16f + 0.82f*ink)*on*f*g_lamp_gain;
        return mix3(box, lit, ink);
    }
    case M_SHOPDARK: case M_ELEVVOID: {
        *emis = -1.0f;
        return v3(0,0,0);
    }
    case M_CLOCKGLASS: { *spec = 0.95f; return v3(0.055f, 0.058f, 0.056f); }
    case M_CLOCKFACE: {
        float u = 0.0f, v = 0.0f; int seed = 0;
        if (g_scene == SC_MALL){
            float lx = rep1(p.x, BAY);
            int bi = bay_index(p.x);
            float side = (p.z > 0.0f) ? 1.0f : -1.0f;
            u = (lx - (BAY*0.5f - 1.05f))*side/0.168f;
            v = (p.y - 1.855f)/0.168f;
            seed = bi*37+1;
        } else if (g_scene == SC_LOBBY){
            u = p.x/0.352f; v = (p.y - 4.02f)/0.352f; seed = 11;
        } else {
            float along; int cx, cz, isx;
            wall_local(p, n, &along, &cx, &cz, &isx);
            u = along/0.135f; v = (p.y - 2.520f)/0.135f;
            seed = cx*13 + cz*7;
        }
        float em;
        V3 c = dial_paint(u, -v, seed, &em);
        if (g_scene == SC_CHASE || g_scene == SC_CORR){
            /* a lift indicator is lit from behind */
            *emis = 0.85f*g_lamp_gain;
            return mix3(v3(1.0f, 0.62f, 0.22f), c, 0.45f);
        }
        *spec = 0.30f;
        return c;
    }
    case M_PENDULUM: {
        V3 c = v3(0.720f, 0.560f, 0.240f);
        c = scl(c, 0.80f + 0.36f*fbm3_f(p, 9.0f, 3));
        *spec = 0.88f;
        return c;
    }
    /* ---------------------------------------------------------- what is standing */
    case M_MANNEQ: {
        V3 c = mix3(v3(0.560f, 0.508f, 0.442f), v3(0.640f, 0.590f, 0.512f), fbm3_f(p, 3.4f, 3));
        /* the plastic has crazed, and it has yellowed at the joints */
        float cz2 = satf((fbm3_f(p, 26.0f, 3) - 0.56f)*4.0f);
        c = mix3(c, v3(0.400f, 0.352f, 0.286f), cz2*0.55f);
        float seam = 1.0f - step_f(0.0f, 0.004f, fabsf(fractf(p.y/0.42f) - 0.5f) - 0.487f, 0.42f, 0.0f);
        c = scl(c, 1.0f - 0.30f*seam);
        c = scl(c, 0.86f + 0.24f*fbm3_f(p, 0.9f, 3));
        *spec = 0.30f;
        return c;
    }
    case M_CLOTH: {
        int h = (int)uhash((uint32_t)((int)floorf(p.x*0.55f)*7919 + (int)floorf(p.z*0.55f)*104729));
        V3 pal[6] = { {0.122f,0.048f,0.056f}, {0.054f,0.060f,0.094f}, {0.116f,0.101f,0.068f},
                      {0.064f,0.079f,0.063f}, {0.128f,0.122f,0.114f}, {0.090f,0.058f,0.079f} };
        V3 c = pal[h % 6];
        float weave = fbm3_f(p, 60.0f, 2);
        c = scl(c, 0.80f + 0.42f*weave);
        /* dust, on the shoulders, on all of them */
        c = mix3(c, v3(0.130f, 0.122f, 0.112f), satf(n.y)*0.22f);
        *spec = 0.10f;
        return c;
    }
    case M_WIG: {
        V3 c = mix3(v3(0.052f, 0.038f, 0.028f), v3(0.118f, 0.088f, 0.062f), fbm3_f(p, 22.0f, 3));
        *spec = 0.24f;
        return c;
    }
    /* ---------------------------------------------------------------- water */
    case M_WATER: {
        /* thick, and there is nothing to see in it */
        V3 c = v3(0.0130f, 0.0165f, 0.0155f);
        float sc = fbm3_f(v3(p.x*1.4f, g_time*0.30f, p.z*1.4f), 1.0f, 4);
        c = mix3(c, v3(0.0290f, 0.0320f, 0.0250f), satf((sc - 0.48f)*3.0f)*0.8f);
        /* what is coming up through it */
        float b = fbm3_f(v3(p.x*5.0f, g_time*1.7f, p.z*5.0f), 1.0f, 3);
        c = add(c, scl(v3(0.035f, 0.038f, 0.032f), satf((b - 0.62f)*5.0f)));
        *spec = 0.93f;
        return c;
    }
    case M_MOSS: {
        V3 c = mix3(v3(0.028f, 0.052f, 0.026f), v3(0.062f, 0.098f, 0.045f), fbm3_f(p, 14.0f, 3));
        *spec = 0.06f;
        return c;
    }
    case M_PALM: {
        V3 c = mix3(v3(0.048f, 0.062f, 0.032f), v3(0.105f, 0.108f, 0.048f), fbm3_f(p, 7.0f, 3));
        c = mix3(c, v3(0.120f, 0.088f, 0.040f), satf(fbm3_f(p, 2.0f, 3)*1.7f - 0.70f)*0.8f);
        *spec = 0.14f;
        return c;
    }
    /* -------------------------------------------------------------- the arcade */
    case M_CABBODY: {
        V3 c = v3(0.050f, 0.048f, 0.052f);
        c = scl(c, 0.85f + 0.30f*fbm3_f(p, 12.0f, 3));
        /* side art, in the flat colours they used */
        if (fabsf(n.x) > 0.7f){
            float u = fractf(p.z*0.55f), v = fractf(p.y*0.42f);
            float band = (v > 0.30f && v < 0.72f) ? 1.0f : 0.0f;
            V3 art = mix3(v3(0.120f, 0.030f, 0.180f), v3(0.020f, 0.150f, 0.180f),
                          smoothstepf(0.2f, 0.8f, u));
            c = mix3(c, art, band*0.75f);
        }
        *spec = 0.30f;
        return c;
    }
    case M_CABSCREEN: {
        float lx = rep1(p.x - ARC_X, 1.55f);
        int   bx = (int)repi(p.x - ARC_X, 1.55f);
        int   row = (int)floorf((p.z - (ARC_ZB + 2.55f))/2.05f + 0.5f);
        float u = 0.5f + lx/0.49f;
        float v = 0.5f - (p.y - 1.185f)/0.38f;
        V3 c = cab_screen(satf(u), satf(v), g_time, bx*7 + row);
        *emis = 1.55f*g_lamp_gain;
        return c;
    }
    case M_CABMARQUEE: {
        int bx = (int)repi(p.x - ARC_X, 1.55f);
        float lx = rep1(p.x - ARC_X, 1.55f);
        const char *T[6] = { "STARFIRE", "MAZE KING", "TURBO", "VOID RUN", "COSMOS", "HYPER" };
        float u = 0.5f + lx/0.60f, v = 0.5f - (p.y - 1.660f)/0.29f;
        float ink = text_lod(text_mask(T[(int)(uhash((uint32_t)(bx*2654435761U)) % 6U)],
                                       (u - 0.5f)/0.90f + 0.5f,
                                       (v - 0.5f)/0.60f + 0.5f), 0.041f);
        V3 c = mix3(v3(0.090f, 0.030f, 0.110f), v3(1.000f, 0.400f, 0.780f), ink);
        *emis = (0.28f + 0.80f*ink)*g_lamp_gain;
        return c;
    }
    case M_CABPANEL: {
        V3 c = mix3(v3(0.075f, 0.030f, 0.095f), v3(0.030f, 0.090f, 0.130f),
                    fbm3_f(p, 1.6f, 3));
        float st = 1.0f - step_f(0.0f, 0.01f, fabsf(fractf(p.y/0.075f) - 0.5f) - 0.36f, 0.075f, 0.3f);
        c = mix3(c, v3(0.480f, 0.150f, 0.320f), st*0.55f);
        c = scl(c, 0.86f + 0.26f*fbm3_f(p, 18.0f, 2));
        *spec = 0.35f;
        return c;
    }
    /* --------------------------------------------------------------- the piano */
    case M_PIANO: {
        V3 c = v3(0.0165f, 0.0160f, 0.0175f);
        c = scl(c, 0.85f + 0.30f*fbm3_f(p, 24.0f, 2));
        float dust = satf(n.y)*satf(fbm3_f(p, 1.4f, 3)*1.4f - 0.35f);
        c = mix3(c, v3(0.115f, 0.108f, 0.098f), dust*0.45f);
        *spec = 0.95f*(1.0f - dust*0.7f);
        return c;
    }
    case M_KEYWHITE: {
        V3 c = v3(0.560f, 0.535f, 0.478f);
        c = mix3(c, v3(0.330f, 0.290f, 0.220f), satf(fbm3_f(p, 4.0f, 3)*1.6f - 0.55f)*0.7f);
        *spec = 0.42f;
        return c;
    }
    case M_KEYBLACK: { *spec = 0.55f; return v3(0.030f, 0.028f, 0.030f); }
    /* ------------------------------------------------------------- the figure */
    case M_FIGSILK: {
        /* tarnished silk: it has a sheen and the sheen is the wrong colour */
        float w = fbm3_f(p, 6.0f, 4);
        V3 lo = v3(0.0850f, 0.0840f, 0.0760f);
        V3 hi = v3(0.2450f, 0.2380f, 0.2050f);
        V3 c = mix3(lo, hi, w);
        /* the tarnish, which is nearly green in places */
        float tk = satf((fbm3_f(add(p, v3(3,1,7)), 1.7f, 4) - 0.44f)*2.4f);
        c = mix3(c, v3(0.098f, 0.115f, 0.086f), tk*0.65f);
        /* the sheen runs across the folds, not along them */
        float rim = powf(1.0f - satf(fabsf(n.y)), 2.0f);
        c = scl(c, 0.80f + 0.55f*rim);
        c = scl(c, 0.85f + 0.30f*noise3_f(p, 34.0f));
        *spec = 0.52f + 0.30f*rim;
        return c;
    }
    case M_FIGFACE: {
        /* nothing on it. It is smooth and it is slightly wet-looking. */
        V3 c = v3(0.335f, 0.322f, 0.292f);
        c = scl(c, 0.90f + 0.16f*fbm3_f(p, 8.0f, 3));
        float rim = powf(1.0f - satf(fabsf(dot(n, v3(0,0,1)))), 3.0f);
        c = scl(c, 0.86f + 0.28f*rim);
        *spec = 0.62f;
        return c;
    }
    /* --------------------------------------------------------------- the rest */
    case M_SHARD: { *spec = 0.98f; *emis = 0.12f; return v3(0.860f, 0.880f, 0.900f); }
    case M_VOIDTEX: {
        float ck = ((fractf(p.x*0.5f) < 0.5f) != (fractf(p.z*0.5f) < 0.5f)) ? 1.0f : 0.0f;
        *emis = 0.55f;
        return mix3(v3(0.030f, 0.0f, 0.040f), v3(0.720f, 0.0f, 0.740f), ck);
    }
    case M_GLASS: case M_SHOPGLASS: case M_MIRROR: { *spec = 0.95f; return v3(0.90f, 0.94f, 0.92f); }
    default: {
        V3 c = v3(0.170f, 0.160f, 0.150f);
        c = scl(c, 0.85f + 0.30f*fbm3_f(p, 3.0f, 3));
        *spec = 0.12f;
        return c;
    }
    }
}

/* ------------------------------------------------------------------- the air
 * Corridors have a haze in them. The atrium has the opposite: density that
 * rises with height, integrated along the ray, so there is no ceiling up there
 * at all -- only the point at which you stop being able to see one. */
static float fog_tau(V3 ro, V3 rd, float t)
{
    const int NS = 4;
    float tau = 0.0f, dt = t/(float)NS;
    for (int i = 0; i < NS; i++){
        float y = ro.y + rd.y*(dt*(i + 0.5f));
        float e;
        if (g_fog_up) e = 0.22f + satf((y - g_fog_y0)/g_fog_hs);
        else          e = (y > g_fog_y0) ? expf(-(y - g_fog_y0)/g_fog_hs) : 1.0f;
        tau += e*dt;
    }
    return tau*g_fog_dens;
}
/* the haze hands the lamps back as a halo */
static V3 haze_glow(V3 rd, float t)
{
    V3 acc = v3(0,0,0);
    for (int i = 0; i < g_cam_nlamps; i++){
        V3 d = g_cam_lamps[i].pos;
        V3 l = norm3(d);
        float s = dot(rd, l);
        if (s <= 0.0f) continue;
        float dist = len3(d);
        if (dist > t + 5.0f) continue;
        float s2 = s*s, s4 = s2*s2, s8 = s4*s4, s16 = s8*s8;
        float lobe = s16*s8;
        float reach = satf(minf(t, dist)/maxf(dist, 0.6f));
        float atten = 1.0f/(1.0f + 0.055f*dist*dist);
        acc = add(acc, scl(g_cam_lamps[i].col, lobe*atten*reach*0.62f));
    }
    return acc;
}
static V3 trace(V3 ro, V3 rd, float *hitdist, int depth);

/* nothing is loaded down there */
static V3 void_look(V3 rd, float seed)
{
    int sx = (int)(rd.x*520.0f + seed*31.0f);
    int sy = (int)(rd.y*520.0f - seed*17.0f);
    float n = fh3(sx, sy, (int)(g_time*64.0f));
    float n2 = fh3(sx/3, sy/2, (int)(g_time*23.0f) + 7);
    float s = 0.09f + 0.60f*n*n + 0.24f*n2*n2;
    V3 c = v3(s*0.95f, s*0.96f, s*1.05f);
    /* the missing texture, on planes that are not really there */
    float pl = fractf(rd.y*3.0f + g_time*1.15f + seed);
    if (pl < 0.13f){
        float u = rd.x*7.0f + g_time*0.5f, v = rd.z*7.0f;
        float ck = (fractf(u) < 0.5f) != (fractf(v) < 0.5f) ? 1.0f : 0.0f;
        V3 miss = mix3(v3(0.03f, 0.0f, 0.04f), v3(0.72f, 0.0f, 0.74f), ck);
        c = mix3(c, miss, (1.0f - pl/0.13f)*0.85f);
    }
    return c;
}
static float floor_hole(V3 p)
{
    if (g_void_mix <= 0.001f) return 0.0f;
    float n = fbm2(p.x*0.155f, p.z*0.155f, 4);
    float thr = 0.62f - g_void_mix*0.52f;
    return smoothstepf(thr, thr - 0.09f, n) * satf(g_void_mix*1.6f);
}
static V3 shade_hit(V3 p, V3 rd, V3 n, int mat, float dist, int depth)
{
    g_shade_dist = dist;
    float spec, emis;
    V3 alb = mat_albedo(mat, p, n, &spec, &emis);
    V3 col;

    if (mat == M_MIRROR){
        /* the only reason a corridor in a mirror behaves like a corridor */
        V3 rr = sub(rd, scl(n, 2.0f*dot(n, rd)));
        V3 refl;
        if (depth < 2){
            float hd;
            refl = trace(add(p, scl(n, 0.020f)), norm3(rr), &hd, depth+1);
        } else refl = scl(g_fog_col, 0.9f);
        /* the silvering has gone, in patches, and nobody has cleaned the rest */
        float dust = smoothstepf(0.44f, 0.88f, fbm3_f(p, 3.0f, 4));
        float dead = smoothstepf(0.76f, 0.92f, fbm3_f(add(p, v3(9,2,4)), 1.1f, 3));
        col = mul(refl, scl(v3(0.855f, 0.900f, 0.860f), 0.96f - 0.30f*dust));
        col = mix3(col, v3(0.062f, 0.064f, 0.060f), dead*0.85f);
    } else if (mat == M_SHOPGLASS || mat == M_GLASS || mat == M_CLOCKGLASS){
        /* one ray through it, one off it: a window with a shop behind it */
        float f = 0.055f + 0.62f*powf(1.0f - satf(fabsf(dot(n, rd))), 4.0f);
        V3 thru, refl;
        /* Only carry a ray through the glass while there is something to see.
         * A shop interior is a lattice of shelves and stock; past about ten
         * metres its period is finer than a pixel, geometry cannot fade toward
         * its mean the way a texture can, and what reaches the colour-under
         * stage is a picket fence that comes out as saturated bars. Past that
         * distance the window becomes what it looks like anyway: a dim box. */
        if (depth < 1 && dist < 10.5f){
            float hd;
            thru = trace(add(p, scl(rd, 0.035f)), rd, &hd, depth+1);
            V3 rr = norm3(sub(rd, scl(n, 2.0f*dot(n, rd))));
            refl = trace(add(p, scl(n, 0.020f)), rr, &hd, depth+1);
        } else {
            float k = smoothstepf(10.5f, 15.0f, dist);
            V3 far = mul(v3(0.052f, 0.047f, 0.040f),
                         v3(1.0f, 1.0f, 1.0f));
            far = scl(far, 0.75f + 0.55f*fbm3_f(p, 0.55f, 3));
            if (depth < 1 && k < 1.0f){
                float hd;
                thru = trace(add(p, scl(rd, 0.035f)), rd, &hd, depth+1);
                V3 rr = norm3(sub(rd, scl(n, 2.0f*dot(n, rd))));
                refl = trace(add(p, scl(n, 0.020f)), rr, &hd, depth+1);
                thru = mix3(thru, far, k);
                refl = mix3(refl, scl(g_fog_col, 0.8f), k);
            } else {
                thru = far;
                refl = scl(g_fog_col, 0.8f);
            }
        }
        /* the glass has not been cleaned since it went in */
        float grime = satf(fbm3_f(p, 2.2f, 4)*1.5f - 0.55f);
        col = mix3(thru, refl, f);
        col = scl(col, 1.0f - 0.30f*grime);
        col = add(col, scl(v3(0.055f, 0.058f, 0.056f), grime*0.7f));
        /* and it catches every lamp in the place */
        Lamp lm[18];
        int nl = gather_lamps(p, lm, 18);
        for (int i = 0; i < nl; i++){
            V3 ld = sub(lm[i].pos, p);
            float d2 = dot(ld, ld);
            V3 l = scl(ld, 1.0f/sqrtf(maxf(d2, 1e-6f)));
            if (dot(n, l) <= 0.02f) continue;      /* not on this side of it */
            V3 hv = sub(l, rd);
            if (dot(hv, hv) < 1e-6f) continue;
            V3 h = norm3(hv);
            float sh = powf(maxf(dot(n,h), 0.0f), 140.0f);
            col = add(col, scl(lm[i].col, sh*0.42f/(1.0f + 0.05f*d2)));
        }
    } else if (emis < 0.0f){
        /* a shaft with no car in it, and a shop with nothing lit */
        float depthfade = 1.0f - 0.85f*satf(1.0f - fabsf(dot(n, rd)));
        col = scl(v3(0.0035f, 0.0038f, 0.0042f), depthfade);
    } else if (emis > 0.0f){
        col = scl(alb, emis);
        col = add(col, scl(alb, 0.10f));
    } else {
        Lamp lm[24];
        int nl = gather_lamps(p, lm, 24);
        V3 acc = v3(0,0,0);
        for (int i = 0; i < nl; i++){
            V3 ld = sub(lm[i].pos, p);
            float d2 = dot(ld, ld);
            float d = sqrtf(d2);
            V3 l = scl(ld, 1.0f/maxf(d, 1e-4f));
            float ndl = dot(n, l);
            float diff = maxf(ndl, 0.0f)*0.90f + 0.10f*satf(ndl*0.5f+0.5f);
            float atten = 1.0f/(1.0f + lm[i].k*d2);
            V3 contrib = scl(lm[i].col, diff*atten);
            if (spec > 0.001f && ndl > 0.02f){
                V3 hv = sub(l, rd);
                if (dot(hv, hv) > 1e-6f){
                    V3 h = norm3(hv);
                    float sh = powf(maxf(dot(n,h), 0.0f), 20.0f + spec*110.0f);
                    contrib = add(contrib, scl(lm[i].col, sh*spec*atten*1.9f));
                }
            }
            acc = add(acc, contrib);
        }
        /* ambient: what the carpet and the marble hand back, and no daylight */
        V3 amb;
        float up = satf(n.y*0.5f + 0.5f);
        if (g_scene == SC_MALL){
            amb = scl(v3(0.064f, 0.059f, 0.053f), 0.40f + 0.80f*up);
            amb = add(amb, scl(v3(0.038f, 0.033f, 0.028f), satf(-n.y)*0.9f));
        } else if (g_scene == SC_VOID){
            amb = v3(0.10f, 0.10f, 0.11f);
        } else {
            amb = scl(v3(0.0405f, 0.0350f, 0.0330f), 0.42f + 0.78f*up);
            amb = add(amb, scl(v3(0.0330f, 0.0180f, 0.0165f), satf(-n.y)*0.95f));
        }
        acc = add(acc, scl(amb, g_lightgain));
        col = mul(alb, acc);
        col = scl(col, 0.32f + 0.68f*calc_ao(p, n));
    }
    return col;
}
static void plane_material(V3 p, int up, int *mat)
{
    (void)p;
    if (up){
        switch (g_scene){
            case SC_MALL:  *mat = M_MARBLEFLOOR; break;
            case SC_BALL:  *mat = M_PARQUET;     break;
            case SC_CORR:
            case SC_CHASE: *mat = M_CARPET; break;
            default:       *mat = M_CARPET;      break;
        }
    } else {
        *mat = (g_scene == SC_MALL) ? M_MALLCEIL : M_CEILING;
    }
}
static V3 trace(V3 ro, V3 rd, float *hitdist, int depth)
{
    if (g_scene == SC_VOID){
        *hitdist = 1e9f;
        return void_look(rd, 0.0f);
    }
    float tmax; int maxsteps; int has_ceil = 0, has_floor = 1; float ceily = 0.0f;
    switch (g_scene){
        case SC_LOBBY: tmax = 46.0f;  maxsteps = 120; has_ceil = 1; ceily = LOB_H;  break;
        case SC_BALL:  tmax = 52.0f;  maxsteps = 120; has_ceil = 1; ceily = BAL_H;  break;
        case SC_MALL:  tmax = 128.0f; maxsteps = 170; break;
        case SC_STAIR: tmax = 26.0f;  maxsteps = 110; has_floor = 0; break;
        default:       tmax = 62.0f;  maxsteps = 130; has_ceil = 1; ceily = CORR_H; break;
    }
    if (depth > 0){ tmax *= 0.70f; maxsteps = 60; }

    /* the floor and the ceiling: solved, not marched */
    float tpl = 1e9f; int plmat = M_NONE; float plsign = 1.0f;
    if (has_floor && rd.y < -1e-5f){
        float tt = -ro.y/rd.y;
        if (tt > 0.02f){ tpl = tt; plane_material(add(ro, scl(rd,tt)), 1, &plmat); plsign = 1.0f; }
    }
    if (has_ceil && rd.y > 1e-5f){
        float tt = (ceily - ro.y)/rd.y;
        if (tt > 0.02f && tt < tpl){
            tpl = tt; plane_material(add(ro, scl(rd,tt)), 0, &plmat); plsign = -1.0f;
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
    float stepk = (g_warp > 0.001f) ? 0.68f : 0.92f;
    for (int i = 0; i < maxsteps; i++){
        V3 p = add(ro, scl(rd, t));
        float d = map_scene(p, &mat);
        if (d < 0.0011f*t + 0.0011f){ hit = 1; break; }
        t += d * stepk;
        if (t > tlim) break;
    }

    V3 col; float dist;
    if (hit && t <= tlim){
        V3 p = add(ro, scl(rd, t));
        col = shade_hit(p, rd, calc_normal(p), mat, t, depth);
        dist = t;
    } else if (tpl < tmax){
        V3 p = add(ro, scl(rd, tpl));
        V3 nn = v3(0.0f, plsign, 0.0f);
        col = shade_hit(p, rd, nn, plmat, tpl, depth);
        col = scl(col, 0.30f + 0.70f*plane_ao(p, plsign));
        if (hole > 0.0f)
            col = mix3(col, scl(void_look(rd, p.x + p.z), 0.55f), satf(hole*1.6f));
        dist = tpl;
    } else {
        col = scl(g_fog_col, (g_scene == SC_MALL) ? 1.10f : 0.65f);
        dist = tmax;
    }

    /* the air between here and there */
    float tau = fog_tau(ro, rd, minf(dist, tmax));
    float tr = expf(-tau);
    col = add(scl(col, tr), scl(g_fog_col, (1.0f - tr)*g_lightgain));
    if (depth == 0) col = add(col, haze_glow(rd, minf(dist, tmax)));
    *hitdist = dist;
    col = scl(col, g_expo);
    if (depth == 0){
        /* The sensor has a shoulder. Twenty-four fascia and shop lamps all
         * adding up puts the promenade several stops over range, and the bloom
         * -- which divides by (1 - threshold) -- then triples whatever is over
         * one before the tape ever sees it. What came out the far end was
         * clipped primaries: pure green piers, pure blue windows. A cheap CCD
         * rolls off and desaturates toward white instead, so this does too. */
        float mx = maxf(col.x, maxf(col.y, col.z));
        if (mx > 0.80f){
            float k = 0.80f + 0.55f*(1.0f - expf(-(mx - 0.80f)*1.10f));
            col = scl(col, k/mx);
        }
    }
    return col;
}
#endif /* HL_SHADE_H */
