// Profile views counter for github.com/Farhan7-tech.
// GET /views.svg[?theme=light]  -> counts the view (subject to cooldown and pause) and returns the badge
// GET /views.svg?peek=1         -> returns the badge without counting (for previews)
// GET /pause?key=...            -> owner: stop counting for PAUSE_MS (open before checking your own profile)
// GET /resume?key=...           -> owner: end the pause early
// GET /health                   -> "ok"
//
// Why not just "skip the owner": GitHub fetches README images through its camo proxy, so every
// request arrives from GitHub's servers with no cookies and no viewer IP. The Worker cannot tell
// the owner from anyone else, so it relies on a cooldown plus an explicit pause switch instead.
import { META, MONO_500_WOFF2 } from './assets.js';

const COOLDOWN_MS = 10 * 60 * 1000; // a burst of refreshes counts once
const PAUSE_MS = 60 * 60 * 1000;

const EASE = 'cubic-bezier(0.32,0.72,0,1)';
const THEMES = {
  dark: { shell: '#FFFFFF', shellOp: 0.04, stroke: 0.1, core: '#0C0C0F', ink: '#FFFFFF', dot: '#34D399', hl: 0.16 },
  light: { shell: '#0A0A0A', shellOp: 0.035, stroke: 0.09, core: '#FFFFFF', ink: '#0A0A0A', dot: '#059669', hl: 0 },
};

// Counts a view only if the cooldown has passed and the owner hasn't paused counting. The check and
// the increment are one statement, so two simultaneous requests can't both get through.
async function bump(db, now) {
  const row = await db
    .prepare(
      `UPDATE counters SET n = n + 1, last_at = ?1
       WHERE name = 'profile' AND COALESCE(last_at, 0) <= ?1 - ?2 AND COALESCE(paused_until, 0) <= ?1
       RETURNING n`,
    )
    .bind(now, COOLDOWN_MS)
    .first();
  return row ? row.n : peek(db);
}

// Constant-time comparison, so the key can't be guessed byte by byte from response timing.
function keyMatches(given, expected) {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function page(title, lines) {
  const body = lines.map((l) => `<p>${l}</p>`).join('');
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#050505;color:#fff;font:16px/1.6 ui-sans-serif,system-ui,sans-serif}
main{max-width:30rem;padding:2rem}h1{font-size:1.4rem;margin:0 0 .75rem}p{margin:.4rem 0;color:#ffffffb3}a{color:#34D399}</style>
<main><h1>${title}</h1>${body}</main>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

const ist = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

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
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });

    if (url.pathname === '/pause' || url.pathname === '/resume') {
      if (!keyMatches(url.searchParams.get('key'), env.PAUSE_KEY)) return new Response('Not found', { status: 404 });
      const now = Date.now();
      const until = url.pathname === '/pause' ? now + PAUSE_MS : 0;
      await env.DB.prepare("UPDATE counters SET paused_until = ?1 WHERE name = 'profile'").bind(until).first();
      return url.pathname === '/pause'
        ? page('Counting paused', [`Your profile views won't be counted until <b>${ist(until)} IST</b>.`, '<a href="https://github.com/Farhan7-tech">Open your profile →</a>', 'Visitors during this hour aren\'t counted either.'])
        : page('Counting resumed', ['Profile views are being counted again.', '<a href="https://github.com/Farhan7-tech">Open your profile →</a>']);
    }

    if (url.pathname !== '/views.svg') return new Response('Not found', { status: 404 });
    const count = url.searchParams.has('peek') || request.method === 'HEAD' ? await peek(env.DB) : await bump(env.DB, Date.now());
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
