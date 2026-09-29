/* Global material palette. IDs are stable and append-only: never reorder, only add at the end of a group's
   block or at the very end. Id 0 is air. Colors are sRGB hex. Flags map straight to the vertex alpha byte
   (bits 2..7; bits 0..1 hold ambient occlusion). */

export const FL = Object.freeze({
  EMISSIVE: 4,
  GLOSSY: 8,
  WATER: 16,
  FOLIAGE: 32,
  FLAT: 64,   // no per-voxel variation
  TINT: 128,  // multiplied by the instance tint (car paint, leaf hue shift)
  ROUND: 2,   // foliage models: centred on their origin, drawn as a rounded crown with a spherical normal.
              // ground materials: forest floor, over which the shader draws a canopy of tree crowns far from the camera
});

const E = FL.EMISSIVE, G = FL.GLOSSY, W = FL.WATER, F = FL.FOLIAGE, N = FL.FLAT, T = FL.TINT, C = FL.ROUND;

// [name, hex, flags]
const TABLE = [
  // terrain surface
  ['GRASS', 0x648f3c, F], ['GRASS_LUSH', 0x4a8032, F], ['GRASS_DRY', 0x9a9c50, F], ['MEADOW', 0x7f9f46, F],
  ['FOREST_FLOOR', 0x3b5a2a, F | C], ['PINE_FLOOR', 0x34502f, F | C], ['DIRT', 0x7a5a3c, 0], ['DIRT_DARK', 0x5b4530, 0],
  ['SAND', 0xd8c48b, 0], ['SAND_WET', 0xb9a574, 0], ['GRAVEL', 0x8d8a82, 0],
  ['ROCK', 0x7a7772, 0], ['ROCK_DARK', 0x615e59, 0], ['ROCK_WARM', 0x8a7560, 0], ['SNOW', 0xf2f4f6, 0],
  ['ICE', 0xcfe2ea, G], ['ALPINE', 0x8c9a6a, F], ['SCREE', 0x9a948a, 0], ['MOSS', 0x5d7a3a, F],
  ['FARM_WHEAT', 0xc8b05a, F], ['FARM_GREEN', 0x5f9c40, F], ['FARM_PLOW', 0x6b4a32, 0], ['FARM_YELLOW', 0xd6b53a, F],
  ['FARM_STUBBLE', 0xb59d55, F], ['LAWN', 0x74a845, F], ['MOWN_STRIP', 0x8ab34e, F],
  // water (banded by depth) ; ids consecutive so depth math can index them
  ['WATER_0', 0x62c2b8, W | G], ['WATER_1', 0x45a9b0, W | G], ['WATER_2', 0x2f8ea3, W | G], ['WATER_3', 0x22738f, W | G],
  ['WATER_4', 0x185a7b, W | G], ['WATER_5', 0x10456a, W | G], ['WATER_LAKE', 0x3f8f9a, W | G], ['WATER_RIVER', 0x4a97a0, W | G],
  ['WATER_POOL', 0x58c0d0, W | G],
  // roads and pavement
  ['ASPHALT', 0x3a3b3e, 0], ['ASPHALT_WORN', 0x4a4b4c, 0], ['ROAD_LINE_W', 0xe9e6dc, N], ['ROAD_LINE_Y', 0xe2b53a, N],
  ['CONCRETE', 0x9c9a94, 0], ['CONCRETE_DARK', 0x7d7b77, 0], ['SIDEWALK', 0xa9a69d, 0], ['CURB', 0xb5b2a9, 0],
  ['RUNWAY', 0x2f3033, 0], ['RUNWAY_MARK', 0xf2efe6, N], ['TAXI_LINE', 0xe6c02e, N], ['APRON', 0xb3b0a8, 0],
  ['DIRT_ROAD', 0x8a6b46, 0], ['GRAVEL_ROAD', 0x9a927f, 0], ['PAVER', 0x9a7f6c, 0], ['PAVER_DARK', 0x6f5d52, 0],
  ['PARKING_LINE', 0xd8d6cf, N], ['BRIDGE_DECK', 0x6d6f72, 0], ['RAIL_BALLAST', 0x77726a, 0], ['RAIL', 0x5a4a3c, 0],
  // building walls
  ['BRICK_RED', 0x9a4a3a, 0], ['BRICK_BROWN', 0x7b5443, 0], ['BRICK_DARK', 0x5d3a30, 0], ['PLASTER_WHITE', 0xe5e0d3, 0],
  ['PLASTER_CREAM', 0xdcc9a1, 0], ['PLASTER_GRAY', 0xa8a49b, 0], ['PLASTER_TERRA', 0xc98a5a, 0], ['STONE_LIGHT', 0xbdb6a4, 0],
  ['STONE_DARK', 0x6d6a66, 0], ['CONCRETE_BLDG', 0xa5a29a, 0], ['CONCRETE_PANEL', 0xb9b6ad, 0], ['STEEL', 0x8c9096, 0],
  ['STEEL_DARK', 0x51555a, 0], ['STEEL_BRIGHT', 0xc3c8cc, G], ['CLADDING_GRAY', 0x7f858a, 0], ['CLADDING_SAND', 0xb5a68a, 0],
  ['SIDING_WHITE', 0xe9e6de, 0], ['SIDING_BLUE', 0x6f8ea6, 0], ['SIDING_GREEN', 0x7d9a78, 0], ['BOULDER', 0x8d8a84, C],
  ['SIDING_RED', 0xa8574a, 0], ['SIDING_GRAY', 0x9aa0a4, 0], ['GRANITE', 0x5f5d5b, G],
  // glass
  ['GLASS_TEAL', 0x4f8a92, G | N], ['GLASS_DARK', 0x2c4650, G | N], ['GLASS_SLATE', 0x3e5560, G | N], ['GLASS_CLEAR', 0x8fb2b8, G | N],
  ['GLASS_BRONZE', 0x6a5a48, G | N], ['GLASS_GREEN', 0x4a7a6a, G | N], ['GLASS_BLEND_DARK', 0x66808a, N], ['GLASS_BLEND_LIGHT', 0x9aa9ac, N],
  ['WINDOW_LIT', 0xffd48a, E | N], ['WINDOW_LIT_COOL', 0xd8e6f2, E | N], ['WINDOW_LIT_DIM', 0xd8a45c, E | N],
  // roofs
  ['ROOF_TERRACOTTA', 0xb0552f, 0], ['ROOF_SLATE', 0x4b4f57, 0], ['ROOF_SHINGLE_BROWN', 0x5a4436, 0], ['ROOF_SHINGLE_GRAY', 0x6a6c70, 0],
  ['ROOF_TIN', 0xa9adb0, G], ['ROOF_TIN_RUST', 0xa3623c, 0], ['ROOF_COPPER', 0x6aa596, 0], ['ROOF_FLAT', 0x4a4a4a, 0],
  ['ROOF_GRAVEL', 0x6d6a66, 0], ['ROOF_GREEN', 0x5f7f52, 0], ['ROOF_RED_METAL', 0x8f3a2e, G],
  // wood and paint
  ['WOOD_LIGHT', 0xb98f5e, 0], ['WOOD_MID', 0x8a643c, 0], ['WOOD_DARK', 0x5b4028, 0], ['WOOD_WEATHERED', 0x8c8478, 0],
  ['PAINT_BARN_RED', 0x8f2f24, 0], ['PAINT_WHITE', 0xece7dc, 0], ['PAINT_YELLOW', 0xd9b64a, 0], ['PAINT_GREEN', 0x5d7f4e, 0],
  ['PAINT_ORANGE', 0xd9772b, 0], ['PAINT_BLUEGRAY', 0x6c7b86, 0], ['TARP_BLUE', 0x3b6ea5, 0], ['TARP_ORANGE', 0xd6791f, 0],
  ['RUST', 0x8a4b2d, 0], ['RUST_DARK', 0x5f3522, 0], ['HAY', 0xd1b25a, F], ['TIRE', 0x1c1c1e, N],
  // foliage
  ['LEAF_PINE', 0x2d5a34, F | C], ['LEAF_PINE_L', 0x3b6f3f, F | C], ['LEAF_OAK', 0x4b7f34, F | C], ['LEAF_OAK_L', 0x62963f, F | C],
  ['LEAF_BIRCH', 0x7fae45, F | C], ['LEAF_AUTUMN', 0xc1782b, F | C], ['LEAF_PALM', 0x3f8a3a, F], ['TRUNK', 0x5b4127, 0],
  ['TRUNK_BIRCH', 0xd8d4c8, 0], ['BUSH', 0x3f7532, F | C], ['FLOWER_YELLOW', 0xe0b83a, F],
  // lights
  ['LAMP_SODIUM', 0xffb760, E | N], ['LAMP_WHITE', 0xfff4dc, E | N], ['BEACON_RED', 0xff3b2f, E | N], ['RWY_LIGHT_WHITE', 0xfff6e0, E | N],
  ['RWY_LIGHT_GREEN', 0x3fd27a, E | N], ['RWY_LIGHT_RED', 0xff4b3a, E | N], ['RWY_LIGHT_AMBER', 0xffa630, E | N], ['SIGNAL_RED', 0xff2a1f, E | N],
  ['SIGNAL_AMBER', 0xffb020, E | N], ['SIGNAL_GREEN', 0x2fe07a, E | N], ['HEADLIGHT', 0xfff2c8, E | N], ['TAILLIGHT', 0xd21c1c, E | N],
  ['NEON_ORANGE', 0xff7a2a, E | N], ['NEON_WHITE', 0xf4f0e6, E | N],
  // vehicles (TINT ones take instance color)
  ['CAR_PAINT', 0xc8c8c8, T | G], ['CAR_GLASS', 0x2a3942, G | N], ['CAR_TRIM', 0x2b2c2f, 0],
  ['SHIP_RED', 0x9a2f27, 0], ['SHIP_WHITE', 0xe4e2dc, 0], ['CONTAINER_RED', 0xa53a2c, 0], ['CONTAINER_BLUE', 0x38618a, 0],
  ['CONTAINER_GREEN', 0x3f7a55, 0], ['CONTAINER_ORANGE', 0xc9702a, 0], ['CONTAINER_GRAY', 0x8b9096, 0],
  // aircraft
  ['AC_WHITE', 0xeeeeea, G], ['AC_RED', 0xc0322a, G], ['AC_ORANGE', 0xe56b1f, G], ['AC_YELLOW', 0xe8b921, G],
  ['AC_GRAY_LIGHT', 0xa9aeb3, G], ['AC_GRAY', 0x7a8086, G], ['AC_GRAY_DARK', 0x4d5257, G], ['AC_OLIVE', 0x5a6240, 0],
  ['AC_DRAB', 0x6d6a4a, 0], ['AC_BLACK', 0x1d1d20, G], ['AC_METAL', 0xb9bec3, G], ['AC_CANOPY', 0x3d5560, G | N],
  ['AC_CREAM', 0xe6dcc0, G], ['AC_PROP', 0x2a2a2c, 0], ['AC_PROP_TIP', 0xe2b324, N],
  ['AC_TIRE', 0x18181a, N], ['AC_HUB', 0xbfc3c6, G], ['AC_EXHAUST', 0x3a3532, 0],
  ['NAV_RED', 0xff2a1f, E | N], ['NAV_GREEN', 0x2fe07a, E | N], ['STROBE', 0xffffff, E | N],
  ['COCKPIT_PANEL', 0x2a2c2e, 0], ['COCKPIT_TRIM', 0x3a3d40, 0], ['GAUGE_FACE', 0x101113, N], ['GAUGE_WHITE', 0xe8e6df, N],
  ['NEEDLE_ORANGE', 0xf26a1b, N], ['SEAT_LEATHER', 0x5b4636, 0], ['SEAT_FABRIC', 0x6d6e60, 0], ['CARPET', 0x4a4a45, 0],
  ['HUD_GLASS', 0x9ad6b4, G | N], ['SWITCH_RED', 0xc0322a, N], ['SWITCH_GRAY', 0x8f9498, N], ['PATCH_A', 0x8e6b3e, 0],
  ['PATCH_B', 0x9c9a6a, 0], ['PATCH_C', 0x7c8a64, 0], ['PATCH_D', 0xb0523a, 0], ['FABRIC_TAN', 0xc9b48a, 0],
  // military and misc
  ['MIL_OLIVE', 0x54593c, 0], ['MIL_TAN', 0xa89468, 0], ['MIL_GRAY', 0x6b7076, 0], ['MIL_CAMO_DARK', 0x3c4230, 0],
  ['MIL_SAND_BAG', 0xb5a17a, 0], ['RADAR_WHITE', 0xe6e6e0, G], ['FENCE', 0x9aa0a6, N],
  ['SIGN_GREEN', 0x2a6b4a, N], ['SIGN_RED', 0xb32a22, N], ['SIGN_YELLOW', 0xe8c02a, N],
  ['SOLAR_PANEL', 0x27384a, G], ['TANK_WHITE', 0xe2e0d8, G], ['TANK_GRAY', 0x9ea3a6, G],
  ['CHIMNEY_BRICK', 0x8a4a3a, 0], ['SMOKE_STACK_RED', 0xb23a2a, 0], ['BLADE_WHITE', 0xeeeeea, G],
  // aggregate tints for coarse LOD painting of urban areas
  ['URBAN_DENSE', 0x7d7a76, 0], ['URBAN_RESIDENTIAL', 0x8a7a68, 0], ['URBAN_INDUSTRIAL', 0x6d6d68, 0], ['URBAN_LOWRISE', 0x928878, 0],
  ['URBAN_GREEN', 0x6a8a48, F],
  // appended: crop rows and hedges
  ['FARM_WHEAT_B', 0xb8a04e, F], ['FARM_GREEN_B', 0x54903a, F], ['FARM_PLOW_B', 0x5a3d29, 0], ['FARM_YELLOW_B', 0xc6a532, F], ['FARM_STUBBLE_B', 0xa48c4a, F], ['HEDGE', 0x35592a, F],
  // appended: rock variety for cliff strata
  ['ROCK_PALE', 0x968f85, 0], ['ROCK_RED', 0x8b5a46, 0],
  // appended: asphalt that glows warm at night, painted in pools along lit streets at coarse detail
  ['ASPHALT_LIT', 0x3a3b3e, E],
  // appended: city palette. More glass tints, stone, dark metal, colored neon, a green roof
  ['GLASS_BLUE', 0x3b6ea5, G | N], ['GLASS_SILVER', 0x9fb0bb, G | N], ['PETAL', 0xf1ede3, T],
  ['LIMESTONE', 0xd6cdb6, 0], ['SANDSTONE', 0xc9ab80, 0], ['BLACK_METAL', 0x25272a, 0],
  ['NEON_RED', 0xff2e3a, E | N], ['NEON_CYAN', 0x35e6ff, E | N], ['NEON_MAGENTA', 0xff3fd0, E | N],
  ['GREEN_ROOF', 0x6f8f4e, F], ['STEAM', 0xe6ecef, F],
  // appended: animal coats that take the instance tint (cattle, horses, deer)
  ['FUR', 0xd9d3c6, T],
];

