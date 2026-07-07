import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight parser for e2e/routeRegistry.ts — avoids TS import in Node guardrails.
 * Returns { route, smoke }[] in source order.
 */
export function parseRouteRegistry(repoRoot = process.cwd()) {
  const text = fs.readFileSync(path.join(repoRoot, 'e2e/routeRegistry.ts'), 'utf8');
  const entries = [];
  const blocks = text.split(/\n\s*\{/).slice(1);
  for (const block of blocks) {
    const route = block.match(/route:\s*'([^']+)'/)?.[1];
    if (!route) continue;
    const smoke = /smoke:\s*true/.test(block);
    entries.push({ route, smoke });
  }
  return entries;
}

export function smokeRoutes(repoRoot = process.cwd()) {
  return parseRouteRegistry(repoRoot).filter((r) => r.smoke);
}
