/* pk_core.h -- Backrooms theme park: maths, noise, and the park itself.
 *
 * Everything is procedural. Signed distance fields, raymarched per pixel.
 * No textures are loaded, no assets, no image files, no generated images.
 *
 * The ground is *not* in the distance field -- it is a plane, intersected
 * analytically in trace(). An outdoor scene spends most of its ray budget
 * skimming the floor, and taking the floor out of the SDF is what lets a
 * sphere-tracer cross forty metres of empty midway in a handful of steps.
 */
#ifndef PK_CORE_H
#define PK_CORE_H

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
static inline float len2f(float a, float b){ return sqrtf(a*a + b*b); }
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
static inline float ease(float t){ t = satf(t); return t*t*(3.0f-2.0f*t); }
static inline float fractf(float x){ return x - floorf(x); }
/* signed triangle wave, period 1, range -0.5..0.5 -- for stripes */
static inline float triw(float x){ float f = fractf(x); return fabsf(f - 0.5f) - 0.25f; }

static inline V3 rotY(V3 p, float a){
    float c = cosf(a), s = sinf(a);
    return v3(p.x*c - p.z*s, p.y, p.x*s + p.z*c);
}
static inline V3 rotX(V3 p, float a){
    float c = cosf(a), s = sinf(a);
    return v3(p.x, p.y*c - p.z*s, p.y*s + p.z*c);
}
static inline V3 rotZ(V3 p, float a){
    float c = cosf(a), s = sinf(a);
    return v3(p.x*c - p.y*s, p.x*s + p.y*c, p.z);
}
/* fold space into one of n sectors about the Y axis */
static inline V3 pmodY(V3 p, int n){
    float a = atan2f(p.z, p.x);
    float sp = 2.0f*PI/(float)n;
    float sector = floorf(a/sp + 0.5f);
    return rotY(p, -sector*sp);
}
/* repeat with period c, centred on 0 */
static inline float rep1(float x, float c){ return x - c*floorf(x/c + 0.5f); }
static inline float repi(float x, float c){ return floorf(x/c + 0.5f); }

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
static inline int ih2(int a, int b, int n){
    return (int)(uhash((uint32_t)a*2654435761U + (uint32_t)b*40503U) % (uint32_t)n);
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
static inline float sdBox2(float x, float y, float bx, float by){
    float qx = fabsf(x)-bx, qy = fabsf(y)-by;
    return len2f(maxf(qx,0), maxf(qy,0)) + minf(maxf(qx,qy), 0.0f);
}
static inline float sdRoundBox(V3 p, V3 b, float r){ return sdBox(p, b) - r; }
static inline float sdCylY(V3 p, float r, float h){
    float d = len2f(p.x, p.z) - r;
    float dy = fabsf(p.y) - h;
    return minf(maxf(d, dy), 0.0f) + len2f(maxf(d,0), maxf(dy,0));
}
static inline float sdCylZ(V3 p, float r, float h){
    float d = len2f(p.x, p.y) - r;
    float dz = fabsf(p.z) - h;
    return minf(maxf(d, dz), 0.0f) + len2f(maxf(d,0), maxf(dz,0));
}
static inline float sdCylX(V3 p, float r, float h){
    float d = len2f(p.z, p.y) - r;
    float dx = fabsf(p.x) - h;
    return minf(maxf(d, dx), 0.0f) + len2f(maxf(d,0), maxf(dx,0));
}
static inline float sdSphere(V3 p, float r){ return len3(p) - r; }
static inline float sdCapsule(V3 p, V3 a, V3 b, float r){
    V3 pa = sub(p,a), ba = sub(b,a);
    float h = satf(dot(pa,ba)/dot(ba,ba));
    return len3(sub(pa, scl(ba,h))) - r;
}
/* torus with its hole facing up (a ring lying flat) */
static inline float sdTorusY(V3 p, float R, float r){
    float q = len2f(p.x, p.z) - R;
    return len2f(q, p.y) - r;
}
/* torus standing up in the XY plane -- a coaster loop */
static inline float sdTorusZ(V3 p, float R, float r){
    float q = len2f(p.x, p.y) - R;
    return len2f(q, p.z) - r;
}
static inline float sdEllipsoid(V3 p, V3 r){
    float k0 = len3(v3(p.x/r.x, p.y/r.y, p.z/r.z));
    float k1 = len3(v3(p.x/(r.x*r.x), p.y/(r.y*r.y), p.z/(r.z*r.z)));
    return k1 > 1e-9f ? k0*(k0-1.0f)/k1 : 0.0f;
}
/* cone, axis Y, base radius r1 at -h, top radius r2 at +h */
static float sdCappedCone(V3 p, float h, float r1, float r2){
    float qx = len2f(p.x, p.z), qy = p.y;
    float k1x = r2, k1y = h;
    float k2x = r2 - r1, k2y = 2.0f*h;
    float cax = qx - minf(qx, (qy < 0.0f) ? r1 : r2);
    float cay = fabsf(qy) - h;
    float dk2 = k2x*k2x + k2y*k2y;
    float tt = satf(((k1x-qx)*k2x + (k1y-qy)*k2y)/maxf(dk2, 1e-9f));
    float cbx = qx - k1x + k2x*tt;
    float cby = qy - k1y + k2y*tt;
    float s = (cbx < 0.0f && cay < 0.0f) ? -1.0f : 1.0f;
    return s*sqrtf(minf(cax*cax + cay*cay, cbx*cbx + cby*cby));
}
static inline float opSmoothU(float a, float b, float k){
    float h = satf(0.5f + 0.5f*(b-a)/k);
    return mixf(b, a, h) - k*h*(1.0f-h);
}

/* -------------------------------------------------------------- a 5x7 font
 * Used twice: burned into the picture by the camcorder's character generator,
 * and lit up in neon on the front of every booth on the midway. */
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
/*! */{"..#..","..#..","..#..","..#..","..#..",".....","..#.."},
/*$ */{"..#..",".####","#.#..",".###.","..#.#","####.","..#.."},
};
static int glyph_index(char ch){
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'A' && ch <= 'Z') return 10 + (ch - 'A');
    if (ch >= 'a' && ch <= 'z') return 10 + (ch - 'a');
    if (ch == ':') return 37;
    if (ch == '.') return 38;
    if (ch == '-') return 39;
    if (ch == '!') return 40;
    if (ch == '$') return 41;
    return 36;
}
/* 1 inside a lit stroke of the string, 0 outside. u,v are 0..1 across the sign */
static float text_mask(const char *s, float u, float v){
    int L = (int)strlen(s);
    if (L <= 0) return 0.0f;
    float W = 6.0f*L - 1.0f;
    float gx = u*W, gy = v*7.0f;
    if (gy < 0.0f || gy >= 7.0f || gx < 0.0f || gx >= W) return 0.0f;
    int ci = (int)(gx/6.0f);
    if (ci < 0 || ci >= L) return 0.0f;
    float fx = gx - ci*6.0f;
    if (fx >= 5.0f) return 0.0f;
    return GLYPH[glyph_index(s[ci])][(int)gy][(int)fx] == '#' ? 1.0f : 0.0f;
}

/* ------------------------------------------------------------------ materials */
enum {
    M_NONE = 0,
    M_ASPHALT, M_BOOTH, M_AWNING, M_COUNTER, M_SHELF, M_PLUSH, M_NEONSIGN,
    M_CRTBODY, M_CRTSCREEN, M_KIOSK, M_RUSTMETAL, M_PAINTMETAL, M_WOOD,
    M_CONCRETE, M_RAILSTEEL, M_TIE, M_STEEL, M_CANOPY, M_CARDECK, M_BRASS,
    M_POPCORN, M_CARTBODY, M_GLASS, M_GONDOLA, M_ARENAFLOOR, M_BUMPERCAR,
    M_BUMPERWALL, M_JSUIT, M_JFACE, M_JEYE, M_JBELL, M_JRUFF,
    M_MIRROR, M_FUNWALL, M_FUNFLOOR, M_FUNCEIL, M_VOIDTEX, M_TICKETSIGN,
    M_BULB, M_LAMPPOST, M_SIGNBACK, M_TARP, M_TICKETGRILLE, M_MIRRORFRAME,
    M_FLOODLAMP
};

/* ------------------------------------------------------------------ the world */
#define GW 64
#define GH 64
#define CELL 3.0f
#define BOOTH_H  3.20f      /* height of a prize booth block            */
#define BOOTH_PROT 1.00f    /* how far awnings and signs stick out      */
#define BOOTH_TOP  4.42f    /* nothing on the midway is taller than this*/
#define FUN_H    2.62f      /* funhouse ceiling  */
#define MZ_H     2.80f      /* mirror maze ceiling */

typedef struct {
    char  c[GH][GW];        /* '#' solid, '.' open */
    float dm[GH][GW];       /* distance from cell centre to the nearest solid
                             * cell that is *not* in the 3x3 neighbourhood --
                             * lets the marcher take long steps down an
                             * empty midway instead of creeping cell by cell */
} Grid;

static Grid GM;             /* the midway: endless rows of prize booths */
static Grid GF;             /* the funhouse */
static unsigned char MZP[GH][GW];   /* mirror maze panels: bit0 = -z face, bit1 = -x face */

static inline float CW(float c){ return (c + 0.5f - GW*0.5f) * CELL; }
static inline int   WC(float w){ return (int)floorf(w/CELL + GW*0.5f); }

