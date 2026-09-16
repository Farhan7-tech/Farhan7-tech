// Generates every SVG for the Farhan7-tech profile README.
// Design language: Ethereal Glass (warm near-black, glow orbs, cream hairlines) in YUSR AI brand colours + Asymmetrical Bento.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const subsetFont = require('subset-font');

// Usage: npm install && node build.js [outDir]   (default: ../assets, the profile repo's assets/ folder)
const OUT = process.argv[2] || path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });
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
for (const f of Object.values(FONTS)) {
  f.ot = opentype.loadSync(f.file + '.woff');
  f.chars = new Set();
}

const EASE = 'cubic-bezier(0.32,0.72,0,1)';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function measure(str, font, size, ls = 0) {
  const f = FONTS[font].ot;
  return f.getAdvanceWidth(str, size, { kerning: true }) + ls * Math.max(0, [...str].length - 1);
}

// ---------- per-SVG document ----------
class Doc {
  constructor(name, W, H, theme = 'dark') {
    Object.assign(this, { name, W, H, theme, used: new Set(), body: [], defs: [], css: [] });
    this.dark = theme === 'dark';
    this.ink = this.dark ? '#F4EEE2' : '#1C1714';
  }
  add(s) { this.body.push(s); return this; }
  def(s) { this.defs.push(s); return this; }
  style(s) { this.css.push(s); return this; }
  text(x, y, str, o = {}) {
    const font = o.font || 's400';
    const F = FONTS[font];
    this.used.add(font);
    for (const ch of str) F.chars.add(ch);
    const a = [
      `x="${x}" y="${y}"`,
      `font-family="${F.fam}" font-weight="${F.w}"`,
      F.style === 'italic' ? 'font-style="italic"' : '',
      `font-size="${o.size || 16}"`,
      o.ls ? `letter-spacing="${o.ls}"` : '',
      `fill="${o.fill || this.ink}"`,
      o.op != null ? `fill-opacity="${o.op}"` : '',
      o.anchor ? `text-anchor="${o.anchor}"` : '',
    ].filter(Boolean).join(' ');
    return `<text ${a}>${esc(str)}</text>`;
  }
  async render() {
    const faces = [];
    for (const key of this.used) {
      const F = FONTS[key];
      faces.push(`@font-face{font-family:'${F.fam}';font-weight:${F.w};font-style:${F.style};src:url(data:font/woff2;base64,${F.b64}) format('woff2')}`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.W}" height="${this.H}" viewBox="0 0 ${this.W} ${this.H}" fill="none">
<defs>${this.defs.join('\n')}</defs>
<style><![CDATA[
${faces.join('\n')}
text{text-rendering:geometricPrecision}
.r{animation:rise 1.15s ${EASE} backwards}
@keyframes rise{from{opacity:0;transform:translateY(26px);filter:blur(10px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ${EASE} infinite}
@keyframes pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(3.2);opacity:0}}
${this.css.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
]]></style>
${this.body.join('\n')}
</svg>`;
  }
}

const delay = (s) => `style="animation-delay:${s.toFixed(2)}s"`;
const rise = (s, inner) => `<g class="r" ${delay(s)}>${inner}</g>`;

// ---------- shared visual primitives ----------
function glassDefs(d, id = 'c') {
  d.def(`<linearGradient id="${id}core" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E0B09"/><stop offset="1" stop-color="#070605"/></linearGradient>`);
  d.def(`<linearGradient id="${id}hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EEE2" stop-opacity=".18"/><stop offset=".22" stop-color="#F4EEE2" stop-opacity=".045"/><stop offset="1" stop-color="#F4EEE2" stop-opacity=".03"/></linearGradient>`);
  d.def(`<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`);
  d.def(`<linearGradient id="emer" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0A07E"/><stop offset=".55" stop-color="#D85A30"/><stop offset="1" stop-color="#B8441F"/></linearGradient>`);
  d.def(`<linearGradient id="vio" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4EEE2"/><stop offset="1" stop-color="#CDB9A0"/></linearGradient>`);
  d.def(`<linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EEE2"/><stop offset="1" stop-color="#F4EEE2" stop-opacity=".62"/></linearGradient>`);
}

// Double-bezel: outer aluminium tray + inner glass core with a top highlight.
function bezel(d, x, y, w, h, r, o = {}) {
  const p = o.pad ?? 7;
  const id = o.id || 'c';
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r}" fill="#F4EEE2" fill-opacity="${o.shell ?? 0.035}" stroke="#F4EEE2" stroke-opacity=".085"/>
<rect x="${x + p}" y="${y + p}" width="${w - 2 * p}" height="${h - 2 * p}" rx="${r - p}" fill="${o.core || `url(#${id}core)`}"/>
<rect x="${x + p + 0.5}" y="${y + p + 0.5}" width="${w - 2 * p - 1}" height="${h - 2 * p - 1}" rx="${r - p - 0.5}" stroke="url(#${id}hl)"/>`;
}

function orbs(d, list, clipId) {
  list.forEach((o, i) => {
    d.def(`<radialGradient id="orb${i}"><stop offset="0" stop-color="${o.c}" stop-opacity="${o.a}"/><stop offset=".45" stop-color="${o.c}" stop-opacity="${o.a * 0.35}"/><stop offset="1" stop-color="${o.c}" stop-opacity="0"/></radialGradient>`);
    d.style(`.orb${i}{animation:drift${i} ${o.t || 18}s cubic-bezier(0.37,0,0.63,1) infinite alternate}
@keyframes drift${i}{from{transform:translate(0,0)}to{transform:translate(${o.dx || 40}px,${o.dy || -30}px)}}`);
  });
  return `<g clip-path="url(#${clipId})">${list.map((o, i) => `<g class="orb${i}"><circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="url(#orb${i})"/></g>`).join('')}</g>`;
}

function grain(d, clipId, x, y, w, h, op = 0.055) {
  return `<g clip-path="url(#${clipId})"><rect x="${x}" y="${y}" width="${w}" height="${h}" filter="url(#grain)" opacity="${op}"/></g>`;
}

function gridLines(d, clipId, x, y, w, h, step = 80) {
  d.def(`<radialGradient id="gridfade" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#F4EEE2" stop-opacity="1"/><stop offset="1" stop-color="#F4EEE2" stop-opacity="0"/></radialGradient>
<mask id="gridmask"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gridfade)"/></mask>`);
  let s = '';
  for (let gx = x + step; gx < x + w; gx += step) s += `<path d="M${gx} ${y}V${y + h}"/>`;
  for (let gy = y + step; gy < y + h; gy += step) s += `<path d="M${x} ${gy}H${x + w}"/>`;
  return `<g clip-path="url(#${clipId})" mask="url(#gridmask)" stroke="#F4EEE2" stroke-opacity=".045">${s}</g>`;
}

// Microscopic eyebrow pill. Returns [svg, width].
function eyebrow(d, x, y, label, o = {}) {
  const size = o.size || 12.5, ls = size * 0.2;
  const dot = o.dot !== false;
  const tw = measure(label, 'm500', size, ls);
  const h = size * 2.3, padL = dot ? size * 2.2 : size * 1.1, w = padL + tw + size * 1.1;
  const cy = y + h / 2;
  const dark = d.dark;
  let s = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="${d.ink}" fill-opacity="${dark ? 0.04 : 0.035}" stroke="${d.ink}" stroke-opacity="${dark ? 0.1 : 0.1}"/>`;
  if (dot) {
    const c = o.color || '#D85A30';
    s += `<circle class="pulse" cx="${x + size * 1.15}" cy="${cy}" r="${size * 0.26}" fill="${c}"/><circle cx="${x + size * 1.15}" cy="${cy}" r="${size * 0.26}" fill="${c}"/>`;
  }
  s += d.text(x + padL, cy + size * 0.36, label, { font: 'm500', size, ls, op: dark ? 0.62 : 0.6 });
  return [s, w, h];
}

// Arrow-in-a-circle ("button-in-button" trailing icon).
function arrowDisc(d, cx, cy, r, o = {}) {
  const k = r * 0.3;
  d.style(`.nudge{animation:nudge 3.6s ${EASE} infinite}
@keyframes nudge{0%,62%,100%{transform:translate(0,0)}74%{transform:translate(3px,-3px)}}`);
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${o.fill || d.ink}" fill-opacity="${o.op ?? (d.dark ? 0.1 : 0.07)}"/>
<g class="nudge"><path d="M${cx - k} ${cy + k}L${cx + k} ${cy - k}M${cx - k * 0.55} ${cy - k}H${cx + k}V${cy + k * 0.55}" stroke="${o.stroke || d.ink}" stroke-width="${o.sw || 1.6}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function chip(d, x, y, label, o = {}) {
  const size = o.size || 12, ls = size * 0.08;
  const tw = measure(label, 'm400', size, ls);
  const h = size * 2.4, w = tw + size * 2;
  return [`<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="#F4EEE2" fill-opacity=".03" stroke="#F4EEE2" stroke-opacity=".1"/>${d.text(x + size, y + h / 2 + size * 0.36, label, { font: 'm400', size, ls, op: 0.66 })}`, w];
}

function chipRow(d, x, y, labels, o = {}) {
  let cx = x, s = '';
  for (const l of labels) { const [c, w] = chip(d, cx, y, l, o); s += c; cx += w + 8; }
  return s;
}

// The real YUSR AI mark (from the brand favicon), drawn at any size.
function yusrLogo(x, y, size) {
  const k = size / 200;
  return `<g transform="translate(${x} ${y}) scale(${k})"><rect width="200" height="200" rx="44" fill="#070605" stroke="#F4EEE2" stroke-opacity=".16" stroke-width="${1 / k}"/><g transform="translate(60 40)"><path d="M0 0L40 60L80 0" stroke="#F4EEE2" stroke-width="14" stroke-linecap="square"/><path d="M40 60V124" stroke="#F4EEE2" stroke-width="14" stroke-linecap="square"/><circle cx="40" cy="30" r="9" fill="#D85A30"/></g></g>`;
}

function checkIcon(x, y, c = '#D85A30') {
  return `<path d="M${x} ${y}l4 4 8-9" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ============================================================
// HERO
// ============================================================
function hero() {
  const W = 1200, H = 720, d = new Doc('hero', W, H);
  glassDefs(d);
  const X = 8, Y = 8, w = W - 16, h = H - 16, R = 48, P = 8;
  d.def(`<clipPath id="core"><rect x="${X + P}" y="${Y + P}" width="${w - 2 * P}" height="${h - 2 * P}" rx="${R - P}"/></clipPath>`);
  d.def(`<linearGradient id="card2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15110E"/><stop offset="1" stop-color="#0A0806"/></linearGradient>`);
  d.add(bezel(d, X, Y, w, h, R, { pad: P, core: '#070605' }));
  d.add(orbs(d, [
    { x: 1010, y: 110, r: 420, c: '#B8441F', a: 0.55, dx: -70, dy: 40, t: 16 },
    { x: 150, y: 700, r: 440, c: '#D85A30', a: 0.42, dx: 60, dy: -50, t: 19 },
    { x: 760, y: 640, r: 260, c: '#B8441F', a: 0.18, dx: -40, dy: -30, t: 14 },
  ], 'core'));
  d.add(gridLines(d, 'core', X + P, Y + P, w - 2 * P, h - 2 * P, 72));
  d.add(grain(d, 'core', X + P, Y + P, w - 2 * P, h - 2 * P, 0.07));
  d.add(`<rect x="${X + P + 0.5}" y="${Y + P + 0.5}" width="${w - 2 * P - 1}" height="${h - 2 * P - 1}" rx="${R - P - 0.5}" stroke="url(#chl)"/>`);

  // Floating status island
  {
    const name = 'Mohd Farhan', role = 'Full-stack developer', live = 'ONLINE';
    const nW = measure(name, 's500', 16), rW = measure(role, 's400', 16), lW = measure(live, 'm500', 11.5, 2.3);
    const iw = 18 + 34 + 14 + nW + 26 + rW + 30 + lW + 22 + 18, ih = 56;
    const ix = (W - iw) / 2, iy = 48, cy = iy + ih / 2;
    let s = `<rect x="${ix - 5.5}" y="${iy - 5.5}" width="${iw + 11}" height="${ih + 11}" rx="${(ih + 11) / 2}" fill="#F4EEE2" fill-opacity=".025" stroke="#F4EEE2" stroke-opacity=".07"/>
<rect x="${ix + 0.5}" y="${iy + 0.5}" width="${iw - 1}" height="${ih - 1}" rx="${ih / 2}" fill="#0D0A08" fill-opacity=".86" stroke="#F4EEE2" stroke-opacity=".1"/>`;
    let cx = ix + 11;
    s += `<circle cx="${cx + 17}" cy="${cy}" r="17" fill="url(#emer)"/>` + d.text(cx + 17, cy + 4.3, 'MF', { font: 'm500', size: 12, ls: 0.5, fill: '#F4EEE2', anchor: 'middle' });
    cx += 34 + 14;
    s += d.text(cx, cy + 5.6, name, { font: 's500', size: 16 });
    cx += nW + 13;
    s += `<circle cx="${cx}" cy="${cy}" r="1.6" fill="#F4EEE2" fill-opacity=".3"/>`;
    cx += 13;
    s += d.text(cx, cy + 5.6, role, { font: 's400', size: 16, op: 0.52 });
    cx += rW + 16;
    s += `<path d="M${cx} ${cy - 13}V${cy + 13}" stroke="#F4EEE2" stroke-opacity=".1"/>`;
    cx += 16;
    s += `<circle class="pulse" cx="${cx + 3}" cy="${cy}" r="3.2" fill="#D85A30"/><circle cx="${cx + 3}" cy="${cy}" r="3.2" fill="#D85A30"/>`;
    s += d.text(cx + 14, cy + 4.1, live, { font: 'm500', size: 11.5, ls: 2.3, op: 0.6 });
    d.add(rise(0.05, s));
  }

  // Left editorial block
  const LX = 92;
  d.add(rise(0.25, eyebrow(d, LX, 170, 'AVAILABLE FOR FULL-STACK ROLES', { size: 13 })[0]));
  const h1 = 84, l1 = 'I build products';
  d.add(rise(0.4, `<g>${d.text(LX - 4, 318, l1, { font: 's600', size: h1, ls: -h1 * 0.045, fill: 'url(#h1)' })}</g>`));
  const l2a = 'end to ';
  const l2aW = measure(l2a, 's600', h1, -h1 * 0.045);
  d.add(rise(0.55, d.text(LX - 4, 408, l2a, { font: 's600', size: h1, ls: -h1 * 0.045, fill: 'url(#h1)' }) +
    d.text(LX - 4 + l2aW + 2, 410, 'end.', { font: 'serif', size: h1 * 1.18, ls: -1, fill: 'url(#emer)' })));
  d.add(rise(0.72, d.text(LX, 474, 'Java & Spring Boot backends, React & Next.js frontends.', { font: 's300', size: 21, op: 0.62 }) +
    d.text(LX, 506, 'Currently shipping YUSR AI, a WhatsApp CRM for Indian businesses.', { font: 's300', size: 21, op: 0.62 })));

  // Meta row
  {
    const items = ['BASED IN INDIA', 'JAVA / SPRING / NEXT.JS', 'SHIPPING SINCE 2023'];
    let cx = LX, s = '';
    items.forEach((it, i) => {
      if (i) { s += `<path d="M${cx} 603V621" stroke="#F4EEE2" stroke-opacity=".14"/>`; cx += 20; }
      s += d.text(cx, 617, it, { font: 'm400', size: 12.5, ls: 2.2, op: 0.42 });
      cx += measure(it, 'm400', 12.5, 2.2) + 20;
    });
    d.add(rise(0.9, `<path d="M${LX} 572H${cx - 20}" stroke="#F4EEE2" stroke-opacity=".08"/>` + s));
  }

  // Right: Z-axis cascade
  d.style(`.float{animation:float 7s cubic-bezier(0.37,0,0.63,1) infinite alternate}
.float2{animation:float 8.5s cubic-bezier(0.37,0,0.63,1) infinite alternate-reverse}
@keyframes float{from{transform:translateY(-7px)}to{transform:translateY(7px)}}
.caret{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}`);
  // back card: numbers
  {
    const cx = 846, cy = 128, cw = 290, ch = 196;
    let s = bezel(d, 0, 0, cw, ch, 30, { pad: 6, core: 'url(#card2)' });
    s += d.text(28, 46, 'YUSR / TEST SUITE', { font: 'm500', size: 11, ls: 2.2, op: 0.45 });
    s += d.text(26, 124, '598', { font: 's300', size: 76, ls: -3, fill: 'url(#vio)' });
    s += d.text(28, 160, 'TESTS PASSING ON MAIN', { font: 'm400', size: 11.5, ls: 1.8, op: 0.55 });
    s += `<circle cx="${cw - 36}" cy="41" r="4" fill="#E8C9B4"/><circle class="pulse" cx="${cw - 36}" cy="41" r="4" fill="#E8C9B4"/>`;
    d.add(`<g transform="translate(${cx} ${cy}) rotate(5 ${cw / 2} ${ch / 2})"><g class="float2">${rise(1.05, s)}</g></g>`);
  }
  // front card: terminal
  {
    const cx = 764, cy = 318, cw = 372, ch = 272;
    let s = bezel(d, 0, 0, cw, ch, 32, { pad: 7, core: 'url(#card2)' });
    s += [0, 1, 2].map((i) => `<circle cx="${34 + i * 18}" cy="38" r="5" stroke="#F4EEE2" stroke-opacity=".22"/>`).join('');
    s += d.text(cw - 30, 42, 'yusr - main', { font: 'm400', size: 12, op: 0.4, anchor: 'end' }) + yusrLogo(cw - 30 - measure('yusr - main', 'm400', 12) - 30, 27, 20);
    s += `<path d="M7 62H${cw - 7}" stroke="#F4EEE2" stroke-opacity=".07"/>`;
    const lines = [
      ['$', 'git push origin main', 0.9, null],
      ['ok', 'type-check / lint / test', 0.72, '#D85A30'],
      ['ok', '598 tests passed', 0.72, '#D85A30'],
      ['ok', 'secret scan clean', 0.72, '#D85A30'],
      ['live', 'deployed to yusr.co.in', 0.95, '#D85A30'],
    ];
    lines.forEach(([k, t, op, c], i) => {
      const y = 104 + i * 34;
      let l = '';
      if (k === '$') l += d.text(32, y, '$', { font: 'm500', size: 15, fill: '#E8C9B4' });
      else if (k === 'ok') l += checkIcon(30, y - 7, c);
      else l += `<circle cx="37" cy="${y - 5}" r="4" fill="${c}"/><circle class="pulse" cx="37" cy="${y - 5}" r="4" fill="${c}"/>`;
      l += d.text(56, y, t, { font: 'm400', size: 15, op });
      if (i === lines.length - 1) l += `<rect class="caret" x="${56 + measure(t, 'm400', 15) + 6}" y="${y - 13}" width="8" height="16" rx="1" fill="#D85A30" fill-opacity=".85"/>`;
      s += rise(1.35 + i * 0.28, l);
    });
    d.add(`<g transform="translate(${cx} ${cy}) rotate(-3 ${cw / 2} ${ch / 2})"><g class="float">${rise(1.15, s)}</g></g>`);
  }
  d.def(`<linearGradient id="chl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EEE2" stop-opacity=".16"/><stop offset=".2" stop-color="#F4EEE2" stop-opacity=".03"/><stop offset="1" stop-color="#F4EEE2" stop-opacity=".02"/></linearGradient>`);
  return d;
}

// ============================================================
// CTA BUTTONS (light + dark)
// ============================================================
function button(label, primary, theme) {
  const W = 360, H = 112, d = new Doc(`btn-${label.toLowerCase().replace(/[^a-z]/g, '')}-${theme}`, W, H, theme);
  const dark = theme === 'dark';
  const ox = 6, oy = 6, ow = W - 12, oh = H - 12;
  const ix = ox + 6, iy = oy + 6, iw = ow - 12, ih = oh - 12;
  d.def(`<linearGradient id="bhl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EEE2" stop-opacity="${primary ? 0.38 : 0.2}"/><stop offset=".5" stop-color="#F4EEE2" stop-opacity="0"/></linearGradient>`);
  let s = `<rect x="${ox + 0.5}" y="${oy + 0.5}" width="${ow - 1}" height="${oh - 1}" rx="${oh / 2}" fill="${d.ink}" fill-opacity="${dark ? 0.04 : 0.035}" stroke="${d.ink}" stroke-opacity="${dark ? 0.1 : 0.09}"/>`;
  let coreFill, txt, discFill, discOp, stroke;
  if (primary) {
    coreFill = '#D85A30'; txt = '#F4EEE2';
  } else {
    coreFill = dark ? '#110D0B' : '#F4EEE2'; txt = d.ink;
  }
  discFill = txt; discOp = primary ? 0.1 : (dark ? 0.1 : 0.06); stroke = txt;
  s += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${ih / 2}" fill="${coreFill}"${!primary && !dark ? ' stroke="#1C1714" stroke-opacity=".06"' : ''}/>`;
  if (dark || primary) s += `<rect x="${ix + 0.5}" y="${iy + 0.5}" width="${iw - 1}" height="${ih - 1}" rx="${ih / 2}" stroke="url(#bhl)" stroke-opacity="1"/>`;
  let lx = ix + 34;
  if (label === 'YUSR AI') { s += yusrLogo(ix + 22, iy + ih / 2 - 19, 38); lx = ix + 72; }
  s += d.text(lx, iy + ih / 2 + 8.4, label, { font: 's500', size: 23.5, ls: -0.3, fill: txt });
  const r = ih / 2 - 7;
  s += arrowDisc(d, ix + iw - 7 - r, iy + ih / 2, r, { fill: discFill, op: discOp, stroke, sw: 2 });
  d.add(s);
  return d;
}

// ============================================================
// SECTION HEADINGS (light + dark)
// ============================================================
function heading(key, num, label, sans, serif, theme) {
  const W = 1200, H = 236, d = new Doc(`h-${key}-${theme}`, W, H, theme);
  d.def(`<linearGradient id="emerT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme === 'dark' ? '#F0A07E' : '#B8441F'}"/><stop offset="1" stop-color="${theme === 'dark' ? '#B8441F' : '#8A3A1E'}"/></linearGradient>`);
  d.add(rise(0.05, eyebrow(d, 14, 36, `${num} — ${label}`, { size: 13, dot: true, color: theme === 'dark' ? '#D85A30' : '#B8441F' })[0]));
  let size = 66;
  const fit = () => measure(sans, 's600', size, -size * 0.04) + 16 + measure(serif, 'serif', size * 1.16, -0.5);
  while (fit() > W - 40) size -= 1;
  const sw = measure(sans, 's600', size, -size * 0.04);
  d.add(rise(0.2, d.text(10, 170, sans, { font: 's600', size, ls: -size * 0.04, op: 1 })));
  d.add(rise(0.36, d.text(10 + sw + 16, 172, serif, { font: 'serif', size: size * 1.16, ls: -0.5, fill: 'url(#emerT)' })));
  d.add(rise(0.5, `<path d="M14 214H${W - 14}" stroke="${d.ink}" stroke-opacity="${theme === 'dark' ? 0.09 : 0.08}"/>`));
  return d;
}

// ============================================================
// BENTO CARDS (dark glass; transparent gutter)
// ============================================================
const CH = 452; // every bento image shares this height so rows align
function cardShell(name, W, accent) {
  const d = new Doc(name, W, CH);
  glassDefs(d);
  const X = 10, Y = 10, w = W - 20, h = CH - 20, R = 38, P = 7;
  d.def(`<clipPath id="core"><rect x="${X + P}" y="${Y + P}" width="${w - 2 * P}" height="${h - 2 * P}" rx="${R - P}"/></clipPath>`);
  d.add(bezel(d, X, Y, w, h, R, { pad: P, core: '#0A0806' }));
  d.add(orbs(d, accent, 'core'));
  d.add(grain(d, 'core', X + P, Y + P, w - 2 * P, h - 2 * P, 0.06));
  d.add(`<rect x="${X + P + 0.5}" y="${Y + P + 0.5}" width="${w - 2 * P - 1}" height="${h - 2 * P - 1}" rx="${R - P - 0.5}" stroke="url(#chl)"/>`);
  d.def(`<linearGradient id="chl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EEE2" stop-opacity=".17"/><stop offset=".25" stop-color="#F4EEE2" stop-opacity=".035"/><stop offset="1" stop-color="#F4EEE2" stop-opacity=".025"/></linearGradient>`);
  return d;
}

function cardText(d, x, o) {
  let s = '';
  s += rise(0.1, eyebrow(d, x, 48, o.eyebrow, { size: 11.5, color: o.dot })[0]);
  const tx = o.logo ? x + 70 : x - 2;
  if (o.logo) s += rise(0.2, yusrLogo(x, o.titleY - 48, 56));
  s += rise(0.24, d.text(tx, o.titleY, o.title, { font: 's600', size: o.titleSize || 46, ls: -(o.titleSize || 46) * 0.04, fill: 'url(#h1)' }));
  if (o.tagline) s += rise(0.34, d.text(x, o.titleY + 42, o.tagline, { font: 'serif', size: 29, op: 0.78, fill: o.tagFill || '#F4EEE2' }));
  s += rise(0.46, o.desc.map((l, i) => d.text(x, o.descY + i * 27, l, { font: 's300', size: 17.5, op: 0.55 })).join(''));
  s += rise(0.6, chipRow(d, x, o.chipsY, o.chips));
  return s;
}

function cardYusr() {
  const W = 800, d = cardShell('card-yusr', W, [
    { x: 700, y: 60, r: 320, c: '#D85A30', a: 0.34, dx: -40, dy: 30, t: 15 },
    { x: 120, y: 470, r: 240, c: '#B8441F', a: 0.22, dx: 40, dy: -20, t: 18 },
  ]);
  d.add(cardText(d, 50, {
    eyebrow: 'FLAGSHIP / LIVE', title: 'YUSR AI', titleY: 158, titleSize: 54, logo: true,
    tagline: 'WhatsApp CRM, with a brain.', tagFill: 'url(#emer)',
    desc: ['Shared team inbox, bulk broadcasts from', 'Google Sheets, and an AI assistant trained', 'on each business\'s own catalog.'], descY: 250,
    chips: ['Next.js', 'TypeScript', 'Supabase', 'n8n'], chipsY: 362,
  }));
  d.add(arrowDisc(d, W - 60, 64, 24));
  // phone-like chat panel
  const px = 470, py = 104, pw = 280, ph = 318;
  let s = bezel(d, px, py, pw, ph, 30, { pad: 6, core: '#0D0A08' });
  s += `<circle cx="${px + 38}" cy="${py + 38}" r="13" fill="url(#emer)" fill-opacity=".9"/>`;
  s += d.text(px + 60, py + 35, 'Customer', { font: 's500', size: 14 });
  s += d.text(px + 60, py + 52, 'via WhatsApp', { font: 'm400', size: 10.5, op: 0.45, ls: 0.5 });
  s += `<path d="M${px + 6} ${py + 68}H${px + pw - 6}" stroke="#F4EEE2" stroke-opacity=".07"/>`;
  d.add(rise(0.3, s));
  // bubbles
  const bub = (bx, by, bw, bh, lines, out, t) => {
    let b = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="15" fill="${out ? '#D85A30' : '#F4EEE2'}" fill-opacity="${out ? 0.16 : 0.06}" stroke="${out ? '#D85A30' : '#F4EEE2'}" stroke-opacity="${out ? 0.35 : 0.08}"/>`;
    lines.forEach((l, i) => { b += d.text(bx + 14, by + 25 + i * 19, l, { font: 's400', size: 13.5, op: out ? 0.92 : 0.8 }); });
    return rise(t, b);
  };
  d.add(bub(px + 18, py + 86, 190, 48, ['Any gold hoops', 'under Rs 20,000?'], false, 0.9));
  d.add(bub(px + 62, py + 146, 200, 67, ['Yes! 3 styles in stock.', 'Sending the catalog', 'right now.'], true, 1.5));
  {
    let c = `<rect x="${px + 62}" y="${py + 224}" width="200" height="58" rx="15" fill="#D85A30" fill-opacity=".1" stroke="#D85A30" stroke-opacity=".28"/>`;
    [0, 1, 2].forEach((i) => { c += `<rect x="${px + 74 + i * 60}" y="${py + 234}" width="52" height="38" rx="9" fill="#F4EEE2" fill-opacity="${0.07 + i * 0.03}"/>`; });
    d.add(rise(2.05, c));
  }
  d.style(`.dot{animation:typing 1.3s ${EASE} infinite}@keyframes typing{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:.9;transform:translateY(-3px)}}`);
  {
    let t = `<rect x="${px + 118}" y="${py + 283}" width="36" height="17" rx="8.5" fill="#D85A30" fill-opacity=".12"/>` + d.text(px + 136, py + 295.5, 'AI', { font: 'm500', size: 10, ls: 1.5, fill: '#D85A30', anchor: 'middle' });
    [0, 1, 2].forEach((i) => { t += `<circle class="dot" style="animation-delay:${i * 0.16}s" cx="${px + 28 + i * 12}" cy="${py + 292}" r="3.2" fill="#F4EEE2"/>`; });
    d.add(rise(2.4, t));
  }
  return d;
}

function cardNumbers() {
  const W = 400, d = cardShell('card-numbers', W, [{ x: 360, y: 440, r: 260, c: '#B8441F', a: 0.34, dx: -30, dy: -40, t: 17 }]);
  d.add(rise(0.1, eyebrow(d, 46, 48, 'BY THE NUMBERS', { size: 11.5, color: '#E8C9B4' })[0]));
  const rows = [['598', 'TESTS IN YUSR\'S SUITE', 'url(#vio)'], ['243', 'CI RUNS ON MAIN', 'url(#h1)'], ['21', 'REPOSITORIES BUILT', 'url(#emer)']];
  rows.forEach(([n, l, f], i) => {
    const y = 158 + i * 104;
    let s = d.text(44, y, n, { font: 's300', size: 66, ls: -3, fill: f });
    s += d.text(48, y + 28, l, { font: 'm400', size: 11.5, ls: 1.9, op: 0.5 });
    if (i < 2) s += `<path d="M46 ${y + 50}H${W - 46}" stroke="#F4EEE2" stroke-opacity=".07"/>`;
    d.add(rise(0.3 + i * 0.16, s));
  });
  return d;
}

function cardSnapbuy() {
  const W = 500, d = cardShell('card-snapbuy', W, [{ x: 420, y: 80, r: 280, c: '#D85A30', a: 0.24, dx: -30, dy: 30, t: 16 }, { x: 60, y: 420, r: 200, c: '#F4EEE2', a: 0.16, t: 19 }]);
  d.add(arrowDisc(d, W - 60, 64, 24));
  // product cascade
  const tile = (x, y, rot, price, t, hue) => {
    let s = bezel(d, 0, 0, 118, 140, 20, { pad: 5, core: '#100C0A' });
    s += `<rect x="14" y="14" width="90" height="70" rx="12" fill="${hue}" fill-opacity=".22"/>`;
    s += `<circle cx="59" cy="49" r="18" stroke="${hue}" stroke-opacity=".7" stroke-width="1.4"/>`;
    s += `<rect x="14" y="96" width="60" height="6" rx="3" fill="#F4EEE2" fill-opacity=".22"/>`;
    s += d.text(14, 124, price, { font: 'm500', size: 12.5, op: 0.8 });
    return `<g transform="translate(${x} ${y}) rotate(${rot} 59 70)">${rise(t, s)}</g>`;
  };
  d.add(tile(168, 104, -8, '$ 49', 0.5, '#D85A30'));
  d.add(tile(244, 96, 2, '$ 129', 0.65, '#F4EEE2'));
  d.add(tile(318, 112, 9, '$ 79', 0.8, '#E8A27F'));
  {
    const [c] = [`<rect x="316" y="224" width="136" height="36" rx="18" fill="#F4EEE2" fill-opacity=".92"/>` +
      d.text(338, 247, 'Checkout', { font: 's500', size: 14.5, fill: '#1C1714' }) +
      `<circle cx="433" cy="242" r="11" fill="#1C1714" fill-opacity=".1"/><path d="M429 246l8-8M431 238h6v6" stroke="#1C1714" stroke-width="1.5" stroke-linecap="round"/>`];
    d.add(rise(1.1, c));
  }
  d.add(rise(0.1, eyebrow(d, 46, 48, 'E-COMMERCE', { size: 11.5, color: '#D85A30' })[0]));
  d.add(rise(0.24, d.text(44, 310, 'SnapBuy', { font: 's600', size: 44, ls: -1.8, fill: 'url(#h1)' })));
  d.add(rise(0.4, d.text(46, 344, 'JWT auth, cart, addresses and Stripe checkout.', { font: 's300', size: 17, op: 0.55 })));
  d.add(rise(0.55, chipRow(d, 46, 372, ['Spring Boot', 'React', 'Redux', 'PostgreSQL'], { size: 11.5 })));
  return d;
}

function cardSkylink() {
  const W = 700, d = cardShell('card-skylink', W, [{ x: 600, y: 360, r: 300, c: '#D85A30', a: 0.26, dx: -40, dy: -30, t: 17 }, { x: 100, y: 40, r: 220, c: '#8A3A1E', a: 0.2, t: 20 }]);
  d.add(cardText(d, 48, {
    eyebrow: 'FILE SHARING', title: 'SkyLink', titleY: 156,
    tagline: 'Share a file with six digits.', tagFill: '#F4EEE2',
    desc: ['Spring Boot + MongoDB with JWT auth,', 'shareable links and Razorpay, plus a', 'plain-Java P2P transfer engine.'], descY: 246,
    chips: ['Spring Boot', 'MongoDB', 'React'], chipsY: 360,
  }));
  d.add(arrowDisc(d, W - 60, 64, 24));
  // transfer diagram
  const A = [440, 150], B = [610, 262];
  const node = (x, y, label, t) => {
    let s = `<circle cx="${x}" cy="${y}" r="38" fill="#F4EEE2" fill-opacity=".035" stroke="#F4EEE2" stroke-opacity=".1"/><circle cx="${x}" cy="${y}" r="30" fill="#100C0A" stroke="#F4EEE2" stroke-opacity=".12"/>`;
    s += `<path d="M${x - 8} ${y - 10}h11l5 5v15h-16z" stroke="#F0A07E" stroke-width="1.4" stroke-linejoin="round"/>`;
    s += d.text(x, y + 60, label, { font: 'm500', size: 10.5, ls: 2, op: 0.45, anchor: 'middle' });
    return rise(t, s);
  };
  const pathD = `M${A[0] + 30} ${A[1] + 10} C ${A[0] + 120} ${A[1] + 6}, ${B[0] - 110} ${B[1] - 14}, ${B[0] - 30} ${B[1] - 6}`;
  d.add(rise(0.7, `<path d="${pathD}" stroke="#F0A07E" stroke-opacity=".35" stroke-dasharray="3 6" stroke-linecap="round"/>`));
  [0, 1, 2].forEach((i) => {
    d.add(`<circle r="4" fill="#F0A07E"><animateMotion dur="2.6s" begin="${1.2 + i * 0.45}s" repeatCount="indefinite" path="${pathD}" calcMode="spline" keyTimes="0;1" keySplines="0.32 0.72 0 1"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.8;1" dur="2.6s" begin="${1.2 + i * 0.45}s" repeatCount="indefinite"/></circle>`);
  });
  d.add(node(A[0], A[1], 'UPLOAD', 0.5));
  d.add(node(B[0], B[1], 'DOWNLOAD', 0.62));
  // six-digit code
  const code = '482915';
  code.split('').forEach((c, i) => {
    const bx = 400 + i * 44, by = 360;
    let s = `<rect x="${bx + 0.5}" y="${by + 0.5}" width="37" height="45" rx="11" fill="#F4EEE2" fill-opacity=".03" stroke="#F4EEE2" stroke-opacity=".09"/><rect x="${bx + 4}" y="${by + 4}" width="30" height="38" rx="8" fill="#100C0A" stroke="#F0A07E" stroke-opacity="${i === 5 ? 0.6 : 0.14}"/>`;
    s += d.text(bx + 19, by + 30, c, { font: 'm500', size: 19, anchor: 'middle', op: 0.92 });
    d.add(rise(1.0 + i * 0.1, s));
  });
  return d;
}

