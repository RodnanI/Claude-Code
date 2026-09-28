'use strict';
/* Small DOM, random and formatting helpers shared by every module. */

const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
  return n;
}

const SVGNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, ...kids) {
  const n = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  for (const c of kids.flat(Infinity)) if (c != null) n.append(c.nodeType ? c : String(c));
  return n;
}

const rand = n => Math.floor(Math.random() * n);
const pick = a => a[rand(a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function pickWeighted(items, weight) {
  let total = 0;
  const ws = items.map(it => { const w = Math.max(0, weight(it)); total += w; return w; });
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

const isLetter = c => c.toLowerCase() !== c.toUpperCase();
const isUpper = c => isLetter(c) && c === c.toUpperCase() && c !== c.toLowerCase();
const cap = w => w.charAt(0).toUpperCase() + w.slice(1);

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtClock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtDuration(ms) {
  if (ms < 60000) return Math.round(ms / 1000) + ' s';
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0');
}

/* Printable name for a character inside hint texts. */
function charName(c) {
  if (c === ' ') return t('spaceKey');
  return isLetter(c) && c.toUpperCase().length === 1 ? c.toUpperCase() : c;
}

/* replaceChildren that skips null/false (replaceChildren itself would print "null"). */
function put(el, ...kids) {
  el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
}

/* Keycap element used in footers and hints. */
const kbd = label => h('kbd', null, label);

function hintBar(items) {
  return h('div', { class: 'hints' }, items.filter(Boolean).map(([k, label]) => h('span', null, kbd(k), label)));
}
