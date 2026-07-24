/* bk_core.h -- Backrooms found-footage renderer: math, noise, level geometry, shading.
 *
 * Everything is procedural: signed-distance fields raymarched per pixel.
 * No textures, no assets, no image files are read.
 */
#ifndef BK_CORE_H
#define BK_CORE_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>

#define PI 3.14159265358979f

/* ------------------------------------------------------------------ vectors */
typedef struct { float x, y, z; } V3;

static inline V3 v3(float x, float y, float z){ V3 r={x,y,z}; return r; }
static inline V3 add(V3 a, V3 b){ return v3(a.x+b.x, a.y+b.y, a.z+b.z); }
static inline V3 sub(V3 a, V3 b){ return v3(a.x-b.x, a.y-b.y, a.z-b.z); }
static inline V3 mul(V3 a, V3 b){ return v3(a.x*b.x, a.y*b.y, a.z*b.z); }
static inline V3 scl(V3 a, float s){ return v3(a.x*s, a.y*s, a.z*s); }
static inline float dot(V3 a, V3 b){ return a.x*b.x + a.y*b.y + a.z*b.z; }
static inline V3 cross3(V3 a, V3 b){
    return v3(a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x);
}
static inline float len3(V3 a){ return sqrtf(dot(a,a)); }
static inline V3 norm3(V3 a){ float l = len3(a); return l > 1e-9f ? scl(a, 1.0f/l) : v3(0,0,1); }
static inline V3 mix3(V3 a, V3 b, float t){ return add(scl(a, 1.0f-t), scl(b, t)); }

static inline float clampf(float v, float a, float b){ return v < a ? a : (v > b ? b : v); }
static inline float mixf(float a, float b, float t){ return a + (b-a)*t; }
static inline float satf(float v){ return clampf(v, 0.0f, 1.0f); }
static inline float smoothstepf(float e0, float e1, float x){
    float t = satf((x-e0)/(e1-e0));
    return t*t*(3.0f-2.0f*t);
}
static inline float maxf(float a, float b){ return a > b ? a : b; }
static inline float minf(float a, float b){ return a < b ? a : b; }
/* smooth-ish easing for scripted camera moves */
static inline float ease(float t){ t = satf(t); return t*t*(3.0f-2.0f*t); }

/* ------------------------------------------------------------------- hashing */
static inline uint32_t uhash(uint32_t x){
    x ^= x >> 16; x *= 0x7feb352dU;
    x ^= x >> 15; x *= 0x846ca68bU;
    x ^= x >> 16; return x;
}
static inline float fh1(int a){ return (uhash((uint32_t)a) & 0xffffffU) / 16777216.0f; }
static inline float fh2(int a, int b){
    return (uhash((uint32_t)a*374761393U + (uint32_t)b*668265263U) & 0xffffffU) / 16777216.0f;
}
static inline float fh3(int a, int b, int c){
    return (uhash((uint32_t)a*374761393U + (uint32_t)b*668265263U + (uint32_t)c*2246822519U)
            & 0xffffffU) / 16777216.0f;
}

/* value noise -------------------------------------------------------------- */
static float noise3(V3 p){
    float fx = floorf(p.x), fy = floorf(p.y), fz = floorf(p.z);
    int ix = (int)fx, iy = (int)fy, iz = (int)fz;
    float tx = p.x-fx, ty = p.y-fy, tz = p.z-fz;
    tx = tx*tx*(3-2*tx); ty = ty*ty*(3-2*ty); tz = tz*tz*(3-2*tz);
    float c000=fh3(ix,iy,iz),       c100=fh3(ix+1,iy,iz);
    float c010=fh3(ix,iy+1,iz),     c110=fh3(ix+1,iy+1,iz);
    float c001=fh3(ix,iy,iz+1),     c101=fh3(ix+1,iy,iz+1);
    float c011=fh3(ix,iy+1,iz+1),   c111=fh3(ix+1,iy+1,iz+1);
    float x00=mixf(c000,c100,tx), x10=mixf(c010,c110,tx);
    float x01=mixf(c001,c101,tx), x11=mixf(c011,c111,tx);
    return mixf(mixf(x00,x10,ty), mixf(x01,x11,ty), tz);
}
static float fbm3(V3 p, int oct){
    float a = 0.5f, s = 0.0f;
    for (int i = 0; i < oct; i++){ s += a*noise3(p); p = scl(p, 2.03f); a *= 0.5f; }
    return s;
}
static float noise2(float x, float y){ return noise3(v3(x, y, 11.7f)); }
static float fbm2(float x, float y, int oct){ return fbm3(v3(x, y, 3.3f), oct); }

