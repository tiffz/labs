import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { countBoundaryEdges } from './skinMeshTopology';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

type GlbDoc = {
  nodes?: Array<{ name?: string; mesh?: number }>;
  meshes?: Array<{ name?: string; primitives?: Array<{ attributes?: { POSITION?: number }; indices?: number }> }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    count?: number;
    componentType?: number;
    type?: string;
  }>;
  bufferViews?: Array<{ buffer?: number; byteOffset?: number; byteLength?: number }>;
  buffers?: Array<{ byteLength?: number }>;
};

export type SkinBoundaryAuditRow = {
  meshName: string;
  triangleCount: number;
  boundaryEdgeCount: number;
};

export type SkinBoundaryAudit = {
  glbPath: string;
  rows: SkinBoundaryAuditRow[];
};

function readGlbBinary(glbRelativePath: string): { doc: GlbDoc; bin: Buffer } {
  const glbPath = path.join(REPO_ROOT, glbRelativePath);
  const buf = fs.readFileSync(glbPath);
  const jsonChunkLength = buf.readUInt32LE(12);
  const jsonStart = 20;
  const doc = JSON.parse(buf.slice(jsonStart, jsonStart + jsonChunkLength).toString('utf8')) as GlbDoc;

  let binChunkOffset = jsonStart + jsonChunkLength;
  binChunkOffset += (4 - (binChunkOffset % 4)) % 4;
  const binChunkLength = buf.readUInt32LE(binChunkOffset);
  const binStart = binChunkOffset + 8;
  return { doc, bin: buf.slice(binStart, binStart + binChunkLength) };
}

function componentByteSize(componentType: number): number {
  switch (componentType) {
    case 5121:
      return 1;
    case 5123:
      return 2;
    case 5125:
      return 4;
    default:
      return 4;
  }
}

function readIndices(doc: GlbDoc, bin: Buffer, accessorIndex: number): Uint32Array {
  const accessor = doc.accessors?.[accessorIndex];
  const view = doc.bufferViews?.[accessor?.bufferView ?? -1];
  if (!accessor || !view || view.buffer === undefined) return new Uint32Array();

  const byteOffset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const componentSize = componentByteSize(accessor.componentType ?? 5125);
  const maxCount = Math.floor((view.byteLength ?? 0) / componentSize);
  const count = Math.min(accessor.count ?? 0, maxCount);
  const out = new Uint32Array(count);
  for (let i = 0; i < count; i += 1) {
    const at = byteOffset + i * componentSize;
    if (at + componentSize > bin.length) break;
    if (componentSize === 1) out[i] = bin.readUInt8(at);
    else if (componentSize === 2) out[i] = bin.readUInt16LE(at);
    else out[i] = bin.readUInt32LE(at);
  }
  return out.subarray(0, count);
}

export function auditSkinMeshBoundaries(glbRelativePath: string): SkinBoundaryAudit {
  const { doc, bin } = readGlbBinary(glbRelativePath);
  const nodeNameByMeshIndex = new Map<number, string>();
  for (const node of doc.nodes ?? []) {
    if (node.mesh !== undefined && node.name) {
      nodeNameByMeshIndex.set(node.mesh, node.name);
    }
  }

  const rows: SkinBoundaryAuditRow[] = [];

  doc.meshes?.forEach((mesh, meshIndex) => {
    const meshName = nodeNameByMeshIndex.get(meshIndex) ?? mesh.name ?? '';
    if (!meshName.startsWith('skin_') && meshName !== 'eye_globes') return;

    let triangleCount = 0;
    let boundaryEdgeCount = 0;
    for (const primitive of mesh.primitives ?? []) {
      const indices = readIndices(doc, bin, primitive.indices ?? -1);
      if (indices.length === 0) continue;
      triangleCount += Math.floor(indices.length / 3);
      boundaryEdgeCount += countBoundaryEdges(indices);
    }
    if (triangleCount === 0) return;
    rows.push({ meshName, triangleCount, boundaryEdgeCount });
  });

  return { glbPath: path.join(REPO_ROOT, glbRelativePath), rows };
}

export function formatSkinBoundaryAudit(audit: SkinBoundaryAudit): string {
  const lines = [`# Skin boundary audit — ${audit.glbPath}`, ''];
  for (const row of audit.rows.sort((a, b) => b.boundaryEdgeCount - a.boundaryEdgeCount)) {
    lines.push(
      `- ${row.meshName}: ${row.boundaryEdgeCount} boundary edges (${row.triangleCount} tris)`,
    );
  }
  return lines.join('\n');
}
