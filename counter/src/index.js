// Profile views counter for github.com/Farhan7-tech.
// GET /views.svg[?theme=light]  -> increments the count and returns the badge
// GET /views.svg?peek=1         -> returns the badge without counting (for previews)
// GET /health                   -> "ok"
import { META, MONO_500_WOFF2 } from './assets.js';

const EASE = 'cubic-bezier(0.32,0.72,0,1)';
const THEMES = {
  dark: { shell: '#FFFFFF', shellOp: 0.04, stroke: 0.1, core: '#0C0C0F', ink: '#FFFFFF', dot: '#34D399', hl: 0.16 },
  light: { shell: '#0A0A0A', shellOp: 0.035, stroke: 0.09, core: '#FFFFFF', ink: '#0A0A0A', dot: '#059669', hl: 0 },
};

async function bump(db) {
  const row = await db
    .prepare("INSERT INTO counters (name, n) VALUES ('profile', 1) ON CONFLICT(name) DO UPDATE SET n = n + 1 RETURNING n")
    .first();
  return row.n;
}

async function peek(db) {
  const row = await db.prepare("SELECT n FROM counters WHERE name = 'profile'").first();
  return row ? row.n : 0;
}

export function badge(count, themeName) {
  const t = THEMES[themeName] || THEMES.dark;
  const text = count.toLocaleString('en-US');
  const { cell, digitSize: size, labelWidth } = META;
  const lh = size * 1.05;
  const H = 96;
  const labelX = 60;
  const sepX = labelX + labelWidth + 24;
  const digitsX = sepX + 24;
  const W = Math.ceil(digitsX + text.length * cell + 38);
  const base = 60; // digit baseline

  let defs = '';
  let css = '';
  let digits = '';
  [...text].forEach((ch, i) => {
    const x = digitsX + i * cell;
    if (ch === ',') {
      digits += `<text x="${x + cell / 2}" y="${base}" text-anchor="middle" class="d">,</text>`;
      return;
    }
    const n = 10 + Number(ch); // one full turn, then settle on the digit
    defs += `<clipPath id="c${i}"><rect x="${x - 2}" y="${base - size * 0.86}" width="${cell + 4}" height="${size * 1.12}"/></clipPath>`;
    css += `.r${i}{animation:k${i} ${(1.4 + i * 0.22).toFixed(2)}s ${EASE} .25s backwards}@keyframes k${i}{from{transform:translateY(${(n * lh).toFixed(2)}px)}}`;
    let col = '';
    for (let k = 0; k <= n; k++) col += `<text x="${x + cell / 2}" y="${(base + (k - n) * lh).toFixed(2)}" text-anchor="middle" class="d">${k % 10}</text>`;
    digits += `<g clip-path="url(#c${i})"><g class="r${i}">${col}</g></g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Profile views: ${text}">
<title>Profile views: ${text}</title>
<defs>${defs}<linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${t.hl}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<style><![CDATA[
@font-face{font-family:'GeistMono';font-weight:500;src:url(data:font/woff2;base64,${MONO_500_WOFF2}) format('woff2')}
text{font-family:'GeistMono',ui-monospace,monospace;font-weight:500}
.l{font-size:${META.labelSize}px;letter-spacing:${META.labelLs}px;fill:${t.ink};fill-opacity:.6}
.d{font-size:${size}px;fill:${t.ink}}
.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ${EASE} infinite}
@keyframes pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(3.2);opacity:0}}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
]]></style>
<rect x="4.5" y="4.5" width="${W - 9}" height="${H - 9}" rx="${(H - 9) / 2}" fill="${t.shell}" fill-opacity="${t.shellOp}" stroke="${t.shell}" stroke-opacity="${t.stroke}"/>
<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="${(H - 20) / 2}" fill="${t.core}"${themeName === 'light' ? ' stroke="#0A0A0A" stroke-opacity=".06"' : ''}/>
<rect x="10.5" y="10.5" width="${W - 21}" height="${H - 21}" rx="${(H - 21) / 2}" stroke="url(#hl)"/>
<circle class="pulse" cx="40" cy="48" r="4" fill="${t.dot}"/><circle cx="40" cy="48" r="4" fill="${t.dot}"/>
<text x="${labelX}" y="52.5" class="l">${META.label}</text>
<path d="M${sepX} 32V64" stroke="${t.ink}" stroke-opacity=".12"/>
${digits}
</svg>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('ok');
    if (url.pathname !== '/views.svg') return new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });

    const count = url.searchParams.has('peek') || request.method === 'HEAD' ? await peek(env.DB) : await bump(env.DB);
    const theme = url.searchParams.get('theme') === 'light' ? 'light' : 'dark';
    return new Response(badge(count, theme), {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        // GitHub's image proxy must refetch on every view, or the count stops moving.
        'Cache-Control': 'max-age=0, no-cache, no-store, must-revalidate',
        Expires: '0',
        ETag: `"${count}-${theme}"`,
      },
    });
  },
};
