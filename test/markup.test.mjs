import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildSharePageHtml, extractSessionShareData } from '../scripts/generate-share-pages.mjs';
import { matchCanonicalRule } from '../src/vault-matcher.ts';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const cards = html
  .split(/(?=<article[^>]*\bvault-card\b)/)
  .slice(1)
  .map((chunk) => {
    const end = chunk.indexOf('</article>');
    return end === -1 ? chunk : chunk.slice(0, end);
  });
const realCards = cards.filter((c) => !c.includes('vault-missing-card'));

const text = (s) =>
  s
    .replace(/<span class="spec-note">.*?<\/span>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

test('vault has the advertised number of cocktails everywhere', () => {
  const n = realCards.length;
  const meta = /content="[^"]*?(\d+) craft cocktails/.exec(html);
  const og = /og:description" content="[^"]*?(\d+) cocktails/.exec(html);
  assert.equal(Number(meta?.[1]), n, 'meta description count');
  assert.equal(Number(og?.[1]), n, 'og:description count');
  assert.match(html, new RegExp(`Search ${n} cocktails`), 'search placeholder count');
});

test('every vault card has the fields the search index reads', () => {
  for (const card of realCards) {
    const id = /id="([^"]+)"/.exec(card)?.[1];
    assert.match(card, /class="card-title"[^>]*>\s*\S/, `${id}: card-title`);
    assert.match(card, /class="card-story"[^>]*>\s*\S/, `${id}: card-story`);
    assert.match(card, /class="spec-name"/, `${id}: spec-name`);
    assert.match(card, /data-host="/, `${id}: data-host`);
  }
});

test('every spec ingredient classifies, except known auto-discovered items', () => {
  // Items not covered by a canonical rule fall to auto-discovery. Add a keyword rule
  // (or data-ing / data-shelf) when a new one appears, then extend this list only if intended.
  const knownAuto = new Set([]);
  const unmatched = new Set();
  for (const card of realCards) {
    for (const li of card.matchAll(/<li class="spec-item([^"]*)"[^>]*>(.*?)<\/li>/gs)) {
      if (li[1].includes('spec-garnish') || /data-optional="true"/.test(li[0])) continue;
      const name = /<span class="spec-name">(.*?)<\/span>(?!\s*<\/span>)/s.exec(li[2])?.[1];
      if (!name) continue;
      const low = text(name).toLowerCase();
      if (low && !matchCanonicalRule(low) && !knownAuto.has(low)) unmatched.add(low);
    }
  }
  assert.deepEqual([...unmatched].sort(), []);
});

test('per-session social preview extractor finds all sessions with session-specific og:image', () => {
  const sessions = extractSessionShareData(html);
  assert.equal(sessions.length, 12);
  const images = new Set(sessions.map((s) => s.imagePath));
  assert.ok(images.size >= 10, 'sessions should use distinct lead cocktail images');
  for (const session of sessions) {
    assert.ok(session.imagePath.startsWith('assets/'), `${session.id} image`);
    const shareHtml = buildSharePageHtml(session);
    assert.match(
      shareHtml,
      new RegExp(
        `property="og:image" content="https://hortonscreekcocktails\\.com/${session.imagePath.replace(/\./g, '\\.')}"`
      )
    );
    assert.match(
      shareHtml,
      new RegExp(`window\\.location\\.replace\\("\\.\\./\\.\\./#${session.id}"\\)`)
    );
  }
});
