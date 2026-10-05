# Fever Parlor

A pachinko roguelike set in a 1950s lacquer-and-brass parlor. Drop chrome balls through a felt board of brass pins, chase the Hot Peg, spin the FEVER reels, survive the boss rounds and break the House.

**Play:** open `fever-parlor.html` in any modern browser. It is one self-contained file (fonts, art, sound and music are all generated or embedded), works offline, and saves progress in the browser.

## How a run works

- Every ball scores **POINTS x MULT**. Pins add Points or Mult as the ball bounces through them, then the pocket it lands in multiplies the Mult.
- Beat the **quota** before your balls run out. Eight floors, three rounds each, the third is a **boss** that bends the rules.
- The glowing **Hot Peg** gives +3 Mult and moves each time one of your balls lands. Aim for it.
- Land in the red **FEVER** pocket (or fill the Heat gauge) to spin the reels. Two matching symbols trigger a **Reach**, three is a **jackpot**. Three sevens start **FEVER**: a rain of free balls with every pocket doubled.
- Between rounds you cash out (and can go **double or nothing**), then shop:
  - **Charms** (59) bend the rules, and their order matters: drag to reorder.
  - **Pins** (17 types) go on the board. Drop the same pin on itself to level it up.
  - **Balls** (13 types) replace balls in your bag.
  - **Tickets** are one-shot tricks, including scratch cards you actually scratch.
  - **Capsules** are a gacha machine: turn the crank, watch the wobble, pick one of three.
- Beat a boss and the House offers a permanent **voucher**.
- Meta progression: rank up to unlock new pins, balls, charms and cabinets; 30 achievements; collection book; daily seeded run with a streak; six stake levels; endless mode after floor 8.

## Controls

| Action | Mouse / keyboard | Touch |
| --- | --- | --- |
| Aim | move the mouse, or `A` / `D` | drag on the board |
| Drop | click, or `Space` | release |
| Nudge the cabinet | side buttons, or `Z` / `X` | bottom corner buttons |
| Use ticket | click it, or `1`-`4` | tap it |
| Cash out early | `C` | button |
| Game speed | `F` | Settings |
| Pause | `Esc` | Menu |

## Project layout

```
src/index.html      page skeleton with build placeholders
src/style.css       all styling
src/js/util.js      math, seeded RNG, number formatting
src/js/audio.js     synthesized sound effects and generative music (Web Audio)
src/js/art.js       procedural sprites, board, cabinet, icon set
src/js/data.js      pins, balls, charms, tickets, vouchers, bosses, cabinets, unlocks
src/js/fx.js        particles, floating text, shake, hit-stop, confetti
src/js/board.js     pin grid, fixed-step ball physics, board rendering
src/js/reels.js     slot reels with reach tiers, omens and near misses
src/js/meta.js      saving, ranks, unlocks, achievements, daily runs
src/js/run.js       game rules: rounds, scoring, shop, capsules, tickets
src/js/ui.js        HUD, shop, modals, menus
src/js/main.js      boot, game loop, input
src/fonts/          Bungee, Shrikhand, Barlow Condensed (SIL Open Font License, see LICENSE-*.txt)
build.js            bundles everything into fever-parlor.html
```

Rebuild after editing: `node build.js`
