import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../..');

/** CRUD apps use keyboard-first undo — no persistent header undo buttons. */
const KEYBOARD_FIRST_UNDO_PATHS = [
  'src/encore/components/EncoreMainShell.tsx',
  'src/stanza/components/StanzaWorkspace.tsx',
  'src/words/App.tsx',
] as const;

const UNDO_CONTROLS_COMPONENT = 'src/shared/undo/LabsUndoControls.tsx';

describe('labsUndoUiGuardrails', () => {
  it('LabsUndoControls component is not shipped (keyboard-first CRUD)', () => {
    expect(() => readFileSync(join(REPO_ROOT, UNDO_CONTROLS_COMPONENT), 'utf8')).toThrow();
  });

  for (const rel of KEYBOARD_FIRST_UNDO_PATHS) {
    it(`${rel} does not mount LabsUndoControls`, () => {
      const src = readFileSync(join(REPO_ROOT, rel), 'utf8');
      expect(src).not.toMatch(/LabsUndoControls/);
    });
  }
});
