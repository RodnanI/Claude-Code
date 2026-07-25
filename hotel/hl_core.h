/* hl_core.h -- Backrooms grand hotel: maths, noise, and the building itself.
 *
 * Everything is procedural. Signed distance fields, raymarched per pixel.
 * No textures are loaded, no assets, no image files, no generated images.
 *
 * Indoors the floor and the ceiling are *not* in the distance field -- they
 * are planes, intersected analytically in trace(). A corridor scene spends
 * most of its ray budget skimming carpet, and taking the two planes out of
 * the SDF is what lets a sphere-tracer run the length of a hallway in a
 * handful of steps instead of creeping along at the height of the lens.
 */
#ifndef HL_CORE_H
#define HL_CORE_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>

#define PI 3.14159265358979f
#define TAPE_DUR 300.0f     /* one tape, and the period every looping signal shares */

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
/* Noise sampled on a circle in the field, with a circumference of one tape's
 * worth of seconds. Anything driven by this is continuous across the loop point
 * instead of landing on an unrelated value -- which matters most for the
 * handheld drift, where 0.075 rad of authority turned an uncorrelated sample at
 * 5:00 into four degrees of yaw, forty pixels of displacement, and a last frame
 * that visibly was not the frame the tape started on. */
static float fbm_loop(float t, float rate, float seed, int oct)
{
    float R = TAPE_DUR*rate/(2.0f*PI);
    float a = 2.0f*PI*t/TAPE_DUR;
    return fbm3(v3(R*cosf(a), R*sinf(a), seed), oct);
}
/* the nearest angular frequency whose period divides the tape */
static inline float w_loop(float w)
{
    float k = floorf(w*TAPE_DUR/(2.0f*PI) + 0.5f);
    if (k < 1.0f) k = 1.0f;
    return k*2.0f*PI/TAPE_DUR;
}
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
    /* floors */
    M_CARPET, M_MARBLEFLOOR, M_PARQUET, M_SERVFLOOR, M_CEILING, M_MALLCEIL,
    /* walls and joinery */
    M_OAK, M_WALLPAPER, M_MOLDING, M_VELVETWALL, M_MARBLE, M_MAHOGANY,
    M_DOOR, M_DOORPANEL, M_NUMPLATE, M_BASEBOARD,
    /* metal and glass */
    M_BRASS, M_BRASSDULL, M_BRASSRUST, M_GLASS, M_MIRROR, M_MIRRORFRAME,
    M_GILT, M_STEEL, M_HANDRAIL,
    /* the tube in the desk */
    M_CRTBODY, M_CRTSCREEN, M_CRTBEZEL,
    /* light */
    M_CHANDARM, M_CRYSTAL, M_BULB, M_SCONCE, M_SHADE,
    /* pictures */
    M_PORTRAIT, M_CANVASBACK,
    /* the mall */
    M_SHOPGLASS, M_SHOPSIGN, M_SHOPFIT, M_SHOPDARK, M_PIER, M_BALCONY,
    M_CLOCKCASE, M_CLOCKFACE, M_PENDULUM, M_CLOCKGLASS,
    M_MANNEQ, M_CLOTH, M_WIG,
    M_FOUNTSTONE, M_WATER, M_MOSS,
    M_CABBODY, M_CABSCREEN, M_CABMARQUEE, M_CABPANEL,
    M_PIANO, M_KEYWHITE, M_KEYBLACK, M_DAIS,
    M_ESCSIDE, M_ESCSTEP, M_ESCRAIL,
    /* the ballroom and what is standing in it */
    M_DRAPE, M_PILASTER, M_FIGSILK, M_FIGFACE,
    /* the run */
    M_ELEVDOOR, M_ELEVVOID, M_SHARD, M_PIPE, M_CONDUIT, M_CINDER,
    M_VOIDTEX, M_CART, M_CARTDECK, M_PIGEONHOLE, M_KEYTAG, M_LEDGER,
    M_PLANTPOT, M_PALM, M_RUNNER, M_LAMPBASE
};

/* ---------------------------------------------------------------- the scenes */
enum { SC_LOBBY = 0, SC_CORR, SC_MALL, SC_BALL, SC_CHASE, SC_STAIR, SC_VOID };
static int   g_scene;
static float g_time;
static int   g_corr_style;     /* 0 oak guest floor, 1 velvet, 2 service */

/* ------------------------------------------------------- animation, per frame */
static float g_lamp_gain   = 1.0f;
static float g_crt_gain    = 1.0f;
static float g_feed_break  = 0.0f;   /* 0..1: the feed going to radar green   */
static float g_warp        = 0.0f;   /* the building stops holding still      */
static float g_slide       = 0.0f;   /* wallpaper running like liquid         */
static float g_swing       = 0.0f;   /* chandeliers, with no wind             */
static float g_void_mix    = 0.0f;   /* the floor stops being loaded          */
static float g_glassfall   = 0.0f;   /* shards coming down in the velvet halls */
static float g_fig_vis     = 0.0f;
static V3    g_fig_pos     = { 0.0f, 0.0f, 0.0f };
static float g_fig_yaw     = 0.0f;
static float g_fig_twitch  = 0.0f;
static float g_fig_contort = 0.0f;
static float g_piano_t     = 0.0f;
static float g_esc_t       = 0.0f;

/* --------------------------------------------------------------- the corridors
 * A guest floor is a lattice, not a maze: hallways every six cells both ways,
 * with a solid five-by-five block of rooms in between. You can always see a
 * long way down one, and every junction is the junction you just left. */
#define GW 64
#define GH 64
#define CELL 2.30f          /* corridor width -- narrow enough to feel it */
#define CORR_H 3.05f        /* corridor ceiling */
#define WALL_PROT 0.22f     /* nothing on a corridor wall stands out further */

typedef struct {
    char  c[GH][GW];
    float dm[GH][GW];       /* distance to the nearest solid cell outside the
                             * 3x3 neighbourhood -- lets the marcher run the
                             * length of a hallway in one step */
} Grid;

static Grid GC;             /* the guest floors, and the velvet halls */

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
/* carve a hallway along a polyline in cell coordinates, dilated so a smoothed
 * camera spline can never clip an inside corner */
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
/* O(n^4), n is 64, runs once at start-up */
static void grid_build_dm(Grid *g, float prot){
    for (int cz = 0; cz < GH; cz++)
        for (int cx = 0; cx < GW; cx++){
            float best = 1e9f;
            float px = CW((float)cx), pz = CW((float)cz);
            for (int qz = 0; qz < GH; qz++)
                for (int qx = 0; qx < GW; qx++){
                    if (g->c[qz][qx] == '.') continue;
                    int dx = qx-cx, dz = qz-cz;
                    if (dx > -2 && dx < 2 && dz > -2 && dz < 2) continue;
                    float bx = CW((float)qx), bz = CW((float)qz);
                    float e = CELL*0.5f + prot;
                    float d = sdBox2(px-bx, pz-bz, e, e);
                    if (d < best) best = d;
                }
            float edge = minf(minf(px - CW(0.0f), CW((float)(GW-1)) - px),
                              minf(pz - CW(0.0f), CW((float)(GH-1)) - pz));
            if (edge < best) best = edge;
            g->dm[cz][cx] = best < 0.0f ? 0.0f : best;
        }
}
static int corr_pattern(int cx, int cz){
    int ax = ((cx % 6) + 6) % 6;
    int az = ((cz % 6) + 6) % 6;
    if (ax == 2 || az == 2) return 0;       /* hallway */
    return 1;                               /* rooms */
}
static void build_hotel(void)
{
    for (int cz = 0; cz < GH; cz++)
        for (int cx = 0; cx < GW; cx++)
            GC.c[cz][cx] = corr_pattern(cx, cz) ? '#' : '.';
    /* the array has to end somewhere, and it ends in wall */
    for (int q = 0; q < GW; q++){
        GC.c[0][q] = GC.c[GH-1][q] = '#';
        GC.c[q][0] = GC.c[q][GW-1] = '#';
    }
    grid_build_dm(&GC, WALL_PROT);
}

/* --------------------------------------------------- what is on a hallway wall
 * The wall is a plane at the cell boundary; L is the point in its frame, with
 * x running along the wall, y up, and z out of it into the corridor. */