/* ---------------------------------------------------------------- primitives */
static inline float sdBox(V3 p, V3 b){
    V3 q = v3(fabsf(p.x)-b.x, fabsf(p.y)-b.y, fabsf(p.z)-b.z);
    float o = len3(v3(maxf(q.x,0), maxf(q.y,0), maxf(q.z,0)));
    return o + minf(maxf(q.x, maxf(q.y, q.z)), 0.0f);
}
static inline float sdRoundBox(V3 p, V3 b, float r){ return sdBox(p, b) - r; }
/* vertical capped cylinder (axis Y) */
static inline float sdCylY(V3 p, float r, float h){
    float d = sqrtf(p.x*p.x + p.z*p.z) - r;
    float dy = fabsf(p.y) - h;
    return minf(maxf(d, dy), 0.0f) + len3(v3(maxf(d,0), maxf(dy,0), 0));
}
/* cylinder along Z */
static inline float sdCylZ(V3 p, float r, float h){
    float d = sqrtf(p.x*p.x + p.y*p.y) - r;
    float dz = fabsf(p.z) - h;
    return minf(maxf(d, dz), 0.0f) + len3(v3(maxf(d,0), maxf(dz,0), 0));
}
/* cylinder along X */
static inline float sdCylX(V3 p, float r, float h){
    float d = sqrtf(p.z*p.z + p.y*p.y) - r;
    float dx = fabsf(p.x) - h;
    return minf(maxf(d, dx), 0.0f) + len3(v3(maxf(d,0), maxf(dx,0), 0));
}
static inline float sdSphere(V3 p, float r){ return len3(p) - r; }
static inline float sdCapsule(V3 p, V3 a, V3 b, float r){
    V3 pa = sub(p,a), ba = sub(b,a);
    float h = satf(dot(pa,ba)/dot(ba,ba));
    return len3(sub(pa, scl(ba,h))) - r;
}

/* ------------------------------------------------------------------ materials */
enum {
    M_NONE = 0,
    M_CARPET, M_WALLPAPER, M_CEILTILE, M_FLUORO, M_TVBODY, M_TVSCREEN,
    M_CART, M_CONCRETE, M_PIPE, M_DOOR, M_GRATE, M_RAIL, M_TILE, M_WATER,
    M_ARCADE, M_ARCSCREEN, M_BLACKLIQ, M_ENTITY, M_TRIM, M_CFLOOR,
    M_VOIDHOLE, M_FLOORLIGHT, M_FARWALL, M_SIGN
};

/* ----------------------------------------------------------------- the grids */
#define GW 64
#define GH 64
#define CELL 3.0f
#define WALLH 3.0f          /* level 0 ceiling height */
#define WALLH1 4.6f         /* level 1 ceiling height */

static char G0[GH][GW];     /* level 0: yellow rooms   ('#' solid, '.' open) */
static char G1[GH][GW];     /* level 1: concrete halls */

/* continuous cell coordinate -> world (cell c centre) */
static inline float CW(float c){ return (c + 0.5f - GW*0.5f) * CELL; }
static inline int   WC(float w){ int c = (int)floorf(w/CELL + GW*0.5f); return c; }

static void grid_fill(char g[GH][GW], char c){
    for (int r = 0; r < GH; r++) for (int q = 0; q < GW; q++) g[r][q] = c;
}
static void carve_cell(char g[GH][GW], int cx, int cz){
    if (cx >= 1 && cx < GW-1 && cz >= 1 && cz < GH-1) g[cz][cx] = '.';
}
/* carve a corridor along a polyline given in cell coordinates, dilated so that
 * smoothed camera paths can never clip an inside corner. */
static void carve_path(char g[GH][GW], const float *pts, int n, float dilate){
    for (int i = 0; i + 1 < n; i++){
        float ax = pts[i*2], az = pts[i*2+1];
        float bx = pts[i*2+2], bz = pts[i*2+3];
        float d = fabsf(bx-ax) + fabsf(bz-az);
        int steps = (int)(d*12.0f) + 2;
        for (int s = 0; s <= steps; s++){
            float t = (float)s/steps;
            float x = ax + (bx-ax)*t, z = az + (bz-az)*t;
            for (float ox = -dilate; ox <= dilate+1e-3f; ox += dilate > 0 ? dilate : 1)
                for (float oz = -dilate; oz <= dilate+1e-3f; oz += dilate > 0 ? dilate : 1){
                    carve_cell(g, (int)floorf(x+ox+0.5f), (int)floorf(z+oz+0.5f));
                    if (dilate <= 0) break;
                }
        }
    }
}
static void carve_rect(char g[GH][GW], int x0, int z0, int x1, int z1){
    for (int z = z0; z <= z1; z++) for (int x = x0; x <= x1; x++) carve_cell(g, x, z);
}