static void grid_fill(Grid *g, char c){
    for (int r = 0; r < GH; r++) for (int q = 0; q < GW; q++) g->c[r][q] = c;
}
static inline int solidg(const Grid *g, int cx, int cz){
    if (cx < 0 || cx >= GW || cz < 0 || cz >= GH) return 1;
    return g->c[cz][cx] != '.';
}
static void carve_cell(Grid *g, int cx, int cz){
    if (cx >= 1 && cx < GW-1 && cz >= 1 && cz < GH-1) g->c[cz][cx] = '.';
}
static void carve_rect(Grid *g, int x0, int z0, int x1, int z1){
    for (int z = z0; z <= z1; z++) for (int x = x0; x <= x1; x++) carve_cell(g, x, z);
}
/* carve a corridor along a polyline in cell coordinates, dilated so a smoothed
 * camera path can never clip an inside corner */
static void carve_path(Grid *g, const float *pts, int n, int dilate){
    for (int i = 0; i + 1 < n; i++){
        float ax = pts[i*2], az = pts[i*2+1];
        float bx = pts[i*2+2], bz = pts[i*2+3];
        float d = fabsf(bx-ax) + fabsf(bz-az);
        int steps = (int)(d*12.0f) + 2;
        for (int s = 0; s <= steps; s++){
            float t = (float)s/steps;
            int x = (int)floorf(ax + (bx-ax)*t + 0.5f);
            int z = (int)floorf(az + (bz-az)*t + 0.5f);
            for (int oz = -dilate; oz <= dilate; oz++)
                for (int ox = -dilate; ox <= dilate; ox++)
                    carve_cell(g, x+ox, z+oz);
        }
    }
}

/* Build the far-field distance table. O(n^4) but n is 64 and this runs once. */
static void grid_build_dm(Grid *g, float prot){
    for (int cz = 0; cz < GH; cz++)
        for (int cx = 0; cx < GW; cx++){
            float best = 1e9f;
            float px = CW((float)cx), pz = CW((float)cz);
            for (int qz = 0; qz < GH; qz++)
                for (int qx = 0; qx < GW; qx++){
                    if (g->c[qz][qx] == '.') continue;
                    int dx = qx-cx, dz = qz-cz;
                    if (dx > -2 && dx < 2 && dz > -2 && dz < 2) continue;  /* exact zone */
                    float bx = CW((float)qx), bz = CW((float)qz);
                    float e = CELL*0.5f + prot;
                    float d = sdBox2(px-bx, pz-bz, e, e);
                    if (d < best) best = d;
                }
            /* the world outside the array is solid */
            float edge = minf(minf(px - CW(0.0f), CW((float)(GW-1)) - px),
                              minf(pz - CW(0.0f), CW((float)(GH-1)) - pz));
            if (edge < best) best = edge;
            g->dm[cz][cx] = best < 0.0f ? 0.0f : best;
        }
}

/* --------------------------------------------------------------- scene state */
enum { SC_BOOTH = 0, SC_MIDWAY, SC_PLAZA, SC_FUN, SC_MIRROR, SC_VOID };
static int   g_scene;
static float g_time;

/* the ticket booth, and the tiny monitor built into its counter */
static V3    P_BOOTH   = { -7.5f, 0.0f, -77.0f };   /* centre of the kiosk mass */
static V3    P_CRT     = { -7.62f, 0.600f, -74.18f };
#define CRT_TILT 0.36f      /* the screen is canted up, out of the counter */
#define CRT_HW   0.128f
#define CRT_HH   0.096f

/* the plaza, the arena, and the thing standing between them */
#define PLAZA_X  13.5f
#define PLAZA_Z  61.5f
static V3    P_ARENA   = { 23.6f, 0.0f, 66.0f };
/* the only two floodlights in the park that are still lit */
static V3    P_FLOOD1  = {  3.2f, 0.0f, 56.5f };
static V3    P_FLOOD2  = { 33.0f, 0.0f, 75.0f };
static V3    P_CAROUSEL= { 24.0f, 0.0f, -33.0f };
static V3    P_TWIST   = {  2.0f, 0.0f,  -6.0f };
static V3    P_POPCORN = { 36.2f, 0.0f,  26.5f };

/* animation globals, set once per frame by the renderer */
static float g_carousel_ang = 0.0f;   /* it turns backwards, and in silence */
static float g_popcorn_t    = 0.0f;
static float g_neon_gain    = 1.0f;
static float g_crt_gain     = 1.0f;
static float g_feed_break   = 0.0f;   /* 0..1: the feed coming apart into rainbow */
static float g_warp         = 0.0f;   /* real-time distortion of the park itself */
static float g_jest_vis     = 0.0f;
static V3    g_jest_pos     = { PLAZA_X, 0.0f, PLAZA_Z + 3.4f };
static float g_jest_yaw     = 0.0f;
static float g_jest_contort = 0.0f;   /* 0 standing dead still, 1 spider */
static float g_jest_twitch  = 0.0f;
static float g_void_mix     = 0.0f;   /* missing-texture rot creeping in */

/* ------------------------------------------------------------ the midway grid
 * Three cells of street, four or five cells of booth block, forever. It is a
 * layout, not a maze: you can always see a long way down a midway, and every
 * midway looks exactly like the one before it. */
static int mid_pattern(int cx, int cz){
    int ax = ((cx % 7) + 7) % 7;
    int az = ((cz % 8) + 8) % 8;
    if (ax <= 2 || az <= 2) return 0;      /* open */
    return 1;                              /* booth block */
}

/* The lattice of things too big to be a booth. One entry every 42 x 48 m,
 * always landing inside a block so nothing ever stands in a walkway. */
#define LAT_X 63.0f
#define LAT_Z 72.0f
static inline float lat_cx(int i){ return CW(21.0f*i + 4.5f); }
static inline float lat_cz(int j){ return CW(24.0f*j + 5.0f); }

/* ---------------------------------------------------------------- prize booth
 * One face of one block: awning, counter, a window with a shelf of oversized
 * plushies behind it, and a neon sign over the top. Every one identical, which
 * is the point.
 *
 * Local frame: L.x runs along the face, L.y is up, L.z points out of it. */
static const char *SIGN_WORDS[8] = {
    "PRIZES", "GAMES", "WIN", "PLAY", "TRY YOUR LUCK", "3 BALLS", "EVERY ONE WINS", "TOKENS"
};

static float booth_face(V3 L, float half, int seed, int *mat, float *blockcut)
{
    float d = 1e9f; int m = *mat;

    /* the window, bitten out of the block */
    float win = sdBox(v3(L.x, L.y - 2.02f, L.z - half), v3(half - 0.34f, 0.62f, 0.62f));
    *blockcut = win;

    /* counter slab */
    float ctr = sdBox(v3(L.x, L.y - 1.06f, L.z - half - 0.20f),
                      v3(half - 0.20f, 0.055f, 0.26f));
    if (ctr < d){ d = ctr; m = M_COUNTER; }
    /* apron under the counter */
    float apr = sdBox(v3(L.x, L.y - 0.72f, L.z - half - 0.42f),
                      v3(half - 0.20f, 0.34f, 0.030f));
    if (apr < d){ d = apr; m = M_BOOTH; }

    /* the shelf inside, and what is sitting on it */
    float shf = sdBox(v3(L.x, L.y - 1.44f, L.z - half + 0.46f),
                      v3(half - 0.36f, 0.030f, 0.34f));
    if (shf < d){ d = shf; m = M_SHELF; }

    /* awning: a slab, and a scalloped valance hanging off its lip */
    float aw = sdBox(v3(L.x, L.y - 2.86f, L.z - half - 0.46f),
                     v3(half + 0.06f, 0.055f, 0.50f));
    if (aw < d){ d = aw; m = M_AWNING; }
    {
        float sc = 0.10f + 0.055f*cosf(L.x*8.4f);        /* scallops */
        float val = sdBox(v3(L.x, L.y - 2.70f, L.z - half - 0.94f),
                          v3(half + 0.06f, sc, 0.028f));
        if (val < d){ d = val; m = M_AWNING; }
    }
    /* two struts back to the block */
    {
        float sx = fabsf(L.x) - (half - 0.14f);
        float str = sdBox(v3(sx, L.y - 2.86f, L.z - half - 0.20f), v3(0.035f, 0.30f, 0.030f));
        if (str < d){ d = str; m = M_PAINTMETAL; }
    }

    /* the sign. A box of glass tube, spelling the same promise every time. */
    {
        float sg = sdBox(v3(L.x, L.y - 3.62f, L.z - half - 0.22f),
                         v3(half - 0.30f, 0.40f, 0.055f));
        if (sg < d){ d = sg; m = M_NEONSIGN; }
        float fr = sdBox(v3(L.x, L.y - 3.62f, L.z - half - 0.15f),
                         v3(half - 0.24f, 0.46f, 0.075f));
        fr = maxf(fr, -sdBox(v3(L.x, L.y - 3.62f, L.z - half - 0.30f),
                             v3(half - 0.30f, 0.40f, 0.20f)));
        if (fr < d){ d = fr; m = M_SIGNBACK; }
    }

    /* the plushies. Nobody has won one. Nobody is going to. */
    {
        float per = 0.66f;
        float ix = repi(L.x, per);
        float lx = L.x - per*ix;
        int   si = (int)ix + seed*7;
        float rr = 0.185f + 0.055f*fh1(si*3);
        float ly = 1.475f + rr;
        V3 q = v3(lx, L.y - ly, L.z - half + 0.44f);
        if (fabsf(L.x) < half - 0.42f){
            float bod = sdEllipsoid(q, v3(rr*0.95f, rr, rr*0.88f));
            float e1 = sdSphere(sub(q, v3(-rr*0.62f, rr*0.72f, 0.0f)), rr*0.40f);
            float e2 = sdSphere(sub(q, v3( rr*0.62f, rr*0.72f, 0.0f)), rr*0.40f);
            float sn = sdSphere(sub(q, v3(0.0f, -rr*0.18f, -rr*0.72f)), rr*0.34f);
            float pl = minf(minf(bod, minf(e1, e2)), sn);
            if (pl < d){ d = pl; m = M_PLUSH; }
        }
        /* one sitting out on the counter, face down */
        if (fabsf(L.x - (half*0.42f)) < 0.40f){
            V3 c2 = v3(L.x - half*0.42f, L.y - 1.30f, L.z - half - 0.20f);
            float pl = sdEllipsoid(c2, v3(0.20f, 0.15f, 0.20f));
            if (pl < d){ d = pl; m = M_PLUSH; }
        }
    }
    *mat = m;
    return d;
}

