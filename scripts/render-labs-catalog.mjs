/**
 * Renders the Labs homepage app grid from `src/labsHome/labsCatalog.manifest.json`
 * into static markers inside `src/index.html` (no React; output is plain HTML).
 *
 *   npm run generate:labs-catalog   # write src/index.html if drift
 *   npm run check:labs-catalog      # exit 1 if src/index.html is out of date
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const scriptFilePath = decodeURIComponent(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const manifestPath = path.join(repoRoot, 'src/labsHome/labsCatalog.manifest.json');
const indexPath = path.join(repoRoot, 'src/index.html');

const MARKER_START = '<!-- labs-catalog:generated:start -->';
const MARKER_END = '<!-- labs-catalog:generated:end -->';

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

function injectGeneratedHtml(indexHtml, generated) {
  const start = indexHtml.indexOf(MARKER_START);
  const end = indexHtml.indexOf(MARKER_END);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `${toRelative(indexPath)}: missing catalog markers. Expected ${MARKER_START} … ${MARKER_END} inside <div class="catalog-columns">.`,
    );
  }
  const before = indexHtml.slice(0, start + MARKER_START.length);
  const after = indexHtml.slice(end);
  return `${before}\n${generated}\n${after}`;
}

function toRelative(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join('/');
}

const apps = loadManifest();
const nextSegment = renderCatalogHtml(apps);
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const nextIndex = injectGeneratedHtml(indexHtml, nextSegment);

if (checkMode) {
  if (indexHtml !== nextIndex) {
    console.error('Labs homepage catalog is out of date. Run: npm run generate:labs-catalog');
    process.exit(1);
  }
  console.log('Labs homepage catalog is up to date.');
  process.exit(0);
}

if (indexHtml !== nextIndex) {
  fs.writeFileSync(indexPath, nextIndex);
  console.log(`Updated ${toRelative(indexPath)} from ${toRelative(manifestPath)} (${apps.length} apps).`);
} else {
  console.log('Labs homepage catalog is already up to date.');
}