static float wall_relief(float y, float u)
{
    /* baseboard, chair rail, the panelling between them, crown at the top */
    float r = 0.0f;
    r = maxf(r, 0.026f*(1.0f - smoothstepf(0.135f, 0.165f, y)));           /* skirting */
    r = maxf(r, 0.030f*smoothstepf(0.885f, 0.905f, y)
                     *(1.0f - smoothstepf(0.965f, 0.985f, y)));            /* dado rail */
    r = maxf(r, 0.040f*smoothstepf(2.760f, 2.800f, y));                    /* cornice  */
    /* raised-and-fielded panels below the rail */
    if (y > 0.20f && y < 0.845f){
        float pu = fabsf(triw(u/0.5f + 0.25f))*0.5f;     /* 0 at stile, .25 at centre */
        float pv = smoothstepf(0.20f, 0.27f, y)*(1.0f - smoothstepf(0.775f, 0.845f, y));
        r = maxf(r, 0.017f*smoothstepf(0.055f, 0.115f, pu)*pv);
    }
    return r;
}
/* a wall sconce: brass bracket, glass shade, the bulb inside it */
static float prop_sconce(V3 L, int *mat)
{
    float d = sdCapsule(L, v3(0,0,0.02f), v3(0,0.055f,0.115f), 0.026f);
    int m = M_BRASS;
    float st = sdCappedCone(v3(L.x, L.y - 0.135f, L.z - 0.125f), 0.075f, 0.045f, 0.082f);
    if (st < d){ d = st; m = M_SHADE; }
    float bl = sdSphere(v3(L.x, L.y - 0.130f, L.z - 0.125f), 0.036f);
    if (bl < d){ d = bl; m = M_BULB; }
    float bk = sdBox(v3(L.x, L.y, L.z - 0.012f), v3(0.055f, 0.105f, 0.014f));
    if (bk < d){ d = bk; m = M_BRASS; }
    *mat = m;
    return d;
}
static float prop_elevator(V3 L, int cx, int cz, int f, int *mat);
static float wall_face(V3 L, int cx, int cz, int f, int *mat)
{
    float h = fh3(cx*7 + f, cz*13, 91);
    float d = 1e9f;
    int m = M_NONE;

    /* on the velvet floors, one wall face in three is a lift lobby */
    if (g_corr_style == 1 && h < 0.34f)
        return prop_elevator(L, cx, cz, f, mat);

    if (h < 0.46f){
        /* a guest room door: architrave, leaf, brass number */
        float ar = sdBox(v3(L.x, L.y - 1.10f, L.z - 0.026f), v3(0.585f, 1.145f, 0.026f));
        ar = maxf(ar, -sdBox(v3(L.x, L.y - 1.06f, L.z - 0.030f), v3(0.508f, 1.062f, 0.060f)));
        d = ar; m = M_MOLDING;
        float leaf = sdBox(v3(L.x, L.y - 1.05f, L.z - 0.006f), v3(0.508f, 1.055f, 0.010f));
        if (leaf < d){ d = leaf; m = M_DOOR; }
        float np = sdBox(v3(L.x, L.y - 1.74f, L.z - 0.019f), v3(0.088f, 0.052f, 0.006f));
        if (np < d){ d = np; m = M_NUMPLATE; }
        float kn = sdSphere(v3(L.x - 0.408f, L.y - 1.010f, L.z - 0.052f), 0.036f);
        if (kn < d){ d = kn; m = M_BRASS; }
    } else if (h < 0.70f){
        /* a portrait of somebody whose face did not survive */
        float fr = sdBox(v3(L.x, L.y - 1.735f, L.z - 0.038f), v3(0.352f, 0.442f, 0.038f));
        fr = maxf(fr, -sdBox(v3(L.x, L.y - 1.735f, L.z - 0.048f), v3(0.292f, 0.382f, 0.070f)));
        d = fr; m = M_GILT;
        float cv = sdBox(v3(L.x, L.y - 1.735f, L.z - 0.012f), v3(0.294f, 0.384f, 0.012f));
        if (cv < d){ d = cv; m = M_PORTRAIT; }
    } else if (h < 0.86f){
        /* a tall mirror in a brass frame, with a corridor in it */
        float fr = sdBox(v3(L.x, L.y - 1.24f, L.z - 0.032f), v3(0.412f, 0.985f, 0.032f));
        fr = maxf(fr, -sdBox(v3(L.x, L.y - 1.24f, L.z - 0.044f), v3(0.352f, 0.925f, 0.070f)));
        d = fr; m = M_MIRRORFRAME;
        float gl = sdBox(v3(L.x, L.y - 1.24f, L.z - 0.010f), v3(0.354f, 0.927f, 0.010f));
        if (gl < d){ d = gl; m = M_MIRROR; }
    } else if (h < 0.925f){
        /* a console table nobody has used, with a lamp that is out */
        float tp = sdBox(v3(L.x, L.y - 0.760f, L.z - 0.175f), v3(0.415f, 0.022f, 0.175f));
        d = tp; m = M_MAHOGANY;
        float lg = sdBox2(fabsf(L.x) - 0.362f, fabsf(L.z - 0.175f) - 0.128f, 0.020f, 0.020f);
        lg = maxf(lg, fabsf(L.y - 0.375f) - 0.375f);
        if (lg < d){ d = lg; m = M_MAHOGANY; }
        float lb = sdCylY(v3(L.x - 0.13f, L.y - 0.900f, L.z - 0.175f), 0.055f, 0.120f);
        if (lb < d){ d = lb; m = M_LAMPBASE; }
        float ls = sdCappedCone(v3(L.x - 0.13f, L.y - 1.115f, L.z - 0.175f), 0.098f, 0.135f, 0.098f);
        if (ls < d){ d = ls; m = M_SHADE; }
    }
    /* a pair of sconces, on most faces */
    if (fh3(cx*11, cz*5 + f, 37) > 0.30f){
        for (int s = -1; s <= 1; s += 2){
            int sm;
            float sd = prop_sconce(v3(L.x - s*0.855f, L.y - 2.115f, L.z), &sm);
            if (sd < d){ d = sd; m = sm; }
        }
    }
    *mat = m;
    return d;
}
/* the chandelier that hangs at every second junction of every guest floor */
static float prop_chandelier(V3 q, float scale, int arms, int *mat)
{
    q = scl(q, 1.0f/scale);
    int m = M_CHANDARM;
    float d = sdCylY(v3(q.x, q.y - 0.62f, q.z), 0.014f, 0.42f);        /* stem */
    float bw = sdSphere(v3(q.x, q.y + 0.24f, q.z), 0.070f);            /* finial */
    if (bw < d){ d = bw; }
    float rg = sdTorusY(v3(q.x, q.y + 0.02f, q.z), 0.300f, 0.020f);
    if (rg < d) d = rg;
    /* arms and candles, folded into sectors */
    V3 s = pmodY(v3(q.x, q.y, q.z), arms);
    float arm = sdCapsule(v3(s.x, s.y, s.z), v3(0.045f, 0.10f, 0.0f), v3(0.300f, 0.055f, 0.0f), 0.017f);
    if (arm < d) d = arm;
    float cup = sdCylY(v3(s.x - 0.300f, s.y - 0.085f, s.z), 0.042f, 0.014f);
    if (cup < d) d = cup;
    float cnd = sdCylY(v3(s.x - 0.300f, s.y - 0.150f, s.z), 0.019f, 0.055f);
    if (cnd < d) d = cnd;
    float bulb = sdEllipsoid(v3(s.x - 0.300f, s.y - 0.233f, s.z), v3(0.020f, 0.033f, 0.020f));
    if (bulb < d){ d = bulb; m = M_BULB; }
    /* two tiers of cut drops */
    for (int tier = 0; tier < 2; tier++){
        float R = tier ? 0.355f : 0.235f;
        float yy = tier ? 0.010f : 0.135f;
        V3 t = pmodY(v3(q.x, q.y, q.z), arms*3);
        float ang = atan2f(t.z, t.x);
        float dr = sdEllipsoid(v3(t.x - R, t.y - yy + 0.075f + 0.012f*cosf(ang*7.0f), t.z),
                               v3(0.017f, 0.043f, 0.017f));
        if (dr < d){ d = dr; m = M_CRYSTAL; }
    }
    *mat = (m == M_CHANDARM) ? M_CHANDARM : m;
    return d*scale;
}
static int corr_chand(int cx, int cz)
{
    int ax = ((cx % 6) + 6) % 6, az = ((cz % 6) + 6) % 6;
    if (ax == 2 && az == 2) return 1;
    if (ax == 2 && (((cz % 3) + 3) % 3) == 0) return 1;
    if (az == 2 && (((cx % 3) + 3) % 3) == 0) return 1;
    return 0;
}

/* The chandeliers hang on three exact lattices, so the marcher can be told how
 * far the nearest one is without looking at a window of cells -- which matters,
 * because the far-field table only knows about walls, and a ray running the
 * length of a hallway would otherwise step straight through six of them. */
typedef struct { float x0, px, z0, pz, sc; int arms; } ChandFam;
/* Nothing here may hang below 2.2 m: the whole fitting is 1.32 units deep, so
 * a 3.05 m corridor ceiling caps the scale at about 0.64. A chandelier the
 * operator walks through is a chandelier nobody believes. */
static const ChandFam CHF[3] = {
    { 0, 6.0f*CELL, 0, 3.0f*CELL, 0.545f, 6 },  /* x-hallways: every 3 cells   */
    { 0, 3.0f*CELL, 0, 6.0f*CELL, 0.545f, 6 },  /* z-hallways                  */
    { 0, 6.0f*CELL, 0, 6.0f*CELL, 0.640f, 8 },  /* junctions: the big fitting  */
};
static float corr_chands(V3 p, float ceil, int *mat, float *cap)
{
    float best = 1e9f, bcap = 1e9f;
    int m = M_CHANDARM;
    for (int i = 0; i < 3; i++){
        float sc = CHF[i].sc;
        float ox = (i == 1) ? CW(0.0f) : CW(2.0f);
        float oz = (i == 0) ? CW(0.0f) : CW(2.0f);
        float lx = rep1(p.x - ox, CHF[i].px);
        float lz = rep1(p.z - oz, CHF[i].pz);
        float oy = ceil - 1.04f*sc;                       /* the fitting origin */
        /* swinging, when there is nothing to swing it */
        float sw = g_swing;
        if (sw > 0.001f){
            float ph = g_time*2.35f + (float)i*1.7f;
            float ax = sw*0.30f*sinf(ph), az = sw*0.26f*sinf(ph*0.83f + 1.1f);
            float hy = p.y - ceil;                        /* negative below the ceiling */
            lx -= ax*hy*-1.0f; lz -= az*hy*-1.0f;
        }
        float c = sdCylY(v3(lx, p.y - (oy + 0.38f*sc), lz), 0.46f*sc, 0.74f*sc);
        if (c < bcap) bcap = c;
        if (c < 1.30f){
            int mm;
            float d = prop_chandelier(v3(lx, p.y - oy, lz), sc, CHF[i].arms, &mm);
            if (d < best){ best = d; m = mm; }
        }
    }
    *cap = bcap; *mat = m;
    return best;
}
/* the service floor: conduit and lagged pipe run the length of every ceiling */
static float serv_pipes(V3 p, int *mat)
{
    float d = 1e9f; int m = M_PIPE;
    /* pipes follow the x-hallways (cx == 2 mod 6) and the z-hallways alike */
    float lx = rep1(p.x - CW(2.0f), 6.0f*CELL);
    float lz = rep1(p.z - CW(2.0f), 6.0f*CELL);
    for (int k = 0; k < 3; k++){
        float off = -0.55f + 0.42f*k;
        float r = (k == 1) ? 0.075f : 0.048f;
        int mm = (k == 1) ? M_PIPE : M_CONDUIT;
        float a = sdCylZ(rotX(v3(lx - off, p.y - (CORR_H - 0.20f - 0.06f*k), 0.0f), 0.0f), r, 1e5f);
        if (a < d){ d = a; m = mm; }
        float b = sdCylX(v3(0.0f, p.y - (CORR_H - 0.20f - 0.06f*k), lz - off), r, 1e5f);
        if (b < d){ d = b; m = mm; }
    }
    /* strap hangers */
    float sx = rep1(p.x, 1.90f), sz = rep1(p.z, 1.90f);
    float hs = sdBox(v3(sx, p.y - (CORR_H - 0.14f), rep1(p.z - CW(2.0f), 6.0f*CELL)),
                     v3(0.020f, 0.145f, 0.62f));
    if (hs < d){ d = hs; m = M_STEEL; }
    float hs2 = sdBox(v3(rep1(p.x - CW(2.0f), 6.0f*CELL), p.y - (CORR_H - 0.14f), sz),
                      v3(0.62f, 0.145f, 0.020f));
    if (hs2 < d){ d = hs2; m = M_STEEL; }
    *mat = m;
    return d;
}
/* the hallways, guest floor or velvet or service */
static float map_corridor(V3 p, int *mat, int with_props)
{
    int px = WC(p.x), pz = WC(p.z);
    float d = 1e9f;
    int m = M_NONE;

    /* the exact zone: the 3x3 of cells around the point */
    for (int oz = -1; oz <= 1; oz++)
        for (int ox = -1; ox <= 1; ox++){
            int cx = px+ox, cz = pz+oz;
            if (!solidg(&GC, cx, cz)) continue;
            float bx = CW((float)cx), bz = CW((float)cz);
            float dx = p.x - bx, dz = p.z - bz;
            float db = sdBox2(dx, dz, CELL*0.5f, CELL*0.5f);
            float u = (fabsf(dx) > fabsf(dz)) ? dz : dx;
            float dwall = db - ((db > -0.05f) ? wall_relief(p.y, u) : 0.0f);
            int wm = (p.y < 0.150f) ? M_BASEBOARD
                   : (p.y < 0.985f || p.y > 2.755f) ? M_MOLDING
                   : (g_corr_style == 1) ? M_VELVETWALL
                   : (g_corr_style == 2) ? M_CINDER
                   : (p.y < 1.62f) ? M_OAK : M_WALLPAPER;
            if (g_corr_style == 2) wm = (p.y < 0.150f) ? M_BASEBOARD : M_CINDER;
            if (dwall < d){ d = dwall; m = wm; }

            /* and what hangs on the faces that look into a hallway */
            if (db < 1.35f && with_props && g_corr_style != 2){
                V3 L; int fm; float fd;
                if (dx > 0.0f && !solidg(&GC, cx+1, cz)){
                    L = v3(dz, p.y, dx - CELL*0.5f);
                    fd = wall_face(L, cx, cz, 0, &fm);
                    if (fd < d){ d = fd; m = fm; }
                } else if (dx < 0.0f && !solidg(&GC, cx-1, cz)){
                    L = v3(-dz, p.y, -dx - CELL*0.5f);
                    fd = wall_face(L, cx, cz, 1, &fm);
                    if (fd < d){ d = fd; m = fm; }
                }
                if (dz > 0.0f && !solidg(&GC, cx, cz+1)){
                    L = v3(-dx, p.y, dz - CELL*0.5f);
                    fd = wall_face(L, cx, cz, 2, &fm);
                    if (fd < d){ d = fd; m = fm; }
                } else if (dz < 0.0f && !solidg(&GC, cx, cz-1)){
                    L = v3(dx, p.y, -dz - CELL*0.5f);
                    fd = wall_face(L, cx, cz, 3, &fm);
                    if (fd < d){ d = fd; m = fm; }
                }
            }
        }

    /* the far field: walls first */
    if (px >= 0 && px < GW && pz >= 0 && pz < GH){
        float far = GC.dm[pz][px];
        if (far < d){ d = far; if (d < 0.0f) d = 0.0f; }
    }
    /* then the light fittings, which the table knows nothing about */
    if (with_props){
        if (g_corr_style == 2){
            int pm; float pd = serv_pipes(p, &pm);
            if (pd < d){ d = pd; m = pm; }
        } else {
            int cm; float cap;
            float cd = corr_chands(p, CORR_H, &cm, &cap);
            if (cd < d){ d = cd; m = cm; }
            if (cap < d) d = cap;              /* never step past one */
        }
    }
    *mat = m;
    return d;
}

