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
