import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const scriptFilePath = decodeURIComponent(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const configPath = path.join(repoRoot, 'src/ui/sharedCatalog.config.json');
const outputPath = path.join(repoRoot, 'src/ui/generatedSharedCatalog.ts');
const checkMode = process.argv.includes('--check');

/** @typedef {'component'|'hook'|'utility'|'model'|'service'|'doc'} SharedCatalogKind */
/** @typedef {'stable'|'beta'|'experimental'} SharedCatalogStability */

/** @type {{includeRoots: string[]; excludePatterns: string[]; demoBySymbol: Record<string,string>; stabilityOverrides?: Record<string, SharedCatalogStability>; kindOverrides?: Record<string, SharedCatalogKind>; extraEntries?: Array<object>}} */
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const APP_DIRS = [
  'beat',
  'chords',
  'drums',
  'piano',
  'words',
  'cats',
  'zines',
  'corp',
  'forms',
  'story',
  'ui',
];

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md'];
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function normalizeSlash(value) {
  return value.split(path.sep).join('/');
}

function toRelative(absPath) {
  return normalizeSlash(path.relative(repoRoot, absPath));
}

function fileExists(absPath) {
  try {
    fs.accessSync(absPath);
    return true;
  } catch {
    return false;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function walkFiles(startAbsPath, predicate, result = []) {
  const entries = fs.readdirSync(startAbsPath, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(startAbsPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, predicate, result);
      continue;
    }
    if (predicate(abs)) result.push(abs);
  }
  return result;
}

function shouldIncludeSharedFile(relPath) {
  if (!relPath.startsWith('src/shared/')) return false;
  if (!CODE_EXTENSIONS.includes(path.extname(relPath))) return false;
  return !config.excludePatterns.some((pattern) => relPath.includes(pattern));
}

function normalizeSummary(value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function getNodeJsDocSummary(node) {
  const docs = node.jsDoc;
  if (!docs || docs.length === 0) return '';
  const lastDoc = docs[docs.length - 1];
  const comment = lastDoc.comment;
  if (typeof comment === 'string') return normalizeSummary(comment);
  if (Array.isArray(comment)) {
    return normalizeSummary(
      comment
        .map((part) => (typeof part === 'string' ? part : part.text ?? ''))
        .join(' ')
    );
  }
  return '';
}

function getFileLevelComment(sourceFile) {
  for (const statement of sourceFile.statements) {
    const summary = getNodeJsDocSummary(statement);
    if (summary) return summary;
    if (!ts.isImportDeclaration(statement)) break;
  }
  return '';
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function extractExports(content, relPath) {
  const sourceFile = ts.createSourceFile(
    relPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  /** @type {Array<{name:string; exportType:string; jsDoc:string}>} */
  const exportsFound = [];
  /** @type {Map<string, string>} */
  const declarationDocByName = new Map();
  const addUnique = (entry) => {
    if (!exportsFound.some((candidate) => candidate.name === entry.name && candidate.exportType === entry.exportType)) {
      exportsFound.push(entry);
    }
  };

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      declarationDocByName.set(statement.name.text, getNodeJsDocSummary(statement));
      continue;
    }
    if (ts.isClassDeclaration(statement) && statement.name) {
      declarationDocByName.set(statement.name.text, getNodeJsDocSummary(statement));
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          declarationDocByName.set(
            declaration.name.text,
            getNodeJsDocSummary(statement)
          );
        }
      }
    }
  }

  for (const statement of sourceFile.statements) {
    const isExported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    const isDefault = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
    if (!isExported && !ts.isExportAssignment(statement) && !ts.isExportDeclaration(statement)) continue;

    if (ts.isFunctionDeclaration(statement)) {
      const name = statement.name?.text ?? path.basename(relPath, path.extname(relPath));
      addUnique({ name, exportType: isDefault ? 'default' : 'function', jsDoc: getNodeJsDocSummary(statement) });
      continue;
    }
    if (ts.isClassDeclaration(statement)) {
      const name = statement.name?.text ?? path.basename(relPath, path.extname(relPath));
      addUnique({ name, exportType: isDefault ? 'default' : 'class', jsDoc: getNodeJsDocSummary(statement) });
      continue;
    }
    if (ts.isInterfaceDeclaration(statement)) {
      addUnique({ name: statement.name.text, exportType: 'interface', jsDoc: getNodeJsDocSummary(statement) });
      continue;
    }
    if (ts.isTypeAliasDeclaration(statement)) {
      addUnique({ name: statement.name.text, exportType: 'type', jsDoc: getNodeJsDocSummary(statement) });
      continue;
    }
    if (ts.isEnumDeclaration(statement)) {
      addUnique({ name: statement.name.text, exportType: 'enum', jsDoc: getNodeJsDocSummary(statement) });
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          addUnique({ name: declaration.name.text, exportType: 'const', jsDoc: getNodeJsDocSummary(statement) });
        }
      }
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      const assignmentText = statement.expression.getText(sourceFile);
      addUnique({
        name: assignmentText || path.basename(relPath, path.extname(relPath)),
        exportType: 'default',
        jsDoc:
          declarationDocByName.get(assignmentText) ??
          getNodeJsDocSummary(statement),
      });
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      const jsDoc = getNodeJsDocSummary(statement);
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          addUnique({
            name: element.name.text,
            exportType: element.isTypeOnly ? 'type' : 'named',
            jsDoc,
          });
        }
      }
    }
  }

  return {
    exports: exportsFound,
    fileComment: getFileLevelComment(sourceFile),
  };
}