/* ------------------------------------------------------------------ the lobby
 * A reception hall with a mahogany desk across the far end, a monitor standing
 * on the desk showing what the lens can see, and marble holding up a ceiling
 * six metres over deep-crimson carpet. */
#define LOB_HX 13.30f
#define LOB_HZ 10.60f
#define LOB_CZ -0.30f
#define LOB_H   6.40f
static const V3 P_DESK = { 0.0f, 0.0f, 6.35f };
static const V3 P_CRT  = { -1.34f, 1.372f, 5.800f };
#define CRT_TILT 0.155f
#define CRT_HW   0.182f
#define CRT_HH   0.137f

/* The tube's own frame: +z comes out of the glass, toward whoever is lying on
 * the carpet, canted up by CRT_TILT. Everything in prop_crt is written in it --
 * the face at z = 0, the tube and the neck behind at negative z -- so the frame
 * has to actually point that way, or the lens spends the first twenty seconds
 * of the tape looking at the back of the case. */
static inline V3 crt_local(V3 p)
{
    V3 q = rotX(sub(p, P_CRT), -CRT_TILT);
    return v3(-q.x, q.y, -q.z);
}
/* the tube standing on the desk, canted a little toward the carpet */
static float prop_crt(V3 p, int *mat)
{
    V3 q = crt_local(p);
    int m = M_CRTBODY;
    /* the case tapers back toward the neck */
    float body = sdRoundBox(v3(q.x, q.y, q.z + 0.212f), v3(0.228f, 0.188f, 0.162f), 0.030f);
    float neck = sdCylZ(v3(q.x, q.y - 0.006f, q.z + 0.448f), 0.118f, 0.090f);
    float d = opSmoothU(body, neck, 0.055f);
    /* the bezel, and the glass in it */
    float bez = sdRoundBox(v3(q.x, q.y, q.z - 0.014f), v3(0.222f, 0.182f, 0.028f), 0.014f);
    bez = maxf(bez, -sdBox(v3(q.x, q.y, q.z - 0.030f), v3(CRT_HW, CRT_HH, 0.060f)));
    if (bez < d){ d = bez; m = M_CRTBEZEL; }
    float scr = sdBox(v3(q.x, q.y, q.z + 0.006f), v3(CRT_HW, CRT_HH, 0.014f));
    /* the faceplate bulges, the way they did */
    scr -= 0.010f*(1.0f - satf((q.x*q.x/(CRT_HW*CRT_HW) + q.y*q.y/(CRT_HH*CRT_HH))));
    if (scr < d){ d = scr; m = M_CRTSCREEN; }
    /* knobs down the side of the bezel */
    for (int i = 0; i < 3; i++){
        float k = sdCylZ(v3(q.x - 0.204f, q.y + 0.108f - 0.056f*i, q.z - 0.026f), 0.013f, 0.012f);
        if (k < d){ d = k; m = M_CRTBEZEL; }
    }
    *mat = m;
    return d;
}
/* the reception desk: mahogany, panelled, with a brass rail along the front */
static float prop_desk(V3 p, int *mat)
{
    V3 q = sub(p, P_DESK);
    float bb = sdBox(q, v3(4.30f, 1.30f, 0.90f));
    if (bb > 0.25f){ *mat = M_MAHOGANY; return bb; }
    int m = M_MAHOGANY;
    /* the carcass, stopping short of the top */
    float d = sdBox(v3(q.x, q.y - 0.545f, q.z), v3(3.85f, 0.545f, 0.560f));
    /* recessed panels along the front, and pilasters between them */
    float pu = fabsf(triw(q.x/0.96f))*0.96f;
    if (q.z < 0.0f && q.y > 0.16f && q.y < 0.90f && fabsf(q.x) < 3.60f){
        float pv = smoothstepf(0.16f, 0.22f, q.y)*(1.0f - smoothstepf(0.84f, 0.90f, q.y));
        float inset = 0.026f*smoothstepf(0.10f, 0.20f, pu)*pv;
        d = maxf(d, -(sdBox(v3(q.x, q.y - 0.53f, q.z + 0.560f), v3(3.60f, 0.37f, 0.030f)) - 0.0f)
                     + 0.0f);
        d += inset;
    }
    /* the top, overhanging, with a moulded edge */
    float top = sdRoundBox(v3(q.x, q.y - 1.128f, q.z - 0.020f), v3(3.98f, 0.048f, 0.640f), 0.022f);
    if (top < d){ d = top; m = M_MAHOGANY; }
    /* a raised transaction shelf behind the top */
    float sh = sdRoundBox(v3(q.x, q.y - 1.212f, q.z + 0.390f), v3(3.86f, 0.038f, 0.210f), 0.016f);
    if (sh < d){ d = sh; m = M_MAHOGANY; }
    /* brass footrail across the front */
    float rail = sdCylX(v3(q.x, q.y - 0.190f, q.z + 0.660f), 0.028f, 3.72f);
    if (rail < d){ d = rail; m = M_BRASS; }
    for (int i = -3; i <= 3; i += 3){
        float st = sdCylY(v3(q.x - i*1.20f, q.y - 0.095f, q.z + 0.660f), 0.024f, 0.095f);
        if (st < d){ d = st; m = M_BRASS; }
    }
    /* a bell, and a ledger nobody signed */
    float bell = sdSphere(v3(q.x - 1.94f, q.y - 1.208f, q.z - 0.140f), 0.062f);
    bell = maxf(bell, -(q.y - 1.208f) - 0.0f);
    float bst = sdCylY(v3(q.x - 1.94f, q.y - 1.182f, q.z - 0.140f), 0.072f, 0.014f);
    bell = minf(bell, bst);
    if (bell < d){ d = bell; m = M_BRASS; }
    float led = sdBox(v3(q.x - 0.42f, q.y - 1.196f, q.z - 0.180f), v3(0.235f, 0.026f, 0.170f));
    if (led < d){ d = led; m = M_LEDGER; }
    *mat = m;
    return d;
}
/* the key wall behind it: pigeonholes, and a clock that is not the right time */
static float prop_keywall(V3 p, int *mat)
{
    V3 q = sub(p, v3(0.0f, 0.0f, 8.95f));
    float bb = sdBox(q, v3(5.40f, 3.30f, 0.60f));
    if (bb > 0.25f){ *mat = M_MAHOGANY; return bb; }
    int m = M_MAHOGANY;
    float d = sdBox(v3(q.x, q.y - 1.95f, q.z), v3(4.95f, 1.35f, 0.230f));
    /* the grid of holes */
    float gx = rep1(q.x, 0.235f), gy = rep1(q.y - 1.95f, 0.235f);
    if (fabsf(q.x) < 4.80f && fabsf(q.y - 1.95f) < 1.22f){
        float hole = sdBox(v3(gx, gy, q.z + 0.130f), v3(0.093f, 0.093f, 0.160f));
        d = maxf(d, -hole);
        /* a key on a tag in about a third of them */
        int kx = (int)repi(q.x, 0.235f), ky = (int)repi(q.y - 1.95f, 0.235f);
        if (fh2(kx*31, ky*17) < 0.34f){
            float tag = sdBox(v3(gx + 0.030f, gy - 0.020f, q.z + 0.055f), v3(0.026f, 0.048f, 0.008f));
            if (tag < d){ d = tag; m = M_KEYTAG; }
        }
    }
    /* the case around it */
    float cs = sdBox(v3(q.x, q.y - 1.95f, q.z + 0.060f), v3(4.95f, 1.35f, 0.075f));
    cs = maxf(cs, -sdBox(v3(q.x, q.y - 1.95f, q.z + 0.060f), v3(4.82f, 1.24f, 0.200f)));
    if (cs < d){ d = cs; m = M_MAHOGANY; }
    /* a cornice over the whole thing */
    float cn = sdBox(v3(q.x, q.y - 3.400f, q.z + 0.020f), v3(5.10f, 0.115f, 0.185f));
    if (cn < d){ d = cn; m = M_MOLDING; }
    /* the clock */
    float cl = sdCylZ(v3(q.x, q.y - 4.02f, q.z + 0.040f), 0.430f, 0.105f);
    if (cl < d){ d = cl; m = M_MAHOGANY; }
    float cf = sdCylZ(v3(q.x, q.y - 4.02f, q.z - 0.078f), 0.352f, 0.020f);
    if (cf < d){ d = cf; m = M_CLOCKFACE; }
    *mat = m;
    return d;
}
/* a fluted marble column, base to capital */
static float prop_column(V3 q, float h, int *mat)
{
    int m = M_MARBLE;
    float r = 0.375f;
    float shaft = sdCylY(v3(q.x, q.y - h*0.5f, q.z), r, h*0.5f);
    /* flutes */
    float ang = atan2f(q.z, q.x);
    float fl = 0.019f*(0.5f + 0.5f*cosf(ang*24.0f));
    shaft += fl*smoothstepf(0.30f, 0.42f, q.y)*(1.0f - smoothstepf(h-0.60f, h-0.44f, q.y));
    float d = shaft;
    float base = sdBox(v3(q.x, q.y - 0.135f, q.z), v3(0.505f, 0.135f, 0.505f)) - 0.030f;
    if (base < d) d = base;
    float tor = sdTorusY(v3(q.x, q.y - 0.335f, q.z), 0.400f, 0.055f);
    if (tor < d) d = tor;
    float cap = sdBox(v3(q.x, q.y - (h - 0.155f), q.z), v3(0.480f, 0.120f, 0.480f)) - 0.034f;
    if (cap < d) d = cap;
    float nk = sdCappedCone(v3(q.x, q.y - (h - 0.360f), q.z), 0.115f, 0.385f, 0.455f);
    if (nk < d) d = nk;
    *mat = m;
    return d;
}
/* a bellhop cart: brass tube frame, a carpeted deck, a bar to hang coats on */
static float prop_cart(V3 p, V3 at, float yaw, int *mat)
{
    V3 q = rotY(sub(p, at), yaw);
    float bb = sdBox(v3(q.x, q.y - 0.95f, q.z), v3(0.80f, 0.98f, 0.52f));
    if (bb > 0.20f){ *mat = M_BRASS; return bb; }
    int m = M_BRASS;
    float d = 1e9f;
    /* four uprights and the top rail */
    for (int i = 0; i < 4; i++){
        float sx = (i & 1) ? 0.635f : -0.635f;
        float sz = (i & 2) ? 0.375f : -0.375f;
        float up = sdCylY(v3(q.x - sx, q.y - 0.860f, q.z - sz), 0.021f, 0.860f);
        if (up < d) d = up;
        float cw = sdSphere(v3(q.x - sx, q.y - 0.055f, q.z - sz), 0.055f);
        if (cw < d) d = cw;
    }
    float bar = sdCylX(v3(q.x, q.y - 1.700f, q.z), 0.023f, 0.635f);
    if (bar < d) d = bar;
    for (int s = -1; s <= 1; s += 2){
        float pst = sdCylY(v3(q.x - s*0.635f, q.y - 1.290f, q.z - 0.375f), 0.021f, 0.430f);
        if (pst < d) d = pst;
        float pst2 = sdCylY(v3(q.x - s*0.635f, q.y - 1.290f, q.z + 0.375f), 0.021f, 0.430f);
        if (pst2 < d) d = pst2;
        float xr = sdCylZ(v3(q.x - s*0.635f, q.y - 1.700f, q.z), 0.021f, 0.375f);
        if (xr < d) d = xr;
    }
    float deck = sdBox(v3(q.x, q.y - 0.290f, q.z), v3(0.660f, 0.036f, 0.400f));
    if (deck < d){ d = deck; m = M_CARTDECK; }
    float lip = sdCylX(v3(q.x, q.y - 0.345f, q.z - 0.400f), 0.018f, 0.660f);
    lip = minf(lip, sdCylX(v3(q.x, q.y - 0.345f, q.z + 0.400f), 0.018f, 0.660f));
    if (lip < d){ d = lip; m = M_BRASS; }
    *mat = m;
    return d;
}
static float prop_palm(V3 p, V3 at, int seed, int *mat)
{
    V3 q = sub(p, at);
    float bb = sdBox(v3(q.x, q.y - 1.10f, q.z), v3(0.95f, 1.15f, 0.95f));
    if (bb > 0.25f){ *mat = M_PALM; return bb; }
    int m = M_PLANTPOT;
    float d = sdCappedCone(v3(q.x, q.y - 0.310f, q.z), 0.310f, 0.245f, 0.320f);
    float rim = sdTorusY(v3(q.x, q.y - 0.610f, q.z), 0.315f, 0.038f);
    if (rim < d) d = rim;
    /* fronds: eight, drooping, all a bit dead */
    for (int i = 0; i < 8; i++){
        float a = 6.283f*fh2(seed, i) + i*0.79f;
        float tilt = 0.55f + 0.75f*fh2(seed+5, i);
        V3 r = rotY(v3(q.x, q.y - 0.70f, q.z), -a);
        float L = 0.62f + 0.34f*fh2(seed+9, i);
        V3 b = v3(L, L*0.42f - tilt*L*0.55f, 0.0f);
        float fr = sdCapsule(r, v3(0,0.10f,0), b, 0.020f);
        float bl = sdEllipsoid(sub(r, scl(b, 0.62f)), v3(L*0.42f, 0.030f, 0.105f));
        fr = minf(fr, bl);
        if (fr < d){ d = fr; m = M_PALM; }
    }
    *mat = m;
    return d;
}
static float map_lobby(V3 p, int *mat, int with_props)
{
    int m = M_NONE;
    /* the shell: the region between two boxes, with the doorways cut out */
    float inner = sdBox2(p.x, p.z - LOB_CZ, LOB_HX, LOB_HZ);
    float outer = sdBox2(p.x, p.z - LOB_CZ, LOB_HX + 0.55f, LOB_HZ + 0.55f);
    float u = (fabsf(p.x) > fabsf(p.z - LOB_CZ)) ? p.z : p.x;
    float d = maxf(-inner, outer) - ((inner > -0.30f) ? wall_relief(p.y, u) : 0.0f);
    m = (p.y < 0.155f) ? M_BASEBOARD
      : (p.y < 1.020f) ? M_MARBLE
      : (p.y > 5.60f)  ? M_MOLDING : M_WALLPAPER;
    /* two ways out, on the long wall, going dark after a metre */
    for (int s = -1; s <= 1; s += 2){
        float dw = sdBox(v3(p.x + LOB_HX, p.y - 1.28f, p.z - (LOB_CZ + s*5.60f)),
                         v3(1.05f, 1.28f, 1.32f));
        d = maxf(d, -dw);
        float back = sdBox(v3(p.x + (LOB_HX + 1.30f), p.y - 1.60f, p.z - (LOB_CZ + s*5.60f)),
                           v3(0.30f, 2.00f, 1.40f));
        if (back < d){ d = back; m = M_SHOPDARK; }
        float arch = sdBox(v3(p.x + (LOB_HX - 0.06f), p.y - 1.34f, p.z - (LOB_CZ + s*5.60f)),
                           v3(0.075f, 1.42f, 1.46f));
        arch = maxf(arch, -sdBox(v3(p.x + LOB_HX, p.y - 1.28f, p.z - (LOB_CZ + s*5.60f)),
                                 v3(0.40f, 1.28f, 1.32f)));
        if (arch < d){ d = arch; m = M_MOLDING; }
    }
    if (!with_props){ *mat = m; return d; }

    int mm; float dd;
    dd = prop_desk(p, &mm);      if (dd < d){ d = dd; m = mm; }
    dd = prop_keywall(p, &mm);   if (dd < d){ d = dd; m = mm; }
    dd = prop_crt(p, &mm);       if (dd < d){ d = dd; m = mm; }
    /* four columns holding up the coffers */
    for (int i = 0; i < 4; i++){
        float cx = (i & 1) ? 8.15f : -8.15f;
        float cz = (i & 2) ? -1.40f : -7.90f;
        dd = prop_column(v3(p.x - cx, p.y, p.z - cz), LOB_H, &mm);
        if (dd < d){ d = dd; m = mm; }
    }
    dd = prop_cart(p, v3(5.05f, 0.0f, 1.30f), 0.42f, &mm);   if (dd < d){ d = dd; m = mm; }
    dd = prop_cart(p, v3(-6.90f, 0.0f, -3.05f), -1.13f, &mm); if (dd < d){ d = dd; m = mm; }
    dd = prop_cart(p, v3(9.90f, 0.0f, -8.10f), 2.35f, &mm);  if (dd < d){ d = dd; m = mm; }
    dd = prop_palm(p, v3(-4.85f, 0.0f, 5.55f), 3, &mm);      if (dd < d){ d = dd; m = mm; }
    dd = prop_palm(p, v3(4.85f, 0.0f, 5.55f), 8, &mm);       if (dd < d){ d = dd; m = mm; }
    /* three chandeliers, the middle one over the desk */
    {
        const float CX[3] = { 0.0f, -7.60f, 7.60f };
        const float CZ[3] = { 1.60f, -6.40f, -6.40f };
        const float CS[3] = { 1.95f, 1.30f, 1.30f };
        for (int i = 0; i < 3; i++){
            float sw = g_swing;
            float lx = p.x - CX[i], lz = p.z - CZ[i];
            if (sw > 0.001f){
                float hy = LOB_H - p.y;
                lx -= sw*0.34f*sinf(g_time*2.1f + i*2.2f)*hy*0.25f;
                lz -= sw*0.30f*sinf(g_time*1.7f + i*1.1f)*hy*0.25f;
            }
            float oy = LOB_H - 1.04f*CS[i];
            float cap = sdCylY(v3(lx, p.y - (oy + 0.38f*CS[i]), lz), 0.46f*CS[i], 0.74f*CS[i]);
            if (cap < 1.30f){
                dd = prop_chandelier(v3(lx, p.y - oy, lz), CS[i], 8, &mm);
                if (dd < d){ d = dd; m = mm; }
            } else if (cap < d) d = cap;
        }
    }
    *mat = m;
    return d;
}

