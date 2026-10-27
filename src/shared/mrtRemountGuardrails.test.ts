import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Every Material React Table renders through `LabsMaterialReactTable`, which fixes MRT's stale
 * scroll-container ref. A raw `<MaterialReactTable>` that unmounts and remounts (a view toggle, a
 * dialog step) shows an empty table in production only; dev StrictMode hides it, so no e2e
 * against the dev server can catch a new raw use. This scan is the guard.
 */
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRAPPER = path.join('shared', 'components', 'LabsMaterialReactTable.tsx');
/** Exempt by name: the `/ui` catalog is generated and embeds shared components' source as text. */
const EXEMPT = new Set([WRAPPER, path.join('ui', 'generatedSharedCatalog.ts')]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(SRC).map((file) => ({
  rel: path.relative(SRC, file),
  text: fs.readFileSync(file, 'utf8'),
}));

describe('Material React Table remount guard', () => {
  it('renders no raw <MaterialReactTable> outside the wrapper', () => {
    const raw = files
      .filter((f) => !EXEMPT.has(f.rel) && /<MaterialReactTable[\s/>]/.test(f.text))
      .map((f) => f.rel);
    expect(raw).toEqual([]);
  });

  it('finds the tables it governs', () => {
    // An empty scan would pass the check above for any codebase.
    const users = files.filter((f) => /<LabsMaterialReactTable[\s/>]/.test(f.text));
    expect(users.length).toBeGreaterThanOrEqual(4);
    expect(files.find((f) => f.rel === WRAPPER)?.text).toMatch(/<MaterialReactTable table=\{table\} \/>/);
  });
});
