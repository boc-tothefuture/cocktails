import fs from 'node:fs';
import path from 'node:path';

const SITE_ORIGIN = 'https://hortonscreekcocktails.com';
const FALLBACK_IMAGE = 'assets/archive/the-alley-cocktail.jpg';

const ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' '
};

function decodeHtml(str) {
  return str
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITY_MAP[entity] ?? entity)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function extractSessionShareData(html) {
  const sections = html.split(/(?=<section\s+class="archive-session"\s)/).slice(1);
  return sections
    .map((chunk) => {
      const end = chunk.indexOf('</section>');
      const block = end === -1 ? chunk : chunk.slice(0, end);
      const id = /id="([^"]+)"/.exec(block)?.[1] ?? '';
      if (!id) return null;

      const date = decodeHtml(/class="session-date">([\s\S]*?)<\/span>/.exec(block)?.[1] ?? '');
      const host = decodeHtml(/class="session-host">([\s\S]*?)<\/span>/.exec(block)?.[1] ?? '');
      const title = decodeHtml(/class="session-title">([\s\S]*?)<\/h3>/.exec(block)?.[1] ?? id);
      const desc = decodeHtml(/class="session-desc">([\s\S]*?)<\/p>/.exec(block)?.[1] ?? '');
      const cardCount = block
        .split(/(?=<article[^>]*\bvault-card\b)/)
        .slice(1)
        .filter((card) => !card.includes('vault-missing-card')).length;

      const firstImg =
        /<div class="card-visual">[\s\S]*?<img[^>]+src="([^"]+)"/.exec(block)?.[1] ??
        FALLBACK_IMAGE;

      return { id, date, host, title, desc, cardCount, imagePath: firstImg };
    })
    .filter((entry) => entry !== null);
}

export function buildSharePageHtml(session) {
  const pageTitle = `${session.title}${session.date ? ` (${session.date})` : ''} — The League of Extraordinary Cocktails`;
  const countText = `${session.cardCount} cocktail${session.cardCount === 1 ? '' : 's'}`;
  const ogDesc = [session.desc, `${countText}${session.host ? ` · ${session.host}` : ''}`]
    .filter(Boolean)
    .join(' — ');
  const imageUrl = `${SITE_ORIGIN}/${session.imagePath.replace(/^\/+/, '')}`;
  const canonicalShareUrl = `${SITE_ORIGIN}/s/${session.id}/`;
  const redirectTarget = `../../#${session.id}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeAttr(pageTitle)}</title>
  <meta name="description" content="${escapeAttr(ogDesc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeAttr(canonicalShareUrl)}">
  <meta property="og:title" content="${escapeAttr(pageTitle)}">
  <meta property="og:description" content="${escapeAttr(ogDesc)}">
  <meta property="og:image" content="${escapeAttr(imageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(pageTitle)}">
  <meta name="twitter:description" content="${escapeAttr(ogDesc)}">
  <meta name="twitter:image" content="${escapeAttr(imageUrl)}">
  <meta http-equiv="refresh" content="0; url=${escapeAttr(redirectTarget)}">
  <link rel="icon" type="image/svg+xml" href="../../assets/favicon.svg">
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 2rem;
      background: #0b0807;
      color: #f5efe8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: center;
    }
    a {
      color: #f5b563;
      text-decoration: underline;
    }
  </style>
  <script>
    window.location.replace(${JSON.stringify(redirectTarget)});
  </script>
</head>
<body>
  <main>
    <p>Opening <strong>${escapeAttr(session.title)}</strong> on The League of Extraordinary Cocktails…</p>
    <p><a href="${escapeAttr(redirectTarget)}">Continue to the tasting menu</a></p>
  </main>
</body>
</html>
`;
}

export function generateSharePages(rootDir = path.resolve(import.meta.dirname, '..')) {
  const htmlPath = path.join(rootDir, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const sessions = extractSessionShareData(html);
  const shareRoot = path.join(rootDir, 's');
  fs.rmSync(shareRoot, { recursive: true, force: true });

  for (const session of sessions) {
    const outDir = path.join(shareRoot, session.id);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), buildSharePageHtml(session), 'utf8');
  }
  return sessions;
}

if (import.meta.main) {
  const generated = generateSharePages();
  console.log(`Generated ${generated.length} per-session social preview pages under s/`);
}
