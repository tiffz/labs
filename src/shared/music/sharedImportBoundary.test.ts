import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const APP_DIRS = new Set([
  'beat',
  'cats',
  'chords',
  'corp',
  'drums',
  'forms',
  'piano',
  'pitch',
  'story',
  'ui',
  'words',
  'zines',
]);

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
    const srcRoot = path.resolve(sharedRoot, '..');
    const files: string[] = [];
    collectTsFiles(sharedRoot, files);

    const violations: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      const rel = path.relative(srcRoot, file).replaceAll(path.sep, '/');
      const importFromRe = /from\s+['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null = null;
      while ((match = importFromRe.exec(text)) !== null) {
        const spec = match[1];
        if (!spec.startsWith('.')) continue;
        const resolved = path.resolve(path.dirname(file), spec);
        const target = path.relative(srcRoot, resolved).replaceAll(path.sep, '/');
        if (target.startsWith('..')) continue;
        const firstSegment = target.split('/')[0] ?? '';
        if (APP_DIRS.has(firstSegment)) {
          violations.push(`${rel} -> ${spec} (targets ${firstSegment})`);
        }
      }
    }

    expect(violations, `Shared layer may not import from app directories.\n${violations.join('\n')}`)
      .toEqual([]);
  });
});
