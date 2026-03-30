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

function extractImportSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const importFromRe = /from\s+['"]([^'"]+)['"]/g;
  const dynamicImportRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match: RegExpExecArray | null = null;
  while ((match = importFromRe.exec(source)) !== null) {
    specs.push(match[1]);
  }
  while ((match = dynamicImportRe.exec(source)) !== null) {
    specs.push(match[1]);
  }
  return specs;
}

describe('app import boundaries', () => {
  it('forbids cross-app imports', () => {
    const thisFileDir = path.dirname(fileURLToPath(import.meta.url));
    const srcRoot = path.resolve(thisFileDir, '..');
    const files: string[] = [];
    collectTsFiles(srcRoot, files);

    const violations: string[] = [];

    for (const file of files) {
      const relFromSrc = path.relative(srcRoot, file).replaceAll(path.sep, '/');
      const sourceApp = relFromSrc.split('/')[0] ?? '';
      if (!APP_DIRS.has(sourceApp)) continue;

      const text = fs.readFileSync(file, 'utf8');
      const specs = extractImportSpecifiers(text);

      for (const spec of specs) {
        if (!spec.startsWith('.')) continue;

        const resolved = path.resolve(path.dirname(file), spec);
        const relTarget = path.relative(srcRoot, resolved).replaceAll(path.sep, '/');
        if (relTarget.startsWith('..')) continue;

        const targetApp = relTarget.split('/')[0] ?? '';
        if (!APP_DIRS.has(targetApp) || targetApp === sourceApp) continue;

        violations.push(`${relFromSrc} -> ${spec} (targets ${targetApp} from ${sourceApp})`);
      }
    }

    expect(
      violations,
      `Cross-app imports are forbidden. Move reusable code/assets into src/shared/**.\n${violations.join('\n')}`
    ).toEqual([]);
  });
});