/* -------------------------------------------------------- the mall promenade
 * An atrium, three levels of it, running in X for as long as anyone has ever
 * walked it. Nothing here needs a far-field table: every part of the shell is
 * either an exact slab, an exact lattice folded in X, or a prop behind a box
 * bound, so the minimum of them all is a true distance everywhere. */
#define MALL_ATR   8.60f    /* half-width of the well */
#define MALL_WALK 13.40f    /* the shopfront line */
#define MALL_BACK 17.30f    /* the wall behind the shops */
#define BAY        8.00f
#define LVL1       5.55f
#define LVL2      11.10f
#define LVL3      16.65f
#define SLAB       0.95f
#define ESC_X    -26.00f    /* where the escalator starts */
#define ESC_Z      4.30f
#define ESC_ANG    0.4712f  /* 27 degrees, and it does not stop */
#define ARC_X     13.20f    /* the arcade, off the -z side */
#define ARC_ZI   -13.40f
#define ARC_ZB   -23.20f
#define ARC_HX     5.60f
#define ARC_H      4.35f
#define PIANO_X   -5.40f
#define PIANO_Z   -9.80f

static const char *SHOPNAME[10] = {
    "MARQUISE", "AURELIA", "PALM COURT", "LE BRUN", "VERANDA",
    "EMPORIUM", "ATELIER", "SOLARIUM", "CHATEAU", "ROYALE"
};
static inline int bay_index(float x){ return (int)repi(x, BAY); }
static inline float arcade_bb(V3 p){
    return sdBox(v3(p.x - ARC_X, p.y - ARC_H*0.5f, p.z - (ARC_ZI + ARC_ZB)*0.5f),
                 v3(ARC_HX, ARC_H*0.5f, (ARC_ZI - ARC_ZB)*0.5f));
}