/* solid test with bounds guard */
static inline int solid(char g[GH][GW], int cx, int cz){
    if (cx < 0 || cx >= GW || cz < 0 || cz >= GH) return 1;
    return g[cz][cx] != '.';
}

/* SDF of grid walls. Exact within the 3x3 neighbourhood of p's cell, and
 * conservatively bounded outside it (never over-estimates). */
static float grid_walls(V3 p, char g[GH][GW], float h){
    int cx = WC(p.x), cz = WC(p.z);
    float d = 1e9f;
    for (int dz = -1; dz <= 1; dz++)
        for (int dx = -1; dx <= 1; dx++){
            int qx = cx+dx, qz = cz+dz;
            if (!solid(g, qx, qz)) continue;
            V3 c = v3(CW((float)qx), h*0.5f, CW((float)qz));
            float b = sdBox(sub(p, c), v3(CELL*0.5f, h*0.5f, CELL*0.5f));
            if (b < d) d = b;
        }
    /* distance to the edge of the trusted region */
    float ccx = CW((float)cx), ccz = CW((float)cz);
    float bound = minf(CELL*1.5f - fabsf(p.x-ccx), CELL*1.5f - fabsf(p.z-ccz));
    if (bound < 0) bound = 0;
    return minf(d, bound);
}

/* ------------------------------------------------------------ scene selector */
enum { SC_ROOM = 0, SC_LEVEL0, SC_TRANS, SC_ATRIUM, SC_LEVEL1, SC_VOID };
static int g_scene;         /* current scene id            */
static float g_time;        /* current shot time (seconds) */
static float g_entity_z;    /* entity position on far catwalk */
static float g_entity_vis;  /* 0..1 entity presence */

/* world x beyond which the wallpaper gives out and concrete begins */
static float g_concrete_x = 0.0f;
/* how far the catwalk door has been shoved open, radians */
static float g_door_ang = 0.0f;

/* ------------------------------------------------------------------ level 0 */
/* Props: the CRT + cart, a doorway stranded halfway up a wall, ceiling light
 * panels lying face-up on the carpet, a dead arcade cabinet, a puddle of
 * black liquid that never moves. */

static V3 P_TV        = {  0.00f, 0.72f, -0.60f };
static V3 P_DOORHI    = {  0.00f, 0.00f,  0.00f };   /* filled at init */
static V3 P_FLOORLIT  = {  0.00f, 0.00f,  0.00f };
static V3 P_ARCADE    = {  0.00f, 0.00f,  0.00f };
#define ARC_ROT (-1.27f)   /* screen turned to face back down the corridor */
static V3 P_PUDDLE    = {  0.00f, 0.00f,  0.00f };

/* CRT television on a rolling AV cart */
static float sd_tv(V3 p, int *m){
    V3 q = sub(p, P_TV);
    float d = 1e9f; int mm = M_TVBODY;
    /* body: chunky rounded box */
    float body = sdRoundBox(q, v3(0.30f, 0.25f, 0.22f), 0.035f);
    /* screen: recessed slab on the +Z face */
    float scr = sdBox(sub(q, v3(0.0f, 0.015f, 0.245f)), v3(0.245f, 0.185f, 0.02f));
    body = maxf(body, -sdBox(sub(q, v3(0.0f, 0.015f, 0.26f)), v3(0.25f, 0.19f, 0.06f)));
    d = body;
    if (scr < d){ d = scr; mm = M_TVSCREEN; }
    /* cart: shelf + legs + castors */
    V3 c = sub(p, v3(P_TV.x, 0.0f, P_TV.z));
    float shelf = sdBox(sub(c, v3(0.0f, 0.44f, 0.0f)), v3(0.34f, 0.022f, 0.27f));
    float shelf2 = sdBox(sub(c, v3(0.0f, 0.20f, 0.0f)), v3(0.32f, 0.020f, 0.25f));
    float legs = 1e9f;
    for (int i = 0; i < 4; i++){
        float lx = (i&1) ? 0.30f : -0.30f, lz = (i&2) ? 0.23f : -0.23f;
        float l = sdCylY(sub(c, v3(lx, 0.26f, lz)), 0.018f, 0.22f);
        if (l < legs) legs = l;
        float w = sdSphere(sub(c, v3(lx, 0.035f, lz)), 0.035f);
        if (w < legs) legs = w;
    }
    float cart = minf(minf(shelf, shelf2), legs);
    if (cart < d){ d = cart; mm = M_CART; }
    *m = mm;
    return d;
}