/* rows of prize booths, plus their signs. Exact in the 3x3 neighbourhood,
 * conservatively bounded outside it. */
static float park_blocks(V3 p, int *mat)
{
    int cx = WC(p.x), cz = WC(p.z);
    float best = 1e9f; int bm = M_BOOTH;

    for (int dz = -1; dz <= 1; dz++)
        for (int dx = -1; dx <= 1; dx++){
            int qx = cx+dx, qz = cz+dz;
            if (qx < 0 || qx >= GW || qz < 0 || qz >= GH) continue;
            if (GM.c[qz][qx] == '.') continue;
            float wx = CW((float)qx), wz = CW((float)qz);
            V3 q = sub(p, v3(wx, 0.0f, wz));
            float half = CELL*0.5f;
            float blk = sdBox(v3(q.x, q.y - BOOTH_H*0.5f, q.z), v3(half, BOOTH_H*0.5f, half));
            int   bmm = M_BOOTH;
            float dets = 1e9f; int detm = M_BOOTH;

            /* skip the detail work entirely unless we are near this block */
            if (blk < 1.6f){
                for (int s = 0; s < 4; s++){
                    int nx = qx + ((s==0) - (s==1));
                    int nz = qz + ((s==2) - (s==3));
                    if (solidg(&GM, nx, nz)) continue;
                    V3 L;
                    if (s == 0)      L = v3(q.z, q.y,  q.x);
                    else if (s == 1) L = v3(-q.z, q.y, -q.x);
                    else if (s == 2) L = v3(-q.x, q.y,  q.z);
                    else             L = v3( q.x, q.y, -q.z);
                    int fm = M_BOOTH; float cut;
                    int seed = qx*31 + qz*17 + s*5;
                    float fd = booth_face(L, half, seed, &fm, &cut);
                    blk = maxf(blk, -cut);
                    if (fd < dets){ dets = fd; detm = fm; }
                }
            }
            if (blk < best){ best = blk; bm = bmm; }
            if (dets < best){ best = dets; bm = detm; }
        }

    /* far field: the table says how far the nearest block outside the exact
     * zone can possibly be, and geometry has a finite height */
    float bound;
    {
        int qx = cx < 0 ? 0 : (cx >= GW ? GW-1 : cx);
        int qz = cz < 0 ? 0 : (cz >= GH ? GH-1 : cz);
        float hd = len2f(p.x - CW((float)qx), p.z - CW((float)qz));
        bound = GM.dm[qz][qx] - hd;
        float above = p.y - BOOTH_TOP;
        if (above > bound) bound = above;
        if (bound < 0.0f) bound = 0.0f;
    }
    *mat = bm;
    return minf(best, bound);
}

/* --------------------------------------------------------- big park furniture
 * A ferris wheel, a coaster loop or a drop tower, chosen by hash, one per
 * lattice cell, repeating out into the fog in every direction. */
static float ride_ferris(V3 q, int seed, int *mat)
{
    /* q is relative to the base of the ride */
    float bnd = sdSphere(sub(q, v3(0.0f, 15.0f, 0.0f)), 16.5f);
    if (bnd > 1.2f) return bnd;
    float d = 1e9f; int m = M_STEEL;
    float R = 13.2f, hub = 15.4f;
    V3 c = sub(q, v3(0.0f, hub, 0.0f));
    /* A frames */
    for (int s = 0; s < 2; s++){
        float zz = s ? 2.6f : -2.6f;
        float a1 = sdCapsule(q, v3(-5.4f, 0.0f, zz), v3(0.0f, hub, zz*0.35f), 0.30f);
        float a2 = sdCapsule(q, v3( 5.4f, 0.0f, zz), v3(0.0f, hub, zz*0.35f), 0.30f);
        d = minf(d, minf(a1, a2));
        float br = sdCapsule(q, v3(-3.4f, hub*0.42f, zz*0.72f), v3(3.4f, hub*0.42f, zz*0.72f), 0.13f);
        d = minf(d, br);
    }
    /* the wheel: two rims, spokes, and the empty cars */
    float sp = 0.0f;
    {
        V3 w = rotZ(c, 0.06f*g_time*0.0f);          /* it does not turn */
        for (int s = 0; s < 2; s++){
            float zz = s ? 1.5f : -1.5f;
            float rim = sdTorusZ(v3(w.x, w.y, w.z - zz), R, 0.115f);
            d = minf(d, rim);
        }
        /* spokes, folded into 16 sectors of the XY plane */
        float a = atan2f(w.y, w.x);
        float sect = 2.0f*PI/16.0f;
        float fa = a - sect*floorf(a/sect + 0.5f);
        float rr = len2f(w.x, w.y);
        float sx = rr*cosf(fa), sy = rr*sinf(fa);
        sp = sdBox(v3(sx - R*0.5f, sy, w.z), v3(R*0.5f, 0.045f, 1.6f));
        d = minf(d, sp);
        float hubd = sdCylZ(v3(w.x, w.y, w.z), 0.72f, 1.9f);
        d = minf(d, hubd);
        /* gondolas hanging off the rim, all of them empty */
        {
            float sect2 = 2.0f*PI/14.0f;
            float a2 = atan2f(w.y, w.x);
            float k = floorf(a2/sect2 + 0.5f);
            float ang = k*sect2;
            V3 g = sub(w, v3(cosf(ang)*R, sinf(ang)*R, 0.0f));
            float car = sdRoundBox(sub(g, v3(0.0f, -0.95f, 0.0f)), v3(0.62f, 0.42f, 0.72f), 0.10f);
            car = maxf(car, -sdBox(sub(g, v3(0.0f, -0.52f, 0.0f)), v3(0.50f, 0.30f, 0.60f)));
            float yoke = sdCapsule(g, v3(0.0f, 0.0f, 0.0f), v3(0.0f, -0.78f, 0.0f), 0.055f);
            if (car < d){ d = car; m = M_GONDOLA; }
            if (yoke < d){ d = yoke; m = M_STEEL; }
        }
    }
    (void)seed;
    *mat = m;
    return d;
}

static float ride_loop(V3 q, int seed, int *mat)
{
    float bnd = sdSphere(sub(q, v3(0.0f, 13.0f, 0.0f)), 14.5f);
    if (bnd > 1.2f) return bnd;
    float d = 1e9f; int m = M_RAILSTEEL;
    /* the loop itself, standing in the XZ plane so it reads side-on from the
     * midway, lifted clear of the booths */
    float R = 7.6f;
    V3 c = sub(q, v3(0.0f, 12.6f, 0.0f));
    for (int s = 0; s < 2; s++){
        float off = s ? 0.62f : -0.62f;
        float rail = sdTorusZ(v3(c.x, c.y, c.z - off), R, 0.085f);
        d = minf(d, rail);
    }
    /* ties across the loop, folded round the circle */
    {
        float a = atan2f(c.y, c.x);
        float sect = 2.0f*PI/40.0f;
        float fa = a - sect*floorf(a/sect + 0.5f);
        float rr = len2f(c.x, c.y);
        float tx = rr*cosf(fa) - R, ty = rr*sinf(fa);
        float tie = sdBox(v3(tx, ty, c.z), v3(0.10f, 0.055f, 0.66f));
        if (tie < d){ d = tie; m = M_TIE; }
    }
    /* the straight track running away either side, and its trestle */
    {
        float rail = 1e9f;
        for (int s = 0; s < 2; s++){
            float off = s ? 0.62f : -0.62f;
            float r1 = sdBox(v3(q.x, q.y - 5.0f, q.z - off), v3(20.0f, 0.075f, 0.075f));
            rail = minf(rail, r1);
        }
        if (rail < d){ d = rail; m = M_RAILSTEEL; }
        float xr = rep1(q.x, 2.4f);
        float tie = sdBox(v3(xr, q.y - 5.08f, q.z), v3(0.09f, 0.045f, 0.80f));
        if (fabsf(q.x) < 20.0f && tie < d){ d = tie; m = M_TIE; }
        float xr2 = rep1(q.x, 4.8f);
        float post = sdBox(v3(xr2, q.y - 2.5f, q.z), v3(0.14f, 2.5f, 0.14f));
        if (fabsf(q.x) < 19.0f && post < d){ d = post; m = M_STEEL; }
    }
    /* legs up to the loop */
    {
        float lg = sdCapsule(q, v3(-2.2f, 0.0f, 0.0f), v3(-1.2f, 5.0f, 0.0f), 0.20f);
        float lg2 = sdCapsule(q, v3( 2.2f, 0.0f, 0.0f), v3( 1.2f, 5.0f, 0.0f), 0.20f);
        float lg3 = sdCapsule(q, v3(0.0f, 5.0f, 0.0f), v3(0.0f, 12.6f - R, 0.0f), 0.22f);
        float l = minf(minf(lg, lg2), lg3);
        if (l < d){ d = l; m = M_STEEL; }
    }
    (void)seed;
    *mat = m;
    return d;
}

