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
});

const E = FL.EMISSIVE, G = FL.GLOSSY, W = FL.WATER, F = FL.FOLIAGE, N = FL.FLAT, T = FL.TINT;

// [name, hex, flags]
const TABLE = [
  // terrain surface
  ['GRASS', 0x648f3c, F], ['GRASS_LUSH', 0x4a8032, F], ['GRASS_DRY', 0x9a9c50, F], ['MEADOW', 0x7f9f46, F],
  ['FOREST_FLOOR', 0x3b5a2a, F], ['PINE_FLOOR', 0x34502f, F], ['DIRT', 0x7a5a3c, 0], ['DIRT_DARK', 0x5b4530, 0],
  ['MUD', 0x4d3b2b, 0], ['SAND', 0xd8c48b, 0], ['SAND_WET', 0xb9a574, 0], ['GRAVEL', 0x8d8a82, 0],
  ['ROCK', 0x7a7772, 0], ['ROCK_DARK', 0x5b5955, 0], ['ROCK_WARM', 0x8a7560, 0], ['SNOW', 0xf2f4f6, 0],
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
  ['SIDING_WHITE', 0xe9e6de, 0], ['SIDING_BLUE', 0x6f8ea6, 0], ['SIDING_GREEN', 0x7d9a78, 0], ['SIDING_YELLOW', 0xd9c07a, 0],
  ['SIDING_RED', 0xa8574a, 0], ['SIDING_GRAY', 0x9aa0a4, 0], ['MARBLE', 0xe4e2dc, G], ['GRANITE', 0x5f5d5b, G],
  // glass
  ['GLASS_TEAL', 0x4f8a92, G | N], ['GLASS_DARK', 0x2c4650, G | N], ['GLASS_SLATE', 0x3e5560, G | N], ['GLASS_CLEAR', 0x8fb2b8, G | N],
  ['GLASS_BRONZE', 0x6a5a48, G | N], ['GLASS_GREEN', 0x4a7a6a, G | N], ['GLASS_BLEND_DARK', 0x66808a, N], ['GLASS_BLEND_LIGHT', 0x9aa9ac, N],
  ['WINDOW_LIT', 0xffd48a, E | N], ['WINDOW_LIT_COOL', 0xd8e6f2, E | N], ['WINDOW_LIT_DIM', 0xd8a45c, E | N],
  // roofs
  ['ROOF_TERRACOTTA', 0xb0552f, 0], ['ROOF_SLATE', 0x4b4f57, 0], ['ROOF_SHINGLE_BROWN', 0x5a4436, 0], ['ROOF_SHINGLE_GRAY', 0x6a6c70, 0],
  ['ROOF_TIN', 0xa9adb0, G], ['ROOF_TIN_RUST', 0xa3623c, 0], ['ROOF_COPPER', 0x6aa596, 0], ['ROOF_FLAT', 0x4a4a4a, 0],
  ['ROOF_GRAVEL', 0x6d6a66, 0], ['ROOF_GREEN', 0x5f7f52, 0], ['ROOF_RED_METAL', 0x8f3a2e, G], ['ROOF_BLACK', 0x2c2d30, 0],
  // wood and paint
  ['WOOD_LIGHT', 0xb98f5e, 0], ['WOOD_MID', 0x8a643c, 0], ['WOOD_DARK', 0x5b4028, 0], ['WOOD_WEATHERED', 0x8c8478, 0],
  ['PAINT_BARN_RED', 0x8f2f24, 0], ['PAINT_WHITE', 0xece7dc, 0], ['PAINT_YELLOW', 0xd9b64a, 0], ['PAINT_GREEN', 0x5d7f4e, 0],
  ['PAINT_ORANGE', 0xd9772b, 0], ['PAINT_BLUEGRAY', 0x6c7b86, 0], ['TARP_BLUE', 0x3b6ea5, 0], ['TARP_ORANGE', 0xd6791f, 0],
  ['RUST', 0x8a4b2d, 0], ['RUST_DARK', 0x5f3522, 0], ['HAY', 0xd1b25a, F], ['TIRE', 0x1c1c1e, N],
  // foliage
  ['LEAF_PINE', 0x2d5a34, F], ['LEAF_PINE_L', 0x3b6f3f, F], ['LEAF_OAK', 0x4b7f34, F], ['LEAF_OAK_L', 0x62963f, F],
  ['LEAF_BIRCH', 0x7fae45, F], ['LEAF_AUTUMN', 0xc1782b, F], ['LEAF_PALM', 0x3f8a3a, F], ['TRUNK', 0x5b4127, 0],
  ['TRUNK_BIRCH', 0xd8d4c8, 0], ['BUSH', 0x3f7532, F], ['FLOWER_RED', 0xc44536, F], ['FLOWER_YELLOW', 0xe0b83a, F],
  ['CACTUS', 0x5d8a4a, F], ['REED', 0x8a9a52, F],
  // lights
  ['LAMP_SODIUM', 0xffb760, E | N], ['LAMP_WHITE', 0xfff4dc, E | N], ['BEACON_RED', 0xff3b2f, E | N], ['RWY_LIGHT_WHITE', 0xfff6e0, E | N],
  ['RWY_LIGHT_GREEN', 0x3fd27a, E | N], ['RWY_LIGHT_RED', 0xff4b3a, E | N], ['RWY_LIGHT_AMBER', 0xffa630, E | N], ['SIGNAL_RED', 0xff2a1f, E | N],
  ['SIGNAL_AMBER', 0xffb020, E | N], ['SIGNAL_GREEN', 0x2fe07a, E | N], ['HEADLIGHT', 0xfff2c8, E | N], ['TAILLIGHT', 0xd21c1c, E | N],
  ['NEON_ORANGE', 0xff7a2a, E | N], ['NEON_WHITE', 0xf4f0e6, E | N],
  // vehicles (TINT ones take instance color)
  ['CAR_PAINT', 0xc8c8c8, T | G], ['CAR_BLACK', 0x1e1f22, G], ['CAR_GLASS', 0x2a3942, G | N], ['CAR_TRIM', 0x2b2c2f, 0],
  ['CAR_RED', 0xb42b26, G], ['CAR_WHITE', 0xe8e8e6, G], ['CAR_SILVER', 0xa3a7ab, G], ['CAR_TAXI', 0xe0b022, G],
  ['BUS_YELLOW', 0xe2ad1f, G], ['TRUCK_WHITE', 0xdcdcd6, G], ['TRAIN_SILVER', 0xb9bdc0, G], ['SHIP_HULL', 0x40454a, 0],
  ['SHIP_RED', 0x9a2f27, 0], ['SHIP_WHITE', 0xe4e2dc, 0], ['CONTAINER_RED', 0xa53a2c, 0], ['CONTAINER_BLUE', 0x38618a, 0],
  ['CONTAINER_GREEN', 0x3f7a55, 0], ['CONTAINER_ORANGE', 0xc9702a, 0], ['CONTAINER_GRAY', 0x8b9096, 0],
  // aircraft
  ['AC_WHITE', 0xeeeeea, G], ['AC_RED', 0xc0322a, G], ['AC_ORANGE', 0xe56b1f, G], ['AC_YELLOW', 0xe8b921, G],
  ['AC_GRAY_LIGHT', 0xa9aeb3, G], ['AC_GRAY', 0x7a8086, G], ['AC_GRAY_DARK', 0x4d5257, G], ['AC_OLIVE', 0x5a6240, 0],
  ['AC_DRAB', 0x6d6a4a, 0], ['AC_BLACK', 0x1d1d20, G], ['AC_METAL', 0xb9bec3, G], ['AC_CANOPY', 0x3d5560, G | N],
  ['AC_CREAM', 0xe6dcc0, G], ['AC_TEAL', 0x2e7d80, G], ['AC_PROP', 0x2a2a2c, 0], ['AC_PROP_TIP', 0xe2b324, N],
  ['AC_TIRE', 0x18181a, N], ['AC_HUB', 0xbfc3c6, G], ['AC_EXHAUST', 0x3a3532, 0], ['AC_GLOW', 0xff8a3d, E | N],
  ['NAV_RED', 0xff2a1f, E | N], ['NAV_GREEN', 0x2fe07a, E | N], ['STROBE', 0xffffff, E | N],
  ['COCKPIT_PANEL', 0x2a2c2e, 0], ['COCKPIT_TRIM', 0x3a3d40, 0], ['GAUGE_FACE', 0x101113, N], ['GAUGE_WHITE', 0xe8e6df, N],
  ['NEEDLE_ORANGE', 0xf26a1b, N], ['SEAT_LEATHER', 0x5b4636, 0], ['SEAT_FABRIC', 0x6d6e60, 0], ['CARPET', 0x4a4a45, 0],
  ['HUD_GLASS', 0x9ad6b4, G | N], ['SWITCH_RED', 0xc0322a, N], ['SWITCH_GRAY', 0x8f9498, N], ['PATCH_A', 0x8e6b3e, 0],
  ['PATCH_B', 0x9c9a6a, 0], ['PATCH_C', 0x7c8a64, 0], ['PATCH_D', 0xb0523a, 0], ['FABRIC_TAN', 0xc9b48a, 0],
  // military and misc
  ['MIL_OLIVE', 0x54593c, 0], ['MIL_TAN', 0xa89468, 0], ['MIL_GRAY', 0x6b7076, 0], ['MIL_CAMO_DARK', 0x3c4230, 0],
  ['MIL_CAMO_BROWN', 0x6a5a3a, 0], ['MIL_SAND_BAG', 0xb5a17a, 0], ['RADAR_WHITE', 0xe6e6e0, G], ['FENCE', 0x9aa0a6, N],
  ['SIGN_WHITE', 0xf0eee6, N], ['SIGN_GREEN', 0x2a6b4a, N], ['SIGN_RED', 0xb32a22, N], ['SIGN_YELLOW', 0xe8c02a, N],
  ['SIGN_BLACK', 0x1c1c1e, N], ['SOLAR_PANEL', 0x27384a, G], ['TANK_WHITE', 0xe2e0d8, G], ['TANK_GRAY', 0x9ea3a6, G],
  ['CHIMNEY_BRICK', 0x8a4a3a, 0], ['SMOKE_STACK_RED', 0xb23a2a, 0], ['BLADE_WHITE', 0xeeeeea, G],
  // aggregate tints for coarse LOD painting of urban areas
  ['URBAN_DENSE', 0x7d7a76, 0], ['URBAN_RESIDENTIAL', 0x8a7a68, 0], ['URBAN_INDUSTRIAL', 0x6d6d68, 0], ['URBAN_LOWRISE', 0x928878, 0],
  ['URBAN_GREEN', 0x6a8a48, F],
];

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