/* level 0 walls, floor, ceiling and props */
static float map_level0(V3 p, int *mat, int with_props){
    int m = M_NONE;
    float d = 1e9f;

    float wall = grid_walls(p, G0, WALLH);

    /* the stranded doorway: a dark opening bitten out of a wall, its sill
     * 1.5 m above the carpet, opening onto nothing */
    int in_hole = 0;
    if (with_props){
        /* A door frame set into the wall with its sill at chest height. It is
         * a doorway. It opens onto nothing. Nobody built it. */
        float hole = sdBox(sub(p, v3(P_DOORHI.x + 0.46f, 1.925f, P_DOORHI.z)),
                           v3(0.50f, 0.875f, 0.52f));
        wall = maxf(wall, -hole);
        if (hole < 0.10f) in_hole = 1;
    }
    d = wall; m = M_WALLPAPER;
    if (in_hole) m = M_VOIDHOLE;
    if (p.x > g_concrete_x && g_scene == SC_TRANS) m = M_CONCRETE;

    /* floor / ceiling */
    float fl = p.y;
    if (fl < d){ d = fl; m = M_CARPET; }
    float ce = WALLH - p.y;
    if (ce < d){ d = ce; m = M_CEILTILE; }

    /* recessed fluorescent panels in the ceiling grid */
    int cx = WC(p.x), cz = WC(p.z);
    for (int dz = -1; dz <= 1; dz++) for (int dx = -1; dx <= 1; dx++){
        int qx = cx+dx, qz = cz+dz;
        if (solid(G0, qx, qz)) continue;
        if (((qx*7 + qz*13) % 3) != 0) continue;
        V3 c = v3(CW((float)qx), WALLH - 0.02f, CW((float)qz));
        float panel = sdBox(sub(p, c), v3(0.55f, 0.03f, 1.05f));
        if (panel < d){ d = panel; m = M_FLUORO; }
    }

    if (!with_props){ *mat = m; return d; }

    /* --- the television ---------------------------------------------- */
    {
        int tm; float t = sd_tv(p, &tm);
        if (t < d){ d = t; m = tm; }
    }
    /* --- ceiling light panels lying face-up on the carpet ------------- */
    for (int i = 0; i < 3; i++){
        float ox = (i-1)*1.25f + 0.3f*fh1(i*13);
        float oz = 0.7f*fh1(i*29) - 0.35f;
        float rot = (fh1(i*7) - 0.5f) * 0.9f;
        V3 q = sub(p, v3(P_FLOORLIT.x+ox, 0.055f, P_FLOORLIT.z+oz));
        float cs = cosf(rot), sn = sinf(rot);
        V3 r = v3(q.x*cs - q.z*sn, q.y, q.x*sn + q.z*cs);
        float pan = sdBox(r, v3(0.30f, 0.045f, 0.60f));
        if (pan < d){ d = pan; m = M_FLOORLIGHT; }
    }
    /* --- arcade cabinet ---------------------------------------------- */
    {
        V3 q = sub(p, P_ARCADE);
        float cs = cosf(ARC_ROT), sn = sinf(ARC_ROT);
        V3 r = v3(q.x*cs - q.z*sn, q.y, q.x*sn + q.z*cs);
        float cab = sdBox(sub(r, v3(0, 0.80f, 0)), v3(0.36f, 0.80f, 0.42f));
        /* slanted control deck bite */
        cab = maxf(cab, -sdBox(sub(r, v3(0, 1.00f, 0.62f)), v3(0.5f, 0.55f, 0.45f)));
        float scr = sdBox(sub(r, v3(0, 1.30f, 0.30f)), v3(0.27f, 0.21f, 0.03f));
        float hood = sdBox(sub(r, v3(0, 1.86f, 0.16f)), v3(0.37f, 0.30f, 0.20f));
        cab = minf(cab, hood);
        if (cab < d){ d = cab; m = M_ARCADE; }
        if (scr < d){ d = scr; m = M_ARCSCREEN; }
    }
    /* --- motionless black liquid ------------------------------------- */
    {
        V3 q = sub(p, v3(P_PUDDLE.x, 0.006f, P_PUDDLE.z));
        float rr = sqrtf(q.x*q.x*1.35f + q.z*q.z*1.9f);
        float edge = 0.90f + 0.20f*noise2(atan2f(q.z,q.x)*1.6f, 4.0f);
        float pud = maxf(rr - edge, fabsf(q.y) - 0.006f);
        if (pud < d){ d = pud; m = M_BLACKLIQ; }
    }

    /* --- where the wallpaper gives out: pipework and the fire door ---- */
    if (g_scene == SC_TRANS){
        float zc = CW(37.0f);
        for (int s = 0; s < 2; s++){
            float pz = zc + (s ? 1.34f : -1.34f);
            for (int k = 0; k < 3; k++){
                float pipe = sdCylX(sub(p, v3(0.0f, 2.42f + k*0.21f, pz)), 0.048f - k*0.008f, 60.0f);
                if (p.x > g_concrete_x - 1.0f && pipe < d){ d = pipe; m = M_PIPE; }
            }
            /* a bracket every few metres */
            float xr = p.x - 2.4f*floorf(p.x/2.4f + 0.5f);
            float brk = sdBox(v3(xr, p.y - 2.62f, p.z - pz + (s?0.13f:-0.13f)), v3(0.035f, 0.26f, 0.13f));
            if (p.x > g_concrete_x && brk < d){ d = brk; m = M_RAIL; }
        }
        float dx = CW(36.0f) - CELL*0.5f;          /* face of the end wall */
        float door = sdBox(sub(p, v3(dx + 0.055f, 1.06f, zc)), v3(0.055f, 1.06f, 0.56f));
        if (door < d){ d = door; m = M_DOOR; }
        float frame = sdBox(sub(p, v3(dx + 0.03f, 1.12f, zc)), v3(0.05f, 1.16f, 0.68f));
        frame = maxf(frame, -sdBox(sub(p, v3(dx + 0.03f, 1.06f, zc)), v3(0.4f, 1.06f, 0.56f)));
        if (frame < d){ d = frame; m = M_RAIL; }
        float bar = sdCylZ(sub(p, v3(dx + 0.13f, 1.02f, zc)), 0.035f, 0.34f);
        if (bar < d){ d = bar; m = M_RAIL; }
    }
    *mat = m;
    return d;
}