static float ride_tower(V3 q, int seed, int *mat)
{
    float bnd = sdSphere(sub(q, v3(0.0f, 14.0f, 0.0f)), 15.5f);
    if (bnd > 1.2f) return bnd;
    float d = 1e9f; int m = M_STEEL;
    float H = 24.0f + 6.0f*fh1(seed);
    /* lattice mast: three legs and a spiral of bracing */
    V3 f = pmodY(q, 3);
    float leg = sdCylY(v3(f.x - 1.15f, f.y - H*0.5f, f.z), 0.14f, H*0.5f);
    d = minf(d, leg);
    {
        float yr = rep1(q.y - 1.0f, 2.0f);
        float ring = sdTorusY(v3(q.x, yr, q.z), 1.15f, 0.055f);
        if (q.y > 0.5f && q.y < H && ring < d) d = ring;
    }
    /* the car, parked at the bottom for good */
    float car = sdBox(v3(q.x, q.y - 1.30f, q.z), v3(1.9f, 0.55f, 1.9f));
    car = maxf(car, -sdCylY(v3(q.x, q.y - 1.30f, q.z), 1.35f, 0.9f));
    if (car < d){ d = car; m = M_GONDOLA; }
    float cap = sdCappedCone(v3(q.x, q.y - H - 1.1f, q.z), 1.1f, 1.5f, 0.15f);
    if (cap < d){ d = cap; m = M_PAINTMETAL; }
    *mat = m;
    return d;
}

/* the whole endless skyline, from the nearest nine lattice cells */
static float park_rides(V3 p, int *mat)
{
    float best = 1e9f; int bm = M_STEEL;
    int i0 = (int)floorf((p.x - CW(4.5f))/LAT_X + 0.5f);
    int j0 = (int)floorf((p.z - CW(5.0f))/LAT_Z + 0.5f);
    /* period is wider than any single structure, so the nearest four suffice */
    for (int j = j0-1; j <= j0+1; j++)
        for (int i = i0-1; i <= i0+1; i++){
            V3 q = sub(p, v3(lat_cx(i), 0.0f, lat_cz(j)));
            int kind = ih2(i*7+3, j*13+5, 6);
            int m = M_STEEL; float d;
            if (kind == 0 || kind == 3)      d = ride_ferris(q, i*31+j, &m);
            else if (kind == 1 || kind == 4) d = ride_loop(q, i*17+j, &m);
            else if (kind == 2)              d = ride_tower(q, i*11+j, &m);
            else {
                /* a stand of dead floodlight masts */
                float bnd = sdSphere(sub(q, v3(0.0f, 7.0f, 0.0f)), 9.0f);
                if (bnd > 1.2f) d = bnd;
                else {
                    float mast = sdCylY(v3(q.x, q.y - 5.5f, q.z), 0.11f, 5.5f);
                    float head = sdBox(v3(q.x, q.y - 11.2f, q.z), v3(1.3f, 0.28f, 0.22f));
                    d = minf(mast, head);
                    m = M_STEEL;
                }
            }
            if (d < best){ best = d; bm = m; }
        }
    *mat = bm;
    return best;
}

/* ------------------------------------------------------------- lamp standards
 * Sodium globes on cast posts, one at every street crossing. Most of the light
 * in the park comes from these and from the neon. */
#define LAMP_OX 2.85f          /* off the centreline, onto the kerb */
static float park_lamps(V3 p, int *mat)
{
    float px = CW(1.0f) + LAMP_OX, pz = CW(1.0f) + LAMP_OX;
    float qx = rep1(p.x - px, 21.0f);
    float qz = rep1(p.z - pz, 24.0f);
    float bnd = len2f(qx, qz) - 0.9f;
    float above = p.y - 4.75f;
    if (above > bnd) bnd = above;
    if (bnd > 1.0f){ *mat = M_LAMPPOST; return bnd; }
    float post = sdCylY(v3(qx, p.y - 2.1f, qz), 0.075f, 2.1f);
    float base = sdCappedCone(v3(qx, p.y - 0.22f, qz), 0.22f, 0.22f, 0.11f);
    float d = minf(post, base);
    int m = M_LAMPPOST;
    float neck = sdCylY(v3(qx, p.y - 4.18f, qz), 0.045f, 0.10f);
    d = minf(d, neck);
    float glob = sdSphere(v3(qx, p.y - 4.46f, qz), 0.235f);
    if (glob < d){ d = glob; m = M_BULB; }
    float cap = sdCappedCone(v3(qx, p.y - 4.74f, qz), 0.09f, 0.26f, 0.10f);
    if (cap < d){ d = cap; m = M_LAMPPOST; }
    *mat = m;
    return d;
}

/* ---------------------------------------------------------- the ticket booth
 * Giant, octagonal-ish, rust running down every seam, a conical roof, and a
 * counter with a small monitor let into it. */
static float prop_kiosk(V3 p, int *mat)
{
    V3 q = sub(p, P_BOOTH);
    float bnd = sdBox(v3(q.x, q.y - 3.6f, q.z), v3(4.2f, 3.9f, 2.6f));
    if (bnd > 1.2f){ *mat = M_KIOSK; return bnd; }

    float d = 1e9f; int m = M_KIOSK;
    /* body */
    float body = sdRoundBox(v3(q.x, q.y - 2.55f, q.z), v3(3.45f, 2.55f, 1.45f), 0.06f);
    /* the ticket window, and a dark hole behind it */
    float win = sdBox(v3(q.x, q.y - 2.34f, q.z - 1.46f), v3(1.42f, 0.66f, 0.62f));
    body = maxf(body, -win);
    d = body;

    /* counter, and the apron under it that the monitor sits in */
    float ctr = sdBox(v3(q.x, q.y - 1.44f, q.z - 1.86f), v3(2.30f, 0.075f, 0.86f));
    if (ctr < d){ d = ctr; m = M_COUNTER; }
    float apron = sdBox(v3(q.x, q.y - 0.90f, q.z - 2.78f), v3(2.30f, 0.62f, 0.045f));
    /* the hole they cut in it for the monitor */
    apron = maxf(apron, -sdBox(sub(p, add(P_CRT, v3(0.0f, 0.0f, -0.02f))),
                               v3(CRT_HW + 0.048f, CRT_HH + 0.044f, 0.30f)));
    if (apron < d){ d = apron; m = M_KIOSK; }
    float kick = sdBox(v3(q.x, q.y - 0.14f, q.z - 2.40f), v3(2.30f, 0.14f, 0.34f));
    if (kick < d){ d = kick; m = M_RUSTMETAL; }

    /* bars across the window */
    {
        float xr = rep1(q.x, 0.30f);
        float bar = sdCylY(v3(xr, q.y - 2.34f, q.z - 1.46f), 0.016f, 0.66f);
        if (fabsf(q.x) < 1.42f && bar < d){ d = bar; m = M_TICKETGRILLE; }
    }

    /* roof: a broad cone with a scalloped skirt and a finial */
    {
        float sk = sdCappedCone(v3(q.x, q.y - 5.34f, q.z), 0.20f, 4.15f, 3.95f);
        if (sk < d){ d = sk; m = M_AWNING; }
        float scal = 0.16f + 0.085f*cosf(atan2f(q.z, q.x)*11.0f);
        float skirt = sdTorusY(v3(q.x, q.y - 5.06f, q.z), 4.05f, scal);
        if (skirt < d){ d = skirt; m = M_AWNING; }
        float cone = sdCappedCone(v3(q.x, q.y - 6.42f, q.z), 0.95f, 3.95f, 0.42f);
        if (cone < d){ d = cone; m = M_AWNING; }
        float fin = sdSphere(sub(q, v3(0.0f, 7.55f, 0.0f)), 0.30f);
        float rod = sdCylY(v3(q.x, q.y - 7.55f, q.z), 0.045f, 0.55f);
        float f = minf(fin, rod);
        if (f < d){ d = f; m = M_BRASS; }
    }
    /* TICKETS, in neon, above the window */
    {
        float sg = sdBox(v3(q.x, q.y - 3.86f, q.z - 1.52f), v3(1.78f, 0.40f, 0.055f));
        if (sg < d){ d = sg; m = M_TICKETSIGN; }
        float fr = sdBox(v3(q.x, q.y - 3.86f, q.z - 1.44f), v3(1.92f, 0.54f, 0.085f));
        fr = maxf(fr, -sdBox(v3(q.x, q.y - 3.86f, q.z - 1.62f), v3(1.78f, 0.40f, 0.22f)));
        if (fr < d){ d = fr; m = M_SIGNBACK; }
    }
    /* the monitor, let into the apron and canted up out of it */
    {
        V3 c = sub(p, P_CRT);
        V3 r = rotX(c, -CRT_TILT);
        float bez = sdRoundBox(v3(r.x, r.y, r.z + 0.10f), v3(CRT_HW+0.036f, CRT_HH+0.032f, 0.115f), 0.018f);
        float scr = sdBox(r, v3(CRT_HW, CRT_HH, 0.012f));
        bez = maxf(bez, -sdBox(v3(r.x, r.y, r.z - 0.004f), v3(CRT_HW+0.004f, CRT_HH+0.004f, 0.05f)));
        if (bez < d){ d = bez; m = M_CRTBODY; }
        if (scr < d){ d = scr; m = M_CRTSCREEN; }
    }
    /* a turnstile off to one side, and a rope stanchion */
    {
        V3 s = sub(q, v3(3.9f, 0.0f, 2.2f));
        float post = sdCylY(v3(s.x, s.y - 0.52f, s.z), 0.055f, 0.52f);
        float ring = sdTorusY(v3(s.x, s.y - 1.02f, s.z), 0.075f, 0.022f);
        float st = minf(post, ring);
        float base = sdCappedCone(v3(s.x, s.y - 0.05f, s.z), 0.05f, 0.22f, 0.16f);
        st = minf(st, base);
        if (st < d){ d = st; m = M_BRASS; }
        /* the rope, sagging to nowhere */
        float rp = sdCapsule(s, v3(0.0f, 1.0f, 0.0f), v3(-1.6f, 0.62f, 0.0f), 0.022f);
        if (rp < d){ d = rp; m = M_TARP; }
    }
    *mat = m;
    return d;
}

/* ------------------------------------------------------------- the carousel
 * Turning the wrong way round, with nothing on it. */