function cardEmail() {
  const W = 700, d = cardShell('card-email', W, [{ x: 620, y: 80, r: 300, c: '#D85A30', a: 0.3, dx: -40, dy: 40, t: 16 }, { x: 80, y: 460, r: 220, c: '#8A3A1E', a: 0.18, t: 21 }]);
  d.add(cardText(d, 48, {
    eyebrow: 'GENERATIVE AI', title: 'AI Email Assistant', titleY: 156, titleSize: 40,
    tagline: 'Replies that write themselves.', tagFill: 'url(#vio)',
    desc: ['Spring Boot + Google Gemini behind a', 'React web app and a Chrome extension', 'that drafts replies in one click.'], descY: 246,
    chips: ['Spring Boot', 'React', 'Gemini', 'Chrome'], chipsY: 360,
  }));
  d.add(arrowDisc(d, W - 60, 64, 24));
  const px = 404, py = 110, pw = 262, ph = 300;
  let s = bezel(d, px, py, pw, ph, 28, { pad: 6, core: '#0D0A08' });
  s += d.text(px + 26, py + 40, 'Re: Project timeline', { font: 's500', size: 14.5, op: 0.9 });
  s += d.text(px + 26, py + 58, 'Draft', { font: 'm400', size: 10.5, ls: 1.6, op: 0.42 });
  s += `<path d="M${px + 6} ${py + 74}H${px + pw - 6}" stroke="#F4EEE2" stroke-opacity=".07"/>`;
  d.add(rise(0.4, s));
  d.style(`.write{transform-box:fill-box;transform-origin:left center;animation:write 1.1s ${EASE} backwards}@keyframes write{from{transform:scaleX(0);opacity:.2}to{transform:scaleX(1);opacity:1}}`);
  const widths = [206, 188, 214, 150, 196, 120];
  widths.forEach((w, i) => {
    d.add(`<rect class="write" style="animation-delay:${(1.1 + i * 0.22).toFixed(2)}s" x="${px + 26}" y="${py + 96 + i * 22}" width="${w}" height="8" rx="4" fill="${i < 3 ? '#F4EEE2' : '#F4EEE2'}" fill-opacity="${i < 3 ? 0.5 : 0.18}"/>`);
  });
  d.style(`.spark{transform-box:fill-box;transform-origin:center;animation:spark 2.8s ${EASE} infinite}@keyframes spark{0%,100%{transform:scale(.85) rotate(0deg)}50%{transform:scale(1.12) rotate(45deg)}}`);
  {
    const bx = px + 26, by = py + 238, bw = 174, bh = 38;
    let b = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="19" fill="url(#vio)" fill-opacity=".95"/>`;
    b += `<path class="spark" d="M${bx + 24} ${by + 9}q1.6 8.4 10 10q-8.4 1.6-10 10q-1.6-8.4-10-10q8.4-1.6 10-10z" fill="#070605"/>`;
    b += d.text(bx + 42, by + 24.5, 'Generate reply', { font: 's500', size: 14, fill: '#070605' });
    d.add(rise(2.5, b));
  }
  return d;
}

function cardLab() {
  const W = 500, d = cardShell('card-lab', W, [{ x: 80, y: 60, r: 240, c: '#D85A30', a: 0.2, dx: 30, dy: 30, t: 18 }]);
  d.add(rise(0.1, eyebrow(d, 46, 48, 'ALSO IN THE LAB', { size: 11.5 })[0]));
  const rows = [['SkyLink P2P Service', 'JAVA'], ['YUSR Website', 'HTML'], ['Daily Diary', 'REACT'], ['ChallengeApp', 'REACT'], ['Java algorithm set', 'JAVA']];
  rows.forEach(([n, t], i) => {
    const y = 132 + i * 46;
    let s = d.text(46, y, n, { font: 's400', size: 19, op: 0.86 });
    s += d.text(W - 46, y - 1, t, { font: 'm400', size: 11, ls: 2, op: 0.4, anchor: 'end' });
    s += `<path d="M46 ${y + 17}H${W - 46}" stroke="#F4EEE2" stroke-opacity=".07"/>`;
    d.add(rise(0.25 + i * 0.1, s));
  });
  {
    const bx = 46, by = 368, bw = 250, bh = 48;
    let s = `<rect x="${bx + 0.5}" y="${by + 0.5}" width="${bw - 1}" height="${bh - 1}" rx="${bh / 2}" fill="#F4EEE2" fill-opacity=".04" stroke="#F4EEE2" stroke-opacity=".1"/>`;
    s += `<rect x="${bx + 4}" y="${by + 4}" width="${bw - 8}" height="${bh - 8}" rx="${(bh - 8) / 2}" fill="#F4EEE2"/>`;
    s += d.text(bx + 24, by + 29.5, 'All repositories', { font: 's500', size: 15.5, fill: '#1C1714' });
    s += arrowDisc(d, bx + bw - 4 - 16 - 4, by + bh / 2, 16, { fill: '#1C1714', op: 0.1, stroke: '#1C1714', sw: 1.5 });
    d.add(rise(0.85, s));
  }
  return d;
}

// ============================================================
// TOOLKIT MARQUEE
// ============================================================
function toolkit() {
  const W = 1200, H = 360, d = new Doc('toolkit', W, H);
  glassDefs(d);
  const X = 8, Y = 8, w = W - 16, h = H - 16, R = 44, P = 8;
  d.def(`<clipPath id="core"><rect x="${X + P}" y="${Y + P}" width="${w - 2 * P}" height="${h - 2 * P}" rx="${R - P}"/></clipPath>`);
  d.def(`<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F4EEE2" stop-opacity="0"/><stop offset=".14" stop-color="#F4EEE2"/><stop offset=".86" stop-color="#F4EEE2"/><stop offset="1" stop-color="#F4EEE2" stop-opacity="0"/></linearGradient><mask id="edgemask"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask>`);
  d.def(`<linearGradient id="chl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EEE2" stop-opacity=".16"/><stop offset=".25" stop-color="#F4EEE2" stop-opacity=".03"/><stop offset="1" stop-color="#F4EEE2" stop-opacity=".02"/></linearGradient>`);
  d.add(bezel(d, X, Y, w, h, R, { pad: P, core: '#070605' }));
  d.add(orbs(d, [{ x: 200, y: 60, r: 300, c: '#D85A30', a: 0.22, dx: 80, dy: 20, t: 17 }, { x: 1000, y: 340, r: 320, c: '#B8441F', a: 0.3, dx: -80, dy: -20, t: 19 }], 'core'));
  d.add(grain(d, 'core', X + P, Y + P, w - 2 * P, h - 2 * P, 0.06));
  d.add(`<rect x="${X + P + 0.5}" y="${Y + P + 0.5}" width="${w - 2 * P - 1}" height="${h - 2 * P - 1}" rx="${R - P - 0.5}" stroke="url(#chl)"/>`);

  const rowA = [['Java', '#D85A30'], ['Spring Boot', '#D85A30'], ['Spring Security', '#D85A30'], ['PostgreSQL', '#E8C9B4'], ['MongoDB', '#D85A30'], ['Supabase', '#D85A30'], ['Maven', '#F0A07E'], ['REST APIs', '#F4EEE2'], ['Microservices', '#E8C9B4']];
  const rowB = [['TypeScript', '#E8C9B4'], ['Next.js', '#F4EEE2'], ['React', '#B8441F'], ['Redux Toolkit', '#E8C9B4'], ['Tailwind CSS', '#D85A30'], ['Gemini API', '#CDB9A0'], ['n8n', '#F0A07E'], ['GitHub Actions', '#F4EEE2'], ['Docker', '#D85A30'], ['Vitest', '#D85A30'], ['Sentry', '#F4EEE2']];
  const pill = (x, y, [label, c]) => {
    const size = 19, tw = measure(label, 's500', size, -0.2), ph = 60, pw = tw + 70;
    const s = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${pw - 1}" height="${ph - 1}" rx="${ph / 2}" fill="#F4EEE2" fill-opacity=".035" stroke="#F4EEE2" stroke-opacity=".09"/>
<rect x="${x + 6}" y="${y + 6}" width="${pw - 12}" height="${ph - 12}" rx="${(ph - 12) / 2}" fill="#0E0B09"/>
<rect x="${x + 6.5}" y="${y + 6.5}" width="${pw - 13}" height="${ph - 13}" rx="${(ph - 13) / 2}" stroke="url(#chl)"/>
<circle cx="${x + 30}" cy="${y + ph / 2}" r="4.5" fill="${c}"/><circle cx="${x + 30}" cy="${y + ph / 2}" r="9" fill="${c}" fill-opacity=".14"/>
${d.text(x + 46, y + ph / 2 + 6.6, label, { font: 's500', size, ls: -0.2, op: 0.9 })}`;
    return [s, pw];
  };
  const track = (items, y) => {
    let x = 0, s = '';
    for (const it of items) { const [p, pw] = pill(x, y, it); s += p; x += pw + 14; }
    return [s, x];
  };
  const [ta, wa] = track(rowA, 0), [tb, wb] = track(rowB, 0);
  d.style(`.mqa{animation:mqa 46s linear infinite}@keyframes mqa{from{transform:translateX(0)}to{transform:translateX(-${wa}px)}}
.mqb{animation:mqb 52s linear infinite}@keyframes mqb{from{transform:translateX(-${wb}px)}to{transform:translateX(0)}}`);
  d.add(`<g clip-path="url(#core)" mask="url(#edgemask)">
<g transform="translate(40 92)">${rise(0.2, `<g class="mqa">${ta}<g transform="translate(${wa} 0)">${ta}</g><g transform="translate(${2 * wa} 0)">${ta}</g></g>`)}</g>
<g transform="translate(40 178)">${rise(0.4, `<g class="mqb">${tb}<g transform="translate(${wb} 0)">${tb}</g><g transform="translate(${2 * wb} 0)">${tb}</g></g>`)}</g>
</g>`);
  const cap = 'BACKEND  /  FRONTEND  /  DATA  /  AI  /  DEVOPS';
  d.add(rise(0.6, d.text(W / 2, 64, 'STACK / IN DAILY USE', { font: 'm500', size: 12, ls: 2.6, op: 0.42, anchor: 'middle' }) +
    d.text(W / 2, 300, cap, { font: 'm400', size: 12, ls: 2.4, op: 0.36, anchor: 'middle' })));
  return d;
}

// ============================================================
// FOOTER
// ============================================================
function footer() {
  const W = 1200, H = 560, d = new Doc('footer', W, H);
  glassDefs(d);
  const X = 8, Y = 8, w = W - 16, h = H - 16, R = 48, P = 8;
  d.def(`<clipPath id="core"><rect x="${X + P}" y="${Y + P}" width="${w - 2 * P}" height="${h - 2 * P}" rx="${R - P}"/></clipPath>`);
  d.def(`<linearGradient id="chl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EEE2" stop-opacity=".16"/><stop offset=".2" stop-color="#F4EEE2" stop-opacity=".03"/><stop offset="1" stop-color="#F4EEE2" stop-opacity=".02"/></linearGradient>`);
  d.add(bezel(d, X, Y, w, h, R, { pad: P, core: '#070605' }));
  d.add(orbs(d, [
    { x: 600, y: 620, r: 520, c: '#D85A30', a: 0.42, dx: 0, dy: -40, t: 16 },
    { x: 160, y: 60, r: 300, c: '#B8441F', a: 0.34, dx: 50, dy: 30, t: 19 },
    { x: 1080, y: 120, r: 280, c: '#B8441F', a: 0.16, dx: -50, dy: 30, t: 14 },
  ], 'core'));
  d.add(gridLines(d, 'core', X + P, Y + P, w - 2 * P, h - 2 * P, 72));
  d.add(grain(d, 'core', X + P, Y + P, w - 2 * P, h - 2 * P, 0.07));
  d.add(`<rect x="${X + P + 0.5}" y="${Y + P + 0.5}" width="${w - 2 * P - 1}" height="${h - 2 * P - 1}" rx="${R - P - 0.5}" stroke="url(#chl)"/>`);
  const [eb, ew] = eyebrow(d, 0, 0, '04 — CONTACT', { size: 13 });
  d.add(rise(0.1, `<g transform="translate(${(W - ew) / 2} 84)">${eb}</g>`));
  d.add(rise(0.25, d.text(W / 2, 250, "Let's build something", { font: 's600', size: 86, ls: -3.6, anchor: 'middle', fill: 'url(#h1)' })));
  d.add(rise(0.42, d.text(W / 2, 352, 'that ships.', { font: 'serif', size: 112, ls: -1.5, anchor: 'middle', fill: 'url(#emer)' })));
  d.add(rise(0.6, d.text(W / 2, 414, 'Open to backend & full-stack roles and freelance work.', { font: 's300', size: 22, op: 0.6, anchor: 'middle' })));
  d.add(rise(0.8, `<path d="M${W / 2 - 260} 462H${W / 2 + 260}" stroke="#F4EEE2" stroke-opacity=".08"/>` +
    d.text(W / 2, 498, 'MOHD FARHAN  /  INDIA  /  UTC+5:30', { font: 'm400', size: 12.5, ls: 2.6, op: 0.42, anchor: 'middle' })));
  return d;
}

// ============================================================
(async () => {
  const docs = [hero(), toolkit(), footer(), cardYusr(), cardNumbers(), cardSnapbuy(), cardSkylink(), cardEmail(), cardLab()];
  for (const t of ['dark', 'light']) {
    docs.push(button('Portfolio', true, t), button('LinkedIn', false, t), button('YUSR AI', false, t), button('Codolio', false, t));
    docs.push(heading('work', '01', 'SELECTED WORK', "Things I've shipped,", 'not just started.', t));
    docs.push(heading('stack', '02', 'TOOLKIT', 'The stack I reach for', 'every day.', t));
    docs.push(heading('activity', '03', 'ACTIVITY', 'Commits, quietly', 'compounding.', t));
  }
  for (const F of Object.values(FONTS)) {
    if (!F.chars.size) continue;
    const buf = await subsetFont(fs.readFileSync(F.file + '.woff2'), [...F.chars].join('') + ' ', { targetFormat: 'woff2' });
    F.b64 = buf.toString('base64');
  }
  let total = 0;
  for (const d of docs) {
    const svg = await d.render();
    fs.writeFileSync(path.join(OUT, d.name + '.svg'), svg);
    total += svg.length;
    console.log(d.name.padEnd(26), (svg.length / 1024).toFixed(1) + ' KB');
  }
  console.log('total', (total / 1024).toFixed(0) + ' KB');
})();