/* Procedural surface patterns. The fragment shader draws them in world space from the palette texture (rows 3 to 5), so a
   facade keeps the same windows, floors and brick courses at every level of detail and costs a handful of quads instead of
   thousands of window voxels. Flags combine: a wall with windows and brick courses is WIN | BRICK. */
export const PAT = Object.freeze({ WIN: 1, ARCH: 2, BRICK: 4, SIDING: 8, RIBS: 16, PANEL: 32, SEAM: 64, BLINK: 128 });

/* Facade materials. hex is the wall (or frame and spandrel) color, glass names the material whose color fills the windows.
   bay and floor are the world-space window grid in meters; win is [width, height, sill] as fractions of a bay and a floor;
   lit is the fraction of windows that glow at night; frame scales the wall color around each window (above 1 lightens, like
   stone dressings on brick), frameCm is that border's width, spandrel scales the wall between floors. v lists the colors of
   banks 1 to 3, so neighbouring buildings of one facade type do not look alike. */
const FACADE_DEFS = [
  // glass and steel towers
  { name: 'FAC_CURTAIN_TEAL', hex: 0xa9b3ba, pat: PAT.WIN, bay: 2.4, floor: 3.6, glass: 'GLASS_TEAL', win: [0.94, 0.84, 0.07], lit: 0.36, frame: 0.62, frameCm: 5, spandrel: 0.92, v: [0x8b969e, 0xc3c9cc, 0x6b7378] },
  { name: 'FAC_CURTAIN_DARK', hex: 0x2a2e33, pat: PAT.WIN, bay: 2.4, floor: 3.6, glass: 'GLASS_DARK', win: [0.94, 0.84, 0.07], lit: 0.32, frame: 0.7, frameCm: 5, spandrel: 0.85, v: [0x3a3f45, 0x1d2024, 0x4a4238] },
  { name: 'FAC_CURTAIN_BLUE', hex: 0xb4bdc4, pat: PAT.WIN, bay: 3.6, floor: 3.6, glass: 'GLASS_BLUE', win: [0.95, 0.86, 0.06], lit: 0.34, frame: 0.55, frameCm: 5, spandrel: 0.9, v: [0x9ca7b0, 0xd0d4d6, 0x7c858c] },
  { name: 'FAC_CURTAIN_BRONZE', hex: 0x5a4c40, pat: PAT.WIN, bay: 2.4, floor: 3.6, glass: 'GLASS_BRONZE', win: [0.94, 0.85, 0.07], lit: 0.36, frame: 0.7, frameCm: 5, spandrel: 0.85, v: [0x6d5b4a, 0x453c34, 0x7a6a58] },
  { name: 'FAC_CURTAIN_SILVER', hex: 0xc5ccd2, pat: PAT.WIN, bay: 3.6, floor: 3.6, glass: 'GLASS_SILVER', win: [0.96, 0.86, 0.06], lit: 0.3, frame: 0.75, frameCm: 4, spandrel: 0.95, v: [0xdfe3e6, 0xa5adb3, 0xb8b0a0] },
  { name: 'FAC_CURTAIN_GREEN', hex: 0x8a9a92, pat: PAT.WIN, bay: 2.4, floor: 3.6, glass: 'GLASS_GREEN', win: [0.94, 0.84, 0.07], lit: 0.34, frame: 0.65, frameCm: 5, spandrel: 0.9, v: [0x9aa89f, 0x6f7b75, 0xa9a58f] },
  { name: 'FAC_RIBBON_WHITE', hex: 0xe6e4de, pat: PAT.WIN, bay: 4.8, floor: 3.6, glass: 'GLASS_DARK', win: [0.97, 0.56, 0.22], lit: 0.3, frame: 0.72, frameCm: 4, spandrel: 1.0, v: [0xd9d6cc, 0xefe9dc, 0xc8ccd0] },
  { name: 'FAC_RIBBON_DARK', hex: 0x3a3d42, pat: PAT.WIN, bay: 4.8, floor: 3.6, glass: 'GLASS_TEAL', win: [0.97, 0.58, 0.2], lit: 0.3, frame: 0.8, frameCm: 4, spandrel: 1.0, v: [0x4a4e54, 0x2a2c30, 0x50463c] },
  { name: 'FAC_RIBBON_STONE', hex: 0xcfc5b0, pat: PAT.WIN, bay: 4.8, floor: 3.6, glass: 'GLASS_SLATE', win: [0.96, 0.6, 0.2], lit: 0.3, frame: 0.7, frameCm: 4, spandrel: 1.0, v: [0xbfb49c, 0xd9d0bd, 0xb6b0a6] },
  // stone, deco and modernist
  { name: 'FAC_PIER_LIME', hex: 0xd6cdb6, pat: PAT.WIN, bay: 4.8, floor: 3.6, glass: 'GLASS_SLATE', win: [0.36, 0.66, 0.16], lit: 0.34, frame: 0.82, frameCm: 8, spandrel: 0.72, v: [0xc9bea4, 0xe0d8c4, 0xb9b3a6] },
  { name: 'FAC_PIER_DARK', hex: 0x56504c, pat: PAT.WIN, bay: 4.8, floor: 3.6, glass: 'GLASS_BRONZE', win: [0.34, 0.66, 0.16], lit: 0.34, frame: 0.75, frameCm: 8, spandrel: 0.7, v: [0x6a625c, 0x403c3a, 0x5c5048] },
  { name: 'FAC_PUNCH_SAND', hex: 0xc9ab80, pat: PAT.WIN, bay: 3.6, floor: 3.6, glass: 'GLASS_SLATE', win: [0.44, 0.52, 0.22], lit: 0.3, frame: 0.78, frameCm: 10, spandrel: 0.86, v: [0xb99a72, 0xd8bf9a, 0xa8907a] },
  { name: 'FAC_GRID_CONCRETE', hex: 0xa9a6a0, pat: PAT.WIN | PAT.PANEL, bay: 3.6, floor: 3.6, glass: 'GLASS_DARK', win: [0.62, 0.56, 0.22], lit: 0.28, frame: 0.72, frameCm: 12, spandrel: 0.9, v: [0x94918c, 0xb8b4ac, 0x8c8f92] },
  { name: 'FAC_GRID_WHITE', hex: 0xeceae4, pat: PAT.WIN, bay: 3.6, floor: 3.6, glass: 'GLASS_BLUE', win: [0.7, 0.6, 0.2], lit: 0.3, frame: 0.8, frameCm: 8, spandrel: 0.96, v: [0xe0ddd2, 0xf3efe6, 0xd6dbe0] },
  // brick, plaster and siding for mid-rise, low-rise and houses
  { name: 'FAC_BRICK_RED', hex: 0x9a4a3a, pat: PAT.WIN | PAT.BRICK, bay: 3.6, floor: 3.6, glass: 'GLASS_SLATE', win: [0.42, 0.5, 0.28], lit: 0.28, frame: 1.5, frameCm: 14, spandrel: 1.0, vari: 0.1, v: [0x8f4536, 0xa9614a, 0x7d4a40] },
  { name: 'FAC_BRICK_BROWN', hex: 0x7b5443, pat: PAT.WIN | PAT.BRICK, bay: 3.6, floor: 3.6, glass: 'GLASS_SLATE', win: [0.42, 0.5, 0.28], lit: 0.28, frame: 1.55, frameCm: 14, spandrel: 1.0, vari: 0.1, v: [0x6d4a3b, 0x8c6350, 0x5d4a44] },
  { name: 'FAC_BRICK_DARK', hex: 0x5d3a30, pat: PAT.WIN | PAT.ARCH | PAT.BRICK, bay: 4.8, floor: 7.2, glass: 'GLASS_DARK', win: [0.6, 0.66, 0.14], lit: 0.3, frame: 1.6, frameCm: 16, spandrel: 1.0, vari: 0.1, v: [0x4d2f28, 0x6f4636, 0x4a3c3a] },
  { name: 'FAC_PLASTER_CREAM', hex: 0xdcc9a1, pat: PAT.WIN, bay: 3.6, floor: 3.6, glass: 'GLASS_SLATE', win: [0.4, 0.5, 0.28], lit: 0.26, frame: 1.15, frameCm: 12, spandrel: 1.0, v: [0xe3d3b0, 0xd0b98f, 0xc9c2a8] },
  { name: 'FAC_PLASTER_TERRA', hex: 0xc98a5a, pat: PAT.WIN | PAT.ARCH, bay: 3.6, floor: 3.6, glass: 'GLASS_SLATE', win: [0.38, 0.55, 0.2], lit: 0.26, frame: 1.2, frameCm: 12, spandrel: 1.0, v: [0xd39a68, 0xb97a4c, 0xd9b48a] },
  { name: 'FAC_PLASTER_WHITE', hex: 0xe5e0d3, pat: PAT.WIN, bay: 3.6, floor: 3.6, glass: 'GLASS_CLEAR', win: [0.4, 0.5, 0.28], lit: 0.26, frame: 0.85, frameCm: 12, spandrel: 1.0, v: [0xd6dde4, 0xe6d9c6, 0xdce6d8] },
  { name: 'FAC_APT_RIBBON', hex: 0xb9b6ad, pat: PAT.WIN | PAT.PANEL, bay: 3.6, floor: 3.6, glass: 'GLASS_CLEAR', win: [0.86, 0.48, 0.3], lit: 0.32, frame: 0.7, frameCm: 6, spandrel: 0.92, v: [0xcdc3b0, 0xa7adb0, 0xd7cfc4] },
  { name: 'FAC_SIDING_WHITE', hex: 0xe9e6de, pat: PAT.WIN | PAT.SIDING, bay: 3.6, floor: 3.6, glass: 'GLASS_CLEAR', win: [0.4, 0.48, 0.32], lit: 0.2, frame: 0.85, frameCm: 10, spandrel: 1.0, v: [0x6f8ea6, 0x7d9a78, 0xd9c07a] },
  { name: 'FAC_CORR_GRAY', hex: 0x9aa0a4, pat: PAT.RIBS, bay: 3.6, floor: 3.6, glass: 'GLASS_SLATE', win: [0, 0, 0], lit: 0, frame: 1, frameCm: 0, spandrel: 1.0, v: [0x8a929a, 0xb0b4b0, 0x7d8a92] },
  { name: 'FAC_CORR_TAN', hex: 0xb5a68a, pat: PAT.RIBS, bay: 3.6, floor: 3.6, glass: 'GLASS_SLATE', win: [0, 0, 0], lit: 0, frame: 1, frameCm: 0, spandrel: 1.0, v: [0xa7a99a, 0xb9b1a0, 0x9a8a72] },
];
for (const f of FACADE_DEFS) TABLE.push([f.name, f.hex, 0]);