/* ------------------------------------------------------------------ level 1 */
static float map_level1(V3 p, int *mat, int with_props){
    int m = M_NONE;
    float d = grid_walls(p, G1, WALLH1);
    m = M_CONCRETE;

    float fl = p.y;
    if (fl < d){ d = fl; m = M_CFLOOR; }
    float ce = WALLH1 - p.y;
    if (ce < d){ d = ce; m = M_CONCRETE; }

    /* caged strip lights slung under the ceiling */
    int cx = WC(p.x), cz = WC(p.z);
    for (int dz = -1; dz <= 1; dz++) for (int dx = -1; dx <= 1; dx++){
        int qx = cx+dx, qz = cz+dz;
        if (solid(G1, qx, qz)) continue;
        if (((qx*5 + qz*11) % 2) != 0) continue;
        V3 c = v3(CW((float)qx), WALLH1 - 0.28f, CW((float)qz));
        float lamp = sdBox(sub(p, c), v3(0.14f, 0.09f, 0.75f));
        if (lamp < d){ d = lamp; m = M_FLUORO; }
        float stem = sdCylY(sub(p, add(c, v3(0, 0.19f, 0))), 0.014f, 0.13f);
        if (stem < d){ d = stem; m = M_RAIL; }
    }

    if (!with_props){ *mat = m; return d; }

    /* copper pipe runs hugging the walls, following the corridor axis */
    for (int dz = -1; dz <= 1; dz++) for (int dx = -1; dx <= 1; dx++){
        int qx = cx+dx, qz = cz+dz;
        if (!solid(G1, qx, qz)) continue;
        float wx = CW((float)qx), wz = CW((float)qz);
        /* run pipes along whichever face is exposed */
        for (int s = 0; s < 4; s++){
            int nx = qx + ((s==0)-(s==1)), nz = qz + ((s==2)-(s==3));
            if (solid(G1, nx, nz)) continue;
            float px = wx + ((s==0)-(s==1))*(CELL*0.5f + 0.10f);
            float pz = wz + ((s==2)-(s==3))*(CELL*0.5f + 0.10f);
            for (int k = 0; k < 3; k++){
                float hy = 2.55f + k*0.20f;
                float rad = 0.045f - k*0.008f;
                float pipe;
                if (s < 2) pipe = sdCylZ(sub(p, v3(px, hy, wz)), rad, CELL*0.5f);
                else       pipe = sdCylX(sub(p, v3(wx, hy, pz)), rad, CELL*0.5f);
                if (pipe < d){ d = pipe; m = M_PIPE; }
            }
        }
    }
    *mat = m;
    return d;
}

/* ------------------------------------------- level 1 catwalk / atrium / L37 */
/* A colossal shaft. Two catwalks face each other across it; far below, the
 * white-tiled basins of Level 37 stretch out in the murk. */
#define ATR_HX 26.0f
#define ATR_HZ 95.0f
#define CAT_X  23.2f
#define L37_Y  (-70.0f)

