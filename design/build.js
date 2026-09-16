// Generates every SVG for the Farhan7-tech profile README and the repo README banners.
//
//   npm install
//   npm run build                    -> profile images into ../assets
//   node build.js --repos <dir>      -> <dir>/<repo>/banner.svg + footer.svg for every repo
//
// Design language: glass "double-bezel" surfaces, asymmetric bento, staggered fade-up motion.
// Each project owns a theme (palette + surface + visual). The personal frame (hero, headings,
// toolkit, footer) uses the personal theme; YUSR AI content uses the YUSR brand.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const subsetFont = require('subset-font');

const FS = path.join(__dirname, 'node_modules', '@fontsource');
const FONTS = {
  s300: { fam: 'Geist', w: 300, style: 'normal', file: `${FS}/geist-sans/files/geist-sans-latin-300-normal` },
  s400: { fam: 'Geist', w: 400, style: 'normal', file: `${FS}/geist-sans/files/geist-sans-latin-400-normal` },
  s500: { fam: 'Geist', w: 500, style: 'normal', file: `${FS}/geist-sans/files/geist-sans-latin-500-normal` },
  s600: { fam: 'Geist', w: 600, style: 'normal', file: `${FS}/geist-sans/files/geist-sans-latin-600-normal` },
  m400: { fam: 'GeistMono', w: 400, style: 'normal', file: `${FS}/geist-mono/files/geist-mono-latin-400-normal` },
  m500: { fam: 'GeistMono', w: 500, style: 'normal', file: `${FS}/geist-mono/files/geist-mono-latin-500-normal` },
  serif: { fam: 'ISerif', w: 400, style: 'italic', file: `${FS}/instrument-serif/files/instrument-serif-latin-400-italic` },
};
for (const f of Object.values(FONTS)) { f.ot = opentype.loadSync(f.file + '.woff'); f.chars = new Set(); }

const EASE = 'cubic-bezier(0.32,0.72,0,1)';
const SPLINE = '0.32 0.72 0 1';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const measure = (str, font, size, ls = 0) => FONTS[font].ot.getAdvanceWidth(str, size, { kerning: true }) + ls * Math.max(0, [...str].length - 1);
let UID = 0;
const uid = (p = 'u') => `${p}${(UID++).toString(36)}`;
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ============================================================
// THEMES
// ============================================================
const THEMES = {
  personal: { dark: true, base: '#050505', core: ['#0C0C0F', '#060607'], ink: '#FFFFFF', accent: '#34D399', grad: ['#6EE7B7', '#34D399', '#22D3EE'], grad2: ['#C4B5FD', '#818CF8'] },
  yusr: { dark: true, base: '#070605', core: ['#0E0B09', '#070605'], ink: '#F4EEE2', accent: '#D85A30', grad: ['#F0A07E', '#D85A30', '#B8441F'], grad2: ['#F4EEE2', '#CDB9A0'] },
  snapbuy: { dark: false, base: '#F3F0E8', core: ['#FBFAF6', '#EDE9DF'], ink: '#0F0F0F', accent: '#FF3B30', lime: '#D4FF3A', grad: ['#0F0F0F', '#0F0F0F'], grad2: ['#FF3B30', '#FF7A45'] },
  skylink: { dark: true, base: '#030712', core: ['#0C1D3F', '#030712'], ink: '#E0F2FE', accent: '#67E8F9', grad: ['#A5F3FC', '#38BDF8', '#818CF8'], grad2: ['#E0F2FE', '#7DD3FC'] },
  holo: { dark: true, base: '#08060F', core: ['#110C1F', '#07050D'], ink: '#F5F3FF', accent: '#C084FC', grad: ['#60A5FA', '#C084FC', '#F472B6'], grad2: ['#F5F3FF', '#DDD6FE'] },
  phosphor: { dark: true, base: '#010402', core: ['#04140C', '#010402'], ink: '#D1FAE5', accent: '#4ADE80', grad: ['#BBF7D0', '#4ADE80'], grad2: ['#86EFAC', '#22C55E'] },
  challenge: { dark: true, base: '#040919', core: ['#0A1638', '#040919'], ink: '#EEF2FF', accent: '#5B8CFF', grad: ['#A5C1FF', '#5B8CFF', '#3A5BFF'], grad2: ['#EEF2FF', '#C7D6FF'] },
  diary: { dark: false, base: '#FBF6EC', core: ['#FFFBF3', '#F6EEDD'], ink: '#2A1F14', accent: '#EA580C', grad: ['#F97316', '#EA580C', '#16A34A'], grad2: ['#F97316', '#16A34A'] },
  java: { dark: true, base: '#0B0806', core: ['#17110C', '#0B0806'], ink: '#F5EDE3', accent: '#F89820', grad: ['#FCC77B', '#F89820', '#E76F00'], grad2: ['#9CC3DE', '#5382A1'] },
};

// ============================================================
// DOCUMENT
// ============================================================
class Doc {
  constructor(name, W, H, t) {
    Object.assign(this, { name, W, H, t, used: new Set(), body: [], defs: [], css: [], ids: new Set() });
  }
  get ink() { return this.t.ink; }
  add(s) { this.body.push(s); return this; }
  def(s) { this.defs.push(s); return this; }
  style(s) { this.css.push(s); return this; }
  text(x, y, str, o = {}) {
    const key = o.font || 's400', F = FONTS[key];
    this.used.add(key);
    for (const ch of str) F.chars.add(ch);
    const a = [`x="${+x.toFixed(2)}" y="${+y.toFixed(2)}"`, `font-family="${F.fam}" font-weight="${F.w}"`, F.style === 'italic' ? 'font-style="italic"' : '',
      `font-size="${o.size || 16}"`, o.ls ? `letter-spacing="${+o.ls.toFixed(2)}"` : '', `fill="${o.fill || this.ink}"`,
      o.op != null ? `fill-opacity="${o.op}"` : '', o.anchor ? `text-anchor="${o.anchor}"` : ''].filter(Boolean).join(' ');
    return `<text ${a}>${esc(str)}</text>`;
  }
  async render() {
    const faces = [...this.used].map((k) => { const F = FONTS[k]; return `@font-face{font-family:'${F.fam}';font-weight:${F.w};font-style:${F.style};src:url(data:font/woff2;base64,${F.b64}) format('woff2')}`; });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.W}" height="${this.H}" viewBox="0 0 ${this.W} ${this.H}" fill="none">
<defs>${this.defs.join('\n')}</defs>
<style><![CDATA[
${faces.join('\n')}
text{text-rendering:geometricPrecision}
.r{animation:rise 1.15s ${EASE} backwards}
@keyframes rise{from{opacity:0;transform:translateY(26px);filter:blur(10px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ${EASE} infinite}
@keyframes pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(3.2);opacity:0}}
.nudge{animation:nudge 3.6s ${EASE} infinite}
@keyframes nudge{0%,62%,100%{transform:translate(0,0)}74%{transform:translate(3px,-3px)}}
.pop{transform-box:fill-box;transform-origin:center;animation:pop .9s ${EASE} backwards}
@keyframes pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
.blink{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
${this.css.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
]]></style>
${this.body.join('\n')}
</svg>`;
  }
}
const rise = (s, inner) => `<g class="r" style="animation-delay:${s.toFixed(2)}s">${inner}</g>`;
const pop = (s, inner) => `<g class="pop" style="animation-delay:${s.toFixed(2)}s">${inner}</g>`;

// ============================================================
// THEMED PRIMITIVES (every primitive takes the theme it paints with)
// ============================================================
// Registers gradients/filters for a theme under a prefix; returns the id map.
function paint(d, t, p) {
  const key = `paint-${p}`;
  const ids = { core: `${p}core`, hl: `${p}hl`, acc: `${p}acc`, acc2: `${p}acc2`, h1: `${p}h1`, shadow: `${p}shadow` };
  if (d.ids.has(key)) return ids;
  d.ids.add(key);
  const stops = (arr) => arr.map((c, i) => `<stop offset="${arr.length === 1 ? 0 : i / (arr.length - 1)}" stop-color="${c}"/>`).join('');
  d.def(`<linearGradient id="${ids.core}" x1="0" y1="0" x2="0" y2="1">${stops(t.core)}</linearGradient>`);
  d.def(t.dark
    ? `<linearGradient id="${ids.hl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".22" stop-color="#fff" stop-opacity=".045"/><stop offset="1" stop-color="#fff" stop-opacity=".03"/></linearGradient>`
    : `<linearGradient id="${ids.hl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".3" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="${t.ink}" stop-opacity=".06"/></linearGradient>`);
  d.def(`<linearGradient id="${ids.acc}" x1="0" y1="0" x2="1" y2="1">${stops(t.grad)}</linearGradient>`);
  d.def(`<linearGradient id="${ids.acc2}" x1="0" y1="0" x2="1" y2="1">${stops(t.grad2)}</linearGradient>`);
  d.def(`<linearGradient id="${ids.h1}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.ink}"/><stop offset="1" stop-color="${t.ink}" stop-opacity="${t.dark ? 0.62 : 0.82}"/></linearGradient>`);
  d.def(`<filter id="${ids.shadow}" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#000" flood-opacity=".12"/></filter>`);
  if (!d.ids.has('grain')) { d.ids.add('grain'); d.def(`<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`); }
  return ids;
}

function bezel(d, t, p, x, y, w, h, r, o = {}) {
  const ids = paint(d, t, p), pad = o.pad ?? 7;
  const shellOp = t.dark ? 0.035 : 0.05, strokeOp = t.dark ? 0.085 : 0.09;
  const shell = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r}" fill="${t.dark ? '#fff' : t.ink}" fill-opacity="${shellOp}" stroke="${t.dark ? '#fff' : t.ink}" stroke-opacity="${strokeOp}"/>`;
  return `${!t.dark && o.shadow !== false ? `<g filter="url(#${ids.shadow})">${shell}</g>` : shell}
<rect x="${x + pad}" y="${y + pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" rx="${r - pad}" fill="${o.core || `url(#${ids.core})`}"/>
<rect x="${x + pad + 0.5}" y="${y + pad + 0.5}" width="${w - 2 * pad - 1}" height="${h - 2 * pad - 1}" rx="${r - pad - 0.5}" stroke="url(#${ids.hl})"/>`;
}

// A full slab: bezel + clipped orbs + grain + optional grid. Returns clip id.
function slab(d, t, p, x, y, w, h, r, o = {}) {
  const pad = o.pad ?? 8, clip = uid('clip');
  d.def(`<clipPath id="${clip}"><rect x="${x + pad}" y="${y + pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" rx="${r - pad}"/></clipPath>`);
  let s = bezel(d, t, p, x, y, w, h, r, { pad, core: o.core });
  if (o.under) s += `<g clip-path="url(#${clip})">${o.under}</g>`;
  if (o.orbs) s += orbs(d, o.orbs, clip);
  if (o.grid) s += gridLines(d, t, clip, x + pad, y + pad, w - 2 * pad, h - 2 * pad, o.grid);
  s += `<g clip-path="url(#${clip})"><rect x="${x + pad}" y="${y + pad}" width="${w - 2 * pad}" height="${h - 2 * pad}" filter="url(#grain)" opacity="${o.grain ?? (t.dark ? 0.065 : 0.045)}"${t.dark ? '' : ' style="mix-blend-mode:multiply"'}/></g>`;
  s += `<rect x="${x + pad + 0.5}" y="${y + pad + 0.5}" width="${w - 2 * pad - 1}" height="${h - 2 * pad - 1}" rx="${r - pad - 0.5}" stroke="url(#${paint(d, t, p).hl})"/>`;
  return [s, clip];
}

function orbs(d, list, clip) {
  return `<g clip-path="url(#${clip})">${list.map((o) => {
    const id = uid('orb');
    d.def(`<radialGradient id="${id}g"><stop offset="0" stop-color="${o.c}" stop-opacity="${o.a}"/><stop offset=".45" stop-color="${o.c}" stop-opacity="${o.a * 0.35}"/><stop offset="1" stop-color="${o.c}" stop-opacity="0"/></radialGradient>`);
    d.style(`.${id}{animation:${id}k ${o.t || 18}s cubic-bezier(0.37,0,0.63,1) infinite alternate}@keyframes ${id}k{from{transform:translate(0,0)}to{transform:translate(${o.dx ?? 40}px,${o.dy ?? -30}px)}}`);
    return `<g class="${id}"><circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="url(#${id}g)"/></g>`;
  }).join('')}</g>`;
}

function gridLines(d, t, clip, x, y, w, h, step = 72) {
  const m = uid('gm');
  d.def(`<radialGradient id="${m}g" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${m}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${m}g)"/></mask>`);
  let s = '';
  for (let gx = x + step; gx < x + w; gx += step) s += `<path d="M${gx} ${y}V${y + h}"/>`;
  for (let gy = y + step; gy < y + h; gy += step) s += `<path d="M${x} ${gy}H${x + w}"/>`;
  return `<g clip-path="url(#${clip})" mask="url(#${m})" stroke="${t.dark ? '#fff' : t.ink}" stroke-opacity="${t.dark ? 0.045 : 0.05}">${s}</g>`;
}

