import { describe, expect, it } from 'vitest';

import { DEFAULT_SCRIPT_HTML } from './defaultScriptSample';
import { isScriptContentEmpty } from './scriptEmpty';

describe('isScriptContentEmpty', () => {
  it('treats blank and whitespace as empty', () => {
    expect(isScriptContentEmpty('')).toBe(true);
    expect(isScriptContentEmpty('   ')).toBe(true);
    expect(isScriptContentEmpty('<p></p>')).toBe(true);
  });

  it('treats the default sample script as non-empty', () => {
    expect(isScriptContentEmpty(DEFAULT_SCRIPT_HTML)).toBe(false);
  });
});