/* Explicit bank colors for materials that are not facades (banks 1 to 3; bank 0 is the table color). Whatever is not
   listed here and is in BANK_AUTO gets a small hue, saturation and value shift, so every brick, plaster or siding
   building differs a little from its neighbours. */
const BANK_COLORS = {
  GLASS_TEAL: [0x4a7fa0, 0x4f9a86, 0x5d7f88], GLASS_DARK: [0x26384f, 0x2a4a45, 0x32363a], GLASS_SLATE: [0x44546c, 0x3e5a52, 0x4a5058],
  GLASS_CLEAR: [0x8ab0c4, 0x9ab8ae, 0xb0b8bc], GLASS_BRONZE: [0x7a6444, 0x5a5048, 0x6f5f52], GLASS_GREEN: [0x45806f, 0x3f7a80, 0x5a7a62],
  GLASS_BLUE: [0x3268a0, 0x4a7ab0, 0x3d5f86], GLASS_SILVER: [0x94a8b8, 0xb2bcc2, 0x8a9aa0],
};
/* Whole-tree color banks, picked per instance by the scatter: autumn, gold and a deep dark green for broadleaf crowns, blue spruce,
   olive and snow-dusted for conifers, and a pale birch, dark and weathered trunk. */
Object.assign(BANK_COLORS, {
  LEAF_OAK: [0xb4632a, 0xc8a13a, 0x34602a], LEAF_OAK_L: [0xd58a36, 0xe2c24c, 0x4b7534], LEAF_BIRCH: [0xe0a63e, 0xa9c852, 0xc48f36],
  LEAF_AUTUMN: [0xa8442a, 0xd09a30, 0x8a5a2a], LEAF_PINE: [0x2c5560, 0x4a5a2a, 0xc9d4d6], LEAF_PINE_L: [0x3a6a70, 0x5f6e33, 0xdfe6e8],
  TRUNK: [0xd8d4c8, 0x3a2f26, 0x8c8478], BUSH: [0x5b7a30, 0x8a7a2e, 0x2f5a3a],
  BOULDER: [0x8a7560, 0x5b5955, 0xb9b3a4],
  MEADOW: [0xb9a95c, 0x5c9a3a, 0x9bb04c], GRASS_DRY: [0xb09a52, 0x8a9a48, 0xa48c4c],
  // ground: the terrain picks a bank per patch, so a meadow is not one green and a forest floor not one brown
  GRASS: [0x4f8a34, 0x86a03e, 0x6e9a48], GRASS_LUSH: [0x3c7a2c, 0x5b9636, 0x477a3e],
  FOREST_FLOOR: [0x2f4d24, 0x4a5a2c, 0x3d6030], PINE_FLOOR: [0x2b4529, 0x3c4d30, 0x2f5236],
  DIRT: [0x8a6a44, 0x6b4f36, 0x92704c], SAND: [0xe0cf9a, 0xcbb47c, 0xd8bc86], ALPINE: [0x7d8f60, 0x9aa672, 0x8a8c62],
  ROCK: [0x86807a, 0x6f6e6c, 0x8a7c6c], ROCK_WARM: [0x9a8066, 0x7a6a58, 0x8a7a68],
  FARM_WHEAT: [0xd0b862, 0xbda350, 0xcfc070], FARM_GREEN: [0x66a844, 0x559a3a, 0x72b04e], FARM_YELLOW: [0xdcc046, 0xc9a534, 0xe0c85a],
  FARM_STUBBLE: [0xbca55e, 0xa8934c, 0xc4ae68], FARM_PLOW: [0x77543a, 0x62442f, 0x6b4a32],
  FARM_WHEAT_B: [0xc0a856, 0xae9548, 0xbfb064], FARM_GREEN_B: [0x5a9c3a, 0x4c8c34, 0x66a248], FARM_YELLOW_B: [0xcdb03c, 0xb99a2e, 0xd0b850],
  FARM_STUBBLE_B: [0xaa944e, 0x98833f, 0xb29c5a], FARM_PLOW_B: [0x674834, 0x553b29, 0x5e412d],
});
const BANK_AUTO = ['BRICK_RED', 'BRICK_BROWN', 'BRICK_DARK', 'PLASTER_WHITE', 'PLASTER_CREAM', 'PLASTER_GRAY', 'PLASTER_TERRA', 'STONE_LIGHT', 'CONCRETE_BLDG',
  'CONCRETE_PANEL', 'CLADDING_GRAY', 'CLADDING_SAND', 'SIDING_WHITE', 'SIDING_BLUE', 'SIDING_GREEN', 'SIDING_RED', 'SIDING_GRAY', 'ROOF_TERRACOTTA',
  'ROOF_SLATE', 'ROOF_SHINGLE_BROWN', 'ROOF_SHINGLE_GRAY', 'ROOF_GREEN', 'PAINT_BARN_RED', 'PAINT_YELLOW', 'PAINT_GREEN', 'PAINT_ORANGE', 'PAINT_BLUEGRAY',
  'LIMESTONE', 'SANDSTONE', 'PAVER', 'PAVER_DARK', 'LEAF_OAK', 'LEAF_OAK_L'];
