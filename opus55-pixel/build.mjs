// Build script: stitches the modular sources into one standalone HTML file.
//   node build.mjs          -> dist/returning-swallow.html
// Modules share one closure scope, so load order only matters for top-level
// statements. A syntax check runs before anything is written.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const outFile = join(root, 'dist', 'returning-swallow.html');

export const MODULES = [
  'core/util.js', 'core/input.js', 'core/audio.js', 'core/music.js',
  'gfx/palette.js', 'gfx/font.js', 'gfx/rig.js', 'gfx/weapons.js', 'gfx/heads.js',
  'gfx/costumes.js', 'gfx/poses.js', 'gfx/fx.js', 'gfx/ribbon.js', 'gfx/light.js',
  'gfx/paint.js', 'gfx/tiles.js', 'gfx/backgrounds.js', 'gfx/props.js', 'gfx/portraits.js',
  'world/tilemap.js', 'world/camera.js', 'world/levels.js',
  'entities/body.js', 'entities/platforms.js', 'entities/fighter.js', 'entities/moves.js', 'entities/player.js',
  'entities/enemies.js', 'entities/bosses.js', 'entities/projectiles.js', 'entities/pickups.js',
  'game/combat.js', 'game/dialogue.js', 'game/hud.js', 'game/story.js', 'game/scenes.js',
  'game/debug.js', 'game/main.js',
];

let js = "(() => {\n'use strict';\n";
const starts = [];
for (const m of MODULES) {
  const code = readFileSync(join(src, 'js', m), 'utf8');
  starts.push([js.split('\n').length, m]);
  js += `// ==== ${m} ====\n${code}\n`;
}
js += '})();\n';

try {
  new vm.Script(js, { filename: 'bundle.js' });
} catch (e) {
  const hit = /bundle\.js:(\d+)/.exec(e.stack || '');
  if (hit) {
    const ln = +hit[1];
    let mod = starts[0];
    for (const s of starts) if (s[0] <= ln) mod = s;
    console.error(`Syntax error in ${mod[1]} line ${ln - mod[0]}: ${e.message}`);
  } else console.error(e);
  process.exit(1);
}

const css = readFileSync(join(src, 'style.css'), 'utf8');
const html = readFileSync(join(src, 'index.html'), 'utf8')
  .replace('/*@CSS*/', () => css)
  .replace('/*@JS*/', () => js);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html);
console.log(`built ${outFile} (${(html.length / 1024).toFixed(1)} KB, ${MODULES.length} modules)`);
