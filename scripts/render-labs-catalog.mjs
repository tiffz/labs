/**
 * Renders the Labs app directory from `src/labsHome/labsCatalog.manifest.json`
 * into static markers inside `src/index.html` and `src/404.html`.
 *
 *   npm run generate:labs-catalog   # write HTML if drift
 *   npm run check:labs-catalog      # exit 1 if out of date
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const scriptFilePath = decodeURIComponent(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const manifestPath = path.join(repoRoot, 'src/labsHome/labsCatalog.manifest.json');
const indexPath = path.join(repoRoot, 'src/index.html');
const notFoundPath = path.join(repoRoot, 'src/404.html');

const INDEX_MARKER_START = '<!-- labs-catalog:generated:start -->';
const INDEX_MARKER_END = '<!-- labs-catalog:generated:end -->';
const NOT_FOUND_MARKER_START = '<!-- labs-404-catalog:generated:start -->';
const NOT_FOUND_MARKER_END = '<!-- labs-404-catalog:generated:end -->';

const checkMode = process.argv.includes('--check');

const STAGE_ORDER = { stable: 0, development: 1, unlisted: 2 };

const STAGE_BADGE = {
  stable: { klass: 'status-stable', label: 'Stable' },
  development: { klass: 'status-development', label: 'Experimental' },
  unlisted: { klass: 'status-unlisted', label: 'Unlisted' },
};

const SECTIONS = [
  { category: 'music', heading: 'Music', dataCategory: 'music' },
  { category: 'art', heading: 'Art &amp; Writing', dataCategory: 'art' },
  { category: 'games', heading: 'Games', dataCategory: 'games' },
];

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtmlText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function loadManifest() {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.apps)) {
    throw new Error(`${manifestPath}: expected top-level { "apps": [...] }`);
  }
  return parsed.apps;
}

function validateApps(apps) {
  const paths = new Set();
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i];
    const label = `apps[${i}]`;
    for (const key of ['path', 'title', 'shortDescription', 'stage', 'category', 'iconClass']) {
      if (a[key] == null || String(a[key]).trim() === '') {
        throw new Error(`${manifestPath}: ${label} missing or empty "${key}"`);
      }
    }
    if (!/^\/[a-z0-9_-]+\/$/i.test(a.path)) {
      throw new Error(`${manifestPath}: ${label} path must look like "/slug/" (got ${JSON.stringify(a.path)})`);
    }
    if (!/^[a-z0-9-]+$/.test(a.iconClass)) {
      throw new Error(
        `${manifestPath}: ${label} iconClass must be lowercase letters, digits, and hyphen only (got ${JSON.stringify(a.iconClass)})`,
      );
    }
    if (!Object.hasOwn(STAGE_ORDER, a.stage)) {
      throw new Error(
        `${manifestPath}: ${label} invalid stage ${JSON.stringify(a.stage)} (expected stable | development | unlisted)`,
      );
    }
    const allowedCat = new Set(SECTIONS.map((s) => s.category));
    if (!allowedCat.has(a.category)) {
      throw new Error(
        `${manifestPath}: ${label} invalid category ${JSON.stringify(a.category)} (expected ${[...allowedCat].join(' | ')})`,
      );
    }
    if (paths.has(a.path)) {
      throw new Error(`${manifestPath}: duplicate path ${JSON.stringify(a.path)}`);
    }
    paths.add(a.path);
  }
}

function sortAppsForCategory(apps, category) {
  const filtered = apps
    .map((a, originalIndex) => ({ ...a, originalIndex }))
    .filter((a) => a.category === category);
  filtered.sort((a, b) => {
    const oa = STAGE_ORDER[a.stage];
    const ob = STAGE_ORDER[b.stage];
    if (oa !== ob) return oa - ob;
    return a.originalIndex - b.originalIndex;
  });
  return filtered;
}

function renderAppCard(app) {
  const badge = STAGE_BADGE[app.stage];
  const dataDesc = escapeHtmlAttr(app.shortDescription);
  const titleAttr = escapeHtmlAttr(app.title);
  const titleText = escapeHtmlText(app.title);
  const descText = escapeHtmlText(app.shortDescription);
  return [
    `            <a href="${escapeHtmlAttr(app.path)}" class="app-card" data-stage="${escapeHtmlAttr(app.stage)}" data-name="${titleAttr}" data-description="${dataDesc}">`,
    `              <div class="app-icon ${app.iconClass}"></div>`,
    `              <div class="app-info">`,
    `                <h3 class="app-title">${titleText}</h3>`,
    `                <p class="app-description">${descText}</p>`,
    `              </div>`,
    `              <span class="status-badge ${badge.klass}">${badge.label}</span>`,
    `            </a>`,
    ``,
  ].join('\n');
}

function render404AppTile(app) {
  const titleAttr = escapeHtmlAttr(app.title);
  const titleText = escapeHtmlText(app.title);
  return [
    `            <a href="${escapeHtmlAttr(app.path)}" class="labs-404-tile" data-stage="${escapeHtmlAttr(app.stage)}" data-name="${titleAttr}" title="${titleAttr}">`,
    `              <span class="app-icon ${app.iconClass}" aria-hidden="true"></span>`,
    `              <span class="labs-404-tile__name">${titleText}</span>`,
    `            </a>`,
  ].join('\n');
}

/** Dense icon + name grids by category for the 404 page (not homepage cards). */
function render404CatalogHtml(apps) {
  validateApps(apps);
  const chunks = [`          <!-- 404 explore grid (labsCatalog.manifest.json + render-labs-catalog.mjs). -->`];
  for (const sec of SECTIONS) {
    const sorted = sortAppsForCategory(apps, sec.category);
    if (sorted.length === 0) continue;
    chunks.push(
      `          <div class="labs-404-category" data-category-section="${sec.dataCategory}">`,
      `            <h3 class="labs-404-category__title">${sec.heading}</h3>`,
      `            <div class="labs-404-apps-grid">`,
      sorted.map(render404AppTile).join('\n'),
      `            </div>`,
      `          </div>`,
      ``,
    );
  }
  return chunks.join('\n').replace(/\n+$/, '');
}

