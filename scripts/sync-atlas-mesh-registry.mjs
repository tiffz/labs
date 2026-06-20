#!/usr/bin/env node
/**
 * Regenerate src/muscle/curriculum/atlasMeshRegistry.ts from atlas_complete manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public/muscle/models/manifest.json');
const outPath = path.join(root, 'src/muscle/curriculum/atlasMeshRegistry.ts');

function titleFromAtlasId(nodeId) {
  const slug = nodeId.replace(/^atlas_/, '');
  return slug
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/\bR\b/g, '(R)');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entry = manifest.regions?.atlas_complete;
if (!entry?.meshes?.length) {
  console.error('Missing atlas_complete meshes in manifest — run atlas export first.');
  process.exit(1);
}

const atlasMeshes = entry.meshes.filter((mesh) => mesh.nodeId.startsWith('atlas_'));

const body = `/**
 * Auto-generated atlas fill nodes for Full body view (not in module study decks).
 * Source: public/muscle/models/manifest.json → atlas_complete
 * Regenerate: npm run muscle:sync-atlas-registry
 */
import type { MuscleMemoryNode } from '../types/node';

const ATLAS_CTX = {
  whyItMatters: 'Anatomy atlas fill — visible in Full body for context.',
  commonMistake: 'Switch to a module tab to study curated structures with reps.',
  movementEffect: 'Full body atlas only.',
};

export const ATLAS_MESH_NODES: MuscleMemoryNode[] = [
${atlasMeshes
  .map((mesh) => {
    const name = mesh.displayName ?? titleFromAtlasId(mesh.nodeId);
    const kind = mesh.atlasKind === 'bone' ? 'bone' : 'muscle';
    const layerDepth = kind === 'bone' ? 2 : 1;
    const shape = kind === 'bone' ? 'box' : 'egg';
    return `  {
    id: ${JSON.stringify(mesh.nodeId)},
    name: ${JSON.stringify(name)},
    type: ${JSON.stringify(kind)},
    region: 'shoulder_neck',
    layerDepth: ${layerDepth},
    isSurfaceForm: false,
    primitiveShape: ${JSON.stringify(shape)},
    atlasOnly: true,
    artisticContext: ATLAS_CTX,
  }`;
  })
  .join(',\n')}
];

export const ATLAS_MESH_NODE_IDS = new Set(ATLAS_MESH_NODES.map((node) => node.id));
`;

fs.writeFileSync(outPath, body, 'utf8');
console.log(
  `muscle:sync-atlas-registry wrote ${atlasMeshes.length} nodes -> ${path.relative(root, outPath)}`,
);
