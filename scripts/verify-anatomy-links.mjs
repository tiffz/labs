#!/usr/bin/env node
/**
 * Verifies Wikipedia URLs in structureDetailsCatalog resolve (HTTP 200).
 * Run: node scripts/verify-anatomy-links.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'src/muscle/curriculum/structureDetailsCatalog.ts');
const source = readFileSync(catalogPath, 'utf8');

const urlPattern = /wikipediaUrl:\s*'(https:\/\/en\.wikipedia\.org\/wiki\/[^']+)'/g;
const urls = [...source.matchAll(urlPattern)].map((m) => m[1]);

if (urls.length === 0) {
  console.error('No wikipediaUrl entries found.');
  process.exit(1);
}

let failed = 0;
for (const url of urls) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (!res.ok) {
      console.error(`FAIL ${url} → ${res.status}`);
      failed += 1;
    } else {
      console.log(`OK ${url}`);
    }
  } catch (err) {
    console.error(`FAIL ${url} → ${err instanceof Error ? err.message : err}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} link(s) failed verification.`);
  process.exit(1);
}

console.log(`\nVerified ${urls.length} Wikipedia link(s).`);
