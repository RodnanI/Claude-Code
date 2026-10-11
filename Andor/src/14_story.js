// ANDOR :: chapters, story, lore, credits.

const CHAPTERS = [
  { name: 'The Bazaar of Isfahan', epigraph: '"Esfahan nesf-e jahan." Isfahan is half the world. The other half is the road out of it.' },
  { name: 'The Sea of Dunes', epigraph: 'The desert is a sea without water, and every traveller is a ship that must not sink.' },
  { name: 'The Tomb of Khemet-Ra', epigraph: 'Whoever enters the house of the dead should leave as quietly as he came.' },
  { name: 'Andor, City of Brass', epigraph: 'Seek knowledge, even where the sand has swallowed the sky.' },
];

const RELIC_NAMES = [
  ['Astrolabe of the Shah', 'Astrolabe of the Sufi', 'Astrolabe of Biruni'],
  ['Scarab of the Nile', 'Scarab of the Oasis', 'Scarab of the Storm'],
  ['Idol of Dawn', 'Idol of Dusk', 'The Golden Face'],
  ['Eye of Thoth', 'Eye of Hermes', 'Eye of Idris'],
];

const STORY = {
  before: [
    {
      art: 'bazaar',
      pages: [
        'Isfahan, in the year 1037. A black fever moves through the city of domes, house by house, like a shadow at dusk.',
        'In the house of wisdom the old Hakim lies dying. He presses a map into your hands. "Andor," he whispers. "The City of Brass, swallowed by the sands. Beneath it lies the Emerald Tablet. Every cure the world has forgotten is written there."',
        '"Go, Idris. The vizier wants this map for himself, and his guards are already on the stair. Take the rooftops. Take the whip. Do not look back."',
      ],
    },
    {
      art: 'desert',
      pages: [
        'Beyond the city gates the caravan road thins to nothing and vanishes into the Sea of Dunes.',
        'The map promises a valley of kings on the far side, and a tomb that holds the second half of the way to Andor. It does not promise water.',
      ],
    },
    {
      art: 'desert',
      pages: [
        'Al-Aqrab lies still at last. Behind its nest, a stair of carved stone sinks into the sand.',
        'The Tomb of Khemet-Ra: the pharaoh who was given the Emerald knowledge and chose to keep it. Bring a light. Touch nothing golden.',
      ],
    },
    {
      art: 'andor',
      pages: [
        'The golden face fits the last empty seal on the map. The burial chamber shudders, the floor gives way, and you fall a very long way.',
        'You wake in a cavern lit green, where a city of brass still turns its gears for no one. Andor. At its heart, something enormous is waiting.',
      ],
    },
  ],
  ending: [
    'The Brass Djinn lowers its burning head. "Knowledge was never meant to be buried," it says, and the Emerald Tablet drifts down into your hands.',
    'Isfahan, in the spring. The fever breaks. Children play again in the shade of the great square.',
    'In the house of wisdom a new physician writes by lamplight, copying every cure, so that nothing is ever lost to the sands again.',
  ],
};

const CREDITS = [
  ['ANDOR', '#f4cf62'],
  ['THE SANDS REMEMBER'],
  [''],
  ['DESIGN, CODE, PIXELS AND MUSIC', '#dea12a'],
  ['made with Claude Code'],
  [''],
  ['EVERY SOUND IS SYNTHESISED', '#dea12a'],
  ['oud, qanun, ney, darbuka, riq, daf'],
  ['in maqam bayati, hijaz, saba, rast and nahawand'],
  [''],
  ['INSPIRED BY', '#dea12a'],
  ['the physicians of old Isfahan'],
  ['the tombs of the Nile'],
  ['and every adventurer who ever cracked a whip'],
  ['at a rolling boulder'],
  [''],
  ['THANK YOU FOR PLAYING', '#f4cf62'],
];