const BANK_SHIFT = [[8, 1.06, 0.96], [-10, 0.9, 1.06], [3, 0.72, 0.88]];

export const M = {};
export const MATERIAL_COUNT = TABLE.length + 1;
if (MATERIAL_COUNT > 256) throw new Error('palette exceeds 255 materials');

export const PALETTE_RGB = new Uint8Array(256 * 3);
export const PALETTE_FLAGS = new Uint8Array(256);
export const MATERIAL_NAMES = ['AIR'];

TABLE.forEach(([name, hex, flags], i) => {
  const id = i + 1;
  M[name] = id;
  MATERIAL_NAMES[id] = name;
  PALETTE_RGB[id * 3] = (hex >> 16) & 255;
  PALETTE_RGB[id * 3 + 1] = (hex >> 8) & 255;
  PALETTE_RGB[id * 3 + 2] = hex & 255;
  PALETTE_FLAGS[id] = flags;
});
Object.freeze(M);

/* Physically based properties per material. Defaults come from flags; overrides by name:
   [roughness, metallic, emissiveIntensity, translucency, variation, emissiveColorHex] (any may be null to keep the default;
   the emissive color defaults to the albedo). */
const OVERRIDES = {
  STEEL: [0.42, 1], STEEL_DARK: [0.5, 0.85], STEEL_BRIGHT: [0.16, 1], AC_METAL: [0.24, 1], ROOF_TIN: [0.38, 0.95], ROOF_RED_METAL: [0.42, 0.7],
  FENCE: [0.5, 0.9], RADAR_WHITE: [0.35, 0], TANK_WHITE: [0.4, 0.4], TANK_GRAY: [0.4, 0.7],
  GRANITE: [0.3, 0], ICE: [0.08, 0], SNOW: [0.55, 0, null, 0.3, 0.05], SAND: [0.95, 0, null, null, 0.1], SAND_WET: [0.55, 0, null, null, 0.1],
  LIMESTONE: [0.8, 0, null, null, 0.1], SANDSTONE: [0.85, 0, null, null, 0.1], BLACK_METAL: [0.38, 0.8], GREEN_ROOF: [0.92, 0, null, 0.3, 0.22], STEAM: [0.96, 0, null, 0.6, 0.3],
  NEON_RED: [0.3, 0, 4.5], NEON_CYAN: [0.3, 0, 4.5], NEON_MAGENTA: [0.3, 0, 4.5],
  ASPHALT: [0.78, 0, null, null, 0.1], ASPHALT_WORN: [0.86, 0, null, null, 0.12], RUNWAY: [0.72, 0, null, null, 0.08], CONCRETE: [0.82, 0], APRON: [0.8, 0],
  WINDOW_LIT: [0.2, 0, 2.6], WINDOW_LIT_COOL: [0.2, 0, 2.6], WINDOW_LIT_DIM: [0.2, 0, 1.8], LAMP_SODIUM: [0.4, 0, 9], LAMP_WHITE: [0.4, 0, 9],
  BEACON_RED: [0.4, 0, 9], RWY_LIGHT_WHITE: [0.4, 0, 10], RWY_LIGHT_GREEN: [0.4, 0, 10], RWY_LIGHT_RED: [0.4, 0, 10], RWY_LIGHT_AMBER: [0.4, 0, 10],
  ASPHALT_LIT: [0.78, 0, 1.6, null, 0.1, 0xffb060],
  SIGNAL_RED: [0.4, 0, 3.2], SIGNAL_AMBER: [0.4, 0, 3.2], SIGNAL_GREEN: [0.4, 0, 3.2], HEADLIGHT: [0.2, 0, 14], TAILLIGHT: [0.3, 0, 6],
  NEON_ORANGE: [0.3, 0, 4.5], NEON_WHITE: [0.3, 0, 4.5], NAV_RED: [0.3, 0, 9], NAV_GREEN: [0.3, 0, 9], STROBE: [0.3, 0, 20],
  LEAF_PINE: [0.9, 0, null, 0.35], LEAF_PINE_L: [0.9, 0, null, 0.35], LEAF_OAK: [0.85, 0, null, 0.45], LEAF_OAK_L: [0.85, 0, null, 0.5],
  LEAF_BIRCH: [0.85, 0, null, 0.5], LEAF_AUTUMN: [0.85, 0, null, 0.5], LEAF_PALM: [0.7, 0, null, 0.45], BUSH: [0.9, 0, null, 0.4],
  GRASS: [0.94, 0, null, 0.22], GRASS_LUSH: [0.94, 0, null, 0.25], MEADOW: [0.94, 0, null, 0.22],
  CAR_PAINT: [0.28, 0.15],
  AC_WHITE: [0.3, 0.2], AC_RED: [0.3, 0.2], AC_ORANGE: [0.3, 0.2], AC_YELLOW: [0.3, 0.2], AC_GRAY_LIGHT: [0.32, 0.4], AC_GRAY: [0.34, 0.45], AC_GRAY_DARK: [0.38, 0.4],
  AC_BLACK: [0.35, 0.2], AC_CREAM: [0.32, 0.15], HUD_GLASS: [0.04, 0], SOLAR_PANEL: [0.15, 0.3], GLASS_BLEND_DARK: [0.35, 0], GLASS_BLEND_LIGHT: [0.4, 0],
};