static float prop_carousel(V3 p, int *mat)
{
    V3 q = sub(p, P_CAROUSEL);
    float bnd = sdCylY(v3(q.x, q.y - 3.4f, q.z), 7.6f, 3.9f);
    if (bnd > 1.2f){ *mat = M_CARDECK; return bnd; }
    float d = 1e9f; int m = M_CARDECK;

    /* the deck, and the drum under it */
    float deck = sdCylY(v3(q.x, q.y - 0.46f, q.z), 6.40f, 0.13f);
    d = deck;
    float drum = sdCylY(v3(q.x, q.y - 0.20f, q.z), 5.90f, 0.20f);
    if (drum < d){ d = drum; m = M_PAINTMETAL; }

    /* everything that turns, turns backwards */
    V3 r = rotY(q, -g_carousel_ang);
    /* poles where the horses would be. There are no horses. */
    {
        V3 f = pmodY(v3(r.x, r.y, r.z), 12);
        float pole = sdCylY(v3(f.x - 5.05f, f.y - 2.55f, f.z), 0.045f, 2.05f);
        if (pole < d){ d = pole; m = M_BRASS; }
        /* the stirrup plate each one stood on, empty */
        float pl = sdCylY(v3(f.x - 5.05f, f.y - 0.60f, f.z), 0.24f, 0.020f);
        if (pl < d){ d = pl; m = M_BRASS; }
        /* the inner ring of poles */
        V3 f2 = pmodY(rotY(v3(r.x, r.y, r.z), 0.26f), 12);
        float pole2 = sdCylY(v3(f2.x - 3.30f, f2.y - 2.55f, f2.z), 0.038f, 2.05f);
        if (pole2 < d){ d = pole2; m = M_BRASS; }
    }
    /* centre drum with its mirrored panels */
    {
        float col = sdCylY(v3(r.x, r.y - 2.7f, r.z), 1.05f, 2.3f);
        if (col < d){ d = col; m = M_MIRROR; }
        float rib = 1e9f;
        V3 f = pmodY(v3(r.x, r.y, r.z), 16);
        rib = sdBox(v3(f.x - 1.06f, f.y - 2.7f, f.z), v3(0.035f, 2.3f, 0.045f));
        if (rib < d){ d = rib; m = M_BRASS; }
    }
    /* canopy: cone, with a scalloped valance and painted rounding boards */
    {
        float cone = sdCappedCone(v3(r.x, r.y - 5.40f, r.z), 0.82f, 6.55f, 1.15f);
        if (cone < d){ d = cone; m = M_CANOPY; }
        float sc = 0.20f + 0.10f*cosf(atan2f(r.z, r.x)*13.0f);
        float val = sdTorusY(v3(r.x, r.y - 4.44f, r.z), 6.52f, sc);
        if (val < d){ d = val; m = M_CANOPY; }
        float board = sdCylY(v3(r.x, r.y - 6.34f, r.z), 1.30f, 0.34f);
        if (board < d){ d = board; m = M_CANOPY; }
        float fin = sdSphere(sub(r, v3(0.0f, 6.90f, 0.0f)), 0.22f);
        if (fin < d){ d = fin; m = M_BRASS; }
    }
    /* the step up onto the deck, which does not turn */
    {
        float st = sdBox(sub(q, v3(0.0f, 0.14f, 6.85f)), v3(1.5f, 0.14f, 0.55f));
        if (st < d){ d = st; m = M_WOOD; }
    }
    *mat = m;
    return d;
}

/* --------------------------------------------- the wooden coaster that ends
 * A trestle carries the track along, and then the track rolls over and goes
 * into the concrete. It does not come out anywhere. */
#define TWIST_ROT 1.5708f      /* broadside to the midway, so it reads */
static float prop_twist(V3 p, int *mat)
{
    V3 q = rotY(sub(p, P_TWIST), TWIST_ROT);
    float bnd = sdBox(v3(q.x, q.y - 4.0f, q.z), v3(11.0f, 5.4f, 2.8f));
    if (bnd > 1.2f){ *mat = M_WOOD; return bnd; }
    float d = 1e9f; int m = M_WOOD;

    /* the run of track: x from -9 to +7, twisting and diving after x = 0 */
    float u = satf((q.x + 9.0f)/16.0f);
    float tw = smoothstepf(0.56f, 1.00f, u);
    float roll = PI * tw;                       /* over it goes */
    float dropy = 6.10f - 6.30f*smoothstepf(0.62f, 1.00f, u)*tw;
    V3 c = v3(q.x, q.y - dropy, q.z);
    V3 r = rotX(c, roll);
    {
        float rail = 1e9f;
        for (int s = 0; s < 2; s++){
            float off = s ? 0.52f : -0.52f;
            float rr = sdBox(v3(r.x, r.y, r.z - off), v3(8.4f, 0.055f, 0.055f));
            rail = minf(rail, rr);
        }
        /* the running rail sits on a laminated wooden stringer */
        float str = sdBox(v3(r.x, r.y - 0.16f, r.z), v3(8.4f, 0.11f, 0.62f));
        float xr = rep1(r.x, 0.62f);
        float tie = sdBox(v3(xr, r.y - 0.05f, r.z), v3(0.075f, 0.05f, 0.80f));
        float trk = minf(str, tie);
        if (rail < d){ d = rail*0.62f; m = M_RAILSTEEL; }
        if (trk*0.62f < d){ d = trk*0.62f; m = M_WOOD; }
    }
    /* the trestle under the level part */
    if (q.x < 1.5f){
        float xr = rep1(q.x + 1.0f, 2.0f);
        float leg = sdBox(v3(xr, q.y - 3.0f, fabsf(q.z) - 0.85f), v3(0.10f, 3.0f, 0.10f));
        float diag = sdCapsule(v3(xr, q.y, q.z), v3(-0.9f, 0.4f, 0.0f), v3(0.9f, 5.4f, 0.0f), 0.065f);
        float cross = sdBox(v3(xr, q.y - 3.1f, q.z), v3(0.9f, 0.075f, 0.075f));
        float t = minf(leg, minf(diag*0.8f, cross));
        if (t < d){ d = t; m = M_WOOD; }
    }
    /* and the concrete it goes into */
    {
        float slab = sdBox(sub(q, v3(8.2f, 0.55f, 0.0f)), v3(2.9f, 0.55f, 2.4f));
        float kerb = sdBox(sub(q, v3(8.2f, 1.16f, 0.0f)), v3(2.9f, 0.10f, 2.4f));
        float s = minf(slab, kerb);
        if (s < d){ d = s; m = M_CONCRETE; }
        /* rebar, bent, where something was poured in a hurry */
        for (int i = 0; i < 3; i++){
            float bx = 6.1f + i*0.5f;
            float bz = (fh1(i*7) - 0.5f)*3.0f;
            float rb = sdCapsule(q, v3(bx, 1.1f, bz), v3(bx + 0.3f, 1.7f + 0.3f*fh1(i), bz + 0.4f), 0.020f);
            if (rb < d){ d = rb; m = M_RUSTMETAL; }
        }
    }
    /* a chain-link fence hoop round the lot, mostly fallen */
    {
        float fz = fabsf(q.z) - 2.55f;
        float post = sdCylY(v3(rep1(q.x, 2.5f), q.y - 0.9f, fz), 0.035f, 0.9f);
        float rail = sdBox(v3(q.x, q.y - 1.78f, fz), v3(10.5f, 0.028f, 0.028f));
        float f = minf(post, rail);
        if (fabsf(q.x) < 10.5f && f < d){ d = f; m = M_RUSTMETAL; }
    }
    *mat = m;
    return d;
}

/* ------------------------------------------------------------ popcorn cart
 * The kettle has not stopped. There is a drift of it on the asphalt now. */