// Contextual hints: keyboard / touch / gamepad wording.
const HINTS = {
  move: ['ARROWS OR A D TO RUN.  SPACE OR Z TO JUMP', 'DRAG THE LEFT SIDE TO RUN.  TAP JUMP TO LEAP', 'STICK TO RUN.  A TO JUMP'],
  whip: ['X CRACKS THE WHIP.  POTS HIDE DINARS', 'TAP WHIP TO CRACK IT.  POTS HIDE DINARS', 'X CRACKS THE WHIP.  POTS HIDE DINARS'],
  awning: ['DROP ONTO THE AWNING TO BOUNCE.  HOLD JUMP TO SOAR', 'DROP ONTO THE AWNING.  HOLD JUMP TO SOAR', 'DROP ONTO THE AWNING.  HOLD A TO SOAR'],
  ring: ['JUMP, THEN X NEAR A GOLDEN RING TO SWING.  JUMP LETS GO', 'JUMP, THEN WHIP NEAR A GOLDEN RING.  JUMP LETS GO', 'JUMP, THEN X NEAR A GOLDEN RING.  A LETS GO'],
  walljump: ['PRESS INTO A WALL AND JUMP TO LEAP OFF IT', 'HOLD TOWARD A WALL AND JUMP TO LEAP OFF IT', 'HOLD TOWARD A WALL AND PRESS A TO LEAP OFF IT'],
  dash: ['IN THE AIR, C TUMBLES YOU FORWARD', 'IN THE AIR, TAP ROLL TO TUMBLE FARTHER', 'IN THE AIR, B TUMBLES YOU FORWARD'],
  hatch: ['THE HATCH IN THE ROOF IS THE WAY ON', 'THE HATCH IN THE ROOF IS THE WAY ON', 'THE HATCH IN THE ROOF IS THE WAY ON'],
  roll: ['C ROLLS YOU UNDER LOW GAPS, UNHARMED', 'TAP ROLL TO SLIP UNDER LOW GAPS', 'B ROLLS YOU UNDER LOW GAPS'],
  pogo: ['HOLD DOWN AND WHIP IN THE AIR TO BOUNCE OFF FOES', 'HOLD DOWN AND WHIP MIDAIR TO BOUNCE OFF FOES', 'HOLD DOWN AND X MIDAIR TO BOUNCE OFF FOES'],
  shield: ['BRASS TURNS THE WHIP.  STRIKE FROM ABOVE OR BEHIND', 'BRASS TURNS THE WHIP.  STRIKE FROM ABOVE OR BEHIND', 'BRASS TURNS THE WHIP.  STRIKE FROM ABOVE OR BEHIND'],
  duck: ['HOLD DOWN TO DUCK UNDER THE DARTS', 'DRAG DOWN TO DUCK UNDER THE DARTS', 'HOLD DOWN TO DUCK UNDER THE DARTS'],
  ledge: ['JUMP AT A LEDGE TO CATCH IT.  JUMP AGAIN TO CLIMB', 'JUMP AT A LEDGE TO CATCH IT.  JUMP AGAIN TO CLIMB', 'JUMP AT A LEDGE TO CATCH IT.  A TO CLIMB'],
  quicksand: ['QUICKSAND DRAGS YOU DOWN.  KEEP JUMPING', 'QUICKSAND DRAGS YOU DOWN.  KEEP JUMPING', 'QUICKSAND DRAGS YOU DOWN.  KEEP JUMPING'],
  idol: ['A GOLDEN FACE ON A PEDESTAL.  WHAT COULD GO WRONG?', 'A GOLDEN FACE ON A PEDESTAL.  WHAT COULD GO WRONG?', 'A GOLDEN FACE ON A PEDESTAL.  WHAT COULD GO WRONG?'],
};
function hintText(key) {
  const h = HINTS[key];
  if (!h) return key;
  return Input.touchMode ? h[1] : Input.usingPad ? h[2] : h[0];
}