export const PALETTE_ROUGH = new Float32Array(256).fill(0.88);
export const PALETTE_METAL = new Float32Array(256);
export const PALETTE_EMIT = new Float32Array(256);
export const PALETTE_TRANS = new Float32Array(256);
export const PALETTE_VAR = new Float32Array(256).fill(0.16);
export const PALETTE_EMIT_RGB = new Uint8Array(PALETTE_RGB);
const EMIT_ALWAYS = new Set(['BEACON_RED', 'RWY_LIGHT_WHITE', 'RWY_LIGHT_GREEN', 'RWY_LIGHT_RED', 'RWY_LIGHT_AMBER', 'SIGNAL_RED', 'SIGNAL_AMBER', 'SIGNAL_GREEN', 'NAV_RED', 'NAV_GREEN', 'STROBE', 'HEADLIGHT', 'TAILLIGHT']);
for (let id = 1; id < MATERIAL_COUNT; id++) {
  const f = PALETTE_FLAGS[id];
  if (f & FL.GLOSSY) PALETTE_ROUGH[id] = 0.14;
  if (f & FL.FLAT) PALETTE_VAR[id] = 0;
  if (f & FL.FOLIAGE) { PALETTE_VAR[id] = 0.24; PALETTE_TRANS[id] = 0.3; }
  if (f & FL.EMISSIVE) PALETTE_EMIT[id] = 4;
  const o = OVERRIDES[MATERIAL_NAMES[id]];
  if (o) {
    if (o[0] != null) PALETTE_ROUGH[id] = o[0];
    if (o[1] != null) PALETTE_METAL[id] = o[1];
    if (o[2] != null) PALETTE_EMIT[id] = o[2];
    if (o[3] != null) PALETTE_TRANS[id] = o[3];
    if (o[4] != null) PALETTE_VAR[id] = o[4];
    if (o[5] != null) { PALETTE_EMIT_RGB[id * 3] = (o[5] >> 16) & 255; PALETTE_EMIT_RGB[id * 3 + 1] = (o[5] >> 8) & 255; PALETTE_EMIT_RGB[id * 3 + 2] = o[5] & 255; }
  }
}

