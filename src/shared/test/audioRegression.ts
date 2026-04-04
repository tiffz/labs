import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export type AudioHashManifest = Record<string, string>;

export function hashFloat32Pcm(data: Float32Array): string {
  const bytes = new Uint8Array(data.length * 4);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < data.length; i++) {
    view.setFloat32(i * 4, data[i], true);
  }
  return createHash('sha256').update(bytes).digest('hex');
}

export function loadHashManifest(filePath: string): AudioHashManifest {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as AudioHashManifest;
}

export function saveHashManifest(filePath: string, manifest: AudioHashManifest): void {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const stableManifest = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(filePath, `${JSON.stringify(stableManifest, null, 2)}\n`, 'utf-8');
}