/* a faceless mannequin, fully dressed, standing exactly where it was left */
static float prop_mannequin(V3 q, int seed, int *mat)
{
    float bb = sdBox(v3(q.x, q.y - 0.92f, q.z), v3(0.46f, 0.95f, 0.36f));
    if (bb > 0.22f){ *mat = M_MANNEQ; return bb; }
    float arm_out = 0.10f + 0.30f*fh1(seed*13+1);
    int m = M_MANNEQ;
    /* legs */
    float lz = 0.0f;
    float leg = 1e9f;
    for (int s = -1; s <= 1; s += 2){
        float l = sdCapsule(q, v3(s*0.088f, 0.86f, lz), v3(s*0.098f, 0.44f, lz), 0.072f);
        l = minf(l, sdCapsule(q, v3(s*0.098f, 0.44f, lz), v3(s*0.092f, 0.055f, 0.010f), 0.058f));
        l = minf(l, sdBox(v3(q.x - s*0.092f, q.y - 0.030f, q.z - 0.052f), v3(0.048f, 0.030f, 0.108f)));
        leg = minf(leg, l);
    }
    float d = leg;
    /* hips and torso */
    float hip = sdEllipsoid(v3(q.x, q.y - 0.955f, q.z), v3(0.152f, 0.130f, 0.112f));
    if (hip < d) d = hip;
    float tor = sdEllipsoid(v3(q.x, q.y - 1.235f, q.z), v3(0.168f, 0.215f, 0.112f));
    if (tor < d) d = tor;
    float sho = sdCapsule(q, v3(-0.168f, 1.415f, 0.0f), v3(0.168f, 1.415f, 0.0f), 0.072f);
    if (sho < d) d = sho;
    /* arms, hanging or slightly away from the body */
    for (int s = -1; s <= 1; s += 2){
        V3 a0 = v3(s*0.196f, 1.400f, 0.0f);
        V3 a1 = v3(s*(0.196f + arm_out*0.28f), 1.105f, 0.024f);
        V3 a2 = v3(s*(0.196f + arm_out*0.40f), 0.855f, 0.062f);
        float ar = sdCapsule(q, a0, a1, 0.049f);
        ar = minf(ar, sdCapsule(q, a1, a2, 0.041f));
        ar = minf(ar, sdEllipsoid(sub(q, v3(a2.x, a2.y - 0.062f, a2.z + 0.012f)),
                                  v3(0.038f, 0.062f, 0.026f)));
        if (ar < d) d = ar;
    }
    /* the neck, and a head with nothing on the front of it */
    float nk = sdCapsule(q, v3(0,1.415f,0), v3(0,1.520f,0), 0.036f);
    if (nk < d) d = nk;
    float hd = sdEllipsoid(v3(q.x, q.y - 1.638f, q.z - 0.008f), v3(0.088f, 0.113f, 0.098f));
    if (hd < d) d = hd;

    /* what it is wearing: the cloth stands a little off the form */
    float cl = 1e9f;
    int dress = fh1(seed*7+3) < 0.45f;
    if (dress){
        /* a gown, to the floor */
        float rr = len2f(q.x, q.z);
        float flare = 0.150f + 0.245f*smoothstepf(1.10f, 0.10f, q.y);
        float g = rr - flare;
        g = maxf(g, q.y - 1.375f);
        g = maxf(g, 0.045f - q.y);
        g -= 0.012f*sinf(atan2f(q.z, q.x)*11.0f + fh1(seed)*6.28f);
        cl = g*0.72f;
    } else {
        /* a jacket, and trousers */
        float jk = sdEllipsoid(v3(q.x, q.y - 1.215f, q.z), v3(0.196f, 0.255f, 0.140f));
        jk = minf(jk, sdCapsule(q, v3(-0.190f,1.420f,0), v3(0.190f,1.420f,0), 0.090f));
        for (int s = -1; s <= 1; s += 2){
            V3 a0 = v3(s*0.205f, 1.400f, 0.0f);
            V3 a1 = v3(s*(0.205f + arm_out*0.28f), 1.070f, 0.024f);
            jk = minf(jk, sdCapsule(q, a0, a1, 0.064f));
        }
        float tr = 1e9f;
        for (int s = -1; s <= 1; s += 2)
            tr = minf(tr, sdCapsule(q, v3(s*0.090f, 0.985f, 0), v3(s*0.104f, 0.115f, 0), 0.085f));
        tr = minf(tr, sdEllipsoid(v3(q.x, q.y - 0.960f, q.z), v3(0.166f, 0.125f, 0.126f)));
        cl = minf(jk, tr);
    }
    if (cl < d){ d = cl; m = M_CLOTH; }
    /* about half of them were given hair */
    if (fh1(seed*5+9) < 0.5f){
        float w = sdEllipsoid(v3(q.x, q.y - 1.672f, q.z + 0.020f), v3(0.098f, 0.112f, 0.104f));
        w = maxf(w, -(q.z - (-0.030f)) - 0.0f + (q.y < 1.62f ? -1.0f : 0.0f));
        if (w < d){ d = w; m = M_WIG; }
    }
    *mat = m;
    return d;
}
/* a longcase clock. Every one of them keeps its own time. */
static float prop_clock(V3 q, int seed, int *mat)
{
    float bb = sdBox(v3(q.x, q.y - 1.20f, q.z), v3(0.36f, 1.28f, 0.24f));
    if (bb > 0.20f){ *mat = M_CLOCKCASE; return bb; }
    int m = M_CLOCKCASE;
    /* trunk */
    float d = sdBox(v3(q.x, q.y - 0.870f, q.z), v3(0.170f, 0.740f, 0.130f));
    float base = sdBox(v3(q.x, q.y - 0.115f, q.z), v3(0.215f, 0.115f, 0.160f));
    if (base < d) d = base;
    float plin = sdBox(v3(q.x, q.y - 0.030f, q.z), v3(0.240f, 0.030f, 0.180f));
    if (plin < d) d = plin;
    /* the hood */
    float hood = sdBox(v3(q.x, q.y - 1.840f, q.z), v3(0.238f, 0.240f, 0.168f));
    if (hood < d) d = hood;
    float ped = sdCappedCone(v3(q.x, q.y - 2.130f, q.z), 0.058f, 0.250f, 0.140f);
    if (ped < d) d = ped;
    float fin = sdSphere(v3(q.x, q.y - 2.235f, q.z), 0.046f);
    if (fin < d) d = fin;
    float cor = sdBox(v3(q.x, q.y - 1.615f, q.z), v3(0.252f, 0.038f, 0.185f));
    if (cor < d) d = cor;
    /* the dial, behind glass */
    float dial = sdCylZ(v3(q.x, q.y - 1.855f, q.z - 0.150f), 0.168f, 0.014f);
    if (dial < d){ d = dial; m = M_CLOCKFACE; }
    float hglass = sdBox(v3(q.x, q.y - 1.855f, q.z - 0.172f), v3(0.190f, 0.196f, 0.006f));
    if (hglass < d){ d = hglass; m = M_CLOCKGLASS; }
    /* the trunk door, and the pendulum behind it, swinging at its own rate */
    float rate = 1.05f + 1.55f*fh1(seed*3+7);
    float amp  = 0.13f + 0.11f*fh1(seed*11+2);
    float ang  = amp*sinf(g_time*rate + fh1(seed)*6.28f);
    V3 pv = rotZ(v3(q.x, q.y - 1.560f, q.z - 0.030f), -ang);
    float rod = sdCapsule(pv, v3(0,0,0), v3(0,-0.560f,0), 0.010f);
    float bobd = sdCylZ(v3(pv.x, pv.y + 0.610f, pv.z), 0.088f, 0.011f);
    float pend = minf(rod, bobd);
    if (pend < d){ d = pend; m = M_PENDULUM; }
    float tglass = sdBox(v3(q.x, q.y - 1.100f, q.z - 0.132f), v3(0.128f, 0.430f, 0.006f));
    if (tglass < d){ d = tglass; m = M_CLOCKGLASS; }
    *mat = m;
    return d;
}
/* an overgrown fountain with something thick in the bottom of it */
static float prop_fountain(V3 q, int *mat)
{
    float bb = sdCylY(v3(q.x, q.y - 1.10f, q.z), 3.35f, 1.30f);
    if (bb > 0.25f){ *mat = M_FOUNTSTONE; return bb; }
    int m = M_FOUNTSTONE;
    /* the basin: an octagon, because it was cut that way */
    V3 o = pmodY(v3(q.x, 0.0f, q.z), 8);
    float oct = o.x - 3.02f;
    float wall = maxf(oct, fabsf(q.y - 0.320f) - 0.320f);
    wall = maxf(wall, -(o.x - 2.79f));
    float d = wall;
    float rim = maxf(o.x - 3.12f, fabsf(q.y - 0.615f) - 0.075f);
    rim = maxf(rim, -(o.x - 2.70f));
    if (rim < d) d = rim;
    float flr = maxf(oct, fabsf(q.y - 0.055f) - 0.055f);
    if (flr < d) d = flr;
    /* the tiers in the middle */
    float ped = sdCylY(v3(q.x, q.y - 0.44f, q.z), 0.42f, 0.44f);
    if (ped < d) d = ped;
    float b1 = sdCylY(v3(q.x, q.y - 0.930f, q.z), 1.05f, 0.070f);
    b1 = minf(b1, sdCappedCone(v3(q.x, q.y - 0.790f, q.z), 0.085f, 0.30f, 0.95f));
    if (b1 < d) d = b1;
    float st = sdCylY(v3(q.x, q.y - 1.240f, q.z), 0.155f, 0.290f);
    if (st < d) d = st;
    float b2 = sdCylY(v3(q.x, q.y - 1.510f, q.z), 0.560f, 0.055f);
    b2 = minf(b2, sdCappedCone(v3(q.x, q.y - 1.420f, q.z), 0.055f, 0.20f, 0.50f));
    if (b2 < d) d = b2;
    float fin = sdSphere(v3(q.x, q.y - 1.660f, q.z), 0.105f);
    if (fin < d) d = fin;
    /* the water: a surface, thick and slow, with something coming up through it */
    float wy = 0.455f;
    float rip = 0.010f*sinf(len2f(q.x,q.z)*5.5f - g_time*1.35f)
              + 0.008f*fbm3(v3(q.x*1.7f, q.z*1.7f, g_time*0.42f), 3);
    float wsurf = maxf(oct - 0.10f, fabsf(q.y - (wy + rip)) - 0.006f);
    if (wsurf < d){ d = wsurf; m = M_WATER; }
    /* what has grown over the stone */
    float mo = fbm3(scl(q, 1.35f), 4);
    if (m == M_FOUNTSTONE && mo > 0.56f && q.y < 0.72f) m = M_MOSS;
    *mat = m;
    return d;
}
/* an upright cabinet, still in attract mode */
static float prop_cabinet(V3 q, int seed, int *mat)
{
    float bb = sdBox(v3(q.x, q.y - 0.85f, q.z), v3(0.38f, 0.90f, 0.44f));
    if (bb > 0.20f){ *mat = M_CABBODY; return bb; }
    int m = M_CABBODY;
    /* the body, cut back at the front where the panel and the screen are */
    float d = sdBox(v3(q.x, q.y - 0.800f, q.z + 0.055f), v3(0.325f, 0.800f, 0.325f));
    float hd = sdBox(v3(q.x, q.y - 1.480f, q.z - 0.030f), v3(0.325f, 0.240f, 0.240f));
    if (hd < d) d = hd;
    /* the marquee */
    float mq = sdBox(v3(q.x, q.y - 1.660f, q.z - 0.170f), v3(0.300f, 0.145f, 0.028f));
    if (mq < d){ d = mq; m = M_CABMARQUEE; }
    /* the screen, canted back */
    V3 s = rotX(v3(q.x, q.y - 1.185f, q.z - 0.108f), 0.20f);
    float scr = sdBox(s, v3(0.245f, 0.190f, 0.020f));
    if (scr < d){ d = scr; m = M_CABSCREEN; }
    float bez = sdBox(rotX(v3(q.x, q.y - 1.185f, q.z - 0.088f), 0.20f), v3(0.290f, 0.235f, 0.030f));
    bez = maxf(bez, -sdBox(s, v3(0.247f, 0.192f, 0.090f)));
    if (bez < d){ d = bez; m = M_CABBODY; }
    /* the control panel, and what is on it */
    V3 c = rotX(v3(q.x, q.y - 0.955f, q.z - 0.230f), -0.62f);
    float cp = sdBox(c, v3(0.310f, 0.135f, 0.022f));
    if (cp < d){ d = cp; m = M_CABPANEL; }
    float stk = sdCapsule(c, v3(-0.135f, 0.0f, -0.020f), v3(-0.135f, 0.0f, -0.115f), 0.016f);
    if (stk < d){ d = stk; m = M_STEEL; }
    float knb = sdSphere(add(c, v3(0.135f, 0.0f, 0.128f)), 0.030f);
    if (knb < d){ d = knb; m = M_CABMARQUEE; }
    for (int i = 0; i < 3; i++){
        float bt = sdCylZ(add(c, v3(-0.020f - 0.070f*i, 0.030f, 0.028f)), 0.019f, 0.008f);
        if (bt < d){ d = bt; m = M_CABMARQUEE; }
    }
    /* the front panel art below it */
    float fp = sdBox(v3(q.x, q.y - 0.430f, q.z - 0.252f), v3(0.300f, 0.420f, 0.014f));
    if (fp < d){ d = fp; m = M_CABPANEL; }
    (void)seed;
    *mat = m;
    return d;
}
/* the arcade, in behind an open shopfront, playing to nobody */
static float map_arcade(V3 p, int *mat)
{
    float bb = arcade_bb(p);
    if (bb > 0.20f){ *mat = M_CABBODY; return bb + 0.0f; }
    int m = M_SHOPDARK;
    /* the shell: side walls, back wall, ceiling */
    float zc = (ARC_ZI + ARC_ZB)*0.5f, zh = (ARC_ZI - ARC_ZB)*0.5f;
    float inner = sdBox2(p.x - ARC_X, p.z - zc, ARC_HX, zh);
    float outer = sdBox2(p.x - ARC_X, p.z - zc, ARC_HX + 0.70f, zh + 0.70f);
    float d = maxf(-inner, outer);
    /* the way back out to the promenade */
    float mouth = sdBox(v3(p.x - ARC_X, p.y - 1.72f, p.z - ARC_ZI), v3(3.70f, 1.72f, 1.40f));
    d = maxf(d, -mouth);
    /* the ceiling of it, lower than the promenade */
    float ceil = sdBox(v3(p.x - ARC_X, p.y - (ARC_H + 0.35f), p.z - zc),
                       v3(ARC_HX + 0.70f, 0.35f, zh + 0.70f));
    if (ceil < d){ d = ceil; m = M_SHOPFIT; }
    /* four rows of cabinets, back to back down the room */
    {
        float lx = rep1(p.x - ARC_X, 1.55f);
        int   bx = (int)repi(p.x - ARC_X, 1.55f);
        for (int row = 0; row < 4; row++){
            float rz = ARC_ZB + 2.55f + row*2.05f;
            float face = (row & 1) ? 0.0f : PI;
            V3 q = rotY(v3(lx, p.y, p.z - rz), face);
            if (fabsf(p.x - ARC_X) > ARC_HX - 0.55f) continue;
            int cm;
            float cd = prop_cabinet(q, bx*7 + row, &cm);
            if (cd < d){ d = cd; m = cm; }
        }
    }
    *mat = m;
    return d;
}
/* the grand piano, playing something it half remembers */
static float prop_piano(V3 p, int *mat)
{
    V3 q = v3(p.x - PIANO_X, p.y, p.z - PIANO_Z);
    float bb = sdBox(v3(q.x, q.y - 0.80f, q.z), v3(1.30f, 0.95f, 2.05f));
    if (bb > 0.25f){ *mat = M_PIANO; return bb; }
    int m = M_DAIS;
    /* the dais */
    float d = sdBox(v3(q.x, q.y - 0.090f, q.z), v3(2.05f, 0.090f, 2.60f));
    float step = sdBox(v3(q.x, q.y - 0.045f, q.z), v3(2.25f, 0.045f, 2.80f));
    if (step < d) d = step;
    /* the case: a rounded wing, wide at the keyboard end */
    float y0 = 0.180f;
    float w = 0.72f + 0.44f*smoothstepf(1.30f, -1.05f, q.z);
    float body = len2f(maxf(fabsf(q.x) - w*0.55f, 0.0f), 0.0f) + 0.0f;
    body = sdBox2(q.x, q.z + 0.10f, w*0.62f, 1.28f) - 0.34f;
    float caseb = maxf(body, fabsf(q.y - (y0 + 0.585f)) - 0.275f);
    if (caseb < d){ d = caseb; m = M_PIANO; }
    /* the lid, up on its stick */
    V3 lp = rotZ(v3(q.x - 0.10f, q.y - (y0 + 0.865f), q.z), -0.30f);
    float lid = maxf(sdBox2(lp.x, q.z + 0.10f, w*0.60f, 1.26f) - 0.34f,
                     fabsf(lp.y) - 0.024f);
    if (lid < d){ d = lid; m = M_PIANO; }
    float stick = sdCapsule(q, v3(0.62f, y0+0.86f, 0.30f), v3(0.30f, y0+0.40f, 0.30f), 0.016f);
    if (stick < d){ d = stick; m = M_PIANO; }
    /* the keybed, and the keys going down by themselves */
    float kb = sdBox(v3(q.x, q.y - (y0 + 0.585f), q.z - 1.235f), v3(0.700f, 0.100f, 0.190f));
    if (kb < d){ d = kb; m = M_PIANO; }
    if (fabsf(q.x) < 0.640f && q.z > 1.15f && q.z < 1.44f){
        float kx = rep1(q.x, 0.0232f);
        int   ki = (int)repi(q.x, 0.0232f);
        /* which notes are down: a slow, wrong little figure */
        float ph = g_piano_t*0.46f;
        int  bar = (int)ph;
        float dn = (fh2(ki*13 + bar*7, bar*29) > 0.905f) ? 1.0f : 0.0f;
        dn *= smoothstepf(0.0f, 0.06f, fractf(ph))*(1.0f - smoothstepf(0.52f, 0.86f, fractf(ph)));
        int black = (((ki % 12) + 12) % 12);
        black = (black==1||black==3||black==6||black==8||black==10);
        float ky;
        if (black){
            ky = sdBox(v3(kx, q.y - (y0 + 0.700f - 0.012f*dn), q.z - 1.322f),
                       v3(0.0072f, 0.0165f, 0.088f));
            if (ky < d){ d = ky; m = M_KEYBLACK; }
        } else {
            ky = sdBox(v3(kx, q.y - (y0 + 0.688f - 0.010f*dn), q.z - 1.290f),
                       v3(0.0104f, 0.0105f, 0.125f));
            if (ky < d){ d = ky; m = M_KEYWHITE; }
        }
    }
    /* three legs and a pedal lyre */
    {
        float lg = 1e9f;
        lg = minf(lg, sdCylY(v3(q.x - 0.62f, q.y - (y0+0.15f), q.z - 1.10f), 0.048f, 0.155f + 0.145f));
        lg = minf(lg, sdCylY(v3(q.x + 0.62f, q.y - (y0+0.15f), q.z - 1.10f), 0.048f, 0.300f));
        lg = minf(lg, sdCylY(v3(q.x, q.y - (y0+0.15f), q.z + 1.05f), 0.048f, 0.300f));
        if (lg < d){ d = lg; m = M_PIANO; }
        float ly = sdBox(v3(q.x, q.y - (y0+0.22f), q.z - 0.96f), v3(0.075f, 0.155f, 0.022f));
        if (ly < d){ d = ly; m = M_PIANO; }
        float pd = sdBox(v3(q.x, q.y - (y0+0.055f), q.z - 0.96f), v3(0.090f, 0.010f, 0.055f));
        if (pd < d){ d = pd; m = M_BRASS; }
    }
    *mat = m;
    return d;
}
/* the escalator. Exact, because it is a rigid transform of a long box, and it
 * has to be visible from a long way off. */