function inferKind(relPath, exportType) {
  if (config.kindOverrides && config.kindOverrides[relPath]) {
    return config.kindOverrides[relPath];
  }
  if (relPath.endsWith('.md')) return 'doc';
  if (relPath.includes('/hooks/')) return 'hook';
  if (relPath.includes('/components/') || relPath.includes('/notation/')) return 'component';
  if (relPath.includes('/types') || exportType === 'interface' || exportType === 'type') return 'model';
  if (relPath.includes('/services/') || relPath.includes('/storage/')) return 'service';
  return 'utility';
}

function inferStability(relPath) {
  if (config.stabilityOverrides && config.stabilityOverrides[relPath]) {
    return config.stabilityOverrides[relPath];
  }
  if (relPath.includes('/experimental/')) return 'experimental';
  return 'stable';
}

function inferOwner(relPath) {
  if (relPath.includes('/shared/components/')) return 'shared-ui';
  if (relPath.includes('/shared/music/')) return 'music-core';
  if (relPath.includes('/shared/audio/') || relPath.includes('/shared/playback/')) return 'playback-core';
  if (relPath.includes('/shared/rhythm/')) return 'rhythm-core';
  return 'shared-core';
}

function inferTags(relPath, exportName) {
  const tags = new Set();
  const parts = relPath.split('/');
  for (const part of parts) {
    if (['shared', 'src'].includes(part)) continue;
    if (part === 'components' || part === 'utils' || part === 'music' || part === 'audio' || part === 'playback' || part === 'rhythm' || part === 'notation') {
      tags.add(part);
    }
  }
  if (/[A-Z]/.test(exportName.charAt(0))) tags.add('api');
  if (relPath.endsWith('.tsx')) tags.add('react');
  return Array.from(tags);
}

function normalizeExtraEntry(extraEntry) {
  const pathValue = String(extraEntry.path ?? '');
  const kindValue = extraEntry.kind ?? inferKind(pathValue, 'doc');
  const stabilityValue = extraEntry.stability ?? inferStability(pathValue);
  return {
    id: String(extraEntry.id ?? slugify(pathValue || String(extraEntry.name ?? 'extra-entry'))),
    name: String(extraEntry.name ?? 'Untitled Entry'),
    path: pathValue,
    kind: kindValue,
    stability: stabilityValue,
    owner: String(extraEntry.owner ?? inferOwner(pathValue)),
    description: String(extraEntry.description ?? 'No description provided.'),
    tags: Array.isArray(extraEntry.tags) ? extraEntry.tags : [],
    appsUsing: Array.isArray(extraEntry.appsUsing) ? extraEntry.appsUsing : [],
    exportType: String(extraEntry.exportType ?? (kindValue === 'doc' ? 'doc' : 'named')),
    demoId: extraEntry.demoId ?? null,
  };
}

