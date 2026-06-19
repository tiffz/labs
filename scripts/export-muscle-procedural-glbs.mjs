#!/usr/bin/env node
/**
 * Procedural GLB export for Muscle Memory (CI / no-Blender fallback).
 * Generates one GLB per curriculum region with mesh names matching node ids.
 * Run: node scripts/export-muscle-procedural-glbs.mjs
 *
 * For Z-Anatomy source meshes, use tools/muscle-anatomy/export_region_glb.py with Blender.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/muscle/models');

// GLTFExporter expects browser FileReader when embedding buffers.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.();
      });
    }
  };
}

const REGIONS = [
  'fundamentals',
  'torso',
  'shoulder_neck',
  'arm',
  'hand',
  'leg',
  'foot',
];

function geometryForShape(shape) {
  switch (shape) {
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 12, 12);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.35, 0.35, 1, 12);
    case 'egg':
      return new THREE.SphereGeometry(0.5, 12, 12);
    case 'bucket':
      return new THREE.CylinderGeometry(0.5, 0.35, 0.5, 12);
    case 'box':
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function exportGlb(scene) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(Buffer.from(result));
          return;
        }
        reject(new Error('Expected binary GLB output'));
      },
      reject,
      { binary: true },
    );
  });
}

async function loadCurriculum() {
  const nodesDir = path.join(root, 'src/muscle/curriculum/nodes');
  const regionFiles = {
    fundamentals: 'fundamentals.ts',
    torso: 'torso.ts',
    shoulder_neck: 'shoulderNeck.ts',
    arm: 'arm.ts',
    hand: 'hand.ts',
    leg: 'leg.ts',
    foot: 'foot.ts',
  };

  /** @type {Record<string, Array<{ id: string; primitiveShape: string; layout?: { position: number[]; rotation?: number[]; scale: number[] } }>>} */
  const NODES_BY_REGION = {};

  for (const [region, file] of Object.entries(regionFiles)) {
    const text = fs.readFileSync(path.join(nodesDir, file), 'utf8');
    const nodes = [];
    const blocks = text.split(/\n(?=\s+(?:bone|muscle|joint)\()/);
    for (const block of blocks) {
      const idMatch = block.match(/^\s*(?:bone|muscle|joint)\(\s*\n?\s*'([^']+)'/m);
      if (!idMatch) continue;
      const shapeMatch = block.match(/'(?:box|cylinder|sphere|bucket|egg)'/g);
      const layoutMatch = block.match(
        /layout:\s*\{\s*position:\s*\[([^\]]+)\],\s*(?:rotation:\s*\[([^\]]+)\],\s*)?scale:\s*\[([^\]]+)\]/,
      );
      const primitiveShape = shapeMatch?.[shapeMatch.length - 1]?.replace(/'/g, '') ?? 'box';
      /** @type {{ id: string; primitiveShape: string; layout?: { position: number[]; rotation?: number[]; scale: number[] } }} */
      const node = { id: idMatch[1], primitiveShape };
      if (layoutMatch) {
        node.layout = {
          position: layoutMatch[1].split(',').map((n) => Number(n.trim())),
          scale: layoutMatch[3].split(',').map((n) => Number(n.trim())),
        };
        if (layoutMatch[2]) {
          node.layout.rotation = layoutMatch[2].split(',').map((n) => Number(n.trim()));
        }
      }
      nodes.push(node);
    }
    NODES_BY_REGION[region] = nodes;
  }

  return { NODES_BY_REGION };
}

async function exportRegion(region, nodesByRegion) {
  const nodes = nodesByRegion[region] ?? [];
  const scene = new THREE.Scene();
  const meshes = [];

  for (const node of nodes) {
    const layout = node.layout ?? {
      position: [0, 0, 0],
      scale: [0.2, 0.2, 0.2],
    };
    const mesh = new THREE.Mesh(
      geometryForShape(node.primitiveShape),
      new THREE.MeshStandardMaterial({ color: 0xc9b89a }),
    );
    mesh.name = node.id;
    mesh.userData.nodeId = node.id;
    mesh.position.set(...layout.position);
    if (layout.rotation) mesh.rotation.set(...layout.rotation);
    mesh.scale.set(...layout.scale);
    scene.add(mesh);
    meshes.push({
      nodeId: node.id,
      meshName: node.id,
      triangleCount: mesh.geometry.index
        ? mesh.geometry.index.count / 3
        : mesh.geometry.attributes.position.count / 3,
    });
  }

  const glb = await exportGlb(scene);
  const outPath = path.join(outDir, `${region}.glb`);
  fs.writeFileSync(outPath, glb);
  return { region, meshes, bytes: glb.length, outPath };
}

async function main() {
  const { NODES_BY_REGION } = await loadCurriculum();
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = { version: 1, regions: {} };
  const manifestPath = path.join(outDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    Object.assign(manifest, JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  }

  console.log('Exporting procedural Muscle Memory GLBs…');
  for (const region of REGIONS) {
    const result = await exportRegion(region, NODES_BY_REGION);
    manifest.regions[region] = {
      region,
      glbUrl: `/muscle/models/${region}.glb`,
      meshes: result.meshes,
      procedural: true,
    };
    console.log(`  ${region}: ${result.meshes.length} meshes, ${(result.bytes / 1024).toFixed(1)} KB`);
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote manifest → ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