static float prop_popcorn(V3 p, int *mat)
{
    V3 q = sub(p, P_POPCORN);
    float bnd = sdBox(v3(q.x, q.y - 1.1f, q.z), v3(1.9f, 1.6f, 1.6f));
    if (bnd > 1.0f){ *mat = M_CARTBODY; return bnd; }
    float d = 1e9f; int m = M_CARTBODY;

    /* body on two big wheels */
    float body = sdRoundBox(v3(q.x, q.y - 0.86f, q.z), v3(0.62f, 0.34f, 0.44f), 0.05f);
    d = body;
    for (int s = 0; s < 2; s++){
        float zz = s ? 0.50f : -0.50f;
        float wh = sdTorusZ(rotY(v3(q.x, q.y - 0.42f, q.z - zz), PI*0.5f), 0.40f, 0.055f);
        float spk = sdCylZ(rotY(v3(q.x, q.y - 0.42f, q.z - zz), PI*0.5f), 0.055f, 0.06f);
        float w = minf(wh, spk);
        if (w < d){ d = w; m = M_PAINTMETAL; }
    }
    /* the glass case, and the kettle inside it */
    float glass = sdRoundBox(v3(q.x, q.y - 1.52f, q.z), v3(0.50f, 0.32f, 0.36f), 0.02f);
    float inner = sdBox(v3(q.x, q.y - 1.52f, q.z), v3(0.465f, 0.30f, 0.325f));
    float shell = maxf(glass, -inner);
    /* glazing bars only -- the panes are filthy but they are still glass */
    shell = maxf(shell, -sdBox(v3(q.x, q.y - 1.52f, q.z), v3(0.40f, 0.235f, 0.9f)));
    shell = maxf(shell, -sdBox(v3(q.x, q.y - 1.52f, q.z), v3(0.9f, 0.235f, 0.265f)));
    if (shell < d){ d = shell; m = M_PAINTMETAL; }
    float frame = sdBox(v3(q.x, q.y - 1.86f, q.z), v3(0.52f, 0.045f, 0.38f));
    if (frame < d){ d = frame; m = M_PAINTMETAL; }
    float roof = sdCappedCone(v3(q.x, q.y - 2.06f, q.z), 0.18f, 0.62f, 0.10f);
    if (roof < d){ d = roof; m = M_AWNING; }
    float kettle = sdCylY(v3(q.x, q.y - 1.74f, q.z), 0.19f, 0.10f);
    if (kettle < d){ d = kettle; m = M_STEEL; }

    /* the popcorn. It fills the case, comes over the lip, and is still coming. */
    {
        float t = g_popcorn_t;
        /* the heap inside */
        float fill = sdBox(v3(q.x, q.y - 1.44f, q.z), v3(0.455f, 0.23f, 0.315f));
        float bump = (noise3(scl(v3(q.x, q.y, q.z), 26.0f)) - 0.5f)*0.045f;
        fill += bump;
        if (fill < d){ d = fill; m = M_POPCORN; }
        /* the fall over the front lip */
        float lipz = 0.34f;
        float w = 0.30f - 0.10f*satf((1.30f - q.y)/1.30f);
        float col = len2f(q.x*0.85f, (q.z - lipz - 0.16f)*1.25f) - w;
        col = maxf(col, q.y - 1.34f);
        col = maxf(col, 0.20f - q.y);
        col += (noise3(v3(q.x*9.0f, q.y*9.0f - t*2.6f, q.z*9.0f)) - 0.5f)*0.10f;
        if (col*0.7f < d){ d = col*0.7f; m = M_POPCORN; }
        /* and the drift it has made on the asphalt */
        float rr = len2f(q.x*0.80f, (q.z - 0.62f)*0.90f);
        float pile = rr - 1.02f;
        pile = maxf(pile, q.y - (0.42f - 0.30f*satf(rr*0.85f)));
        pile += (noise3(v3(q.x*7.0f, q.y*7.0f, q.z*7.0f)) - 0.5f)*0.085f;
        if (pile*0.75f < d){ d = pile*0.75f; m = M_POPCORN; }
        /* kernels in the air, on their way down */
        {
            float per = 0.55f;
            float k = floorf(t/per);
            for (int i = 0; i < 3; i++){
                float ph = fractf(t/per) + i*0.33f;
                int   ki = (int)k - i;
                float fx = (fh1(ki*3+1) - 0.5f)*0.34f;
                float fz = 0.40f + (fh1(ki*3+2) - 0.5f)*0.22f;
                float y0 = 1.30f, y1 = 0.30f;
                float yy = y0 - (y0-y1)*satf(ph)*satf(ph);
                float kern = sdSphere(sub(q, v3(fx, yy, fz)), 0.022f);
                if (kern < d){ d = kern; m = M_POPCORN; }
            }
        }
    }
    *mat = m;
    return d;
}

/* --------------------------------------------------------- bumper car arena */
static float prop_arena(V3 p, int *mat)
{
    V3 q = sub(p, P_ARENA);
    float bnd = sdBox(v3(q.x, q.y - 2.3f, q.z), v3(7.6f, 2.9f, 5.6f));
    if (bnd > 1.2f){ *mat = M_ARENAFLOOR; return bnd; }
    float d = 1e9f; int m = M_ARENAFLOOR;

    float pad = sdBox(v3(q.x, q.y - 0.06f, q.z), v3(7.0f, 0.06f, 5.0f));
    d = pad;
    /* the padded wall round the outside */
    {
        float outer = sdRoundBox(v3(q.x, q.y - 0.34f, q.z), v3(7.15f, 0.34f, 5.15f), 0.10f);
        float inner = sdBox(v3(q.x, q.y - 0.34f, q.z), v3(6.85f, 0.40f, 4.85f));
        float wall = maxf(outer, -inner);
        /* the way in */
        wall = maxf(wall, -sdBox(sub(q, v3(0.0f, 0.34f, -5.2f)), v3(1.1f, 0.5f, 0.6f)));
        if (wall < d){ d = wall; m = M_BUMPERWALL; }
    }
    /* canopy on columns, with the conductor grid under it */
    {
        for (int s = 0; s < 4; s++){
            float cx = (s&1) ? 6.7f : -6.7f;
            float cz = (s&2) ? 4.7f : -4.7f;
            float col = sdCylY(v3(q.x - cx, q.y - 2.2f, q.z - cz), 0.10f, 2.2f);
            if (col < d){ d = col; m = M_STEEL; }
        }
        float roof = sdBox(v3(q.x, q.y - 4.46f, q.z), v3(7.4f, 0.06f, 5.4f));
        if (roof < d){ d = roof; m = M_TARP; }
        float gx = rep1(q.x, 0.90f), gz = rep1(q.z, 0.90f);
        float g1 = sdBox(v3(gx, q.y - 4.30f, q.z), v3(0.020f, 0.020f, 5.0f));
        float g2 = sdBox(v3(q.x, q.y - 4.30f, gz), v3(7.0f, 0.020f, 0.020f));
        float grid = minf(g1, g2);
        if (fabsf(q.x) < 7.0f && fabsf(q.z) < 5.0f && grid < d){ d = grid; m = M_RUSTMETAL; }
    }
    /* the cars, dead where they stopped */
    for (int i = 0; i < 5; i++){
        float ax = (fh1(i*13+1) - 0.5f)*11.0f;
        float az = (fh1(i*13+2) - 0.5f)*7.6f;
        float ay = fh1(i*13+3)*6.28f;
        V3 c = rotY(sub(q, v3(ax, 0.0f, az)), ay);
        float cbnd = sdSphere(sub(c, v3(0.0f, 0.9f, 0.0f)), 2.4f);
        if (cbnd > 0.6f){ if (cbnd < d){ d = cbnd; m = M_BUMPERCAR; } continue; }
        float shell = sdEllipsoid(sub(c, v3(0.0f, 0.46f, 0.0f)), v3(0.62f, 0.34f, 0.86f));
        shell = maxf(shell, -sdEllipsoid(sub(c, v3(0.0f, 0.62f, -0.10f)), v3(0.44f, 0.30f, 0.56f)));
        float ring = sdTorusY(sub(c, v3(0.0f, 0.26f, 0.0f)), 0.80f, 0.13f);
        ring = maxf(ring, -sdBox(sub(c, v3(0.0f, 0.26f, 0.0f)), v3(0.62f, 0.3f, 0.86f)));
        float seat = sdBox(sub(c, v3(0.0f, 0.66f, 0.34f)), v3(0.34f, 0.24f, 0.07f));
        float pole = sdCylY(sub(c, v3(0.0f, 2.3f, 0.42f)), 0.030f, 1.95f);
        float head = sdBox(sub(c, v3(0.0f, 4.24f, 0.42f)), v3(0.12f, 0.05f, 0.12f));
        float car = minf(minf(shell, ring), seat);
        if (car < d){ d = car; m = M_BUMPERCAR; }
        float st = minf(pole, head);
        if (st < d){ d = st; m = M_STEEL; }
    }
    *mat = m;
    return d;
}

/* --------------------------------------------------------- the floodlights
 * Two masts at the edge of the plaza. Whatever else has been switched off,
 * these are still burning, and they are the reason anything in the middle of
 * it can be seen at all. */
static float prop_flood(V3 p, int *mat)
{
    float best = 1e9f; int bm = M_STEEL;
    for (int i = 0; i < 2; i++){
        V3 c = i ? P_FLOOD2 : P_FLOOD1;
        V3 q = sub(p, c);
        float bnd = sdCylY(v3(q.x, q.y - 5.2f, q.z), 1.5f, 5.6f);
        if (bnd > 1.0f){ if (bnd < best){ best = bnd; bm = M_STEEL; } continue; }
        float mast = sdCylY(v3(q.x, q.y - 4.55f, q.z), 0.090f, 4.55f);
        float base = sdCappedCone(v3(q.x, q.y - 0.20f, q.z), 0.20f, 0.30f, 0.14f);
        float d = minf(mast, base);
        int m = M_STEEL;
        float arm = sdBox(v3(q.x, q.y - 9.05f, q.z), v3(1.15f, 0.055f, 0.055f));
        if (arm < d) d = arm;
        /* three heads on the crossarm, canted down into the plaza */
        float hx = rep1(q.x, 0.86f);
        if (fabsf(q.x) < 1.15f){
            V3 h = rotX(v3(hx, q.y - 9.34f, q.z), -0.62f);
            float hood = sdCappedCone(v3(h.x, h.y, h.z), 0.16f, 0.11f, 0.28f);
            float lens = sdCylY(v3(h.x, h.y - 0.15f, h.z), 0.245f, 0.020f);
            if (hood < d){ d = hood; m = M_LAMPPOST; }
            if (lens < d){ d = lens; m = M_FLOODLAMP; }
        }
        if (d < best){ best = d; bm = m; }
    }
    *mat = bm;
    return best;
}

/* ------------------------------------------------------------- the mascot
 * A costume with nobody in it, standing where it was left. The head is the
 * wrong size for the body, the paint is old, and the eyes were bought
 * separately: they do not match, they stand proud of the face, and they do
 * not blink.
 *
 * The head geometry is shared with the two materials that paint it, so the
 * numbers live here. */