static float prop_escalator(V3 p, int *mat)
{
    V3 q = v3(p.x - ESC_X, p.y, p.z - ESC_Z);
    V3 L = rotZ(q, -ESC_ANG);          /* L.x runs up the incline */
    const float RUN = 62.0f;
    int m = M_ESCSIDE;
    /* the truss */
    float run = sdBox(v3(L.x - RUN*0.5f, L.y + 0.42f, L.z), v3(RUN*0.5f, 0.46f, 0.660f));
    float d = run;
    /* the steps: a comb of treads and risers, folded along the run */
    float sx = rep1(L.x, 0.410f);
    float tread = sdBox(v3(sx, L.y - 0.010f, L.z), v3(0.205f, 0.026f, 0.610f));
    float riser = sdBox(v3(sx - 0.205f, L.y - 0.100f, L.z), v3(0.024f, 0.115f, 0.610f));
    float steps = minf(tread, riser);
    steps = maxf(steps, sdBox(v3(L.x - RUN*0.5f, L.y - 0.02f, L.z), v3(RUN*0.5f, 0.22f, 0.615f)));
    if (steps < d){ d = steps; m = M_ESCSTEP; }
    /* the cleats on each tread */
    if (m == M_ESCSTEP){
        float cl = 0.0026f*(0.5f + 0.5f*cosf(L.z*230.0f));
        d -= cl;
    }
    /* the balustrades and the moving handrail */
    for (int s = -1; s <= 1; s += 2){
        float bal = sdBox(v3(L.x - RUN*0.5f, L.y - 0.480f, L.z - s*0.685f),
                          v3(RUN*0.5f, 0.505f, 0.028f));
        if (bal < d){ d = bal; m = M_ESCSIDE; }
        float hr = sdCylX(v3(L.x - RUN*0.5f, L.y - 1.010f, L.z - s*0.700f), 0.052f, RUN*0.5f);
        if (hr < d){ d = hr; m = M_ESCRAIL; }
    }
    /* the deck plate at the bottom, and the comb */
    float deck = sdBox(v3(L.x - 0.40f, L.y - 0.010f, L.z), v3(0.70f, 0.030f, 0.660f));
    if (deck < d){ d = deck; m = M_BRASSRUST; }
    *mat = m;
    return d;
}
static float map_mall(V3 p, int *mat, int with_props)
{
    int m = M_NONE;
    float az = fabsf(p.z);
    float arcbb = arcade_bb(p);

    /* which level are we in the height of? Nothing crosses a slab, so this
     * partition is exact and one bay's worth of geometry serves all three. */
    int   lv   = (p.y < LVL1) ? 0 : (p.y < LVL2 ? 1 : 2);
    float base = (lv == 0) ? 0.0f : (lv == 1 ? LVL1 : LVL2);
    float ly   = p.y - base;

    /* --- the shell ------------------------------------------------------- */
    /* the wall behind the shops, with the arcade knocked through it.
     * Signed distance to the region |z| >= MALL_BACK, which is negative inside
     * it and positive out in the well -- not the other way round. */
    float d = MALL_BACK - az;
    if (p.z < 0.0f) d = maxf(d, -arcbb);
    m = M_SHOPDARK;
    /* the three slabs: two balconies and the roof over the top level */
    {
        const float LY[3] = { LVL1, LVL2, LVL3 };
        for (int i = 0; i < 3; i++){
            float zz = fabsf(az - (MALL_ATR + MALL_BACK)*0.5f) - (MALL_BACK - MALL_ATR)*0.5f;
            float yy = fabsf(p.y - (LY[i] - SLAB*0.5f)) - SLAB*0.5f;
            float sd = len2f(maxf(zz,0), maxf(yy,0)) + minf(maxf(zz,yy), 0.0f);
            if (p.z < 0.0f && i == 0) sd = maxf(sd, -arcbb);
            if (sd < d){ d = sd; m = (yy > -0.02f && p.y < LY[i] - SLAB) ? M_MALLCEIL : M_MARBLEFLOOR; }
        }
        /* and everything above the roof is building, going up into the fog */
        float a = az - MALL_ATR, b = p.y - LVL3;
        float sd = len2f(maxf(-a,0), maxf(-b,0)) + minf(maxf(-a,-b), 0.0f);
        if (sd < d){ d = sd; m = M_MALLCEIL; }
    }
    /* the piers at the edge of the well, every bay, all the way up */
    {
        float lx = rep1(p.x, BAY);
        float pd = sdBox2(lx, az - (MALL_ATR + 0.34f), 0.255f, 0.300f);
        if (pd < d){ d = pd; m = M_PIER; }
    }
    /* the balustrade on the two balconies */
    if (lv > 0 && ly < 1.20f && az > MALL_ATR - 0.45f && az < MALL_ATR + 0.55f){
        float bx = rep1(p.x, 0.152f);
        float bal = sdCylY(v3(bx, ly - 0.520f, az - MALL_ATR - 0.075f), 0.0165f, 0.470f);
        if (bal < d){ d = bal; m = M_BRASS; }
        float rl = sdCylX(v3(0.0f, ly - 1.035f, az - MALL_ATR - 0.075f), 0.043f, 1e5f);
        if (rl < d){ d = rl; m = M_BRASS; }
        float kick = sdBox(v3(0.0f, ly - 0.030f, az - MALL_ATR - 0.075f), v3(1e5f, 0.030f, 0.085f));
        if (kick < d){ d = kick; m = M_MARBLE; }
    }
    /* --- the shopfronts, one bay wide, three levels high ----------------- */
    if (az > MALL_WALK - 1.10f && !(p.z < 0.0f && arcbb < 0.10f)){
        float lx = rep1(p.x, BAY);
        float zz = az - MALL_WALK;
        /* mullions: the bay division, and two more inside it */
        float mu = minf(fabsf(fabsf(lx) - BAY*0.5f) - 0.185f,
                        fabsf(fabsf(lx) - 1.62f) - 0.048f);
        float mud = maxf(mu, maxf(fabsf(zz + 0.055f) - 0.085f, ly - 3.42f));
        mud = maxf(mud, 0.055f - ly);
        if (mud < d){ d = mud; m = M_BRASSDULL; }
        /* the glass */
        float gl = maxf(fabsf(lx) - (BAY*0.5f - 0.185f), fabsf(zz) - 0.012f);
        gl = maxf(gl, ly - 3.36f);
        gl = maxf(gl, 0.14f - ly);
        if (gl < d){ d = gl; m = M_SHOPGLASS; }
        /* the stallriser under it */
        float sr = maxf(fabsf(lx) - (BAY*0.5f - 0.185f), fabsf(zz + 0.030f) - 0.060f);
        sr = maxf(sr, ly - 0.145f);
        if (sr < d){ d = sr; m = M_MARBLE; }
        /* the fascia, and the sign lit up on it */
        float fa = maxf(fabsf(lx) - BAY*0.5f, fabsf(zz + 0.100f) - 0.150f);
        fa = maxf(fa, fabsf(ly - 3.90f) - 0.480f);
        if (fa < d){ d = fa; m = M_SHOPFIT; }
        float sg = maxf(fabsf(lx) - (BAY*0.5f - 0.32f), fabsf(zz + 0.008f) - 0.036f);
        sg = maxf(sg, fabsf(ly - 3.88f) - 0.300f);
        if (sg < d){ d = sg; m = M_SHOPSIGN; }
    }
    /* --- inside the shops: shelving, and more of them standing about ----- */
    if (with_props && az > MALL_WALK - 0.30f && az < MALL_BACK && ly < 3.60f
        && !(p.z < 0.0f && arcbb < 0.10f)){
        float lx = rep1(p.x, BAY);
        int   bi = bay_index(p.x);
        float zz = az - MALL_WALK;
        /* three shelf bays against the back, stocked to the top */
        float shy = rep1(ly - 0.42f, 0.505f);
        float sh = maxf(fabsf(shy) - 0.022f, fabsf(zz - 3.05f) - 0.290f);
        sh = maxf(sh, fabsf(lx) - 3.30f);
        sh = maxf(sh, ly - 2.62f);
        if (sh < d){ d = sh; m = M_SHOPFIT; }
        /* the stock */
        {
            float gx = rep1(lx, 0.245f);
            int   gi = (int)repi(lx, 0.245f);
            int   gj = (int)repi(ly - 0.42f, 0.505f);
            float hh = 0.085f + 0.075f*fh3(bi*7, gi, gj);
            float gz = 2.86f + 0.16f*fh3(bi*3, gi*5, gj*11);
            float gd = sdBox(v3(gx, shy - 0.022f - hh, zz - gz), v3(0.078f, hh, 0.078f));
            gd = maxf(gd, fabsf(lx) - 3.28f);
            gd = maxf(gd, ly - 2.62f);
            if (fh3(gi*13, gj*17, bi) > 0.16f && gd < d){ d = gd; m = M_SHOPFIT; }
        }
        /* two or three in the window, dressed, facing out */
        for (int i = 0; i < 3; i++){
            float mx = -2.20f + 2.20f*i + 0.55f*fh3(bi*5, i, 3);
            float mz = 0.95f + 0.75f*fh3(bi*9, i, 7);
            float yaw = 6.28f*fh3(bi*11, i, 13);
            V3 q = rotY(v3(lx - mx, p.y - base, (az - MALL_WALK) - mz), yaw);
            if (p.z < 0.0f) q.z = -q.z;
            int mm;
            float md = prop_mannequin(q, bi*31 + i*7, &mm);
            if (md < d){ d = md; m = mm; }
        }
    }
    if (!with_props){ *mat = m; return d; }

    int mm; float dd;
    /* --- what is standing on the promenade ------------------------------- */
    /* clusters of them, out on the marble, in the places they were left */
    if (p.y < 2.20f){
        float lx = rep1(p.x, BAY*2.0f);
        int   bi = (int)repi(p.x, BAY*2.0f);
        if (fh1(bi*17+3) > 0.30f){
            int n = 3 + (int)(fh1(bi*29) * 3.0f);
            for (int i = 0; i < n; i++){
                float ang = 6.283f*fh2(bi*7, i*13);
                float rad = 0.70f + 1.55f*fh2(bi*11, i*5);
                float cx = 2.10f*(fh1(bi*5) - 0.5f) + cosf(ang)*rad;
                float cz = (fh1(bi*13) > 0.5f ? 1.0f : -1.0f)
                         * (6.20f + 3.40f*fh1(bi*19)) + sinf(ang)*rad;
                float yaw = 6.283f*fh2(bi*3, i*19);
                dd = prop_mannequin(rotY(v3(lx - cx, p.y, p.z - cz), yaw), bi*53 + i*11, &mm);
                if (dd < d){ d = dd; m = mm; }
            }
        }
    }
    /* the clocks, against the shopfront piers, none of them agreeing */
    if (p.y < 2.45f && az > MALL_ATR){
        float lx = rep1(p.x, BAY);
        int   bi = bay_index(p.x);
        if (fh1(bi*23+5) > 0.42f){
            float side = (p.z > 0.0f) ? 1.0f : -1.0f;
            float cz = side*(MALL_WALK - 0.62f);
            V3 q = v3(lx - (BAY*0.5f - 1.05f), p.y, p.z - cz);
            if (side < 0.0f){ q.x = -q.x; q.z = -q.z; }
            dd = prop_clock(q, bi*37+1, &mm);
            if (dd < d){ d = dd; m = mm; }
        }
    }
    /* the fountains, down the middle, every fourth bay */
    {
        float lx = rep1(p.x - BAY*0.5f, BAY*4.0f);
        dd = prop_fountain(v3(lx, p.y, p.z), &mm);
        if (dd < d){ d = dd; m = mm; }
    }
    dd = prop_escalator(p, &mm);  if (dd < d){ d = dd; m = mm; }
    dd = prop_piano(p, &mm);      if (dd < d){ d = dd; m = mm; }
    dd = map_arcade(p, &mm);      if (dd < d){ d = dd; m = mm; }
    *mat = m;
    return d;
}

