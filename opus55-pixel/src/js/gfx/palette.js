// ---------------------------------------------------------------------------
// Material ramps for characters: [outline, deep, shadow, mid, light, highlight].
// Warm ink-and-lacquer palette: rice paper whites, cinnabar, jade, old gold.
// ---------------------------------------------------------------------------
const RAMP = {
  skin:     ['#2e1711', '#6b3827', '#a15d42', '#d08f6a', '#ecba91', '#fbdcbc'],
  skinFair: ['#2f1813', '#724030', '#ab6c52', '#dba283', '#f3c9aa', '#fde6d2'],
  skinTan:  ['#221109', '#4d2615', '#7a4027', '#a55e3b', '#c77f55', '#e2a57a'],
  skinPale: ['#16201b', '#3b4a40', '#5f7466', '#869d8b', '#afc4ae', '#d6e3cf'],
  skinGold: ['#2a1804', '#664010', '#a0701c', '#d4a232', '#f0ca5a', '#fff2a8'],
  ink:      ['#070506', '#130f11', '#1f191b', '#2e2628', '#433839', '#5e504e'],
  hairGray: ['#26211e', '#4c4540', '#766e67', '#a1988e', '#cac2b6', '#eee8dd'],
  white:    ['#2a2520', '#5c544b', '#8f8578', '#c0b5a4', '#e3d9c7', '#f9f3e7'],
  crimson:  ['#1c0505', '#460c0d', '#761513', '#aa2119', '#d53823', '#f36a45'],
  cult:     ['#110304', '#290709', '#470e11', '#6a1718', '#8f2620', '#b5442e'],
  gold:     ['#271804', '#583709', '#8c5d15', '#c28c29', '#e7bb50', '#fbe89c'],
  steel:    ['#121418', '#34393f', '#5f676f', '#959ea5', '#c9d0d3', '#f6f9f9'],
  darkSteel:['#0b0c0e', '#1e2125', '#353a40', '#555c63', '#7c848a', '#aab1b5'],
  leather:  ['#170c06', '#352012', '#56341d', '#7b502b', '#9f6c3c', '#bf8c56'],
  wood:     ['#1b1008', '#3c2511', '#5f3f1d', '#86602d', '#aa8143', '#caa263'],
  jade:     ['#06190f', '#113c2c', '#1b5e46', '#29856a', '#49ae8b', '#8fd9b6'],
  celadon:  ['#1c2822', '#435a4b', '#698674', '#91ad97', '#b9d1b9', '#deeddb'],
  bone:     ['#28221a', '#58503f', '#887c65', '#b4a88d', '#d7ceb3', '#f3eedb'],
  bronze:   ['#1a1006', '#432b0d', '#6a4818', '#946926', '#bd903a', '#e0ba62'],
  saffron:  ['#2a1004', '#5b2a08', '#8f460d', '#c26515', '#e48a29', '#f7b658'],
  maroon:   ['#160507', '#330b10', '#541418', '#782025', '#9a3230', '#b95044'],
  earth:    ['#18100a', '#38281b', '#57402c', '#795b40', '#9a7956', '#ba9a76'],
  teal:     ['#050f10', '#0d2124', '#153437', '#1f4a4b', '#2c6663', '#44877f'],
  paper:    ['#372705', '#74540e', '#b1841a', '#dab02e', '#f1d05a', '#fcef9e'],
  fur:      ['#19110b', '#3b2b1f', '#5c4633', '#82664a', '#a68a67', '#c9ad8b'],
  blood:    ['#130203', '#380607', '#630b0c', '#921410', '#c02418', '#ea4829'],
  khaki:    ['#1e190f', '#433925', '#695a3b', '#8e7e53', '#b1a06d', '#d1c28c'],
  straw:    ['#231a0b', '#4e3c19', '#7a6129', '#a4863c', '#c9a955', '#e6ca7b'],
  charcoal: ['#0b0a0a', '#1a1818', '#2a2727', '#3d3939', '#565050', '#736b69'],
  glowRed:  ['#3a0404', '#8a0f0a', '#d4200f', '#ff4a26', '#ff8a5a', '#ffd0b0'],
  glowGold: ['#3a2604', '#8a5a0a', '#d49a18', '#ffcc3a', '#ffe68a', '#fffbe0'],
  glowJade: ['#04261a', '#0a5a3c', '#14a070', '#3ae0a0', '#8affd0', '#e0fff2'],
  pinkSilk: ['#2a0f14', '#5e2430', '#93404c', '#c2646c', '#e0918f', '#f6c3bb'],
  ivory:    ['#2c2820', '#5e584b', '#928a78', '#c2b9a3', '#e2dac5', '#f8f4e8'],
};

// Scene palettes used by tiles, backgrounds and props.
const PAL = {
  ink: '#0e0a09', paper: '#efe3c8', cinnabar: '#c23a22', gold: '#d6a53a', jade: '#3f8c6c',
  lacquer: '#8e1c16', lacquerDk: '#5a1210', roofTeal: '#2f5a55', roofTealDk: '#1b3634',
  stone: '#9a9384', stoneLt: '#c3bca9', stoneDk: '#5f5a50', moss: '#6f8a45', mossDk: '#465e2c',
};