#define JHEAD_RX 0.245f
#define JHEAD_RY 0.262f
#define JHEAD_RZ 0.238f
#define JEYE_L   v3(-0.101f,  0.042f, 0.206f)
#define JEYE_LR  0.0765f
#define JEYE_R   v3( 0.112f,  0.014f, 0.199f)
#define JEYE_RR  0.1010f
#define JNOSE_P  v3( 0.006f, -0.052f, 0.244f)
#define JNOSE_R  0.0575f
/* the head, in the costume's own frame */
static inline V3 jest_head_c(void){
    return v3(0.0f, mixf(1.735f, 1.455f, g_jest_contort),
                    mixf(0.0f,  0.300f, g_jest_contort));
}
static float prop_jester(V3 p, int *mat)
{
    if (g_jest_vis < 0.001f){ *mat = M_JSUIT; return 1e9f; }
    V3 w = sub(p, g_jest_pos);
    float bnd = sdSphere(sub(w, v3(0.0f, 1.05f, 0.0f)), 1.55f);
    if (bnd > 1.0f){ *mat = M_JSUIT; return bnd; }

    V3 q = rotY(w, -g_jest_yaw);
    float k = g_jest_contort;
    /* the twitch: a single frame of the wrong animation */
    float tw = g_jest_twitch;
    q = rotZ(q, tw*0.09f*sinf(g_time*61.0f));
    q.x += tw*0.03f*sinf(g_time*83.0f);

    float d = 1e9f; int m = M_JSUIT;

    /* torso, dropping and hunching as it contorts */
    V3 tc = v3(0.0f, mixf(1.06f, 0.86f, k), mixf(0.0f, 0.10f, k));
    float torso = sdEllipsoid(sub(q, tc),
                              v3(mixf(0.31f,0.36f,k), mixf(0.38f,0.29f,k), mixf(0.27f,0.31f,k)));
    d = torso;
    float pelvis = sdSphere(sub(q, v3(0.0f, mixf(0.78f,0.66f,k), mixf(0.0f,0.06f,k))), 0.225f);
    d = opSmoothU(d, pelvis, 0.10f);

    /* neck and head. The head is too big, and it is always pointed at the lens. */
    V3 hc = jest_head_c();
    float neck = sdCapsule(q, v3(0.0f, mixf(1.38f,1.14f,k), mixf(0.0f,0.12f,k)),
                              add(hc, v3(0,-0.14f,0)), 0.070f);
    d = opSmoothU(d, neck, 0.05f);
    {
        V3 h = sub(q, hc);
        h = rotZ(h, k*0.62f);                    /* it lies over on its side */
        float head = sdEllipsoid(h, v3(JHEAD_RX, JHEAD_RY, JHEAD_RZ));
        if (head < d){ d = head; m = M_JFACE; }
        /* the eyes: two, and they were not made for the same face */
        float e1 = sdSphere(sub(h, JEYE_L), JEYE_LR);
        float e2 = sdSphere(sub(h, JEYE_R), JEYE_RR);
        float e = minf(e1, e2);
        if (e < d){ d = e; m = M_JEYE; }
        float nose = sdSphere(sub(h, JNOSE_P), JNOSE_R);
        if (nose < d){ d = nose; m = M_JFACE; }
        /* the hat: three points, drooping, with a bell on each */
        for (int i = 0; i < 3; i++){
            float a = (i - 1)*0.88f;
            V3 t0 = v3(0.0f, 0.215f, 0.0f);
            V3 t1 = v3(sinf(a)*0.38f, 0.425f, cosf(a)*0.20f - 0.06f);
            V3 t2 = v3(sinf(a)*0.63f, 0.105f, cosf(a)*0.35f - 0.11f);
            float c1 = sdCapsule(h, t0, t1, 0.092f);
            float c2 = sdCapsule(h, t1, t2, 0.056f);
            float hh = minf(c1, c2);
            if (hh < d){ d = hh; m = M_JSUIT; }
            float bell = sdSphere(sub(h, t2), 0.056f);
            if (bell < d){ d = bell; m = M_JBELL; }
        }
    }
    /* the ruff */
    {
        V3 rc = sub(q, v3(0.0f, mixf(1.415f,1.175f,k), mixf(0.0f,0.13f,k)));
        float sc = 0.070f + 0.030f*cosf(atan2f(rc.z, rc.x)*9.0f);
        float ruff = sdTorusY(rc, 0.240f, sc);
        if (ruff < d){ d = ruff; m = M_JRUFF; }
    }

    /* arms. Standing: hanging. Contorted: arched back over the head, elbows
     * the wrong way, taking its weight like legs. */
    for (int s = 0; s < 2; s++){
        float sx = s ? 1.0f : -1.0f;
        V3 sh = v3(sx*0.325f, mixf(1.30f, 1.08f, k), mixf(0.0f, 0.10f, k));
        V3 el = mix3(v3(sx*0.395f, 0.930f, 0.035f), v3(sx*0.64f, 1.98f, -0.28f), k);
        V3 hd = mix3(v3(sx*0.360f, 0.560f, 0.075f), v3(sx*0.74f, 0.86f, 0.54f), k);
        float a1 = sdCapsule(q, sh, el, mixf(0.082f, 0.062f, k));
        float a2 = sdCapsule(q, el, hd, mixf(0.070f, 0.050f, k));
        float arm = minf(a1, a2);
        if (arm < d){ d = arm; m = M_JSUIT; }
        float mitt = sdSphere(sub(q, hd), mixf(0.098f, 0.070f, k));
        if (mitt < d){ d = mitt; m = M_JSUIT; }
        /* a cuff bell at each wrist */
        float cb = sdSphere(sub(q, mix3(add(hd, v3(0,0.09f,0)), add(hd, v3(0,0.06f,-0.06f)), k)), 0.036f);
        if (cb < d){ d = cb; m = M_JBELL; }
    }
    /* legs. Contorted: knees up over the hips, splayed. */
    for (int s = 0; s < 2; s++){
        float sx = s ? 1.0f : -1.0f;
        V3 hp = v3(sx*0.135f, mixf(0.72f, 0.62f, k), 0.0f);
        V3 kn = mix3(v3(sx*0.175f, 0.385f, 0.020f), v3(sx*0.545f, 1.06f, -0.14f), k);
        V3 ft = mix3(v3(sx*0.200f, 0.075f, 0.090f), v3(sx*0.470f, 0.055f, 0.30f), k);
        float l1 = sdCapsule(q, hp, kn, mixf(0.098f, 0.070f, k));
        float l2 = sdCapsule(q, kn, ft, mixf(0.082f, 0.058f, k));
        float leg = minf(l1, l2);
        if (leg < d){ d = leg; m = M_JSUIT; }
        /* the shoe, long and curling up at the toe */
        V3 sc = sub(q, ft);
        float shoe = sdEllipsoid(sub(sc, v3(0.0f, 0.015f, 0.115f)), v3(0.082f, 0.070f, 0.215f));
        float toe = sdSphere(sub(sc, v3(0.0f, 0.085f, 0.285f)), 0.050f);
        float sh2 = minf(shoe, toe);
        if (sh2 < d){ d = sh2; m = M_JSUIT; }
        float tb = sdSphere(sub(sc, v3(0.0f, 0.125f, 0.305f)), 0.036f);
        if (tb < d){ d = tb; m = M_JBELL; }
    }
    *mat = m;
    return d;
}

/* ------------------------------------------------------------- the funhouse
 * Inside, where the paint is loud and none of the walls are straight. */
static float map_fun(V3 p, int *mat, int with_props)
{
    int cx = WC(p.x), cz = WC(p.z);
    float best = 1e9f; int bm = M_FUNWALL;
    for (int dz = -1; dz <= 1; dz++)
        for (int dx = -1; dx <= 1; dx++){
            int qx = cx+dx, qz = cz+dz;
            if (qx < 0 || qx >= GW || qz < 0 || qz >= GH) continue;
            if (GF.c[qz][qx] == '.') continue;
            V3 c = v3(CW((float)qx), FUN_H*0.5f, CW((float)qz));
            float b = sdBox(sub(p, c), v3(CELL*0.5f, FUN_H*0.5f, CELL*0.5f));
            if (b < best){ best = b; bm = M_FUNWALL; }
        }
    /* the walls bulge and pinch: nothing in here is plumb */
    if (with_props){
        float bulge = 0.20f*sinf(p.x*0.62f + 0.4f)*cosf(p.z*0.58f)
                    + 0.10f*sinf(p.y*1.7f + p.x*0.3f);
        best -= bulge;
        best *= 0.72f;                     /* the displacement costs us Lipschitz */
        int jm; float jd = prop_jester(p, &jm);
        if (jd < best){ best = jd; bm = jm; }
    }
    float bound;
    {
        int qx = cx < 0 ? 0 : (cx >= GW ? GW-1 : cx);
        int qz = cz < 0 ? 0 : (cz >= GH ? GH-1 : cz);
        float hd = len2f(p.x - CW((float)qx), p.z - CW((float)qz));
        bound = (GF.dm[qz][qx] - hd - 0.35f)*0.7f;
        if (bound < 0.0f) bound = 0.0f;
    }
    *mat = bm;
    return minf(best, bound);
}

/* ------------------------------------------------------- the hall of mirrors
 * Thin glass panels on a lattice. Which panels exist is hashed, then cleared
 * along the route so there is a way through, if you already know it. */
#define MZ_X0 (-24.0f)
#define MZ_Z0 (-24.0f)
static inline int mzc(float w){ return (int)floorf(w/CELL + GW*0.5f); }

