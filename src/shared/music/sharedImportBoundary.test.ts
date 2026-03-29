import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FORBIDDEN_APP_IMPORT_RE =
  /from\s+['"][^'"]*(\.{1,2}\/)+((beat|chords|drums|piano|words)\/)/;

function collectTsFiles(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
}

describe('shared import boundary', () => {
  it('does not import from app directories', () => {
    const thisFileDir = path.dirname(fileURLToPath(import.meta.url));
    const sharedRoot = path.resolve(thisFileDir, '..');
    const files: string[] = [];
    collectTsFiles(sharedRoot, files);

    const violations: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      const rel = path.relative(path.resolve(sharedRoot, '..', '..'), file);
      text.split(/\r?\n/).forEach((line, index) => {
        if (FORBIDDEN_APP_IMPORT_RE.test(line)) {
          violations.push(`${rel}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations, `Shared layer may not import from app directories.\n${violations.join('\n')}`)
      .toEqual([]);
  });
});
