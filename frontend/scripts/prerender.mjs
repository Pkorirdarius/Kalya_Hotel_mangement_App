/**
 * Static prerender for the 12 indexable marketing routes in EN and SW.
 *
 * Runs after `vite build` and reuses the real router/page components so the
 * generated HTML cannot drift from the app. CMS data is deliberately not
 * fetched here: static copy is the fallback, then React Query loads live data
 * after hydration. Only a missing critical page (no H1 or no metadata) fails
 * the build; dynamic blog slugs are handled by scripts/refresh_blog_routes.py.
 */
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(FRONTEND_ROOT, 'dist');
const TEMPLATE = path.join(DIST_DIR, 'index.html');
const SOURCE_TEMPLATE = path.join(DIST_DIR, 'index.source.html');
const LANGUAGES = ['en', 'sw'];
const EXPECTED_CRITICAL_ROUTES = 12;

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'");
}

function extractH1(markup, label) {
  const matches = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one <h1>, found ${matches.length}`);
  }
  const text = decodeEntities(matches[0][1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
  if (!text) {
    throw new Error(`${label}: the rendered <h1> is empty`);
  }
  return text;
}

function replaceOnce(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`Prerender template is missing ${label}`);
  }
  return html.replace(pattern, replacement);
}

function outputPathFor(routePath) {
  const segments = routePath.split('/').filter(Boolean);
  return segments.length ? path.join(DIST_DIR, ...segments, 'index.html') : path.join(DIST_DIR, 'index.html');
}

function buildHtml(template, page, body, h1) {
  const attribute = escapeAttribute;
  let html = template;

  html = replaceOnce(html, /<html lang="[^"]*">/i, `<html lang="${page.language}">`, 'html lang');
  html = replaceOnce(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${attribute(page.title)}</title>`,
    '<title>',
  );
  html = replaceOnce(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${attribute(page.description)}" />`,
    'meta description',
  );
  html = replaceOnce(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s+data-origin="([^"]*)"\s*\/?>/i,
    (_match, origin) =>
      `<link\n      rel="canonical"\n      href="${attribute(page.canonical)}"\n      data-origin="${attribute(origin)}"\n    />`,
    'canonical link',
  );

  for (const hreflang of ['en', 'sw', 'x-default']) {
    html = replaceOnce(
      html,
      new RegExp(`<link rel="alternate" hreflang="${hreflang}" href="[^"]*"\\s*\\/?>`, 'i'),
      `<link rel="alternate" hreflang="${hreflang}" href="${attribute(page.hreflangs[hreflang])}" />`,
      `hreflang ${hreflang}`,
    );
  }

  const ogTags = [
    ['og:title', page.title],
    ['og:description', page.description],
    ['og:url', page.canonical],
    ['og:locale', page.ogLocale],
    ['og:locale:alternate', page.ogLocaleAlternate],
    ['twitter:title', page.title],
    ['twitter:description', page.description],
  ];
  for (const [property, value] of ogTags) {
    const attributeName = property.startsWith('og:') ? 'property' : 'name';
    html = replaceOnce(
      html,
      new RegExp(`<meta ${attributeName}="${property}" content="[^"]*"\\s*\\/?>`, 'i'),
      `<meta ${attributeName}="${property}" content="${attribute(value)}" />`,
      `meta ${property}`,
    );
  }

  const extraHead = [
    `    <meta name="hotel:prerendered-path" content="${attribute(page.path)}" />`,
    `    <meta name="hotel:prerendered-language" content="${attribute(page.language)}" />`,
    `    <meta name="hotel:prerendered-h1" content="${attribute(h1)}" />`,
    `    <script type="application/ld+json">${escapeJson(page.jsonLd)}</script>`,
  ].join('\n');
  html = replaceOnce(html, /<\/head>/i, `${extraHead}\n  </head>`, '</head>');

  const root = `<div\n    id="root"\n    data-prerender-route="${attribute(page.route.path)}"\n    data-prerender-language="${attribute(page.language)}"\n  >${body}</div>`;
  html = replaceOnce(html, /<div id="root"><\/div>/i, root, 'root element');
  return html;
}

function assertUnique(label, values) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`${label} is not unique: "${value}" appears on more than one page`);
    }
    seen.add(value);
  }
}

function verifyHtml(html, page, h1, label) {
  const expected = [
    `<title>${escapeAttribute(page.title)}</title>`,
    `<meta name="description" content="${escapeAttribute(page.description)}" />`,
    `href="${escapeAttribute(page.canonical)}"`,
    `<link rel="alternate" hreflang="en" href="${escapeAttribute(page.hreflangs.en)}" />`,
    `<link rel="alternate" hreflang="sw" href="${escapeAttribute(page.hreflangs.sw)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeAttribute(page.hreflangs['x-default'])}" />`,
    `<meta property="og:title" content="${escapeAttribute(page.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(page.description)}" />`,
    `<meta property="og:url" content="${escapeAttribute(page.canonical)}" />`,
    `<meta name="hotel:prerendered-h1" content="${escapeAttribute(h1)}" />`,
    `<script type="application/ld+json">${escapeJson(page.jsonLd)}</script>`,
    `<h1`,
  ];
  for (const value of expected) {
    if (!html.includes(value)) {
      throw new Error(`${label}: generated HTML is missing ${value.slice(0, 90)}`);
    }
  }
  if (!/<script type="module"[^>]*src="\/assets\//i.test(html)) {
    throw new Error(`${label}: hydration script was lost`);
  }
}