static float map_atrium(V3 p, int *mat, int with_props){
    int m = M_NONE;
    float d = 1e9f;

    /* interior of a gigantic hollow box */
    float shell = -sdBox(sub(p, v3(0.0f, -13.0f, 0.0f)), v3(ATR_HX, 59.0f, ATR_HZ));
    d = shell; m = M_FARWALL;

    /* deep window bays, big enough to still be shapes at four hundred metres */
    {
        float zr = p.z - 22.0f*floorf(p.z/22.0f + 0.5f);
        float yr = p.y - 22.0f*floorf(p.y/22.0f + 0.5f);
        float bay = sdBox(v3(fabsf(p.x) - ATR_HX - 1.6f, yr - 4.0f, zr), v3(1.8f, 5.5f, 6.5f));
        if (-bay > d) { }                      /* bays are cut into the shell */
        d = maxf(d, -bay);
        if (bay < 0.25f && bay > -3.0f) m = M_CONCRETE;
    }
    /* one deck band per storey */
    {
        float yr = p.y - 22.0f*floorf(p.y/22.0f + 0.5f);
        for (int s = 0; s < 2; s++){
            float wx = s ? ATR_HX : -ATR_HX;
            float led = sdBox(v3(p.x - wx + (s?1.5f:-1.5f), yr - 10.5f, 0), v3(1.5f, 0.55f, 0));
            if (led < d){ d = led; m = M_CONCRETE; }
        }
    }

    /* wall fittings, repeated up and down the shaft */
    {
        float yr = p.y - 22.0f*floorf(p.y/22.0f + 0.5f);
        float zr = p.z - 22.0f*floorf(p.z/22.0f + 0.5f);
        for (int s = 0; s < 2; s++){
            float wx = s ? ATR_HX - 0.85f : -ATR_HX + 0.85f;
            float lamp = sdBox(v3(p.x - wx, yr - 1.55f, zr), v3(0.34f, 0.30f, 4.2f));
            if (lamp < d){ d = lamp; m = M_FLUORO; }
            float hood = sdBox(v3(p.x - wx, yr - 2.05f, zr), v3(0.50f, 0.20f, 4.3f));
            if (hood < d){ d = hood; m = M_RAIL; }
        }
    }

    /* the two catwalks */
    for (int s = 0; s < 2; s++){
        float cxw = s ? CAT_X : -CAT_X;
        float deck = sdBox(sub(p, v3(cxw, -0.07f, 0)), v3(1.7f, 0.07f, ATR_HZ));
        if (deck < d){ d = deck; m = M_GRATE; }
        /* handrail on the open side */
        float railx = cxw + (s ? -1.62f : 1.62f);
        for (int k = 0; k < 2; k++){
            float ry = 0.55f + k*0.53f;
            float bar = sdCylZ(sub(p, v3(railx, ry, 0)), 0.030f, ATR_HZ);
            if (bar < d){ d = bar; m = M_RAIL; }
        }
        float zr = p.z - 2.0f*floorf(p.z/2.0f + 0.5f);
        float post = sdBox(v3(p.x-railx, p.y-0.54f, zr), v3(0.028f, 0.56f, 0.028f));
        if (post < d){ d = post; m = M_RAIL; }
        /* toe plate */
        float toe = sdBox(sub(p, v3(railx, 0.09f, 0)), v3(0.02f, 0.09f, ATR_HZ));
        if (toe < d){ d = toe; m = M_RAIL; }
    }
    /* back wall behind the near catwalk, with the door we came through */
    {
        float bw = sdBox(sub(p, v3(-ATR_HX + 0.55f, 8.0f, 0)), v3(0.55f, 30.0f, ATR_HZ));
        /* the opening */
        float hole = sdBox(sub(p, v3(-ATR_HX + 0.55f, 1.06f, 0.0f)), v3(0.9f, 1.06f, 0.56f));
        bw = maxf(bw, -hole);
        if (bw < d){ d = bw; m = M_CONCRETE; }
        /* the door itself, hinged on the near jamb */
        V3 q = sub(p, v3(-ATR_HX + 1.06f, 1.06f, -0.56f));
        float ca = cosf(g_door_ang), sa = sinf(g_door_ang);
        V3 r = v3(q.x*ca - q.z*sa, q.y, q.x*sa + q.z*ca);
        float door = sdBox(sub(r, v3(0.0f, 0.0f, 0.56f)), v3(0.055f, 1.06f, 0.56f));
        if (door < d){ d = door; m = M_DOOR; }
        float bar = sdCylY(sub(r, v3(0.09f, 0.0f, 0.98f)), 0.030f, 0.22f);
        if (bar < d){ d = bar; m = M_RAIL; }
    }

    /* --- far below: Level 37's tiled basins -------------------------- */
    {
        float slab = sdBox(sub(p, v3(0.0f, L37_Y - 1.0f, 0.0f)), v3(ATR_HX, 1.0f, ATR_HZ));
        float bx = p.x - 13.0f*floorf(p.x/13.0f + 0.5f);
        float bz = p.z - 13.0f*floorf(p.z/13.0f + 0.5f);
        float basin = sdBox(v3(bx, p.y - (L37_Y - 0.05f), bz), v3(4.4f, 0.95f, 4.4f));
        slab = maxf(slab, -basin);
        if (slab < d){ d = slab; m = M_TILE; }
        float water = sdBox(v3(bx, p.y - (L37_Y - 0.60f), bz), v3(4.35f, 0.35f, 4.35f));
        if (water < d){ d = water; m = M_WATER; }
        /* tiled piers rising out of the basin field */
        float px = p.x - 13.0f*floorf(p.x/13.0f + 0.5f) - 6.5f;
        float pz = p.z - 13.0f*floorf(p.z/13.0f + 0.5f) - 6.5f;
        float pier = sdBox(v3(px, p.y - (L37_Y + 22.0f), pz), v3(1.5f, 23.0f, 1.5f));
        if (pier < d){ d = pier; m = M_TILE; }
    }

    if (!with_props) { *mat = m; return d; }

    /* --- the figure on the opposite catwalk -------------------------- */
    if (g_entity_vis > 0.001f){
        float t = g_time;
        /* jerky stepped motion: it does not move like anything with joints */
        float st = floorf(t*7.0f);
        float jx = (fh1((int)st*3+1) - 0.5f) * 0.10f;
        float jy = (fh1((int)st*3+2) - 0.5f) * 0.07f;
        float hd = (fh1((int)st*3+7) - 0.5f) * 0.55f;
        float sway = sinf(t*0.7f)*0.05f;

        V3 q = sub(p, v3(CAT_X - 0.3f, 0.0f, g_entity_z));
        q.x -= jx + sway; q.z -= jy;
        float body = sdCapsule(q, v3(0,0.05f,0), v3(0.02f,2.42f,0.0f), 0.155f);
        float shld = sdCapsule(q, v3(-0.26f,2.16f,0.02f), v3(0.30f,2.14f,-0.02f), 0.085f);
        body = minf(body, shld);
        /* neck + head, snapped around toward the lens */
        V3 hp = sub(q, v3(0.02f, 2.66f, 0.0f));
        float ca = cosf(hd), sa = sinf(hd);
        V3 hr = v3(hp.x*ca - hp.z*sa, hp.y, hp.x*sa + hp.z*ca);
        float head = sdCapsule(hr, v3(0,0,0), v3(0.05f, 0.34f, -0.04f), 0.145f);
        float neck = sdCapsule(q, v3(0.02f,2.36f,0), v3(0.02f,2.66f,0), 0.062f);
        /* long arms, hanging past the knees */
        float a1 = sdCapsule(q, v3(-0.22f, 2.13f, 0.02f), v3(-0.30f + jx*2.0f, 0.52f, 0.06f), 0.070f);
        float a2 = sdCapsule(q, v3( 0.26f, 2.11f,-0.02f), v3( 0.34f - jx*2.0f, 0.45f,-0.05f), 0.070f);
        float l1 = sdCapsule(q, v3(-0.06f, 1.15f, 0.0f), v3(-0.12f, 0.03f, 0.03f), 0.075f);
        float l2 = sdCapsule(q, v3( 0.08f, 1.15f, 0.0f), v3( 0.14f, 0.03f,-0.03f), 0.075f);
        float ent = minf(minf(minf(body, head), minf(neck, a1)), minf(a2, minf(l1, l2)));
        if (ent < d){ d = ent; m = M_ENTITY; }
    }
    *mat = m;
    return d;
}

