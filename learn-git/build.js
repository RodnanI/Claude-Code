#!/usr/bin/env node
/*
  Learn Git build script. Zero dependencies, just Node.

  It glues everything in src/ into ONE self-contained file:
    src/template.html      the page skeleton, with three placeholders
    src/styles/*.css       inlined into <style>, in filename order
    src/chapters/*.html    inlined into <main>, in filename order
    src/scripts/*.js       inlined into <script>, in filename order

  Usage:
    node build.js            build once  ->  dist/learn-git.html
    node build.js --watch    rebuild whenever something in src/ changes
*/
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const OUT_DIR = path.join(__dirname, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'learn-git.html');

function readSorted(dir, ext) {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .sort()
    .map((f) => ({ name: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

function build() {
  const started = Date.now();
  const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');

  const styles = readSorted(path.join(SRC, 'styles'), '.css');
  const chapters = readSorted(path.join(SRC, 'chapters'), '.html');
  const scripts = readSorted(path.join(SRC, 'scripts'), '.js');

  const css = styles.map((f) => `/* ---- ${f.name} ---- */\n${f.text}`).join('\n');
  const html = chapters.map((f) => `<!-- ---- ${f.name} ---- -->\n${f.text}`).join('\n');
  // A literal "</script" inside the JS would end the script tag early.
  const js = scripts
    .map((f) => `/* ---- ${f.name} ---- */\n${f.text}`)
    .join('\n;\n')
    .replace(/<\/script/gi, '<\\/script');

  // Function replacers, so "$&" and friends inside the content are left alone.
  const page = template
    .replace('/* @styles */', () => css)
    .replace('<!-- @chapters -->', () => html)
    .replace('/* @scripts */', () => js)
    .replace('@build-date', () => new Date().toISOString().slice(0, 10));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, page);

  const kb = (Buffer.byteLength(page) / 1024).toFixed(0);
  console.log(
    `built ${path.relative(process.cwd(), OUT_FILE)}  ` +
      `(${chapters.length} chapters, ${styles.length} stylesheets, ${scripts.length} scripts, ${kb} KB) ` +
      `in ${Date.now() - started} ms`
  );
}

build();

if (process.argv.includes('--watch')) {
  let timer = null;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { build(); } catch (err) { console.error('build failed:', err.message); }
    }, 80);
  };
  for (const dir of ['', 'styles', 'chapters', 'scripts']) {
    fs.watch(path.join(SRC, dir), rebuild);
  }
  console.log('watching src/ for changes (Ctrl+C to stop)');
}