/* Pattern rows. A = pattern flags, bay * 8, floor * 16, glass material. B = lit fraction, window width, height and sill
   (fractions). C = frame tone / 127.5, frame width in cm, spandrel tone / 127.5, spare. */
export const PALETTE_ROWS = 9;
const PAT_A = new Uint8Array(256 * 4), PAT_B = new Uint8Array(256 * 4), PAT_C = new Uint8Array(256 * 4);
/** Grid of each facade material in meters, so kits can keep footprints and floors on the same grid the shader draws. */
export const FACADE_INFO = {};
const q8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
const facadeByName = {};
for (const f of FACADE_DEFS) {
  const id = M[f.name];
  facadeByName[f.name] = f;
  PALETTE_ROUGH[id] = f.rough ?? 0.72;
  PALETTE_VAR[id] = f.vari ?? 0.05;
  PAT_A.set([f.pat, q8(f.bay * 8), q8(f.floor * 16), M[f.glass]], id * 4);
  PAT_B.set([q8(f.lit * 255), q8(f.win[0] * 255), q8(f.win[1] * 255), q8(f.win[2] * 255)], id * 4);
  PAT_C.set([q8(f.frame * 127.5), q8(f.frameCm), q8(f.spandrel * 127.5), 0], id * 4);
  FACADE_INFO[id] = Object.freeze({ bay: f.bay, floor: f.floor, pat: f.pat, win: f.win });
}
Object.freeze(FACADE_INFO);
PAT_A[M.BEACON_RED * 4] = PAT.BLINK;
/* Canopy parameters of forest ground live in row 3 (no pattern bits, so the facade code never looks at them): g is the crown
   size in 1/32 of the texture scale, b is 0 for broadleaf and 255 for conifer. */