/* ------------------------------------------------------------ scene dispatch */
static float map_scene(V3 p, int *mat){
    switch (g_scene){
        case SC_ROOM:
        case SC_LEVEL0:
        case SC_TRANS:  return map_level0(p, mat, 1);
        case SC_LEVEL1: return map_level1(p, mat, 1);
        case SC_ATRIUM: return map_atrium(p, mat, 1);
        default: *mat = M_NONE; return 1e9f;
    }
}
/* cheap variant for normals / AO / collision */
static float map_dist(V3 p){
    int m;
    switch (g_scene){
        case SC_ROOM:
        case SC_LEVEL0:
        case SC_TRANS:  return map_level0(p, &m, 1);
        case SC_LEVEL1: return map_level1(p, &m, 1);
        case SC_ATRIUM: return map_atrium(p, &m, 1);
        default: return 1e9f;
    }
}
/* walls only -- used to keep the walker out of geometry */
static float map_collide(V3 p){
    int m;
    switch (g_scene){
        case SC_ROOM:
        case SC_LEVEL0:
        case SC_TRANS:  return map_level0(p, &m, 0);
        case SC_LEVEL1: return map_level1(p, &m, 0);
        default: return 1e9f;
    }
}

static V3 calc_normal(V3 p){
    const float e = 0.0016f;
    float dx = map_dist(v3(p.x+e,p.y,p.z)) - map_dist(v3(p.x-e,p.y,p.z));
    float dy = map_dist(v3(p.x,p.y+e,p.z)) - map_dist(v3(p.x,p.y-e,p.z));
    float dz = map_dist(v3(p.x,p.y,p.z+e)) - map_dist(v3(p.x,p.y,p.z-e));
    return norm3(v3(dx,dy,dz));
}
static float calc_ao(V3 p, V3 n){
    float occ = 0.0f, sca = 1.0f;
    for (int i = 1; i <= 5; i++){
        float h = 0.02f + 0.14f*i;
        float d = map_dist(add(p, scl(n,h)));
        occ += (h - d)*sca;
        sca *= 0.72f;
    }
    return satf(1.0f - 1.4f*occ);
}