function eyebrow(d, t, x, y, label, o = {}) {
  const size = o.size || 12.5, ls = size * 0.2, dot = o.dot !== false;
  const tw = measure(label, 'm500', size, ls), h = size * 2.3, padL = dot ? size * 2.2 : size * 1.1, w = padL + tw + size * 1.1, cy = y + h / 2;
  const c = o.color || t.accent;
  let s = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="${t.ink}" fill-opacity="${t.dark ? 0.04 : 0.045}" stroke="${t.ink}" stroke-opacity="${t.dark ? 0.1 : 0.12}"/>`;
  if (dot) s += `<circle class="pulse" cx="${x + size * 1.15}" cy="${cy}" r="${size * 0.26}" fill="${c}"/><circle cx="${x + size * 1.15}" cy="${cy}" r="${size * 0.26}" fill="${c}"/>`;
  s += d.text(x + padL, cy + size * 0.36, label, { font: 'm500', size, ls, fill: t.ink, op: t.dark ? 0.62 : 0.66 });
  return [s, w, h];
}

function arrowDisc(d, t, cx, cy, r, o = {}) {
  const k = r * 0.3, ink = o.stroke || t.ink;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${o.fill || t.ink}" fill-opacity="${o.op ?? (t.dark ? 0.1 : 0.07)}"/>
<g class="nudge"><path d="M${cx - k} ${cy + k}L${cx + k} ${cy - k}M${cx - k * 0.55} ${cy - k}H${cx + k}V${cy + k * 0.55}" stroke="${ink}" stroke-width="${o.sw || 1.6}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function chipRow(d, t, x, y, labels, o = {}) {
  const size = o.size || 12, ls = size * 0.08;
  let cx = x, s = '';
  for (const l of labels) {
    const w = measure(l, 'm400', size, ls) + size * 2, h = size * 2.4;
    s += `<rect x="${cx + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="${t.ink}" fill-opacity="${t.dark ? 0.03 : 0.04}" stroke="${t.ink}" stroke-opacity="${t.dark ? 0.1 : 0.14}"/>` +
      d.text(cx + size, y + h / 2 + size * 0.36, l, { font: 'm400', size, ls, fill: t.ink, op: t.dark ? 0.68 : 0.72 });
    cx += w + 8;
  }
  return s;
}

const checkIcon = (x, y, c, sw = 1.8) => `<path d="M${x} ${y}l4 4 8-9" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;

// The real YUSR AI mark (brand favicon).
function yusrLogo(x, y, size) {
  const k = size / 200;
  return `<g transform="translate(${x} ${y}) scale(${k})"><rect width="200" height="200" rx="44" fill="#070605" stroke="#F4EEE2" stroke-opacity=".16" stroke-width="${1 / k}"/><g transform="translate(60 40)"><path d="M0 0L40 60L80 0" stroke="#F4EEE2" stroke-width="14" stroke-linecap="square"/><path d="M40 60V124" stroke="#F4EEE2" stroke-width="14" stroke-linecap="square"/><circle cx="40" cy="30" r="9" fill="#D85A30"/></g></g>`;
}

// Rolling odometer digits that settle on `value`.
function odometer(d, x, y, value, o) {
  const size = o.size, font = o.font || 's300', cell = measure('0', font, size) * 1.02, lh = size * 1.05;
  let s = '';
  [...String(value)].forEach((ch, i) => {
    const cx = x + i * cell;
    if (!/\d/.test(ch)) { s += d.text(cx, y, ch, { font, size, fill: o.fill }); return; }
    const n = 20 + Number(ch), id = uid('odo'), clip = uid('oc');
    d.def(`<clipPath id="${clip}"><rect x="${cx - 4}" y="${y - size * 0.86}" width="${cell + 8}" height="${size * 1.12}"/></clipPath>`);
    d.style(`.${id}{transform:translateY(-${(n * lh).toFixed(2)}px);animation:${id}k ${(1.6 + i * 0.35).toFixed(2)}s ${EASE} ${(o.delay || 0) + 0.1}s backwards}@keyframes ${id}k{from{transform:translateY(0)}}`);
    let col = '';
    for (let k = 0; k <= n; k++) col += d.text(cx + cell / 2, y + k * lh, String(k % 10), { font, size, fill: o.fill, anchor: 'middle' });
    s += `<g clip-path="url(#${clip})"><g class="${id}">${col}</g></g>`;
  });
  return s;
}

// SMIL helpers that stay hidden until their start time (no flash of the final state).
function revealWidth(from, to, delay, dur) {
  const total = delay + dur;
  return `<animate attributeName="width" values="${from};${from};${to}" keyTimes="0;${(delay / total).toFixed(4)};1" dur="${total}s" fill="freeze" calcMode="spline" keySplines="0 0 1 1;${SPLINE}"/>`;
}

// ============================================================
// VISUALS (local coordinates; wrap with translate/scale)
// ============================================================

// YUSR: WhatsApp chat with AI reply. Box 280 x 318.
function visYusrChat(d) {
  const t = THEMES.yusr, pw = 280, ph = 318;
  let out = rise(0.3, bezel(d, t, 'y', 0, 0, pw, ph, 30, { pad: 6, core: '#0D0A08' }) +
    `<circle cx="38" cy="38" r="13" fill="url(#yacc)"/>` + d.text(60, 35, 'Customer', { font: 's500', size: 14, fill: t.ink }) +
    d.text(60, 52, 'via WhatsApp', { font: 'm400', size: 10.5, op: 0.45, ls: 0.5, fill: t.ink }) + `<path d="M6 68H${pw - 6}" stroke="${t.ink}" stroke-opacity=".08"/>`);
  const bub = (bx, by, bw, bh, lines, out_, delay) => rise(delay, `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="15" fill="${out_ ? t.accent : t.ink}" fill-opacity="${out_ ? 0.16 : 0.06}" stroke="${out_ ? t.accent : t.ink}" stroke-opacity="${out_ ? 0.4 : 0.08}"/>` +
    lines.map((l, i) => d.text(bx + 14, by + 25 + i * 19, l, { font: 's400', size: 13.5, fill: t.ink, op: out_ ? 0.94 : 0.8 })).join(''));
  out += bub(18, 86, 190, 48, ['Any gold hoops', 'under Rs 20,000?'], false, 0.9);
  out += bub(62, 146, 200, 67, ['Yes! 3 styles in stock.', 'Sending the catalog', 'right now.'], true, 1.5);
  out += rise(2.05, `<rect x="62" y="224" width="200" height="58" rx="15" fill="${t.accent}" fill-opacity=".1" stroke="${t.accent}" stroke-opacity=".3"/>` + [0, 1, 2].map((i) => `<rect x="${74 + i * 60}" y="234" width="52" height="38" rx="9" fill="${t.ink}" fill-opacity="${0.07 + i * 0.03}"/>`).join(''));
  d.style(`.tdot{animation:tdot 1.3s ${EASE} infinite}@keyframes tdot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:.9;transform:translateY(-3px)}}`);
  out += rise(2.4, `<rect x="118" y="283" width="36" height="17" rx="8.5" fill="${t.accent}" fill-opacity=".14"/>` + d.text(136, 295.5, 'AI', { font: 'm500', size: 10, ls: 1.5, fill: t.accent, anchor: 'middle' }) +
    [0, 1, 2].map((i) => `<circle class="tdot" style="animation-delay:${i * 0.16}s" cx="${28 + i * 12}" cy="292" r="3.2" fill="${t.ink}"/>`).join(''));
  return out;
}

// YUSR website: browser mock. Box 320 x 300.
function visYusrBrowser(d) {
  const t = THEMES.yusr, W = 320, H = 300;
  let s = rise(0.3, bezel(d, t, 'y', 0, 0, W, H, 26, { pad: 6, core: '#0D0A08' }) +
    [0, 1, 2].map((i) => `<circle cx="${28 + i * 15}" cy="30" r="4.5" stroke="${t.ink}" stroke-opacity=".25"/>`).join('') +
    `<rect x="92" y="19" width="160" height="22" rx="11" fill="${t.ink}" fill-opacity=".06"/>` + d.text(172, 34.5, 'yusr.co.in', { font: 'm400', size: 11, fill: t.ink, op: 0.6, anchor: 'middle' }) +
    `<path d="M6 52H${W - 6}" stroke="${t.ink}" stroke-opacity=".08"/>`);
  s += rise(0.55, yusrLogo(24, 68, 26) + d.text(58, 86, 'YUSR AI', { font: 's600', size: 13, fill: t.ink }) +
    [0, 1, 2].map((i) => `<rect x="${150 + i * 34}" y="78" width="24" height="5" rx="2.5" fill="${t.ink}" fill-opacity=".22"/>`).join('') +
    `<rect x="252" y="70" width="46" height="22" rx="11" fill="${t.accent}"/>`);
  s += rise(0.8, d.text(24, 142, 'WhatsApp CRM,', { font: 's600', size: 27, ls: -1, fill: t.ink }));
  s += rise(0.95, d.text(24, 176, 'with a brain.', { font: 'serif', size: 32, fill: t.accent }));
  s += rise(1.1, `<rect x="24" y="192" width="220" height="6" rx="3" fill="${t.ink}" fill-opacity=".16"/><rect x="24" y="206" width="170" height="6" rx="3" fill="${t.ink}" fill-opacity=".16"/>`);
  s += rise(1.25, `<rect x="24" y="226" width="118" height="30" rx="15" fill="${t.accent}"/>` + d.text(83, 245.5, 'Book a demo', { font: 's500', size: 12.5, fill: t.ink, anchor: 'middle' }));
  const tape = 'TEAM INBOX  /  BROADCASTS  /  AI REPLIES  /  CATALOG  /  ';
  const tw = measure(tape, 'm400', 10.5, 1.5), clip = uid('tp');
  d.def(`<clipPath id="${clip}"><rect x="6" y="266" width="${W - 12}" height="28"/></clipPath>`);
  d.style(`.tape{animation:tape 14s linear infinite}@keyframes tape{from{transform:translateX(0)}to{transform:translateX(-${tw.toFixed(1)}px)}}`);
  s += `<path d="M6 266H${W - 6}" stroke="${t.ink}" stroke-opacity=".08"/><g clip-path="url(#${clip})"><g class="tape">${[0, 1, 2].map((i) => d.text(14 + i * tw, 284, tape, { font: 'm400', size: 10.5, ls: 1.5, fill: t.ink, op: 0.45 })).join('')}</g></g>`;
  return s;
}

// SnapBuy: product tiles + a receipt printing out, stamped PAID. Box 410 x 250.
function visSnapReceipt(d) {
  const t = THEMES.snapbuy;
  paint(d, t, 's');
  let s = '';
  const tile = (x, y, rot, price, shape, delay) => {
    let g = `<rect x="0" y="0" width="112" height="136" rx="18" fill="#FFFFFF" stroke="${t.ink}" stroke-opacity=".1" filter="url(#sshadow)"/>`;
    g += `<rect x="10" y="10" width="92" height="74" rx="11" fill="${shape.bg}"/>` + shape.draw;
    g += `<rect x="12" y="96" width="54" height="6" rx="3" fill="${t.ink}" fill-opacity=".18"/>` + d.text(12, 122, price, { font: 'm500', size: 13, fill: t.ink });
    g += `<circle cx="92" cy="117" r="9" fill="${t.ink}"/><path d="M88 117h8M92 113v8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot} 56 68)">${rise(delay, g)}</g>`;
  };
  s += tile(0, 58, -9, '$49', { bg: t.lime, draw: `<path d="M28 62c10-2 18-10 22-22l16 8c6 4 14 6 22 6v8H28z" fill="${t.ink}"/>` }, 0.35);
  s += tile(92, 40, 3, '$129', { bg: '#111', draw: `<path d="M34 58a22 22 0 0 1 44 0" stroke="${t.lime}" stroke-width="5" fill="none"/><rect x="28" y="54" width="12" height="18" rx="4" fill="${t.lime}"/><rect x="72" y="54" width="12" height="18" rx="4" fill="${t.lime}"/>` }, 0.5);
  s += tile(178, 70, 11, '$79', { bg: t.accent, draw: `<circle cx="56" cy="47" r="20" stroke="#fff" stroke-width="4"/><path d="M56 36v12l7 5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` }, 0.65);
  // printer + receipt
  const px = 286, py = 6, rw = 118;
  s += rise(0.8, `<rect x="${px - 8}" y="${py}" width="${rw + 16}" height="24" rx="12" fill="${t.ink}"/><rect x="${px}" y="${py + 10}" width="${rw}" height="4" rx="2" fill="#000"/><circle cx="${px + rw}" cy="${py + 12}" r="3" fill="${t.lime}"/>`);
  const clip = uid('rc'), rid = uid('rcpt');
  d.def(`<clipPath id="${clip}"><rect x="${px - 20}" y="${py + 13}" width="${rw + 40}" height="260"/></clipPath>`);
  d.style(`.${rid}{animation:${rid}k 2.2s cubic-bezier(0.22,1,0.36,1) 1s backwards}@keyframes ${rid}k{from{transform:translateY(-236px)}}`);
  let r = `<path d="M${px} ${py + 12}h${rw}v222l-9.8 6-9.8-6-9.8 6-9.8-6-9.8 6-9.8-6-9.8 6-9.8-6-9.8 6-9.8-6-9.8 6-9.8-6-9.8 6z" fill="#FFFFFF" stroke="${t.ink}" stroke-opacity=".1"/>`;
  r += d.text(px + rw / 2, py + 38, 'SNAPBUY', { font: 'm500', size: 11, ls: 3, fill: t.ink, anchor: 'middle' });
  r += d.text(px + rw / 2, py + 52, 'ORDER #1042', { font: 'm400', size: 8.5, ls: 1, fill: t.ink, op: 0.5, anchor: 'middle' });
  r += `<path d="M${px + 10} ${py + 62}h${rw - 20}" stroke="${t.ink}" stroke-opacity=".3" stroke-dasharray="2 3"/>`;
  [['Sneakers', '49.00'], ['Headphones', '129.00'], ['Watch', '79.00']].forEach(([a, b], i) => {
    r += d.text(px + 10, py + 80 + i * 16, a, { font: 'm400', size: 9.5, fill: t.ink, op: 0.8 }) + d.text(px + rw - 10, py + 80 + i * 16, b, { font: 'm400', size: 9.5, fill: t.ink, op: 0.8, anchor: 'end' });
  });
  r += `<path d="M${px + 10} ${py + 124}h${rw - 20}" stroke="${t.ink}" stroke-opacity=".3" stroke-dasharray="2 3"/>`;
  r += d.text(px + 10, py + 142, 'TOTAL', { font: 'm500', size: 10.5, ls: 1, fill: t.ink }) + d.text(px + rw - 10, py + 142, '$257.00', { font: 'm500', size: 10.5, fill: t.ink, anchor: 'end' });
  const bars = rng(7);
  let bx = px + 14;
  while (bx < px + rw - 16) { const w = 1 + Math.floor(bars() * 3); r += `<rect x="${bx}" y="${py + 158}" width="${w}" height="30" fill="${t.ink}"/>`; bx += w + 1 + Math.floor(bars() * 2); }
  r += d.text(px + rw / 2, py + 204, 'THANK YOU', { font: 'm400', size: 8.5, ls: 2, fill: t.ink, op: 0.5, anchor: 'middle' });
  s += `<g clip-path="url(#${clip})"><g class="${rid}">${r}</g></g>`;
  // PAID stamp
  s += `<g transform="translate(${px + rw / 2} ${py + 150}) rotate(-14)">${pop(3.1, `<rect x="-52" y="-22" width="104" height="44" rx="8" fill="${t.lime}" fill-opacity=".92" stroke="${t.ink}" stroke-width="2"/>` +
    d.text(0, 2, 'PAID', { font: 's600', size: 20, ls: 2, fill: t.ink, anchor: 'middle' }) + d.text(0, 15, 'VIA STRIPE', { font: 'm500', size: 7.5, ls: 1.6, fill: t.ink, anchor: 'middle' }))}</g>`;
  return s;
}