function resolveImportTarget(importerFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const importerDir = path.dirname(importerFile);
  const base = path.resolve(importerDir, specifier);
  const candidates = [];

  for (const ext of SOURCE_EXTENSIONS) {
    candidates.push(`${base}${ext}`);
  }
  for (const ext of SOURCE_EXTENSIONS) {
    candidates.push(path.join(base, `index${ext}`));
  }
  candidates.push(base);

  for (const candidate of candidates) {
    if (fileExists(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function buildUsageMap() {
  /** @type {Map<string, Set<string>>} */
  const usageMap = new Map();
  const srcRoot = path.join(repoRoot, 'src');
  const appRoots = APP_DIRS.map((app) => path.join(srcRoot, app)).filter((abs) => fileExists(abs));

  for (const appRoot of appRoots) {
    const appName = path.basename(appRoot);
    const appFiles = walkFiles(
      appRoot,
      (abs) => CODE_EXTENSIONS.includes(path.extname(abs)) && !abs.includes('.test.') && !abs.includes('.spec.')
    );

    for (const appFile of appFiles) {
      const content = fs.readFileSync(appFile, 'utf8');
      const importRegex = /import[\s\S]*?from\s+['"]([^'"]+)['"]/g;
      for (const match of content.matchAll(importRegex)) {
        const specifier = match[1];
        const resolved = resolveImportTarget(appFile, specifier);
        if (!resolved) continue;
        const rel = toRelative(resolved);
        if (!rel.startsWith('src/shared/')) continue;
        if (!usageMap.has(rel)) usageMap.set(rel, new Set());
        usageMap.get(rel).add(appName);
      }
    }
  }

  return usageMap;
}

function buildCatalogEntries() {
  const usageMap = buildUsageMap();
  const sharedFiles = config.includeRoots
    .flatMap((root) => walkFiles(path.join(repoRoot, root), (abs) => shouldIncludeSharedFile(toRelative(abs))))
    .sort((a, b) => a.localeCompare(b));

  /** @type {Array<object>} */
  const entries = [];
  for (const absPath of sharedFiles) {
    const relPath = toRelative(absPath);
    const content = fs.readFileSync(absPath, 'utf8');
    const { exports: exportsFound, fileComment } = extractExports(content, relPath);
    const usedByApps = Array.from(usageMap.get(relPath) ?? []).sort();

    for (const symbol of exportsFound) {
      const demoId = config.demoBySymbol[symbol.name] ?? null;
      const description = symbol.jsDoc || fileComment || 'No JSDoc summary provided.';
      const id = slugify(`${relPath}-${symbol.name}`);
      entries.push({
        id,
        name: symbol.name,
        path: relPath,
        kind: inferKind(relPath, symbol.exportType),
        stability: inferStability(relPath),
        owner: inferOwner(relPath),
        description,
        tags: inferTags(relPath, symbol.name),
        appsUsing: usedByApps,
        exportType: symbol.exportType,
        demoId,
      });
    }
  }

  for (const extraEntry of config.extraEntries ?? []) {
    entries.push(normalizeExtraEntry(extraEntry));
  }

  // Ensure each demo id maps to a single canonical entry (avoid duplicate gallery cards
  // when both a source file and an index re-export expose the same symbol).
  const demoGroups = new Map();
  for (const entry of entries) {
    if (!entry.demoId) continue;
    if (!demoGroups.has(entry.demoId)) demoGroups.set(entry.demoId, []);
    demoGroups.get(entry.demoId).push(entry);
  }

  for (const group of demoGroups.values()) {
    if (group.length <= 1) continue;
    group.sort((a, b) => {
      const score = (entry) => {
        let value = 0;
        if (entry.exportType === 'default') value += 200;
        if (!/\/index\.[jt]sx?$/.test(entry.path)) value += 100;
        if (entry.description && entry.description !== 'No JSDoc summary provided.') value += 20;
        if (entry.path.toLowerCase().includes(entry.name.toLowerCase())) value += 10;
        return value;
      };
      return score(b) - score(a);
    });
    const [, ...duplicates] = group;
    for (const duplicate of duplicates) {
      duplicate.demoId = null;
    }
  }

  entries.sort((a, b) => {
    const pathOrder = String(a.path).localeCompare(String(b.path));
    if (pathOrder !== 0) return pathOrder;
    return String(a.name).localeCompare(String(b.name));
  });

  return entries;
}

function renderOutput(entries) {
  const serialized = JSON.stringify(entries, null, 2);

  return `/* eslint-disable */
// AUTO-GENERATED FILE: scripts/generate-shared-catalog.mjs
// Do not edit manually. Run: npm run generate:shared-catalog

export type SharedCatalogKind = 'component' | 'hook' | 'utility' | 'model' | 'service' | 'doc';
export type SharedCatalogStability = 'stable' | 'beta' | 'experimental';

export interface SharedCatalogEntry {
  id: string;
  name: string;
  path: string;
  kind: SharedCatalogKind;
  stability: SharedCatalogStability;
  owner: string;
  description: string;
  tags: string[];
  appsUsing: string[];
  exportType: string;
  demoId: string | null;
}

export const SHARED_CATALOG: ReadonlyArray<SharedCatalogEntry> = ${serialized} as const;
`;
}

const entries = buildCatalogEntries();
const nextOutput = renderOutput(entries);
const previousOutput = fileExists(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';

if (checkMode) {
  if (previousOutput !== nextOutput) {
    console.error('Shared catalog is out of date. Run: npm run generate:shared-catalog');
    process.exit(1);
  }
  process.exit(0);
}

if (previousOutput !== nextOutput) {
  fs.writeFileSync(outputPath, nextOutput);
  console.log(`Generated ${toRelative(outputPath)} with ${entries.length} entries.`);
} else {
  console.log('Shared catalog is already up to date.');
}
