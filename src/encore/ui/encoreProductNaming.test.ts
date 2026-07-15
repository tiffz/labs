import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('Encore Stanza product naming', () => {
  it('media link row labels Stanza, not Segno', () => {
    const src = readFileSync(path.join(here, 'EncoreMediaLinkRow.tsx'), 'utf8');
    expect(src).not.toMatch(/Segno/);
    expect(src).toMatch(/Stanza/);
  });
});