// SkyLink: orbit transfer + rolling six-digit code. Box 300 x 320.
function visSkyOrbit(d, o = {}) {
  const t = THEMES.skylink;
  paint(d, t, 'k');
  const cx = 150, cy = 130;
  let s = '';
  const ell = (rx, ry, rot, dur, dir, delay, op) => {
    const id = uid('orbit');
    d.style(`.${id}{transform-box:view-box;transform-origin:${cx}px ${cy}px}`);
    const p = `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
    return rise(delay, `<g transform="rotate(${rot} ${cx} ${cy})"><path d="${p}" stroke="${t.ink}" stroke-opacity="${op}" stroke-dasharray="1 5" stroke-linecap="round"/>` +
      `<circle r="4.5" fill="${t.accent}" opacity="0"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${p}" keyPoints="${dir > 0 ? '0;1' : '1;0'}" keyTimes="0;1" calcMode="linear"/><animate attributeName="opacity" values="0;1" dur="0.01s" begin="${delay + 0.6}s" fill="freeze"/></circle></g>`);
  };
  s += ell(138, 50, -16, 9, 1, 0.5, 0.28) + ell(96, 36, 22, 6.5, -1, 0.65, 0.22);
  s += rise(0.35, `<circle cx="${cx}" cy="${cy}" r="42" fill="${t.accent}" fill-opacity=".06" stroke="${t.accent}" stroke-opacity=".25"/><circle cx="${cx}" cy="${cy}" r="30" fill="#07142C" stroke="${t.ink}" stroke-opacity=".18"/>` +
    `<path d="M${cx - 9} ${cy - 12}h12l6 6v17h-18z" stroke="${t.accent}" stroke-width="1.5" stroke-linejoin="round"/><path d="M${cx + 3} ${cy - 12}v6h6" stroke="${t.accent}" stroke-width="1.5" stroke-linejoin="round"/>`);
  d.style(`.halo{transform-box:fill-box;transform-origin:center;animation:halo 3s ${EASE} infinite}@keyframes halo{0%{transform:scale(.8);opacity:.6}100%{transform:scale(1.9);opacity:0}}`);
  s += `<circle class="halo" cx="${cx}" cy="${cy}" r="42" stroke="${t.accent}" stroke-opacity=".5"/>`;
  s += d.text(cx, cy + 68, o.centerLabel || 'SHARED FILE', { font: 'm500', size: 9.5, ls: 2, fill: t.ink, op: 0.5, anchor: 'middle' });
  // code tiles
  const code = '482915', cw = 40, gap = 8, x0 = cx - (6 * cw + 5 * gap) / 2, y0 = 238;
  [...code].forEach((c, i) => {
    const x = x0 + i * (cw + gap);
    s += rise(0.9 + i * 0.06, `<rect x="${x + 0.5}" y="${y0 + 0.5}" width="${cw - 1}" height="55" rx="11" fill="${t.ink}" fill-opacity=".04" stroke="${t.ink}" stroke-opacity=".12"/><rect x="${x + 4}" y="${y0 + 4}" width="${cw - 8}" height="47" rx="8" fill="#06122A" stroke="${t.accent}" stroke-opacity="${i === 5 ? 0.7 : 0.16}"/><path d="M${x + 4} ${y0 + 27.5}h${cw - 8}" stroke="#000" stroke-opacity=".6"/>` +
      odometer(d, x + (cw - measure('0', 'm500', 24) * 1.02) / 2, y0 + 36, Number(c), { size: 24, font: 'm500', fill: t.ink, delay: 1.1 + i * 0.12 }));
  });
  return s;
}

// Starfield for night-sky surfaces.
function stars(d, t, x, y, w, h, n, seed) {
  const r = rng(seed);
  d.style(`.tw{animation:tw 4s cubic-bezier(0.37,0,0.63,1) infinite alternate}@keyframes tw{from{opacity:.15}to{opacity:.9}}`);
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle class="tw" style="animation-delay:-${(r() * 4).toFixed(2)}s;animation-duration:${(2.5 + r() * 4).toFixed(2)}s" cx="${(x + r() * w).toFixed(1)}" cy="${(y + r() * h).toFixed(1)}" r="${(0.5 + r() * 1.1).toFixed(2)}" fill="${t.ink}"/>`;
  return s;
}

// SkyLink P2P: request pipeline with packets. Box 320 x 320.
function visP2P(d) {
  const t = THEMES.skylink;
  paint(d, t, 'k');
  const nodes = [
    ['POST /upload', 'validate · rate-limit', 22],
    ['FileSharer', 'port 53817 · token 482915', 112],
    ['GET /download?token=', 'stream once', 202],
    ['cleanup', 'file, port, token freed', 282],
  ];
  let s = '';
  const px = 20, w = 280;
  s += rise(0.4, `<path id="p2pline" d="M160 58V282" stroke="${t.accent}" stroke-opacity=".3" stroke-dasharray="2 6" stroke-linecap="round"/>`);
  for (let i = 0; i < 3; i++) {
    s += `<circle r="4" fill="${t.accent}" opacity="0"><animateMotion dur="3s" begin="${1.8 + i}s" repeatCount="indefinite" path="M160 72V270" calcMode="spline" keyTimes="0;1" keySplines="${SPLINE}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="3s" begin="${1.8 + i}s" repeatCount="indefinite"/></circle>`;
  }
  nodes.forEach(([a, b, y], i) => {
    const last = i === 3, h = last ? 38 : 50;
    let g = `<rect x="${px + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="${t.ink}" fill-opacity=".035" stroke="${t.ink}" stroke-opacity=".1"/>` +
      `<rect x="${px + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="${(h - 10) / 2}" fill="#07142C" stroke="${i === 1 ? t.accent : t.ink}" stroke-opacity="${i === 1 ? 0.5 : 0.1}"/>`;
    g += `<circle cx="${px + 26}" cy="${y + h / 2}" r="4" fill="${last ? '#F87171' : t.accent}"/>`;
    if (last) g += d.text(px + 42, y + h / 2 + 4.5, `${a}: ${b}`, { font: 'm400', size: 10.5, fill: t.ink, op: 0.6 });
    else g += d.text(px + 42, y + 22, a, { font: 'm500', size: 13, fill: t.ink }) + d.text(px + 42, y + 38, b, { font: 'm400', size: 10.5, fill: t.ink, op: 0.5 });
    s += rise(0.5 + i * 0.25, g);
  });
  return s;
}

