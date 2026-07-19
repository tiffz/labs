import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(import.meta.dirname, '../..');

/**
 * Tier A undo coverage guardrail.
 *
 * Any micro-app whose users author durable local state (a Dexie database plus
 * destructive delete flows) must mount {@link LabsUndoProvider} so committed
 * CRUD is undoable via keyboard shortcuts (see README.md in this directory).
 *
 * Add an app here only when its Dexie writes are not user-authored CRUD —
 * document the reason inline.
 */
const DURABLE_CRUD_UNDO_EXEMPT: Record<string, string> = {
  // Muscle stores quiz/workout progress and preferences only (put-only rows,
  // no user-facing delete/edit flows) — nothing to undo.
  muscle: 'progress + preferences only, no destructive CRUD',
};

const NON_APP_DIRS = new Set(['shared', 'ui', 'types', 'pitch']);

function listAppDirs(): string[] {
  return readdirSync(SRC_ROOT).filter((name) => {
    if (NON_APP_DIRS.has(name)) return false;
    const full = join(SRC_ROOT, name);
    return statSync(full).isDirectory();
  });
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

type AppScan = {
  usesDexie: boolean;
  hasDexieTableDelete: boolean;
  mountsUndoProvider: boolean;
};

function scanApp(appDir: string): AppScan {
  const scan: AppScan = {
    usesDexie: false,
    hasDexieTableDelete: false,
    mountsUndoProvider: false,
  };
  for (const file of walkFiles(appDir)) {
    const src = readFileSync(file, 'utf8');
    if (/from 'dexie'/.test(src)) scan.usesDexie = true;
    // Dexie table deletes look like `db.<table>.delete(` / `.where(...).delete()`
    // / `bulkDelete(` — Set/Map `.delete(` calls do not match these shapes.
    if (/\w*[Dd]b\.\w+\.delete\(|\.where\([^)]*\)[\s\S]{0,80}?\.delete\(\)|bulkDelete\(/.test(src)) {
      scan.hasDexieTableDelete = true;
    }
    if (/LabsUndoProvider/.test(src)) scan.mountsUndoProvider = true;
  }
  return scan;
}

describe('labsUndoTierACoverage', () => {
  const apps = listAppDirs();

  it('finds micro-apps to scan', () => {
    expect(apps.length).toBeGreaterThan(5);
  });

  for (const app of apps) {
    it(`${app}: durable Dexie CRUD mounts LabsUndoProvider (or is exempt)`, () => {
      const scan = scanApp(join(SRC_ROOT, app));
      if (!scan.usesDexie || !scan.hasDexieTableDelete) return;
      if (DURABLE_CRUD_UNDO_EXEMPT[app]) return;
      expect(
        scan.mountsUndoProvider,
        `src/${app} has Dexie delete flows but never mounts LabsUndoProvider. ` +
          'Wire Tier A undo (see src/shared/undo/README.md) or add an exemption with a reason.',
      ).toBe(true);
    });
  }

  it('exemptions stay minimal and real', () => {
    for (const app of Object.keys(DURABLE_CRUD_UNDO_EXEMPT)) {
      expect(apps).toContain(app);
      const scan = scanApp(join(SRC_ROOT, app));
      expect(
        scan.usesDexie,
        `src/${app} no longer uses Dexie — remove its exemption`,
      ).toBe(true);
    }
  });
});