/* -------------------------------------------------------------- the ballroom */
#define BAL_HX 15.20f
#define BAL_HZ 11.30f
#define BAL_H   9.25f
/* what is standing in the middle of it. Three and a bit metres of tarnished
 * silk with nothing on the front of its head. */
static float prop_figure(V3 p, int *mat)
{
    V3 q = rotY(sub(p, g_fig_pos), -g_fig_yaw);
    float bb = sdBox(v3(q.x, q.y - 1.70f, q.z), v3(1.05f, 1.85f, 0.95f));
    if (bb > 0.30f){ *mat = M_FIGSILK; return bb; }

    float ct = g_fig_contort;
    /* the twitch: it does not move smoothly and it does not move all over */
    if (g_fig_twitch > 0.001f){
        float j = g_fig_twitch;
        float s1 = (fh3((int)(g_time*38.0f), 3, 7) - 0.5f);
        float s2 = (fh3((int)(g_time*47.0f), 11, 2) - 0.5f);
        q.x += j*0.075f*s1*satf(q.y*0.5f);
        q.z += j*0.060f*s2*satf(q.y*0.5f);
        q = rotY(q, j*0.13f*s1);
    }
    int m = M_FIGSILK;
    /* the silk: a tapering column, gathered, that does not quite reach the floor */
    float rr = len2f(q.x, q.z);
    float ang = atan2f(q.z, q.x);
    float taper = 0.560f - 0.300f*smoothstepf(0.10f, 2.62f, q.y)
                         + 0.075f*smoothstepf(2.30f, 2.72f, q.y);
    /* folds, and they hang wrong when it starts to come apart */
    float fold = 0.030f*sinf(ang*13.0f + q.y*0.85f)
               + 0.020f*sinf(ang*7.0f - q.y*1.9f)
               + ct*0.035f*sinf(ang*23.0f + g_time*3.1f);
    float lean = ct*0.30f*smoothstepf(0.60f, 2.80f, q.y);
    float body = len2f(q.x - lean, q.z) - (taper + fold);
    body = maxf(body, q.y - 2.86f);
    body = maxf(body, 0.015f - q.y);
    /* the hem, dragging */
    body = maxf(body, -(rr - 0.10f) - 8.0f);
    float d = body*0.80f;
    /* shoulders */
    float sh = sdEllipsoid(v3(q.x - lean, q.y - 2.780f, q.z), v3(0.475f, 0.175f, 0.325f));
    if (sh < d) d = sh;
    /* the arms: too long, and longer once it starts */
    for (int s = -1; s <= 1; s += 2){
        float ex = 0.10f + ct*0.42f;
        V3 a0 = v3(s*0.430f + lean, 2.700f, 0.0f);
        V3 a1 = v3(s*(0.470f + ex*0.55f) + lean, 1.960f - ct*0.16f, 0.075f + ex*0.30f);
        V3 a2 = v3(s*(0.430f + ex*0.85f) + lean, 1.180f - ct*0.36f, 0.190f + ex*0.62f);
        float ar = sdCapsule(q, a0, a1, 0.098f - 0.020f*ct);
        ar = minf(ar, sdCapsule(q, a1, a2, 0.072f - 0.016f*ct));
        /* the hands, which are mostly finger */
        for (int fi = 0; fi < 4; fi++){
            V3 f0 = a2;
            V3 f1 = v3(a2.x + s*0.045f*(fi-1.5f)*0.6f,
                       a2.y - 0.235f - 0.075f*ct, a2.z + 0.075f + 0.040f*fi);
            ar = minf(ar, sdCapsule(q, f0, f1, 0.019f));
        }
        if (ar < d) d = ar;
    }
    /* the neck and the head */
    float nk = sdCapsule(q, v3(lean, 2.760f, 0), v3(lean, 2.975f, 0.010f), 0.078f);
    if (nk < d) d = nk;
    V3 hp = v3(q.x - lean, q.y - 3.115f, q.z - 0.012f);
    float hd = sdEllipsoid(hp, v3(0.166f, 0.212f, 0.178f));
    if (hd < d){ d = hd; m = M_FIGFACE; }
    /* the silk drawn over the crown of it */
    float hood = sdEllipsoid(v3(hp.x, hp.y - 0.055f, hp.z + 0.030f), v3(0.190f, 0.205f, 0.190f));
    hood = maxf(hood, -(hp.z - 0.020f));
    hood = maxf(hood, -(hp.y + 0.050f));
    if (hood < d){ d = hood; m = M_FIGSILK; }
    *mat = m;
    return d;
}
static float map_ballroom(V3 p, int *mat, int with_props)
{
    int m;
    float inner = sdBox2(p.x, p.z, BAL_HX, BAL_HZ);
    float outer = sdBox2(p.x, p.z, BAL_HX + 0.70f, BAL_HZ + 0.70f);
    float d = maxf(-inner, outer);
    m = (p.y < 0.185f) ? M_BASEBOARD : (p.y > 8.30f) ? M_MOLDING : M_DRAPE;

    /* velvet, floor to cornice, in bays between gilt pilasters */
    if (inner > -0.85f && p.y > 0.185f && p.y < 8.30f){
        float u = (fabsf(p.x)/BAL_HX > fabsf(p.z)/BAL_HZ) ? p.z : p.x;
        /* the folds of it */
        float fold = 0.055f + 0.048f*cosf(u*11.5f) + 0.020f*cosf(u*29.0f + 1.1f);
        fold *= 0.55f + 0.45f*smoothstepf(0.20f, 2.20f, p.y);
        /* pulled back into swags at the top */
        float swag = 0.10f*smoothstepf(7.10f, 8.20f, p.y)*(0.5f + 0.5f*cosf(u*4.2f));
        float dr = maxf(-inner, outer) - fold - swag;
        if (dr < d){ d = dr; m = M_DRAPE; }
        /* the pilasters, every four and a half metres */
        float pu = rep1(u, 4.55f);
        float pil = maxf(-inner, outer) - 0.145f;
        pil = maxf(pil, fabsf(pu) - 0.230f);
        if (pil < d){ d = pil; m = M_PILASTER; }
        float cap = maxf(-inner, outer) - 0.215f;
        cap = maxf(cap, fabsf(pu) - 0.290f);
        cap = maxf(cap, fabsf(p.y - 8.10f) - 0.235f);
        if (cap < d){ d = cap; m = M_PILASTER; }
        /* and a tall mirror in the middle of every second bay */
        float bu = repi(u, 4.55f);
        if (((int)bu & 1) == 0){
            float fr = maxf(-inner, outer) - 0.130f;
            fr = maxf(fr, fabsf(pu - 2.275f) - 0.780f);
            fr = maxf(fr, fabsf(p.y - 3.05f) - 2.30f);
            float gp = maxf(-inner, outer) - 0.080f;
            gp = maxf(gp, fabsf(pu - 2.275f) - 0.690f);
            gp = maxf(gp, fabsf(p.y - 3.05f) - 2.21f);
            if (fr < d){ d = fr; m = M_GILT; }
            if (gp < d){ d = gp; m = M_MIRROR; }
        }
    }
    if (!with_props){ *mat = m; return d; }
    int mm; float dd;
    /* three chandeliers, and they are not small */
    for (int i = 0; i < 3; i++){
        float cx = -8.60f + 8.60f*i;
        float sc = (i == 1) ? 2.75f : 2.15f;
        float lx = p.x - cx, lz = p.z;
        if (g_swing > 0.001f){
            float hy = BAL_H - p.y;
            lx -= g_swing*0.40f*sinf(g_time*2.05f + i*2.4f)*hy*0.20f;
            lz -= g_swing*0.36f*sinf(g_time*1.63f + i*1.3f)*hy*0.20f;
        }
        float oy = BAL_H - 1.04f*sc;
        float cap = sdCylY(v3(lx, p.y - (oy + 0.38f*sc), lz), 0.46f*sc, 0.74f*sc);
        if (cap < 1.60f){
            dd = prop_chandelier(v3(lx, p.y - oy, lz), sc, 10, &mm);
            if (dd < d){ d = dd; m = mm; }
        } else if (cap < d) d = cap;
    }
    if (g_fig_vis > 0.01f){
        dd = prop_figure(p, &mm);
        if (dd < d){ d = dd; m = mm; }
    }
    *mat = m;
    return d;
}