// AI email: holographic compose panel that types itself. Box 290 x 320.
function visHoloCompose(d) {
  const t = THEMES.holo, W = 290, H = 320;
  paint(d, t, 'h');
  d.def(`<linearGradient id="holoRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60A5FA"/><stop offset=".35" stop-color="#C084FC"/><stop offset=".65" stop-color="#F472B6"/><stop offset="1" stop-color="#FDE68A"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="6s" repeatCount="indefinite"/></linearGradient>`);
  d.def(`<linearGradient id="holoFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#93C5FD"/><stop offset=".5" stop-color="#D8B4FE"/><stop offset="1" stop-color="#F9A8D4"/><animateTransform attributeName="gradientTransform" type="translate" values="-.5 0;.5 0;-.5 0" dur="5s" repeatCount="indefinite"/></linearGradient>`);
  let s = rise(0.3, `<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="28" stroke="url(#holoRing)" stroke-width="1.5"/><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="22" fill="#0C0817"/>` +
    d.text(26, 42, 'Re: Project timeline', { font: 's500', size: 14.5, fill: t.ink }) + d.text(26, 60, 'DRAFTED WITH GEMINI', { font: 'm400', size: 9.5, ls: 1.6, fill: t.accent, op: 0.8 }) +
    `<path d="M6 76H${W - 6}" stroke="${t.ink}" stroke-opacity=".08"/>`);
  const lines = ['Hi team,', 'Thanks for the update. The new', 'timeline works for us, and we can', 'ship the beta on Friday.', 'Best, Farhan'];
  let tDelay = 1.0;
  lines.forEach((l, i) => {
    const y = 104 + i * 23 + (i === 4 ? 10 : 0), w = measure(l, 's400', 13.5) + 4, clip = uid('ty'), dur = 0.25 + l.length * 0.025;
    d.def(`<clipPath id="${clip}"><rect x="24" y="${y - 14}" width="${w}" height="20">${revealWidth(0, w, tDelay, dur)}</rect></clipPath>`);
    s += `<g clip-path="url(#${clip})">${d.text(26, y, l, { font: 's400', size: 13.5, fill: t.ink, op: 0.88 })}</g>`;
    tDelay += dur + 0.12;
  });
  s += `<rect class="blink" x="${26 + measure(lines[4], 's400', 13.5) + 4}" y="${104 + 4 * 23 + 10 - 12}" width="2" height="15" fill="${t.accent}" opacity="0"><animate attributeName="opacity" values="0;1" dur="0.01s" begin="${tDelay.toFixed(2)}s" fill="freeze"/></rect>`;
  d.style(`.spark{transform-box:fill-box;transform-origin:center;animation:spark 2.8s ${EASE} infinite}@keyframes spark{0%,100%{transform:scale(.7) rotate(0deg);opacity:.5}50%{transform:scale(1.15) rotate(45deg);opacity:1}}`);
  const star = (x, y, r, c, dl) => `<path class="spark" style="animation-delay:${dl}s" d="M${x} ${y - r}q${r * 0.16} ${r * 0.84} ${r} ${r}q-${r * 0.84} ${r * 0.16}-${r} ${r}q-${r * 0.16}-${r * 0.84}-${r}-${r}q${r * 0.84}-${r * 0.16} ${r}-${r}z" fill="${c}"/>`;
  s += rise(tDelay + 0.2, `<rect x="24" y="${H - 64}" width="164" height="38" rx="19" fill="url(#holoFill)"/>` + star(46, H - 45, 8, '#1E1036', 0) + d.text(62, H - 40.5, 'Generate reply', { font: 's500', size: 13.5, fill: '#1E1036' }));
  s += star(W - 26, 30, 7, '#F9A8D4', 0.4) + star(W - 48, 50, 4, '#93C5FD', 1.1) + star(W - 20, H - 40, 5, '#D8B4FE', 0.8);
  return s;
}

