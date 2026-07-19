import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TEMPLATES_DIR = import.meta.dirname;

/**
 * Drift guard: the starter main.tsx must satisfy every marker that
 * `scripts/check-app-quality-contract.mjs` enforces on real app shells, so a
 * fresh copy passes `npm run check:app-quality` without edits.
 */
describe('appStarterTemplateContract', () => {
  const starter = readFileSync(join(TEMPLATES_DIR, 'app-main.starter.tsx'), 'utf8');
  const contract = readFileSync(
    join(TEMPLATES_DIR, '../../../scripts/check-app-quality-contract.mjs'),
    'utf8',
  );

  const mainTsxMarkers: Array<[name: string, test: (src: string) => boolean]> = [
    ['LabsErrorBoundary', (src) => src.includes('LabsErrorBoundary')],
    ['installLabsCrashHandlers()', (src) => src.includes('installLabsCrashHandlers(')],
    ['React.StrictMode', (src) => /<(React\.)?StrictMode\b/.test(src)],
    ['labsChrome.css import', (src) => src.includes("import '../shared/styles/labsChrome.css'")],
    ['appSharedThemes.css import', (src) => src.includes('appSharedThemes.css')],
  ];

  for (const [name, test] of mainTsxMarkers) {
    it(`starter main.tsx includes ${name}`, () => {
      expect(test(starter), `app-main.starter.tsx is missing ${name}`).toBe(true);
    });

    it(`contract script still enforces ${name}`, () => {
      // If this fails, the contract dropped or renamed a marker — update
      // mainTsxMarkers here so template and contract cannot drift silently.
      const needle = name.startsWith('React.')
        ? 'StrictMode'
        : name.split(' ')[0].replace('()', '(');
      expect(contract).toContain(needle);
    });
  }

  it('starter main.tsx mounts the keyboard shortcuts host', () => {
    expect(starter).toContain('LabsKeyboardShortcutsHost');
  });

  it('starter main.tsx points at the undo Tier A decision', () => {
    expect(starter).toContain('LabsUndoProvider');
  });
});
