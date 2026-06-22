#!/usr/bin/env node
/**
 * Wire LabsErrorBoundary + crash handlers into app main.tsx (idempotent).
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'src');

for (const dirent of fs.readdirSync(SRC, { withFileTypes: true })) {
  if (!dirent.isDirectory() || dirent.name === 'shared') continue;
  const mainPath = path.join(SRC, dirent.name, 'main.tsx');
  if (!fs.existsSync(mainPath)) continue;

  const appId = dirent.name;
  let src = fs.readFileSync(mainPath, 'utf8');

  if (!src.includes('installLabsCrashHandlers')) {
    if (src.includes('installServerLogger')) {
      src = src.replace(
        /import \{ installServerLogger \}[^\n]+\n/,
        (m) =>
          `${m}import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';\nimport LabsErrorBoundary from '../shared/components/LabsErrorBoundary';\n`,
      );
    } else {
      src = `import { installLabsCrashHandlers } from '../shared/utils/labsCrashLog';\nimport LabsErrorBoundary from '../shared/components/LabsErrorBoundary';\n${src}`;
    }
  }

  if (!src.includes(`installLabsCrashHandlers('${appId}')`)) {
    if (src.includes('installServerLogger(')) {
      src = src.replace(
        /installServerLogger\([^)]+\);/,
        (m) => `${m}\ninstallLabsCrashHandlers('${appId}');`,
      );
    } else if (src.includes('initMaterialIconRuntime();')) {
      src = src.replace(
        /initMaterialIconRuntime\(\);/,
        (m) => `${m}\ninstallLabsCrashHandlers('${appId}');`,
      );
    }
  }

  if (!src.includes('<LabsErrorBoundary')) {
    src = src.replace(
      /ReactDOM\.createRoot\(document\.getElementById\('root'\)!?\)\.render\(\s*\n([\s\S]*?)\n\)/,
      (_, inner) =>
        `ReactDOM.createRoot(document.getElementById('root')!).render(\n  <LabsErrorBoundary appId="${appId}">\n${inner}\n  </LabsErrorBoundary>\n)`,
    );
  }

  fs.writeFileSync(mainPath, src);
  console.log(`checked ${dirent.name}/main.tsx`);
}