function renderCatalogHtml(apps) {
  validateApps(apps);
  const chunks = [];
  for (const sec of SECTIONS) {
    const sorted = sortAppsForCategory(apps, sec.category);
    const gridIntro =
      sec.category === 'music'
        ? [
            `          <div class="apps-grid">`,
            `            <!-- Stable + experimental first; unlisted last (order from labsCatalog.manifest.json + scripts/render-labs-catalog.mjs). -->`,
            ``,
          ].join('\n')
        : [`          <div class="apps-grid">`, ``].join('\n');

    const cards = sorted.map(renderAppCard).join('\n');
    chunks.push(
      [
        `        <section class="catalog-section" data-category-section="${sec.dataCategory}">`,
        `          <div class="section-heading">`,
        `            <h2 class="section-title">${sec.heading}</h2>`,
        `          </div>`,
        gridIntro,
        cards,
        `          </div>`,
        `        </section>`,
        ``,
      ].join('\n'),
    );
  }
  return chunks.join('\n').replace(/\n+$/, '');
}

function injectGeneratedHtml(html, generated, markerStart, markerEnd, contextLabel) {
  const start = html.indexOf(markerStart);
  const end = html.indexOf(markerEnd);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `${contextLabel}: missing catalog markers. Expected ${markerStart} … ${markerEnd}.`,
    );
  }
  const before = html.slice(0, start + markerStart.length);
  const after = html.slice(end);
  return `${before}\n${generated}\n${after}`;
}

function toRelative(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join('/');
}

function updateFile(filePath, nextHtml, label) {
  const current = fs.readFileSync(filePath, 'utf8');
  if (checkMode) {
    if (current !== nextHtml) {
      console.error(`${label} is out of date. Run: npm run generate:labs-catalog`);
      return false;
    }
    return true;
  }
  if (current !== nextHtml) {
    fs.writeFileSync(filePath, nextHtml);
    console.log(`Updated ${toRelative(filePath)}.`);
    return true;
  }
  return false;
}

const apps = loadManifest();
const catalogSegment = renderCatalogHtml(apps);
const notFoundSegment = render404CatalogHtml(apps);

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const nextIndex = injectGeneratedHtml(
  indexHtml,
  catalogSegment,
  INDEX_MARKER_START,
  INDEX_MARKER_END,
  toRelative(indexPath),
);

const notFoundHtml = fs.readFileSync(notFoundPath, 'utf8');
const nextNotFound = injectGeneratedHtml(
  notFoundHtml,
  notFoundSegment,
  NOT_FOUND_MARKER_START,
  NOT_FOUND_MARKER_END,
  toRelative(notFoundPath),
);

if (checkMode) {
  const indexOk = updateFile(indexPath, nextIndex, 'Labs homepage catalog');
  const notFoundOk = updateFile(notFoundPath, nextNotFound, 'Labs 404 catalog');
  if (!indexOk || !notFoundOk) process.exit(1);
  console.log('Labs homepage and 404 catalogs are up to date.');
  process.exit(0);
}

let changed = 0;
if (updateFile(indexPath, nextIndex, 'homepage')) changed++;
if (updateFile(notFoundPath, nextNotFound, '404')) changed++;

if (changed === 0) {
  console.log('Labs catalogs are already up to date.');
} else {
  console.log(`Synced ${apps.length} apps from ${toRelative(manifestPath)}.`);
}