/* ---------------------------------------------------------------- level init */
static void build_levels(void){
    grid_fill(G0, '#');
    grid_fill(G1, '#');

    /* ---- level 0: the room with the television, then the wander ---- */
    carve_rect(G0, 30, 29, 34, 34);            /* the room the tape starts in */
    static const float wander[] = {
        32,33, 32,30, 32,26, 29,26, 26,26, 24,26,
        24,30, 24,34, 24,37, 28,37, 32,37
    };
    carve_path(G0, wander, sizeof(wander)/8, 0.0f);
    /* the corridor that runs east until the wallpaper stops */
    static const float outbound[] = { 32,37, 35,37 };
    carve_path(G0, outbound, 2, 0.0f);

    /* side rooms and dead ends, so the floor plan reads as a building that
     * was once meant for something */
    carve_rect(G0, 27, 21, 30, 24);
    carve_rect(G0, 20, 24, 22, 27);
    carve_rect(G0, 35, 24, 38, 27);
    carve_rect(G0, 18, 32, 21, 35);
    carve_rect(G0, 27, 41, 31, 44);
    carve_rect(G0, 36, 31, 39, 33);
    carve_rect(G0, 14, 26, 17, 30);
    static const float links[][4] = {
        {28,25, 28,26}, {23,26, 22,26}, {33,26, 35,26}, {24,33, 21,33},
        {28,38, 28,41}, {35,37, 37,33}, {17,28, 16,28}
    };
    for (unsigned i = 0; i < sizeof(links)/sizeof(links[0]); i++)
        carve_path(G0, links[i], 2, 0.0f);

    /* the yellow half of the final sprint: a loop that comes back on itself */
    static const float run0[] = {
        40,40, 40,34, 40,28, 34,28, 28,28, 28,22, 22,22, 22,28,
        16,28, 16,34, 22,34, 22,40, 28,40, 34,40, 40,40, 40,34
    };
    carve_path(G0, run0, sizeof(run0)/8, 0.0f);

    /* ---- level 1: concrete service halls ---- */
    static const float trans1[] = { 43,37, 51,37 };
    carve_path(G1, trans1, 2, 0.0f);
    static const float run1[] = {
        51,37, 45,37, 45,31, 39,31, 39,25, 33,25, 33,19, 27,19,
        27,25, 21,25, 21,31, 27,31, 27,37, 21,37, 15,37
    };
    carve_path(G1, run1, sizeof(run1)/8, 0.0f);
    /* plant rooms hanging off the run */
    carve_rect(G1, 46, 33, 49, 35);
    carve_rect(G1, 36, 21, 38, 23);
    carve_rect(G1, 23, 33, 25, 35);
    carve_rect(G1, 17, 39, 19, 41);
    static const float links1[][4] = {
        {45,34, 47,34}, {33,22, 36,22}, {24,31, 24,34}, {18,37, 18,39}
    };
    for (unsigned i = 0; i < sizeof(links1)/sizeof(links1[0]); i++)
        carve_path(G1, links1[i], 2, 0.0f);

    /* prop placement, in world units */
    P_DOORHI   = v3(CW(33.0f) - CELL*0.5f, 0.0f, CW(27.0f));  /* east wall, north corridor */
    P_FLOORLIT = v3(CW(28.0f), 0.0f, CW(26.0f));
    P_ARCADE   = v3(CW(24.0f) + 1.05f, 0.0f, CW(33.0f));
    P_PUDDLE   = v3(CW(26.5f), 0.0f, CW(37.0f) + 1.05f);
    g_concrete_x = -6.0f;
}

#endif /* BK_CORE_H */