static float map_mirror(V3 p, int *mat, int with_props)
{
    int cx = WC(p.x), cz = WC(p.z);
    float best = 1e9f; int bm = M_MIRROR;
    for (int dz = -1; dz <= 1; dz++)
        for (int dx = -1; dx <= 1; dx++){
            int qx = cx+dx, qz = cz+dz;
            if (qx < 1 || qx >= GW-1 || qz < 1 || qz >= GH-1) continue;
            unsigned char b = MZP[qz][qx];
            float wx = CW((float)qx), wz = CW((float)qz);
            if (b & 1){    /* a panel across the -z edge of this cell */
                float d = sdBox(sub(p, v3(wx, MZ_H*0.5f, wz - CELL*0.5f)),
                                v3(CELL*0.5f, MZ_H*0.5f, 0.030f));
                float fr = sdBox(sub(p, v3(wx, MZ_H*0.5f, wz - CELL*0.5f)),
                                 v3(CELL*0.5f + 0.02f, MZ_H*0.5f, 0.055f));
                fr = maxf(fr, -sdBox(sub(p, v3(wx, MZ_H*0.5f - 0.10f, wz - CELL*0.5f)),
                                     v3(CELL*0.5f - 0.10f, MZ_H*0.5f, 0.2f)));
                if (d < best){ best = d; bm = M_MIRROR; }
                if (fr < best){ best = fr; bm = M_MIRRORFRAME; }
            }
            if (b & 2){    /* a panel across the -x edge */
                float d = sdBox(sub(p, v3(wx - CELL*0.5f, MZ_H*0.5f, wz)),
                                v3(0.030f, MZ_H*0.5f, CELL*0.5f));
                float fr = sdBox(sub(p, v3(wx - CELL*0.5f, MZ_H*0.5f, wz)),
                                 v3(0.055f, MZ_H*0.5f, CELL*0.5f + 0.02f));
                fr = maxf(fr, -sdBox(sub(p, v3(wx - CELL*0.5f, MZ_H*0.5f - 0.10f, wz)),
                                     v3(0.2f, MZ_H*0.5f, CELL*0.5f - 0.10f)));
                if (d < best){ best = d; bm = M_MIRROR; }
                if (fr < best){ best = fr; bm = M_MIRRORFRAME; }
            }
        }
    /* the room the maze is standing in */
    {
        float shell = -sdBox(sub(p, v3(0.0f, MZ_H*0.5f, 0.0f)), v3(25.0f, MZ_H*0.5f, 25.0f));
        if (shell < best){ best = shell; bm = M_MIRROR; }
    }
    /* and it is in here too, in every panel at once */
    if (with_props){
        int jm; float jd = prop_jester(p, &jm);
        if (jd < best){ best = jd; bm = jm; }
    }
    /* conservative: panels can be anywhere in the next ring of cells */
    float ccx = CW((float)cx), ccz = CW((float)cz);
    float bound = minf(CELL*1.5f - fabsf(p.x-ccx), CELL*1.5f - fabsf(p.z-ccz)) - 0.10f;
    if (bound < 0.0f) bound = 0.0f;
    (void)with_props;
    *mat = bm;
    return minf(best, bound);
}

/* ---------------------------------------------------------------- dispatch */
/* the park, outdoors: booths, rides, lamps, and whatever is scripted here */
static float map_park(V3 p, int *mat, int with_props)
{
    V3 q = p;
    if (g_warp > 0.001f){
        /* the geometry stops holding still */
        float w = g_warp;
        q.x += w*0.55f*sinf(p.z*0.28f + g_time*1.7f) + w*0.25f*sinf(p.y*0.9f - g_time*2.3f);
        q.z += w*0.55f*sinf(p.x*0.31f - g_time*1.3f);
        q.y += w*0.30f*sinf(p.x*0.22f + p.z*0.19f + g_time*0.9f);
    }
    int m = M_BOOTH;
    float d = park_blocks(q, &m);
    {
        int rm; float r = park_rides(q, &rm);
        if (r < d){ d = r; m = rm; }
    }
    {
        int lm; float l = park_lamps(q, &lm);
        if (l < d){ d = l; m = lm; }
    }
    if (with_props){
        int pm; float pd;
        pd = prop_kiosk(q, &pm);     if (pd < d){ d = pd; m = pm; }
        pd = prop_carousel(q, &pm);  if (pd < d){ d = pd; m = pm; }
        pd = prop_twist(q, &pm);     if (pd < d){ d = pd; m = pm; }
        pd = prop_popcorn(q, &pm);   if (pd < d){ d = pd; m = pm; }
        pd = prop_arena(q, &pm);     if (pd < d){ d = pd; m = pm; }
        pd = prop_flood(q, &pm);     if (pd < d){ d = pd; m = pm; }
        pd = prop_jester(q, &pm);    if (pd < d){ d = pd; m = pm; }
    }
    if (g_warp > 0.001f) d *= 0.62f;
    *mat = m;
    return d;
}

static float map_scene(V3 p, int *mat){
    switch (g_scene){
        case SC_BOOTH:
        case SC_MIDWAY:
        case SC_PLAZA:  return map_park(p, mat, 1);
        case SC_FUN:    return map_fun(p, mat, 1);
        case SC_MIRROR: return map_mirror(p, mat, 1);
        default: *mat = M_NONE; return 1e9f;
    }
}
static float map_dist(V3 p){ int m; return map_scene(p, &m); }

/* walls only: keeps the operator's feet out of the scenery */
static float map_collide(V3 p){
    int m;
    switch (g_scene){
        case SC_BOOTH:
        case SC_MIDWAY:
        case SC_PLAZA: {
            float d = park_blocks(p, &m);
            float k = prop_kiosk(p, &m);   if (k < d) d = k;
            float c = prop_carousel(p, &m);if (c < d) d = c;
            float a = prop_arena(p, &m);   if (a < d) d = a;
            float t = prop_twist(p, &m);   if (t < d) d = t;
            float l = park_lamps(p, &m);   if (l < d) d = l;
            float o = prop_flood(p, &m);   if (o < d) d = o;
            float w = prop_popcorn(p, &m); if (w < d) d = w;
            return d;
        }
        case SC_FUN:    return map_fun(p, &m, 0);
        case SC_MIRROR: return map_mirror(p, &m, 0);
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
        float h = 0.02f + 0.15f*i;
        float d = map_dist(add(p, scl(n,h)));
        if (d > h) d = h;
        occ += (h - d)*sca;
        sca *= 0.72f;
    }
    return satf(1.0f - 1.3f*occ);
}
/* the ground is a plane, so ambient occlusion on it has to be asked for */
static float ground_ao(V3 p){
    float occ = 0.0f, sca = 1.0f;
    for (int i = 1; i <= 4; i++){
        float h = 0.06f + 0.30f*i;
        float d = map_dist(add(p, v3(0.0f, h, 0.0f)));
        if (d > h) d = h;
        occ += (h - d)*sca;
        sca *= 0.70f;
    }
    return satf(1.0f - 1.15f*occ);
}

/* ------------------------------------------------------------------- levels */
static void mz_carve(const float *cells, int n)
{
    for (int i = 0; i + 1 < n; i++){
        int ax = (int)cells[i*2],   az = (int)cells[i*2+1];
        int bx = (int)cells[i*2+2], bz = (int)cells[i*2+3];
        int sx = (bx > ax) - (bx < ax), sz = (bz > az) - (bz < az);
        int x = ax, z = az;
        while (x != bx || z != bz){
            int nx = x + sx, nz = z + sz;
            /* clear whichever panel sits between (x,z) and (nx,nz) */
            if (sx > 0) MZP[nz][nx] &= ~2;
            if (sx < 0) MZP[z][x]   &= ~2;
            if (sz > 0) MZP[nz][nx] &= ~1;
            if (sz < 0) MZP[z][x]   &= ~1;
            /* and give the walker some elbow room */
            MZP[nz][nx] &= (unsigned char)~(1|2);
            x = nx; z = nz;
            if (x == bx) sx = 0;
            if (z == bz) sz = 0;
            if (sx == 0 && sz == 0) break;
        }
    }
}

static void build_park(void)
{
    /* ---- the midway ---- */
    for (int z = 0; z < GH; z++)
        for (int x = 0; x < GW; x++)
            GM.c[z][x] = mid_pattern(x, z) ? '#' : '.';
    /* a rim of solid, so the marcher always has something to stop on */
    for (int x = 0; x < GW; x++){ GM.c[0][x] = '#'; GM.c[GH-1][x] = '#'; }
    for (int z = 0; z < GH; z++){ GM.c[z][0] = '#'; GM.c[z][GW-1] = '#'; }

    /* the forecourt in front of the ticket booth */
    carve_rect(&GM, 25, 3, 33, 13);
    /* the lot with the coaster that goes into the ground */
    carve_rect(&GM, 30, 26, 35, 34);
    /* the carousel's own circle */
    carve_rect(&GM, 37, 18, 43, 24);
    /* the wide plaza at the end, and the arena beside it */
    carve_rect(&GM, 31, 46, 46, 58);

    /* the route, dilated so the smoothed camera spline cannot clip a corner */
    static const float wander[] = {
        29,7,  29,17,  43,17,  43,25,  36,25,  36,41,  36,52
    };
    carve_path(&GM, wander, 7, 1);
    /* the loop that the chase runs round, twice */
    static const float loop[] = {
        36,52, 36,41, 22,41, 22,25, 36,25, 36,41
    };
    carve_path(&GM, loop, 6, 1);
    grid_build_dm(&GM, BOOTH_PROT);

    /* ---- the funhouse ---- */
    grid_fill(&GF, '#');
    static const float fun[] = {
        10,10, 10,20, 18,20, 18,12, 26,12, 26,24, 16,24, 16,32,
        28,32, 28,40, 20,40, 12,40, 12,30, 6,30, 6,20, 10,20
    };
    carve_path(&GF, fun, 16, 0);
    carve_rect(&GF, 21, 16, 24, 19);
    carve_rect(&GF, 8, 34, 11, 37);
    grid_build_dm(&GF, 0.0f);

    /* ---- the hall of mirrors ---- */
    for (int z = 0; z < GH; z++)
        for (int x = 0; x < GW; x++){
            unsigned char b = 0;
            if (fh2(x*3+1, z*7+5) > 0.42f) b |= 1;
            if (fh2(x*5+9, z*11+3) > 0.42f) b |= 2;
            MZP[z][x] = b;
        }
    static const float mz[] = {
        26,26, 26,32, 32,32, 32,26, 38,26, 38,34, 30,34, 30,38, 38,38
    };
    mz_carve(mz, 9);
}

#endif /* PK_CORE_H */