// Phosphor terminal listing. Box 400 x 300.
function visPhosphor(d, o = {}) {
  const t = THEMES.phosphor;
  d.def(`<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  const rows = o.rows;
  let s = `<g filter="url(#glow)">`;
  s += rise(0.2, d.text(0, 0, o.prompt, { font: 'm500', size: 14.5, fill: t.accent }));
  rows.forEach(([n, tag], i) => {
    const y = 38 + i * 36;
    s += rise(0.45 + i * 0.14, d.text(0, y, n, { font: 'm400', size: 16, fill: t.ink, op: 0.92 }) + d.text(o.width, y, tag, { font: 'm400', size: 11.5, ls: 2, fill: t.accent, op: 0.7, anchor: 'end' }) +
      `<path d="M0 ${y + 14}H${o.width}" stroke="${t.accent}" stroke-opacity=".12" stroke-dasharray="2 4"/>`);
  });
  s += `</g>`;
  return s;
}
function crt(d, clip, x, y, w, h) {
  const pid = uid('scan');
  d.def(`<pattern id="${pid}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#000" fill-opacity=".45"/></pattern><radialGradient id="${pid}v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>`);
  d.style(`.sweep{animation:sweep 6s cubic-bezier(0.45,0,0.55,1) infinite}@keyframes sweep{from{transform:translateY(-120px)}to{transform:translateY(${h + 120}px)}}`);
  return `<g clip-path="url(#${clip})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${pid})"/><g class="sweep"><rect x="${x}" y="${y}" width="${w}" height="90" fill="#4ADE80" fill-opacity=".05"/></g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${pid}v)"/></g>`;
}

// ChallengeApp: 12-month grid filling with checks. Box 320 x 300.
function visMonths(d) {
  const t = THEMES.challenge;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  let s = '';
  months.forEach((m, i) => {
    const col = i % 4, row = Math.floor(i / 4), x = col * 80, y = row * 80, done = i < 8, cur = i === 8;
    let g = `<rect x="${x + 0.5}" y="${y + 0.5}" width="71" height="71" rx="18" fill="${t.ink}" fill-opacity=".035" stroke="${t.ink}" stroke-opacity=".1"/><rect x="${x + 5}" y="${y + 5}" width="62" height="62" rx="14" fill="${cur ? t.accent : '#0B1A42'}" fill-opacity="${cur ? 0.22 : 1}" stroke="${cur ? t.accent : t.ink}" stroke-opacity="${cur ? 0.8 : 0.08}"/>`;
    g += d.text(x + 16, y + 28, m, { font: 'm500', size: 11, ls: 1.5, fill: t.ink, op: cur ? 1 : 0.6 });
    s += rise(0.3 + i * 0.05, g);
    if (done) s += pop(0.9 + i * 0.12, `<circle cx="${x + 50}" cy="${y + 50}" r="10" fill="${t.accent}"/>${checkIcon(x + 44.5, y + 50.5, '#fff', 2)}`);
    if (cur) {
      const c = 2 * Math.PI * 10, id = uid('ring');
      d.style(`.${id}{stroke-dasharray:${c.toFixed(2)};stroke-dashoffset:${(c * 0.35).toFixed(2)};animation:${id}k 2.4s ${EASE} 2s backwards}@keyframes ${id}k{from{stroke-dashoffset:${c.toFixed(2)}}}`);
      s += `<circle cx="${x + 50}" cy="${y + 50}" r="10" stroke="${t.ink}" stroke-opacity=".15" stroke-width="3"/><circle class="${id}" cx="${x + 50}" cy="${y + 50}" r="10" stroke="${t.accent}" stroke-width="3" stroke-linecap="round" transform="rotate(-90 ${x + 50} ${y + 50})"/>`;
    }
  });
  s += rise(1.8, `<rect x="0" y="252" width="312" height="44" rx="22" fill="${t.accent}"/>` + d.text(24, 279.5, 'Add a challenge for October', { font: 's500', size: 14.5, fill: '#fff' }) +
    `<circle cx="290" cy="274" r="15" fill="#fff" fill-opacity=".18"/><path d="M284 274h12M290 268v12" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`);
  return s;
}

// Daily Diary: notebook page with handwriting and a JWT lock. Box 320 x 300.
function visNotebook(d) {
  const t = THEMES.diary;
  d.def(`<linearGradient id="ddGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F97316"/><stop offset="1" stop-color="#16A34A"/></linearGradient><filter id="pageShadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#5B3A1A" flood-opacity=".14"/></filter>`);
  let s = rise(0.3, `<g transform="rotate(-3 160 150)"><rect x="18" y="14" width="284" height="276" rx="14" fill="#F1E6D0"/></g><rect x="10" y="6" width="290" height="284" rx="14" fill="#FFFDF8" stroke="${t.ink}" stroke-opacity=".1" filter="url(#pageShadow)"/>` +
    [0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M24 ${104 + i * 26}H286" stroke="#60A5FA" stroke-opacity=".22"/>`).join('') + `<path d="M58 70V282" stroke="#F87171" stroke-opacity=".4"/>` +
    [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="10" cy="${40 + i * 44}" r="5" fill="${t.base}" stroke="${t.ink}" stroke-opacity=".15"/>`).join(''));
  s += rise(0.5, `<circle cx="42" cy="40" r="16" fill="url(#ddGrad)"/>` + d.text(42, 44.5, 'DD', { font: 's600', size: 11.5, fill: '#fff', anchor: 'middle' }) +
    d.text(68, 38, 'Daily Diary', { font: 's600', size: 15, fill: t.ink }) + d.text(68, 54, 'WEDNESDAY', { font: 'm400', size: 9.5, ls: 1.8, fill: t.ink, op: 0.5 }));
  s += rise(0.7, `<rect x="222" y="26" width="64" height="26" rx="13" fill="${t.ink}"/><rect x="236" y="38" width="11" height="9" rx="2" fill="#FDE68A"/><path d="M238.5 38v-3a3 3 0 0 1 6 0v3" stroke="#FDE68A" stroke-width="1.5"/>` + d.text(254, 43.5, 'JWT', { font: 'm500', size: 10, ls: 1, fill: '#fff' }));
  const lines = ['Shipped the signup fix today.', 'Wrote tests before the code,', 'and it actually felt faster.', 'Next up: edit & delete.'];
  let delay = 1.1;
  lines.forEach((l, i) => {
    const y = 100 + i * 26, w = measure(l, 'serif', 20) + 6, clip = uid('hw'), dur = 0.35 + l.length * 0.03;
    d.def(`<clipPath id="${clip}"><rect x="64" y="${y - 18}" width="${w}" height="26">${revealWidth(0, w, delay, dur)}</rect></clipPath>`);
    s += `<g clip-path="url(#${clip})">${d.text(66, y, l, { font: 'serif', size: 20, fill: i === 3 ? t.accent : t.ink, op: i === 3 ? 1 : 0.86 })}</g>`;
    delay += dur + 0.1;
  });
  s += rise(delay, `<rect x="66" y="232" width="98" height="32" rx="16" fill="url(#ddGrad)"/>` + d.text(115, 252.5, 'Save entry', { font: 's500', size: 12.5, fill: '#fff', anchor: 'middle' }));
  return s;
}

// Java task visuals. Box 320 x 300.
function visThermo(d) {
  const t = THEMES.java;
  const id = uid('merc');
  d.style(`.${id}{transform-box:fill-box;transform-origin:bottom;animation:${id}k 2.6s ${EASE} .8s backwards}@keyframes ${id}k{from{transform:scaleY(.05)}}`);
  let s = rise(0.3, `<rect x="136" y="10" width="48" height="220" rx="24" fill="${t.ink}" fill-opacity=".04" stroke="${t.ink}" stroke-opacity=".14"/><circle cx="160" cy="250" r="38" fill="${t.ink}" fill-opacity=".04" stroke="${t.ink}" stroke-opacity=".14"/>`);
  s += `<rect class="${id}" x="150" y="44" width="20" height="200" rx="10" fill="url(#jacc)"/><circle cx="160" cy="250" r="26" fill="url(#jacc)"/>`;
  for (let i = 0; i <= 10; i++) {
    const y = 214 - i * 17;
    s += rise(0.4 + i * 0.03, `<path d="M${i % 5 ? 120 : 112} ${y}H130M190 ${y}H${i % 5 ? 200 : 208}" stroke="${t.ink}" stroke-opacity=".35"/>` +
      (i % 5 === 0 ? d.text(104, y + 4, String(i * 10), { font: 'm400', size: 11, fill: t.ink, op: 0.6, anchor: 'end' }) + d.text(216, y + 4, String(32 + i * 18), { font: 'm400', size: 11, fill: t.ink, op: 0.6 }) : ''));
  }
  s += rise(0.5, d.text(104, 16, '°C', { font: 'm500', size: 11, fill: t.accent, anchor: 'end' }) + d.text(216, 16, '°F', { font: 'm500', size: 11, fill: t.accent }));
  s += rise(2.6, `<rect x="0" y="232" width="96" height="62" rx="16" fill="#1C140D" stroke="${t.accent}" stroke-opacity=".4"/>` + d.text(14, 256, '100 °C', { font: 'm500', size: 14, fill: t.ink }) + d.text(14, 278, '= 212 °F', { font: 'm400', size: 12, fill: t.accent }));
  s += rise(2.9, `<rect x="226" y="236" width="94" height="44" rx="14" fill="#1C140D" stroke="${t.ink}" stroke-opacity=".15"/>` + d.text(240, 263, '373.15 K', { font: 'm500', size: 13, fill: t.ink }));
  return s;
}
function visGuess(d) {
  const t = THEMES.java;
  const x0 = 10, x1 = 310, X = (n) => x0 + ((n - 1) / 99) * (x1 - x0);
  let s = rise(0.3, `<path d="M${x0} 150H${x1}" stroke="${t.ink}" stroke-opacity=".25"/>` + [1, 25, 50, 75, 100].map((n) => `<path d="M${X(n)} 142V158" stroke="${t.ink}" stroke-opacity=".35"/>` + d.text(X(n), 180, String(n), { font: 'm400', size: 11, fill: t.ink, op: 0.5, anchor: 'middle' })).join('') +
    Array.from({ length: 99 }, (_, i) => i + 1).filter((n) => n % 5 === 0 && n % 25).map((n) => `<path d="M${X(n)} 146V154" stroke="${t.ink}" stroke-opacity=".15"/>`).join(''));
  const seq = [[50, 'LOWER'], [25, 'HIGHER'], [37, 'HIGHER'], [43, 'LOWER'], [40, 'HIGHER'], [42, 'GOT IT']];
  const id = uid('ptr'), total = 7.5;
  const frames = seq.map(([n], i) => { const p = ((i + 0.5) / seq.length) * 100; return `${(p - 6).toFixed(1)}%,${p.toFixed(1)}%{transform:translateX(${(X(n) - X(50)).toFixed(1)}px)}`; }).join('');
  d.style(`.${id}{transform:translateX(${(X(42) - X(50)).toFixed(1)}px);animation:${id}k ${total}s ${EASE} .6s backwards}@keyframes ${id}k{0%{transform:translateX(0)}${frames}}`);
  s += `<g class="${id}"><path d="M${X(50)} 136l-8-14h16z" fill="url(#jacc)"/></g>`;
  seq.forEach(([n, hint], i) => {
    const delay = 0.6 + ((i + 0.5) / seq.length) * total, last = i === seq.length - 1;
    const row = i % 3, col = Math.floor(i / 3), x = col * 160, y = 214 + row * 30;
    s += rise(delay - 0.2, `<circle cx="${x + 10}" cy="${y - 4}" r="4" fill="${last ? '#4ADE80' : t.accent}"/>` + d.text(x + 22, y, `${String(n).padStart(2, ' ')}  ${hint}`, { font: 'm400', size: 12.5, fill: t.ink, op: last ? 1 : 0.7 }));
  });
  s += rise(0.2, d.text(0, 30, 'guess #1-6', { font: 'm400', size: 11, ls: 1.5, fill: t.ink, op: 0.45 }) + d.text(0, 58, 'target: ??', { font: 'm500', size: 20, fill: t.ink }));
  s += rise(0.6 + total, `<rect x="186" y="18" width="134" height="48" rx="16" fill="${t.accent}" fill-opacity=".14" stroke="${t.accent}" stroke-opacity=".5"/>` + d.text(253, 48, '42 in 6 tries', { font: 'm500', size: 14, fill: t.ink, anchor: 'middle' }));
  return s;
}
function visContacts(d) {
  const t = THEMES.java;
  const people = [['AK', 'Aisha Khan', '+91 90000 00001'], ['RM', 'Rohan Mehta', '+91 90000 00002'], ['SA', 'Sara Ali', '+91 90000 00003']];
  let s = '';
  people.forEach(([ini, name, ph], i) => {
    const x = 10 + i * 30, y = 4 + i * 84, rot = [-4, 2, 5][i];
    let g = bezel(d, t, 'j', 0, 0, 250, 76, 22, { pad: 6, core: '#17110C' });
    g += `<circle cx="40" cy="38" r="18" fill="url(#j${i === 2 ? 'acc' : 'acc2'})"/>` + d.text(40, 42.5, ini, { font: 's600', size: 12.5, fill: '#0B0806', anchor: 'middle' });
    g += d.text(70, 34, name, { font: 's500', size: 15, fill: t.ink }) + d.text(70, 55, ph, { font: 'm400', size: 11.5, fill: t.ink, op: 0.55 });
    s += `<g transform="translate(${x} ${y}) rotate(${rot} 125 38)">${rise(0.3 + i * 0.2, g)}</g>`;
  });
  const ops = ['ADD', 'VIEW', 'EDIT', 'DELETE'];
  let cx = 0;
  ops.forEach((o, i) => {
    const w = measure(o, 'm500', 11, 1.8) + 26;
    s += pop(1.4 + i * 0.18, `<rect x="${cx}" y="262" width="${w}" height="30" rx="15" fill="${i === 3 ? '#F87171' : t.accent}" fill-opacity="${i === 3 ? 0.14 : 0.14}" stroke="${i === 3 ? '#F87171' : t.accent}" stroke-opacity=".5"/>` + d.text(cx + 13, 281.5, o, { font: 'm500', size: 11, ls: 1.8, fill: t.ink }));
    cx += w + 8;
  });
  return s;
}
function visSudoku(d) {
  const t = THEMES.java;
  const sol = ['534678912', '672195348', '198342567', '859761423', '426853791', '713924856', '961537284', '287419635', '345286179'];
  const given = ['53..7....', '6..195...', '.98....6.', '8...6...3', '4..8.3..1', '7...2...6', '.6....28.', '...419..5', '....8..79'];
  const c = 32, ox = 16, oy = 6;
  let s = rise(0.2, `<rect x="${ox - 6}" y="${oy - 6}" width="${9 * c + 12}" height="${9 * c + 12}" rx="18" fill="${t.ink}" fill-opacity=".03" stroke="${t.ink}" stroke-opacity=".12"/>` +
    Array.from({ length: 10 }, (_, i) => `<path d="M${ox + i * c} ${oy}V${oy + 9 * c}M${ox} ${oy + i * c}H${ox + 9 * c}" stroke="${t.ink}" stroke-opacity="${i % 3 ? 0.08 : 0.3}"/>`).join(''));
  let k = 0;
  for (let r = 0; r < 9; r++) for (let q = 0; q < 9; q++) {
    const x = ox + q * c + c / 2, y = oy + r * c + c / 2 + 5.5, g = given[r][q] !== '.';
    if (g) s += d.text(x, y, sol[r][q], { font: 's600', size: 16, fill: t.ink, anchor: 'middle' });
    else { s += pop(0.8 + k * 0.055, d.text(x, y, sol[r][q], { font: 'm400', size: 15, fill: t.accent, anchor: 'middle' })); k++; }
  }
  return s;
}

// ============================================================
// PROFILE: HERO
// ============================================================
const P = THEMES.personal, Y = THEMES.yusr;
function hero() {
  const W = 1200, H = 720, d = new Doc('hero', W, H, P);
  const ids = paint(d, P, 'p');
  paint(d, Y, 'y');
  const [sl] = slab(d, P, 'p', 8, 8, W - 16, H - 16, 48, {
    core: '#050505', grid: 72, grain: 0.07,
    orbs: [{ x: 1010, y: 110, r: 420, c: '#7C3AED', a: 0.55, dx: -70, dy: 40, t: 16 }, { x: 150, y: 700, r: 440, c: '#10B981', a: 0.42, dx: 60, dy: -50, t: 19 }, { x: 760, y: 640, r: 260, c: '#22D3EE', a: 0.18, dx: -40, dy: -30, t: 14 }],
  });
  d.add(sl);
  {
    const name = 'Mohd Farhan', role = 'Full-stack developer', live = 'ONLINE';
    const nW = measure(name, 's500', 16), rW = measure(role, 's400', 16), lW = measure(live, 'm500', 11.5, 2.3);
    const iw = 18 + 34 + 14 + nW + 26 + rW + 30 + lW + 22 + 18, ih = 56, ix = (W - iw) / 2, iy = 48, cy = iy + ih / 2;
    let s = `<rect x="${ix - 5.5}" y="${iy - 5.5}" width="${iw + 11}" height="${ih + 11}" rx="${(ih + 11) / 2}" fill="#fff" fill-opacity=".025" stroke="#fff" stroke-opacity=".07"/><rect x="${ix + 0.5}" y="${iy + 0.5}" width="${iw - 1}" height="${ih - 1}" rx="${ih / 2}" fill="#0B0B0E" fill-opacity=".86" stroke="#fff" stroke-opacity=".1"/>`;
    let cx = ix + 11;
    s += `<circle cx="${cx + 17}" cy="${cy}" r="17" fill="url(#${ids.acc})"/>` + d.text(cx + 17, cy + 4.3, 'MF', { font: 'm500', size: 12, ls: 0.5, fill: '#04130D', anchor: 'middle' });
    cx += 48; s += d.text(cx, cy + 5.6, name, { font: 's500', size: 16 });
    cx += nW + 13; s += `<circle cx="${cx}" cy="${cy}" r="1.6" fill="#fff" fill-opacity=".3"/>`;
    cx += 13; s += d.text(cx, cy + 5.6, role, { font: 's400', size: 16, op: 0.52 });
    cx += rW + 16; s += `<path d="M${cx} ${cy - 13}V${cy + 13}" stroke="#fff" stroke-opacity=".1"/>`;
    cx += 16; s += `<circle class="pulse" cx="${cx + 3}" cy="${cy}" r="3.2" fill="#34D399"/><circle cx="${cx + 3}" cy="${cy}" r="3.2" fill="#34D399"/>` + d.text(cx + 14, cy + 4.1, live, { font: 'm500', size: 11.5, ls: 2.3, op: 0.6 });
    d.add(rise(0.05, s));
  }
  const LX = 92, h1 = 84;
  d.add(rise(0.25, eyebrow(d, P, LX, 170, 'AVAILABLE FOR FULL-STACK ROLES', { size: 13 })[0]));
  d.add(rise(0.4, d.text(LX - 4, 318, 'I build products', { font: 's600', size: h1, ls: -h1 * 0.045, fill: `url(#${ids.h1})` })));
  const l2W = measure('end to ', 's600', h1, -h1 * 0.045);
  d.add(rise(0.55, d.text(LX - 4, 408, 'end to ', { font: 's600', size: h1, ls: -h1 * 0.045, fill: `url(#${ids.h1})` }) + d.text(LX - 2 + l2W, 410, 'end.', { font: 'serif', size: h1 * 1.18, ls: -1, fill: `url(#${ids.acc})` })));
  d.add(rise(0.72, d.text(LX, 474, 'Java & Spring Boot backends, React & Next.js frontends.', { font: 's300', size: 21, op: 0.62 }) + d.text(LX, 506, 'Currently shipping YUSR AI, a WhatsApp CRM for Indian businesses.', { font: 's300', size: 21, op: 0.62 })));
  {
    let cx = LX, s = '';
    ['BASED IN INDIA', 'JAVA / SPRING / NEXT.JS', 'SHIPPING SINCE 2023'].forEach((it, i) => {
      if (i) { s += `<path d="M${cx} 603V621" stroke="#fff" stroke-opacity=".14"/>`; cx += 20; }
      s += d.text(cx, 617, it, { font: 'm400', size: 12.5, ls: 2.2, op: 0.42 }); cx += measure(it, 'm400', 12.5, 2.2) + 20;
    });
    d.add(rise(0.9, `<path d="M${LX} 572H${cx - 20}" stroke="#fff" stroke-opacity=".08"/>` + s));
  }
  d.style(`.float{animation:float 7s cubic-bezier(0.37,0,0.63,1) infinite alternate}.float2{animation:float 8.5s cubic-bezier(0.37,0,0.63,1) infinite alternate-reverse}@keyframes float{from{transform:translateY(-7px)}to{transform:translateY(7px)}}`);
  // YUSR-branded cascade (it's YUSR's CI)
  {
    const cw = 290, ch = 196;
    let s = bezel(d, Y, 'y', 0, 0, cw, ch, 30, { pad: 6, core: '#0E0B09' });
    s += yusrLogo(26, 26, 22) + d.text(56, 42, 'YUSR / TEST SUITE', { font: 'm500', size: 11, ls: 2.2, fill: Y.ink, op: 0.5 });
    s += odometer(d, 26, 124, 598, { size: 76, font: 's300', fill: 'url(#yacc)', delay: 1.1 });
    s += d.text(28, 160, 'TESTS PASSING ON MAIN', { font: 'm400', size: 11.5, ls: 1.8, fill: Y.ink, op: 0.55 });
    d.add(`<g transform="translate(846 128) rotate(5 ${cw / 2} ${ch / 2})"><g class="float2">${rise(1.05, s)}</g></g>`);
  }
  {
    const cw = 372, ch = 272;
    let s = bezel(d, Y, 'y', 0, 0, cw, ch, 32, { pad: 7, core: '#0E0B09' });
    s += [0, 1, 2].map((i) => `<circle cx="${34 + i * 18}" cy="38" r="5" stroke="${Y.ink}" stroke-opacity=".22"/>`).join('');
    s += yusrLogo(cw - 30 - measure('yusr - main', 'm400', 12) - 30, 27, 20) + d.text(cw - 30, 42, 'yusr - main', { font: 'm400', size: 12, fill: Y.ink, op: 0.45, anchor: 'end' });
    s += `<path d="M7 62H${cw - 7}" stroke="${Y.ink}" stroke-opacity=".08"/>`;
    const lines = [['$', 'git push origin main', 0.9], ['ok', 'type-check / lint / test', 0.72], ['ok', '598 tests passed', 0.72], ['ok', 'secret scan clean', 0.72], ['live', 'deployed to yusr.co.in', 0.95]];
    lines.forEach(([k, tx, op], i) => {
      const y = 104 + i * 34;
      let l = k === '$' ? d.text(32, y, '$', { font: 'm500', size: 15, fill: Y.accent }) : k === 'ok' ? checkIcon(30, y - 7, Y.accent) : `<circle cx="37" cy="${y - 5}" r="4" fill="${Y.accent}"/><circle class="pulse" cx="37" cy="${y - 5}" r="4" fill="${Y.accent}"/>`;
      l += d.text(56, y, tx, { font: 'm400', size: 15, fill: Y.ink, op });
      if (i === lines.length - 1) l += `<rect class="blink" x="${56 + measure(tx, 'm400', 15) + 6}" y="${y - 13}" width="8" height="16" rx="1" fill="${Y.accent}"/>`;
      s += rise(1.35 + i * 0.28, l);
    });
    d.add(`<g transform="translate(764 318) rotate(-3 ${cw / 2} ${ch / 2})"><g class="float">${rise(1.15, s)}</g></g>`);
  }
  return d;
}

// ============================================================
// PROFILE: BUTTONS + HEADINGS (light & dark page variants)
// ============================================================
function button(label, kind, pageTheme) {
  const W = 360, H = 112, dark = pageTheme === 'dark';
  const d = new Doc(`btn-${label.toLowerCase().replace(/[^a-z]/g, '')}-${pageTheme}`, W, H, { ...P, ink: dark ? '#FFFFFF' : '#0A0A0A', dark });
  const ink = d.ink, ox = 6, oy = 6, ow = W - 12, oh = H - 12, ix = 12, iy = 12, iw = W - 24, ih = H - 24;
  const k = { primary: { core: dark ? '#FAFAFA' : '#0A0A0A', txt: dark ? '#0A0A0A' : '#FAFAFA', hl: 0.9 }, yusr: { core: '#D85A30', txt: '#F4EEE2', hl: 0.38 }, plain: { core: dark ? '#0E0E11' : '#FFFFFF', txt: ink, hl: 0.2 } }[kind];
  d.def(`<linearGradient id="bhl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${k.hl}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  let s = `<rect x="${ox + 0.5}" y="${oy + 0.5}" width="${ow - 1}" height="${oh - 1}" rx="${oh / 2}" fill="${ink}" fill-opacity="${dark ? 0.04 : 0.035}" stroke="${ink}" stroke-opacity="${dark ? 0.1 : 0.09}"/>`;
  s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${ih / 2}" fill="${k.core}"${kind === 'plain' && !dark ? ' stroke="#0A0A0A" stroke-opacity=".06"' : ''}/>`;
  if (dark || kind !== 'plain') s += `<rect x="${ix + 0.5}" y="${iy + 0.5}" width="${iw - 1}" height="${ih - 1}" rx="${ih / 2}" stroke="url(#bhl)" stroke-opacity="${kind === 'primary' && !dark ? 0.15 : 1}"/>`;
  let lx = ix + 34;
  if (kind === 'yusr') { s += yusrLogo(ix + 22, iy + ih / 2 - 19, 38); lx = ix + 72; }
  s += d.text(lx, iy + ih / 2 + 8.4, label, { font: 's500', size: 23.5, ls: -0.3, fill: k.txt });
  const r = ih / 2 - 7;
  s += arrowDisc(d, d.t, ix + iw - 7 - r, iy + ih / 2, r, { fill: k.txt, op: kind === 'plain' ? (dark ? 0.1 : 0.06) : 0.14, stroke: k.txt, sw: 2 });
  d.add(s);
  return d;
}

function heading(key, num, label, sans, serif, pageTheme) {
  const W = 1200, H = 236, dark = pageTheme === 'dark';
  const t = { ...P, dark, ink: dark ? '#FFFFFF' : '#0A0A0A', accent: dark ? '#34D399' : '#059669' };
  const d = new Doc(`h-${key}-${pageTheme}`, W, H, t);
  d.def(`<linearGradient id="emerT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark ? '#6EE7B7' : '#059669'}"/><stop offset="1" stop-color="${dark ? '#22D3EE' : '#0891B2'}"/></linearGradient>`);
  d.add(rise(0.05, eyebrow(d, t, 14, 36, `${num} — ${label}`, { size: 13 })[0]));
  let size = 66;
  while (measure(sans, 's600', size, -size * 0.04) + 16 + measure(serif, 'serif', size * 1.16, -0.5) > W - 40) size -= 1;
  const sw = measure(sans, 's600', size, -size * 0.04);
  d.add(rise(0.2, d.text(10, 170, sans, { font: 's600', size, ls: -size * 0.04 })));
  d.add(rise(0.36, d.text(10 + sw + 16, 172, serif, { font: 'serif', size: size * 1.16, ls: -0.5, fill: 'url(#emerT)' })));
  d.add(rise(0.5, `<path d="M14 214H${W - 14}" stroke="${t.ink}" stroke-opacity="${dark ? 0.09 : 0.08}"/>`));
  return d;
}

// ============================================================
// PROFILE: BENTO CARDS — each project in its own theme
// ============================================================
const CH = 452;
function card(name, W, t, p, o = {}) {
  const d = new Doc(name, W, CH, t);
  paint(d, t, p);
  const [s, clip] = slab(d, t, p, 10, 10, W - 20, CH - 20, 38, { pad: 7, orbs: o.orbs, under: o.under, grain: o.grain });
  d.add(s);
  d.clip = clip;
  return d;
}
function cardCopy(d, t, p, x, o) {
  let s = rise(0.1, eyebrow(d, t, x, 48, o.eyebrow, { size: 11.5 })[0]);
  const tx = o.logo ? x + 70 : x - 2;
  if (o.logo) s += rise(0.2, yusrLogo(x, o.titleY - 48, 56));
  s += rise(0.24, d.text(tx, o.titleY, o.title, { font: 's600', size: o.titleSize || 46, ls: -(o.titleSize || 46) * 0.04, fill: o.titleFill || `url(#${p}h1)` }));
  if (o.tagline) s += rise(0.34, d.text(x, o.titleY + 42, o.tagline, { font: 'serif', size: 29, fill: o.tagFill || t.accent, op: o.tagOp ?? 1 }));
  s += rise(0.46, o.desc.map((l, i) => d.text(x, o.descY + i * 27, l, { font: 's300', size: 17.5, fill: t.ink, op: t.dark ? 0.58 : 0.72 })).join(''));
  s += rise(0.6, chipRow(d, t, x, o.chipsY, o.chips));
  return s;
}

function cardYusr() {
  const t = Y, W = 800, d = card('card-yusr', W, t, 'y', { orbs: [{ x: 700, y: 60, r: 320, c: '#D85A30', a: 0.34, dx: -40, dy: 30, t: 15 }, { x: 120, y: 470, r: 240, c: '#B8441F', a: 0.22, dx: 40, dy: -20, t: 18 }] });
  d.add(cardCopy(d, t, 'y', 50, { eyebrow: 'FLAGSHIP / LIVE', logo: true, title: 'YUSR AI', titleY: 158, titleSize: 54, tagline: 'WhatsApp CRM, with a brain.', tagFill: 'url(#yacc)',
    desc: ['Shared team inbox, bulk broadcasts from', 'Google Sheets, and an AI assistant trained', "on each business's own catalog."], descY: 250, chips: ['Next.js', 'TypeScript', 'Supabase', 'n8n'], chipsY: 362 }));
  d.add(arrowDisc(d, t, W - 60, 64, 24));
  d.add(`<g transform="translate(470 104)">${visYusrChat(d)}</g>`);
  return d;
}

function cardNumbers() {
  const t = P, W = 400, d = card('card-numbers', W, t, 'p', { orbs: [{ x: 360, y: 440, r: 260, c: '#7C3AED', a: 0.34, dx: -30, dy: -40, t: 17 }, { x: 40, y: 40, r: 180, c: '#10B981', a: 0.14, t: 20 }] });
  d.add(rise(0.1, eyebrow(d, t, 46, 48, 'BY THE NUMBERS', { size: 11.5, color: '#A78BFA' })[0]));
  [['598', "TESTS IN YUSR'S SUITE", 'url(#pacc2)'], ['243', 'CI RUNS ON MAIN', 'url(#ph1)'], ['21', 'REPOSITORIES BUILT', 'url(#pacc)']].forEach(([n, l, f], i) => {
    const y = 158 + i * 104;
    let s = odometer(d, 44, y, n, { size: 66, font: 's300', fill: f, delay: 0.3 + i * 0.25 });
    s += d.text(48, y + 28, l, { font: 'm400', size: 11.5, ls: 1.9, op: 0.5 });
    if (i < 2) s += `<path d="M46 ${y + 50}H${W - 46}" stroke="#fff" stroke-opacity=".07"/>`;
    d.add(rise(0.3 + i * 0.16, s));
  });
  return d;
}

function cardSnapbuy() {
  const t = THEMES.snapbuy, W = 500, d = card('card-snapbuy', W, t, 's', { grain: 0.05 });
  d.add(`<g transform="translate(46 66)">${visSnapReceipt(d)}</g>`);
  d.add(rise(0.1, eyebrow(d, t, 46, 48, 'E-COMMERCE', { size: 11.5 })[0]));
  const tw = measure('Snap', 's600', 50, -2);
  d.add(rise(0.24, `<rect x="${44 + tw - 2}" y="${332 - 34}" width="${measure('Buy', 's600', 50, -2) + 10}" height="40" rx="6" fill="${t.lime}" transform="rotate(-2 ${44 + tw + 40} 300)"/>` + d.text(44, 336, 'SnapBuy', { font: 's600', size: 50, ls: -2, fill: t.ink })));
  d.add(rise(0.4, d.text(46, 366, 'JWT auth, cart, addresses and Stripe checkout.', { font: 's400', size: 16.5, fill: t.ink, op: 0.7 })));
  d.add(rise(0.55, chipRow(d, t, 46, 386, ['Spring Boot', 'React', 'Redux', 'PostgreSQL'], { size: 11.5 })));
  return d;
}

function cardSkylink() {
  const t = THEMES.skylink, W = 700;
  const d = new Doc('card-skylink', W, CH, t);
  paint(d, t, 'k');
  const starsSvg = stars(d, t, 17, 17, W - 34, CH - 34, 70, 11);
  const [s] = slab(d, t, 'k', 10, 10, W - 20, CH - 20, 38, { pad: 7, under: starsSvg, orbs: [{ x: 600, y: 420, r: 320, c: '#38BDF8', a: 0.26, dx: -40, dy: -30, t: 17 }, { x: 80, y: 20, r: 240, c: '#6366F1', a: 0.26, t: 20 }] });
  d.add(s);
  d.add(cardCopy(d, t, 'k', 48, { eyebrow: 'FILE SHARING', title: 'SkyLink', titleY: 156, tagline: 'Share a file with six digits.', tagFill: `url(#kacc)`,
    desc: ['Spring Boot + MongoDB with JWT auth,', 'shareable links and Razorpay, plus a', 'plain-Java P2P transfer engine.'], descY: 246, chips: ['Spring Boot', 'MongoDB', 'React'], chipsY: 360 }));
  d.add(arrowDisc(d, t, W - 60, 64, 24));
  d.add(`<g transform="translate(372 96)">${visSkyOrbit(d)}</g>`);
  return d;
}

function cardEmail() {
  const t = THEMES.holo, W = 700;
  const d = card('card-email', W, t, 'h', { orbs: [{ x: 640, y: 60, r: 300, c: '#C084FC', a: 0.32, dx: -40, dy: 40, t: 16 }, { x: 60, y: 460, r: 240, c: '#60A5FA', a: 0.22, t: 21 }, { x: 380, y: 480, r: 200, c: '#F472B6', a: 0.16, dx: 40, dy: -40, t: 13 }] });
  d.def(`<linearGradient id="holoText" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#93C5FD"/><stop offset=".5" stop-color="#D8B4FE"/><stop offset="1" stop-color="#F9A8D4"/></linearGradient>`);
  d.add(cardCopy(d, t, 'h', 48, { eyebrow: 'GENERATIVE AI', title: 'AI Email Assistant', titleY: 156, titleSize: 40, tagline: 'Replies that write themselves.', tagFill: 'url(#holoText)',
    desc: ['Spring Boot + Google Gemini behind a', 'React web app and a Chrome extension', 'that drafts replies in one click.'], descY: 246, chips: ['Spring Boot', 'React', 'Gemini'], chipsY: 360 }));
  d.add(`<g transform="translate(384 96)">${visHoloCompose(d)}</g>`);
  return d;
}

function cardLab() {
  const t = THEMES.phosphor, W = 500;
  const d = new Doc('card-lab', W, CH, t);
  paint(d, t, 'g');
  const [s, clip] = slab(d, t, 'g', 10, 10, W - 20, CH - 20, 38, { pad: 7, grain: 0.08, orbs: [{ x: 250, y: 220, r: 300, c: '#22C55E', a: 0.16, dx: 0, dy: 0, t: 10 }] });
  d.add(s);
  d.style(`.flick{animation:flick 5s steps(1) infinite}@keyframes flick{0%,100%{opacity:1}92%{opacity:.93}93%{opacity:1}96%{opacity:.96}}`);
  let c = rise(0.1, eyebrow(d, t, 46, 48, 'ALSO IN THE LAB', { size: 11.5 })[0]);
  c += `<g transform="translate(48 122)">${visPhosphor(d, { prompt: 'farhan@lab:~$ ls projects/', width: 404, rows: [['skylink-p2p-service/', 'JAVA'], ['yusr-website/', 'HTML'], ['daily-diary/', 'REACT'], ['challenge-app/', 'REACT'], ['java-fundamentals/', 'JAVA']] })}</g>`;
  c += rise(1.3, `<g filter="url(#glow)">${d.text(48, 344, 'farhan@lab:~$', { font: 'm500', size: 14.5, fill: t.accent })}<rect class="blink" x="${48 + measure('farhan@lab:~$ ', 'm500', 14.5)}" y="331" width="9" height="16" fill="${t.accent}"/></g>`);
  {
    const bx = 46, by = 368, bw = 262, bh = 48;
    c += rise(0.9, `<rect x="${bx + 0.5}" y="${by + 0.5}" width="${bw - 1}" height="${bh - 1}" rx="${bh / 2}" fill="${t.accent}" fill-opacity=".05" stroke="${t.accent}" stroke-opacity=".35"/><rect x="${bx + 4}" y="${by + 4}" width="${bw - 8}" height="${bh - 8}" rx="${(bh - 8) / 2}" fill="${t.accent}"/>` +
      d.text(bx + 24, by + 29.5, 'cd all-repositories', { font: 'm500', size: 14, fill: '#02140A' }) + arrowDisc(d, t, bx + bw - 24, by + bh / 2, 16, { fill: '#02140A', op: 0.14, stroke: '#02140A', sw: 1.6 }));
  }
  d.add(`<g class="flick">${c}</g>`);
  d.add(crt(d, clip, 17, 17, W - 34, CH - 34));
  return d;
}

// ============================================================
// PROFILE: TOOLKIT + FOOTER (personal)
// ============================================================
function toolkit() {
  const W = 1200, H = 360, d = new Doc('toolkit', W, H, P);
  paint(d, P, 'p');
  const [sl, clip] = slab(d, P, 'p', 8, 8, W - 16, H - 16, 44, { core: '#050505', orbs: [{ x: 200, y: 60, r: 300, c: '#10B981', a: 0.22, dx: 80, dy: 20, t: 17 }, { x: 1000, y: 340, r: 320, c: '#7C3AED', a: 0.3, dx: -80, dy: -20, t: 19 }] });
  d.add(sl);
  d.def(`<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".14" stop-color="#fff"/><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="edgemask"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask>`);
  const rowA = [['Java', '#F89820'], ['Spring Boot', '#6DB33F'], ['Spring Security', '#6DB33F'], ['PostgreSQL', '#6A9BD8'], ['MongoDB', '#47A248'], ['Supabase', '#3ECF8E'], ['Maven', '#E0473D'], ['REST APIs', '#E5E7EB'], ['Microservices', '#A78BFA']];
  const rowB = [['TypeScript', '#3178C6'], ['Next.js', '#FAFAFA'], ['React', '#61DAFB'], ['Redux Toolkit', '#9B7BEA'], ['Tailwind CSS', '#38BDF8'], ['Gemini API', '#8E75F0'], ['n8n', '#EA4B71'], ['GitHub Actions', '#2F81F7'], ['Docker', '#2496ED'], ['Vitest', '#A3E635'], ['Sentry', '#A78BFA']];
  const pill = (x, [label, c]) => {
    const tw = measure(label, 's500', 19, -0.2), ph = 60, pw = tw + 70;
    return [`<rect x="${x + 0.5}" y="0.5" width="${pw - 1}" height="${ph - 1}" rx="${ph / 2}" fill="#fff" fill-opacity=".035" stroke="#fff" stroke-opacity=".09"/><rect x="${x + 6}" y="6" width="${pw - 12}" height="${ph - 12}" rx="${(ph - 12) / 2}" fill="#0C0C0F"/><rect x="${x + 6.5}" y="6.5" width="${pw - 13}" height="${ph - 13}" rx="${(ph - 13) / 2}" stroke="url(#phl)"/><circle cx="${x + 30}" cy="30" r="4.5" fill="${c}"/><circle cx="${x + 30}" cy="30" r="9" fill="${c}" fill-opacity=".16"/>${d.text(x + 46, 36.6, label, { font: 's500', size: 19, ls: -0.2, op: 0.9 })}`, pw];
  };
  const track = (items) => { let x = 0, s = ''; for (const it of items) { const [p, w] = pill(x, it); s += p; x += w + 14; } return [s, x]; };
  const [ta, wa] = track(rowA), [tb, wb] = track(rowB);
  d.style(`.mqa{animation:mqa 46s linear infinite}@keyframes mqa{from{transform:translateX(0)}to{transform:translateX(-${wa}px)}}.mqb{animation:mqb 52s linear infinite}@keyframes mqb{from{transform:translateX(-${wb}px)}to{transform:translateX(0)}}`);
  const loop = (tr, w) => `${tr}<g transform="translate(${w} 0)">${tr}</g><g transform="translate(${2 * w} 0)">${tr}</g>`;
  d.add(`<g clip-path="url(#${clip})" mask="url(#edgemask)"><g transform="translate(40 92)">${rise(0.2, `<g class="mqa">${loop(ta, wa)}</g>`)}</g><g transform="translate(40 178)">${rise(0.4, `<g class="mqb">${loop(tb, wb)}</g>`)}</g></g>`);
  d.add(rise(0.6, d.text(W / 2, 64, 'STACK / IN DAILY USE', { font: 'm500', size: 12, ls: 2.6, op: 0.42, anchor: 'middle' }) + d.text(W / 2, 300, 'BACKEND  /  FRONTEND  /  DATA  /  AI  /  DEVOPS', { font: 'm400', size: 12, ls: 2.4, op: 0.36, anchor: 'middle' })));
  return d;
}

function footer() {
  const W = 1200, H = 560, d = new Doc('footer', W, H, P);
  const ids = paint(d, P, 'p');
  const [sl] = slab(d, P, 'p', 8, 8, W - 16, H - 16, 48, { core: '#050505', grid: 72, grain: 0.07, orbs: [{ x: 600, y: 620, r: 520, c: '#10B981', a: 0.42, dx: 0, dy: -40, t: 16 }, { x: 160, y: 60, r: 300, c: '#7C3AED', a: 0.34, dx: 50, dy: 30, t: 19 }, { x: 1080, y: 120, r: 280, c: '#22D3EE', a: 0.16, dx: -50, dy: 30, t: 14 }] });
  d.add(sl);
  const [eb, ew] = eyebrow(d, P, 0, 0, '04 — CONTACT', { size: 13 });
  d.add(rise(0.1, `<g transform="translate(${(W - ew) / 2} 84)">${eb}</g>`));
  d.add(rise(0.25, d.text(W / 2, 250, "Let's build something", { font: 's600', size: 86, ls: -3.6, anchor: 'middle', fill: `url(#${ids.h1})` })));
  d.add(rise(0.42, d.text(W / 2, 352, 'that ships.', { font: 'serif', size: 112, ls: -1.5, anchor: 'middle', fill: `url(#${ids.acc})` })));
  d.add(rise(0.6, d.text(W / 2, 414, 'Open to backend & full-stack roles and freelance work.', { font: 's300', size: 22, op: 0.6, anchor: 'middle' })));
  d.add(rise(0.8, `<path d="M${W / 2 - 260} 462H${W / 2 + 260}" stroke="#fff" stroke-opacity=".08"/>` + d.text(W / 2, 498, 'MOHD FARHAN  /  INDIA  /  UTC+5:30', { font: 'm400', size: 12.5, ls: 2.6, op: 0.42, anchor: 'middle' })));
  return d;
}

// ============================================================
// REPO README BANNERS + FOOTERS
// ============================================================
const REPOS = [
  { repo: 'Ecommerce-snapBuy', theme: 'snapbuy', p: 's', eyebrow: 'FULL-STACK / E-COMMERCE', title: 'SnapBuy', marker: 'Buy', tagline: 'Add to cart. Pay. Done.', desc: ['Spring Boot REST API and a React + Redux', 'storefront with JWT auth and Stripe checkout.'], chips: ['Java 17', 'Spring Boot', 'React', 'Redux', 'PostgreSQL', 'Stripe'], vis: visSnapReceipt, box: [410, 330], scale: 1.1 },
  { repo: 'SkyLink_File_Share_Application', theme: 'skylink', p: 'k', stars: true, eyebrow: 'FULL-STACK / FILE SHARING', title: 'SkyLink', tagline: 'Share a file with six digits.', desc: ['Spring Boot + MongoDB API with JWT auth,', 'shareable links and Razorpay, React frontend.'], chips: ['Spring Boot', 'MongoDB', 'React', 'Razorpay'], vis: visSkyOrbit, box: [300, 300], scale: 1.4 },
  { repo: 'SkyLink_P2P_Service', theme: 'skylink', p: 'k', stars: true, eyebrow: 'JAVA / TRANSFER ENGINE', title: 'SkyLink P2P', tagline: 'Upload once. Download once. Gone.', desc: ['A plain-Java HTTP and socket server that gives', 'every file one port and one six-digit code.'], chips: ['Java 17', 'HttpServer', 'Sockets', 'Maven', 'No framework'], vis: visP2P, box: [320, 320], scale: 1.32 },
  { repo: 'Generative-AI-Email-Assistant', theme: 'holo', p: 'h', eyebrow: 'GENERATIVE AI / CHROME EXTENSION', title: 'AI Email Assistant', tagline: 'Replies that write themselves.', desc: ['Spring Boot + Google Gemini behind a React', 'web app and a Chrome extension.'], chips: ['Spring Boot', 'Gemini API', 'React', 'Vite', 'Chrome Extension'], vis: visHoloCompose, box: [290, 320], scale: 1.32 },
  { repo: 'YUSR-WEBSITE', theme: 'yusr', p: 'y', logo: true, eyebrow: 'YUSR AI / MARKETING SITE', title: 'YUSR AI', tagline: 'WhatsApp CRM, with a brain.', desc: ['The marketing site for yusr.co.in: 13 pages of', 'hand-written HTML, CSS and JS. No build step.'], chips: ['HTML', 'CSS', 'JavaScript', 'No framework'], vis: visYusrBrowser, box: [320, 300], scale: 1.36, link: 'https://yusr.co.in' },
  { repo: 'ChallengeApp-Frontend', theme: 'challenge', p: 'c', eyebrow: 'REACT / PRODUCTIVITY', title: 'ChallengeApp', tagline: 'One challenge, every month.', desc: ['A React 19 + Vite frontend for a Spring Boot', 'API: add monthly challenges and track them.'], chips: ['React 19', 'Vite', 'Bootstrap 5', 'Axios'], vis: visMonths, box: [312, 296], scale: 1.36 },
  { repo: 'Journal-App-Frontend', theme: 'diary', p: 'd', eyebrow: 'REACT / JOURNALING', title: 'Daily Diary', tagline: 'A private place to write.', desc: ['React + Tailwind frontend for a Spring Boot', 'journal API, secured with JWT.'], chips: ['React 19', 'React Router', 'Tailwind CSS', 'JWT'], vis: visNotebook, box: [310, 292], scale: 1.36 },
  { repo: 'PRODIGY_SD_01', theme: 'java', p: 'j', eyebrow: 'JAVA FUNDAMENTALS / TASK 01', title: 'Temperature Converter', tagline: 'Celsius, Fahrenheit, Kelvin.', desc: ['A command-line Java program that converts', 'temperatures between all three scales.'], chips: ['Java', 'CLI', 'Prodigy InfoTech'], vis: visThermo, box: [320, 290], scale: 1.36 },
  { repo: 'PRODIGY_SD_02', theme: 'java', p: 'j', eyebrow: 'JAVA FUNDAMENTALS / TASK 02', title: 'Number Guessing Game', tagline: 'Higher. Lower. Got it.', desc: ['Guess a random number from 1 to 100 with', 'higher or lower hints and an attempt count.'], chips: ['Java', 'CLI', 'Prodigy InfoTech'], vis: visGuess, box: [320, 300], scale: 1.36 },
  { repo: 'PRODIGY_SD_03', theme: 'java', p: 'j', eyebrow: 'JAVA FUNDAMENTALS / TASK 03', title: 'Contact Manager', tagline: 'Add, view, edit, delete.', desc: ['A Java command-line contact book that keeps', 'contacts in memory or in a file.'], chips: ['Java', 'CLI', 'File I/O', 'Prodigy InfoTech'], vis: visContacts, box: [320, 296], scale: 1.36 },
  { repo: 'PRODIGY_SD_04', theme: 'java', p: 'j', eyebrow: 'JAVA FUNDAMENTALS / TASK 04', title: 'Sudoku Solver', tagline: 'Backtracking, cell by cell.', desc: ['Reads a 9x9 puzzle and solves it with the', 'classic backtracking algorithm.'], chips: ['Java', 'Algorithms', 'Backtracking', 'Prodigy InfoTech'], vis: visSudoku, box: [316, 296], scale: 1.36 },
];

const ORBS = {
  snapbuy: [{ x: 1080, y: 80, r: 360, c: '#D4FF3A', a: 0.35, dx: -40, dy: 30 }, { x: 120, y: 620, r: 320, c: '#FF3B30', a: 0.1, dx: 40, dy: -30 }],
  skylink: [{ x: 1000, y: 560, r: 440, c: '#38BDF8', a: 0.26, dx: -60, dy: -30 }, { x: 140, y: 0, r: 340, c: '#6366F1', a: 0.3, dx: 50, dy: 30 }],
  holo: [{ x: 1040, y: 60, r: 400, c: '#C084FC', a: 0.34, dx: -50, dy: 40 }, { x: 120, y: 620, r: 360, c: '#60A5FA', a: 0.24, dx: 50, dy: -40 }, { x: 640, y: 640, r: 260, c: '#F472B6', a: 0.18, dx: 40, dy: -30 }],
  yusr: [{ x: 1040, y: 80, r: 420, c: '#D85A30', a: 0.42, dx: -50, dy: 40 }, { x: 140, y: 640, r: 380, c: '#B8441F', a: 0.3, dx: 50, dy: -40 }],
  challenge: [{ x: 1060, y: 100, r: 420, c: '#3A5BFF', a: 0.42, dx: -50, dy: 30 }, { x: 120, y: 620, r: 340, c: '#5B8CFF', a: 0.2, dx: 60, dy: -30 }],
  diary: [{ x: 1080, y: 60, r: 380, c: '#F97316', a: 0.2, dx: -40, dy: 30 }, { x: 180, y: 640, r: 360, c: '#16A34A', a: 0.14, dx: 40, dy: -30 }],
  java: [{ x: 1060, y: 80, r: 420, c: '#F89820', a: 0.3, dx: -50, dy: 40 }, { x: 100, y: 640, r: 360, c: '#5382A1', a: 0.3, dx: 60, dy: -30 }],
};

function repoBanner(cfg) {
  const t = THEMES[cfg.theme], W = 1200, H = 600, p = cfg.p;
  const d = new Doc(`${cfg.repo}/banner`, W, H, t);
  const ids = paint(d, t, p);
  const under = cfg.stars ? stars(d, t, 16, 16, W - 32, H - 32, 120, 5) : '';
  const [sl] = slab(d, t, p, 8, 8, W - 16, H - 16, 48, { grid: t.dark ? 72 : 64, under, orbs: ORBS[cfg.theme], grain: t.dark ? 0.07 : 0.05 });
  d.add(sl);
  const LX = 72;
  d.add(rise(0.1, eyebrow(d, t, LX, 64, cfg.eyebrow, { size: 13 })[0]));
  let size = 84;
  const tx = cfg.logo ? LX + 92 : LX - 4;
  while (measure(cfg.title, 's600', size, -size * 0.045) > 590 - (tx - LX)) size -= 2;
  if (cfg.logo) d.add(rise(0.25, yusrLogo(LX, 232 - size * 0.78, size * 0.9)));
  let title = '';
  if (cfg.marker) {
    const pre = cfg.title.slice(0, cfg.title.length - cfg.marker.length), mx = tx + measure(pre, 's600', size, -size * 0.045) - 4;
    title += `<rect x="${mx}" y="${232 - size * 0.72}" width="${measure(cfg.marker, 's600', size, -size * 0.045) + 14}" height="${size * 0.8}" rx="8" fill="${t.lime}" transform="rotate(-2 ${mx + 60} 200)"/>`;
  }
  title += d.text(tx, 232, cfg.title, { font: 's600', size, ls: -size * 0.045, fill: t.dark ? `url(#${ids.h1})` : t.ink });
  d.add(rise(0.28, title));
  d.add(rise(0.42, d.text(LX, 300, cfg.tagline, { font: 'serif', size: 46, ls: -0.5, fill: t.dark ? `url(#${ids.acc})` : t.accent })));
  d.add(rise(0.56, cfg.desc.map((l, i) => d.text(LX, 362 + i * 32, l, { font: 's300', size: 22, fill: t.ink, op: t.dark ? 0.62 : 0.74 })).join('')));
  d.add(rise(0.7, chipRow(d, t, LX, 450, cfg.chips, { size: 13 })));
  d.add(rise(0.85, `<path d="M${LX} 516H660" stroke="${t.ink}" stroke-opacity="${t.dark ? 0.08 : 0.1}"/>` + d.text(LX, 548, `GITHUB.COM/FARHAN7-TECH/${cfg.repo.toUpperCase()}`, { font: 'm400', size: 11.5, ls: 2, fill: t.ink, op: 0.45 })));
  const [bw, bh] = cfg.box, s = cfg.scale;
  const vx = 700 + (440 - bw * s) / 2, vy = (H - bh * s) / 2 + 6;
  d.add(`<g transform="translate(${vx.toFixed(1)} ${vy.toFixed(1)}) scale(${s})">${cfg.vis(d)}</g>`);
  return d;
}

function repoFooter(cfg) {
  const t = THEMES[cfg.theme], W = 1200, H = 150, p = cfg.p;
  const d = new Doc(`${cfg.repo}/footer`, W, H, t);
  paint(d, t, p);
  const [sl] = slab(d, t, p, 8, 8, W - 16, H - 16, 40, { orbs: [{ ...ORBS[cfg.theme][0], y: 80, r: 300, x: 1100 }], grain: t.dark ? 0.07 : 0.05 });
  d.add(sl);
  d.add(rise(0.1, `<circle cx="84" cy="75" r="26" fill="url(#${p}acc)"/>` + d.text(84, 80, 'MF', { font: 'm500', size: 14, fill: t.dark ? t.base : '#fff', anchor: 'middle' }) +
    d.text(126, 66, 'BUILT BY', { font: 'm500', size: 11, ls: 2.2, fill: t.ink, op: 0.5 }) + d.text(126, 94, 'Mohd Farhan', { font: 's600', size: 26, ls: -0.8, fill: t.ink })));
  d.add(rise(0.25, d.text(W / 2, 81, 'Full-stack developer  /  Java, Spring Boot, React, Next.js', { font: 's300', size: 17, fill: t.ink, op: t.dark ? 0.55 : 0.7, anchor: 'middle' })));
  const bw = 250, bh = 58, bx = W - 64 - bw, by = 75 - bh / 2;
  d.add(rise(0.4, `<rect x="${bx + 0.5}" y="${by + 0.5}" width="${bw - 1}" height="${bh - 1}" rx="${bh / 2}" fill="${t.ink}" fill-opacity=".05" stroke="${t.ink}" stroke-opacity=".12"/><rect x="${bx + 5}" y="${by + 5}" width="${bw - 10}" height="${bh - 10}" rx="${(bh - 10) / 2}" fill="${t.accent}"/>` +
    d.text(bx + 26, by + 35, 'More projects', { font: 's500', size: 17, fill: t.dark && cfg.theme !== 'yusr' && cfg.theme !== 'challenge' ? t.base : '#fff' }) +
    arrowDisc(d, t, bx + bw - 5 - 19, by + bh / 2, 19, { fill: t.dark && cfg.theme !== 'yusr' && cfg.theme !== 'challenge' ? t.base : '#fff', op: 0.16, stroke: t.dark && cfg.theme !== 'yusr' && cfg.theme !== 'challenge' ? t.base : '#fff', sw: 1.8 })));
  return d;
}

// ============================================================
async function emit(docs, outDir) {
  for (const F of Object.values(FONTS)) {
    if (!F.chars.size) continue;
    F.b64 = (await subsetFont(fs.readFileSync(F.file + '.woff2'), [...F.chars].join('') + ' ', { targetFormat: 'woff2' })).toString('base64');
  }
  let total = 0;
  for (const d of docs) {
    const svg = await d.render(), file = path.join(outDir, d.name + '.svg');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, svg);
    total += svg.length;
    console.log(d.name.padEnd(40), (svg.length / 1024).toFixed(1) + ' KB');
  }
  console.log('total', (total / 1024).toFixed(0) + ' KB ->', outDir);
}

(async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--repos') {
    const out = args[1] || path.join(__dirname, 'repos-out');
    const docs = [];
    for (const cfg of REPOS) docs.push(repoBanner(cfg), repoFooter(cfg));
    return emit(docs, out);
  }
  const out = args[0] || path.join(__dirname, '..', 'assets');
  const docs = [hero(), toolkit(), footer(), cardYusr(), cardNumbers(), cardSnapbuy(), cardSkylink(), cardEmail(), cardLab()];
  for (const th of ['dark', 'light']) {
    docs.push(button('Portfolio', 'primary', th), button('LinkedIn', 'plain', th), button('YUSR AI', 'yusr', th), button('Codolio', 'plain', th));
    docs.push(heading('work', '01', 'SELECTED WORK', "Things I've shipped,", 'not just started.', th));
    docs.push(heading('stack', '02', 'TOOLKIT', 'The stack I reach for', 'every day.', th));
    docs.push(heading('activity', '03', 'ACTIVITY', 'Commits, quietly', 'compounding.', th));
  }
  return emit(docs, out);
})();