PAT_A[M.FOREST_FLOOR * 4 + 1] = 32;
PAT_A[M.PINE_FLOOR * 4 + 1] = 21; PAT_A[M.PINE_FLOOR * 4 + 2] = 255;

const hexRgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
function shiftHsv(rgb, [dh, ds, dv]) {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-6) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + dh + 360) % 360;
  const s = Math.min(1, (mx > 0 ? d / mx : 0) * ds), v = Math.min(1, mx * dv);
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [rr, gg, bb] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [q8((rr + m) * 255), q8((gg + m) * 255), q8((bb + m) * 255)];
}

/** Albedo of each material in banks 1 to 3, three bytes per entry (bank 0 is PALETTE_RGB). A structure picks one bank for
    all its faces, so a street of brick or plaster buildings is not one color. */
export const PALETTE_BANK_RGB = new Uint8Array(3 * 256 * 3);
for (let id = 1; id < MATERIAL_COUNT; id++) {
  const name = MATERIAL_NAMES[id];
  for (let b = 1; b <= 3; b++) {
    let rgb = [PALETTE_RGB[id * 3], PALETTE_RGB[id * 3 + 1], PALETTE_RGB[id * 3 + 2]];
    if (facadeByName[name]) rgb = hexRgb(facadeByName[name].v[b - 1]);
    else if (BANK_COLORS[name]) rgb = hexRgb(BANK_COLORS[name][b - 1]);
    else if (BANK_AUTO.includes(name)) rgb = shiftHsv(rgb, BANK_SHIFT[b - 1]);
    PALETTE_BANK_RGB.set(rgb, ((b - 1) * 256 + id) * 3);
  }
}

