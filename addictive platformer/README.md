# Squeakborne

A pixel-art roguelite platformer about a mouse with a sewing needle and a grudge against the house cat.

**Play:** open `squeakborne.html` in any modern browser. It is a single standalone file with no external assets. All art is drawn by code and all sound and music are synthesized live. Keyboard only.

## Controls (default, rebindable in Options)

| Action | WASD preset | Arrows preset |
| --- | --- | --- |
| Move | A / D | Left / Right |
| Jump (double jump, wall jump) | Space | Z |
| Weapon 1 / Weapon 2 | J / K | X / C |
| Dodge roll (air dash in the air) | L or Shift | V or Shift |
| Skill 1 / Skill 2 | U / I | A / S |
| Eat cheese (heal) | Q | D |
| Interact | E | F |
| Squeak (taunt) | T | Q |
| Map / Pause | Tab / Esc | Tab / Esc |

Down + Jump in the air is a ground pound. Down + Jump on a wooden platform drops through it.

## What is in it

- Four biomes (Damp Cellar, Living Room, Kitchen, Cat Tree) built from hand-made room templates stitched into a new layout every run, with random tiles, enemies, loot, shops, cursed chests, ambush rooms and secret walls.
- Three bosses and a final boss: the Rat King (three rats in a trenchcoat), Vacuum-Tron 3000, Monsieur Roach, and Mittens the cat, who has nine lives.
- 30 weapons, shields and skills with rarities and random affixes, 18 quirks, stat snacks, parries, ground pounds, and enemy bowling.
- Persistent progress: bank crumbs with the Hoarder to unlock blueprints and permanent upgrades, collect 17 hats, and beat the cat to unlock harder Spice levels.
- Seeded runs, stats, full key rebinding, screen shake and flash settings.

A full run takes roughly 20 to 30 minutes. Dying sends you back to the mousehole in seconds.

## Building from source

The source lives in `src/` as plain JavaScript files. To rebuild the single HTML file:

```
node build.js
```

The build concatenates `src/*.js` into `src/template.html`, checks the bundle for syntax errors and writes `squeakborne.html`.