/* -------------------------------------------------------------- the stairwell
 * A helix that does not have a bottom. There is no floor plane in this scene,
 * which is the only reason it can keep going. */
#define ST_R    3.640f
#define ST_RISE 0.186f
#define ST_NS   17.0f        /* treads to a turn */
static float map_stair(V3 p, int *mat, int with_props)
{
    int m = M_CINDER;
    float r = len2f(p.x, p.z);
    /* the shaft */
    float d = ST_R - r;
    if (p.y > 3.10f){                   /* a lid on it, a long way up */
        float lid = p.y - 3.10f;
        if (lid < d){ d = lid; m = M_MALLCEIL; }
    }
    if (!with_props){ *mat = m; return d; }
    /* the newel */
    float nw = r - 0.300f;
    if (nw < d){ d = nw; m = M_MARBLE; }
    /* the treads, on the unrolled helix */
    float phi = atan2f(p.z, p.x);
    float pitch = ST_RISE*ST_NS;
    float w = floorf((p.y/pitch) - phi/(2.0f*PI) + 0.5f);
    float A = phi + 2.0f*PI*w;                       /* total angle travelled */
    float sect = 2.0f*PI/ST_NS;
    float i = floorf(A/sect + 0.5f);
    float ty = ST_RISE*i;
    float aoff = r*(A - i*sect);
    float half = r*sect*0.5f;
    if (r > 0.28f && r < 3.34f){
        float tr = fabsf(p.y - ty) - 0.032f;
        tr = maxf(tr, fabsf(aoff) - (half - 0.008f));
        tr = maxf(tr, r - 3.32f);
        tr = maxf(tr, 0.300f - r);
        if (tr < d){ d = tr; m = M_MARBLE; }
        /* the riser under the leading edge */
        float ri = fabsf(aoff - half) - 0.024f;
        ri = maxf(ri, fabsf(p.y - (ty - ST_RISE*0.5f)) - ST_RISE*0.5f);
        ri = maxf(ri, r - 3.32f);
        ri = maxf(ri, 0.300f - r);
        if (ri < d){ d = ri; m = M_MARBLE; }
    }
    /* the handrail, which is a real helix, and the balusters under it */
    {
        float ry = ST_RISE*(A/sect) + 0.955f;
        float hr = len2f(r - 3.170f, p.y - ry) - 0.044f;
        if (hr < d){ d = hr; m = M_HANDRAIL; }
        float bal = len2f(r - 3.170f, 0.0f);
        float bi = fabsf(aoff - half*0.0f);
        (void)bi;
        float bd = maxf(bal - 0.020f, fabsf(aoff) - 0.020f);
        bd = maxf(bd, p.y - ry);
        bd = maxf(bd, ty - 0.05f - p.y);
        if (bd < d){ d = bd; m = M_BRASS; }
    }
    *mat = m;
    return d;
}

/* -------------------------------------------------- lifts, and falling glass */
/* A lift lobby, in the wall's own frame. Some of the cars are not there, and
 * the doors do not wait to be called. */
static float prop_elevator(V3 L, int cx, int cz, int f, int *mat)
{
    int m = M_BRASSDULL;
    /* the surround */
    float sur = sdBox(v3(L.x, L.y - 1.180f, L.z - 0.030f), v3(0.760f, 1.230f, 0.030f));
    sur = maxf(sur, -sdBox(v3(L.x, L.y - 1.135f, L.z - 0.040f), v3(0.622f, 1.130f, 0.090f)));
    float d = sur;
    /* how far open, and when. Two in five surge as the lens goes past. */
    float ph = fh3(cx*3+f, cz*5, 17);
    float open = 0.0f;
    if (ph > 0.60f){
        float cyc = fmodf(g_time*0.62f + ph*9.0f, 4.30f);
        open = smoothstepf(0.00f, 0.34f, cyc)*(1.0f - smoothstepf(1.95f, 2.55f, cyc));
        open = powf(open, 0.55f);
    }
    /* the black behind them: no car, no shaft light, nothing */
    float vo = sdBox(v3(L.x, L.y - 1.135f, L.z - 0.006f), v3(0.620f, 1.128f, 0.008f));
    if (vo < d){ d = vo; m = M_ELEVVOID; }
    /* the two leaves */
    for (int s = -1; s <= 1; s += 2){
        float lf = sdBox(v3(L.x - s*(0.311f + open*0.315f), L.y - 1.135f, L.z - 0.026f),
                         v3(0.311f, 1.128f, 0.014f));
        if (lf < d){ d = lf; m = M_BRASSDULL; }
    }
    /* the sill, the call plate, the dial over the door */
    float sil = sdBox(v3(L.x, L.y - 0.014f, L.z - 0.040f), v3(0.640f, 0.014f, 0.040f));
    if (sil < d){ d = sil; m = M_BRASS; }
    float cp = sdBox(v3(L.x - 0.855f, L.y - 1.180f, L.z - 0.016f), v3(0.058f, 0.098f, 0.016f));
    if (cp < d){ d = cp; m = M_BRASS; }
    float dl = sdCylZ(v3(L.x, L.y - 2.520f, L.z - 0.028f), 0.135f, 0.028f);
    if (dl < d){ d = dl; m = M_CLOCKFACE; }
    *mat = m;
    return d;
}
/* the chandeliers letting go of their drops, a cell at a time */
static float corr_glass(V3 p, int *mat)
{
    if (g_glassfall <= 0.01f) return 1e9f;
    int px = WC(p.x), pz = WC(p.z);
    float best = 1e9f;
    for (int oz = -1; oz <= 1; oz++)
        for (int ox = -1; ox <= 1; ox++){
            int cx = px+ox, cz = pz+oz;
            if (solidg(&GC, cx, cz)) continue;
            float bx = CW((float)cx), bz = CW((float)cz);
            for (int i = 0; i < 3; i++){
                float sd0 = fh3(cx*13+i, cz*7, 5);
                if (sd0 > g_glassfall*0.85f + 0.10f) continue;
                float ox2 = (fh3(cx*5+i, cz*11, 3) - 0.5f)*(CELL - 0.5f);
                float oz2 = (fh3(cx*17+i, cz*3, 9) - 0.5f)*(CELL - 0.5f);
                float spd = 5.2f + 4.0f*fh3(cx*7, cz*19+i, 2);
                float fall = fmodf(g_time*spd + sd0*31.0f, CORR_H + 1.6f);
                float y = CORR_H - fall;
                V3 q = v3(p.x - (bx + ox2), p.y - y, p.z - (bz + oz2));
                float bsph = len3(q) - 0.145f;         /* the bound, so it cannot be skipped */
                if (bsph > 0.0f){ if (bsph < best) best = bsph; continue; }
                V3 r = rotY(rotX(q, g_time*7.3f + sd0*20.0f), g_time*5.1f + sd0*11.0f);
                float sh = sdBox(r, v3(0.014f, 0.052f, 0.010f));
                if (sh < best) best = sh;
            }
        }
    *mat = M_SHARD;
    return best;
}

/* --------------------------------------------------------------- the dispatch */
static V3 warp_p(V3 p)
{
    if (g_warp <= 0.001f) return p;
    float k = g_warp;
    float a = fbm3(v3(p.x*0.155f, p.y*0.215f, p.z*0.155f + g_time*0.23f), 3) - 0.5f;
    float b = fbm3(v3(p.z*0.175f + 5.0f, p.y*0.185f, p.x*0.175f - g_time*0.19f), 3) - 0.5f;
    float c = fbm3(v3(p.x*0.09f - 3.0f, p.z*0.11f, g_time*0.31f), 2) - 0.5f;
    return v3(p.x + k*(0.72f*a + 0.30f*c), p.y + k*0.34f*b, p.z + k*(0.72f*b - 0.28f*c));
}
static float map_scene_raw(V3 p, int *mat, int with_props)
{
    switch (g_scene){
        case SC_LOBBY: return map_lobby(p, mat, with_props);
        case SC_MALL:  return map_mall(p, mat, with_props);
        case SC_BALL:  return map_ballroom(p, mat, with_props);
        case SC_STAIR: return map_stair(p, mat, with_props);
        case SC_CORR:
        case SC_CHASE: {
            float d = map_corridor(p, mat, with_props);
            if (with_props == 1){
                int mm;
                float gd = corr_glass(p, &mm);
                if (gd < d){ d = gd; *mat = mm; }
                if (g_fig_vis > 0.01f){
                    float fd = prop_figure(p, &mm);
                    if (fd < d){ d = fd; *mat = mm; }
                }
            }
            return d;
        }
        default: *mat = M_NONE; return 1e9f;
    }
}
static float map_scene(V3 p, int *mat)
{
    if (g_warp > 0.001f)
        return map_scene_raw(warp_p(p), mat, 1) * (1.0f - 0.34f*satf(g_warp));
    return map_scene_raw(p, mat, 1);
}
static float map_dist(V3 p){ int m; return map_scene(p, &m); }
/* the operator's own collision, which does not care about the small stuff */
static float map_collide(V3 p)
{
    int m;
    /* 2: the furniture is solid, but the figure and the falling glass are not
     * allowed to shove the operator around */
    return map_scene_raw(p, &m, 2);
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
        float h = 0.02f + 0.13f*i;
        float d = map_dist(add(p, scl(n,h)));
        if (d > h) d = h;
        occ += (h - d)*sca;
        sca *= 0.72f;
    }
    return satf(1.0f - 1.35f*occ);
}
/* the floor and the ceiling are planes, so occlusion on them has to be asked for */
static float plane_ao(V3 p, float dir)
{
    float occ = 0.0f, sca = 1.0f;
    for (int i = 1; i <= 4; i++){
        float h = 0.05f + 0.26f*i;
        float d = map_dist(add(p, v3(0.0f, dir*h, 0.0f)));
        if (d > h) d = h;
        occ += (h - d)*sca;
        sca *= 0.70f;
    }
    return satf(1.0f - 1.25f*occ);
}

#endif /* HL_CORE_H */