async function main() {
  // Keep the untouched Vite output so `npm run prerender` is idempotent.
  let template;
  try {
    template = await readFile(SOURCE_TEMPLATE, 'utf8');
  } catch {
    template = await readFile(TEMPLATE, 'utf8');
    await writeFile(SOURCE_TEMPLATE, template, 'utf8');
  }
  const vite = await createServer({
    root: FRONTEND_ROOT,
    configFile: path.join(FRONTEND_ROOT, 'vite.config.ts'),
    server: { middlewareMode: true },
    // react-router-dom exposes ESM through the Node `module-sync` condition.
    // Without it Node resolves the CJS entry and hides named exports.
    ssr: { resolve: { externalConditions: ['module-sync'] } },
    appType: 'custom',
    logLevel: 'warn',
  });

  try {
    const [
      { App },
      { SSR_ROUTE_COMPONENTS },
      { buildPrerenderPage, prerenderTargetRoutes },
      { I18nProvider },
      { QueryProvider },
      { ToastProvider },
      { MemoryRouter },
    ] = await Promise.all([
      vite.ssrLoadModule('/src/App.tsx'),
      vite.ssrLoadModule('/src/lib/ssrRouteComponents.tsx'),
      vite.ssrLoadModule('/src/lib/prerenderMeta.ts'),
      vite.ssrLoadModule('/src/i18n-context.tsx'),
      vite.ssrLoadModule('/src/components/QueryProvider.tsx'),
      vite.ssrLoadModule('/src/components/ToastProvider.tsx'),
      vite.ssrLoadModule('/src/lib/ssrRuntime.ts'),
    ]);

    const criticalRoutes = prerenderTargetRoutes();
    if (criticalRoutes.length !== EXPECTED_CRITICAL_ROUTES) {
      throw new Error(
        `Expected ${EXPECTED_CRITICAL_ROUTES} critical routes, found ${criticalRoutes.length}`,
      );
    }

    const pages = [];
    for (const language of LANGUAGES) {
      for (const route of criticalRoutes) {
        const page = buildPrerenderPage(route, language);
        const label = `${language} ${route.path}`;
        if (!page.title || !page.description || !page.canonical) {
          throw new Error(`${label}: missing title, description or canonical`);
        }

        const tree = createElement(
          MemoryRouter,
          { initialEntries: [page.path] },
          createElement(
            QueryProvider,
            null,
            createElement(
              I18nProvider,
              null,
              createElement(
                ToastProvider,
                null,
                createElement(App, { components: SSR_ROUTE_COMPONENTS }),
              ),
            ),
          ),
        );
        const body = renderToString(tree);
        const h1 = extractH1(body, label);
        const html = buildHtml(template, page, body, h1);
        verifyHtml(html, page, h1, label);

        const output = outputPathFor(page.path);
        await mkdir(path.dirname(output), { recursive: true });
        await writeFile(output, html, 'utf8');
        pages.push({ ...page, h1, output: path.relative(FRONTEND_ROOT, output).replace(/\\/g, '/') });
        console.log(`prerendered ${label} -> ${pages.at(-1).output}`);
      }
    }

    assertUnique('title', pages.map((page) => page.title));
    assertUnique('description', pages.map((page) => page.description));
    assertUnique('canonical', pages.map((page) => page.canonical));
    assertUnique('og:title', pages.map((page) => page.title));
    assertUnique('og:url', pages.map((page) => page.canonical));
    assertUnique('H1', pages.map((page) => page.h1));
    assertUnique('JSON-LD @id', pages.map((page) => page.jsonLd['@id']));

    const report = {
      generatedAt: new Date().toISOString(),
      criticalRoutes: criticalRoutes.length,
      languages: LANGUAGES,
      pageCount: pages.length,
      pages: pages.map((page) => ({
        path: page.path,
        language: page.language,
        title: page.title,
        description: page.description,
        canonical: page.canonical,
        hreflangs: page.hreflangs,
        h1: page.h1,
        jsonLdId: page.jsonLd['@id'],
        output: page.output,
      })),
    };
    await writeFile(path.join(DIST_DIR, 'prerender-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`prerender complete: ${pages.length} pages from ${criticalRoutes.length} critical routes`);
  } finally {
    // Vite's in-memory module runner can keep a watcher handle alive after the
    // work is done. Give close() a moment, then exit explicitly so CI does not
    // hang on an idle process.
    await Promise.race([
      vite.close(),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