/** RGBA8 texels for the 256x9 palette texture. Row 0: albedo + roughness. Row 1: emissive + intensity/24.
    Row 2: metallic, variation, translucency, flags (bit 0 = emission ignores night). Rows 3 to 5: surface pattern
    parameters. Rows 6 to 8: albedo + roughness of banks 1 to 3. */
export function buildPaletteTexels() {
  const t = new Uint8Array(256 * PALETTE_ROWS * 4);
  for (let id = 0; id < 256; id++) {
    const o0 = id * 4, o1 = (256 + id) * 4, o2 = (512 + id) * 4;
    t[o0] = PALETTE_RGB[id * 3]; t[o0 + 1] = PALETTE_RGB[id * 3 + 1]; t[o0 + 2] = PALETTE_RGB[id * 3 + 2]; t[o0 + 3] = Math.round(PALETTE_ROUGH[id] * 255);
    const em = PALETTE_EMIT[id] > 0;
    t[o1] = em ? PALETTE_EMIT_RGB[id * 3] : 0; t[o1 + 1] = em ? PALETTE_EMIT_RGB[id * 3 + 1] : 0; t[o1 + 2] = em ? PALETTE_EMIT_RGB[id * 3 + 2] : 0;
    t[o1 + 3] = Math.round(Math.min(1, PALETTE_EMIT[id] / 24) * 255);
    t[o2] = Math.round(PALETTE_METAL[id] * 255); t[o2 + 1] = Math.round(Math.min(1, PALETTE_VAR[id] / 0.5) * 255);
    t[o2 + 2] = Math.round(PALETTE_TRANS[id] * 255);
    t[o2 + 3] = PALETTE_FLAGS[id] | (EMIT_ALWAYS.has(MATERIAL_NAMES[id]) ? 1 : 0);
    for (let k = 0; k < 4; k++) {
      t[(768 + id) * 4 + k] = PAT_A[id * 4 + k];
      t[(1024 + id) * 4 + k] = PAT_B[id * 4 + k];
      t[(1280 + id) * 4 + k] = PAT_C[id * 4 + k];
    }
    for (let b = 0; b < 3; b++) {
      const o = ((6 + b) * 256 + id) * 4, s = (b * 256 + id) * 3;
      t[o] = PALETTE_BANK_RGB[s]; t[o + 1] = PALETTE_BANK_RGB[s + 1]; t[o + 2] = PALETTE_BANK_RGB[s + 2]; t[o + 3] = t[o0 + 3];
    }
  }
  return t;
}

export const materialName = (id) => MATERIAL_NAMES[id] || 'UNKNOWN';
export const isWaterMat = (id) => (PALETTE_FLAGS[id] & FL.WATER) !== 0;
export const isEmissiveMat = (id) => (PALETTE_FLAGS[id] & FL.EMISSIVE) !== 0;

/** Water material by depth below sea level in meters (positive number). */
export function waterMatForDepth(depth) {
  if (depth < 1.5) return M.WATER_0;
  if (depth < 4) return M.WATER_1;
  if (depth < 10) return M.WATER_2;
  if (depth < 24) return M.WATER_3;
  if (depth < 55) return M.WATER_4;
  return M.WATER_5;
}

/** Linear-ish blend of two materials' colors, snapped to the nearest existing entry (used for LOD tints). */
export function nearestMaterial(r, g, b, pool) {
  let best = 1, bd = Infinity;
  const ids = pool || null;
  const consider = (id) => {
    const dr = PALETTE_RGB[id * 3] - r, dg = PALETTE_RGB[id * 3 + 1] - g, db = PALETTE_RGB[id * 3 + 2] - b;
    const d = dr * dr + dg * dg + db * db;
    if (d < bd) { bd = d; best = id; }
  };
  if (ids) ids.forEach(consider);
  else for (let id = 1; id < MATERIAL_COUNT; id++) consider(id);
  return best;
}
