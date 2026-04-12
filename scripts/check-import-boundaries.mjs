import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIRS = new Set([
  'beat',
  'cats',
  'chords',
  'corp',
  'drums',
  'forms',
  'piano',
  'scales',
  'pitch',
  'story',
  'ui',
  'words',
  'zines',
]);

function collectTsFiles(dir, out) {
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

function extractImportSpecifiers(source) {
  const specs = [];
  const importFromRe = /from\s+['"]([^'"]+)['"]/g;
  const dynamicImportRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match = null;
  while ((match = importFromRe.exec(source)) !== null) {
    specs.push(match[1]);
  }
  while ((match = dynamicImportRe.exec(source)) !== null) {
    specs.push(match[1]);
  }
  return specs;
}

function run() {
  const thisFileDir = path.dirname(fileURLToPath(import.meta.url));
  const srcRoot = path.resolve(thisFileDir, '..', 'src');
  const files = [];
  collectTsFiles(srcRoot, files);

  const violations = [];

  for (const file of files) {
    const relFromSrc = path.relative(srcRoot, file).replaceAll(path.sep, '/');
    const sourceApp = relFromSrc.split('/')[0] ?? '';
    if (!APP_DIRS.has(sourceApp) && sourceApp !== 'shared') continue;

    const text = fs.readFileSync(file, 'utf8');
    const specs = extractImportSpecifiers(text);

    for (const spec of specs) {
      if (!spec.startsWith('.')) continue;

      const resolved = path.resolve(path.dirname(file), spec);
      const relTarget = path.relative(srcRoot, resolved).replaceAll(path.sep, '/');
      if (relTarget.startsWith('..')) continue;

      const targetApp = relTarget.split('/')[0] ?? '';

      if (sourceApp === 'shared') {
        if (!APP_DIRS.has(targetApp)) continue;
        violations.push(`${relFromSrc} -> ${spec} (shared must not import ${targetApp})`);
        continue;
      }

      if (!APP_DIRS.has(targetApp) || targetApp === sourceApp) continue;
      violations.push(`${relFromSrc} -> ${spec} (targets ${targetApp} from ${sourceApp})`);
    }
  }

  if (violations.length > 0) {
    console.error('Cross-app imports are forbidden. Move reusable code/assets into src/shared/**.');
    console.error(violations.join('\n'));
    process.exit(1);
  }
}

run();
