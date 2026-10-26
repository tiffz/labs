import fs from 'node:fs';
import path from 'node:path';
import { BoxGeometry, CylinderGeometry, type BufferGeometry } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { ALL_NODES, getNodeById } from '../../curriculum';
import { muscleModelsManifest } from '../../types/muscleModelsManifest';
import { ATTACHMENT_MARKER_STYLE, buildAttachmentMarkers } from './attachmentMarkers';
import { computeAttachmentSites } from './attachmentSites';
import { extractGlbMeshes } from './extractGlbMeshes';

const MODELS = path.resolve(import.meta.dirname, '../../../../public/muscle/models');

async function loadMeshes(file: string, nodeIds: readonly string[]): Promise<Map<string, BufferGeometry>> {
  const buffer = fs.readFileSync(path.join(MODELS, file));
  const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new GLTFLoader().parseAsync(data, '');
  const meshes = extractGlbMeshes(gltf.scene, (id) => nodeIds.includes(id));
  return new Map(meshes.map((mesh) => [mesh.name, mesh.geometry]));
}

/** A vertical muscle from y=0 to y=1, with a bone just past each end. */
function verticalMuscle() {
  const muscle = new CylinderGeometry(0.05, 0.05, 1, 12, 20).translate(0, 0.5, 0);
  const lowBone = new BoxGeometry(0.2, 0.2, 0.2).translate(0, -0.12, 0);
  const highBone = new BoxGeometry(0.2, 0.2, 0.2).translate(0, 1.12, 0);
  return { muscle, lowBone, highBone };
}

describe('computeAttachmentSites', () => {
  it('puts each site at the muscle end nearest its bone', () => {
    const { muscle, lowBone, highBone } = verticalMuscle();
    const sites = computeAttachmentSites(muscle, lowBone, highBone);
    expect(sites?.origin.y).toBeCloseTo(0, 1);
    expect(sites?.insertion.y).toBeCloseTo(1, 1);
  });

  it('swapping origin and insertion bones swaps the sites', () => {
    const { muscle, lowBone, highBone } = verticalMuscle();
    const sites = computeAttachmentSites(muscle, highBone, lowBone);
    expect(sites?.origin.y).toBeCloseTo(1, 1);
    expect(sites?.insertion.y).toBeCloseTo(0, 1);
  });

  it('returns null when one bone is never the nearer one', () => {
    const { muscle, lowBone } = verticalMuscle();
    expect(computeAttachmentSites(muscle, lowBone, lowBone.clone().translate(0, -5, 0))).toBeNull();
  });
});

describe('attachment markers', () => {
  it('draws origin and insertion with a different shape and colour', () => {
    const { muscle, lowBone, highBone } = verticalMuscle();
    const [origin, insertion] = buildAttachmentMarkers(computeAttachmentSites(muscle, lowBone, highBone)!);
    expect(origin?.role).toBe('origin');
    expect(insertion?.role).toBe('insertion');
    expect(origin?.shape).not.toBe(insertion?.shape);
    expect(origin?.color.toLowerCase()).not.toBe(insertion?.color.toLowerCase());
    expect(origin?.position[1]).toBeLessThan(insertion!.position[1]);
  });

  it('keeps the legend labels distinct', () => {
    expect(ATTACHMENT_MARKER_STYLE.origin.label).not.toBe(ATTACHMENT_MARKER_STYLE.insertion.label);
  });
});

/**
 * Ground truth on the shipped meshes: the runtime takes the muscle from its region GLB and
 * the bones from the atlas. Anatomy fixes the direction of each pair, so a swapped
 * origin/insertion in the curriculum moves the markers and fails here.
 */
describe('attachment sites on Z-Anatomy meshes', () => {
  async function sitesFor(muscleId: string, regionGlb: string) {
    const node = getNodeById(muscleId)!;
    const boneIds = [node.originBoneId!, node.insertionBoneId!];
    const [region, atlas] = await Promise.all([
      loadMeshes(regionGlb, [muscleId]),
      loadMeshes('atlas_complete.glb', boneIds),
    ]);
    const sites = computeAttachmentSites(
      region.get(muscleId)!,
      atlas.get(node.originBoneId!)!,
      atlas.get(node.insertionBoneId!)!,
    );
    expect(sites).not.toBeNull();
    return sites!;
  }

  it('rectus abdominis: origin at the pubis, below the insertion at the ribs', async () => {
    const { origin, insertion } = await sitesFor('muscle_rectus_abdominis', 'torso.glb');
    // The muscle spans ~0.41 units; the two ends must be most of that apart, pubis lowest.
    expect(insertion.y - origin.y).toBeGreaterThan(0.3);
  }, 20_000);

  it('biceps brachii: origin at the shoulder, above the insertion at the elbow', async () => {
    const { origin, insertion } = await sitesFor('muscle_biceps_brachii', 'arm.glb');
    expect(origin.y - insertion.y).toBeGreaterThan(0.2);
  }, 20_000);

  /** The region GLB that draws this muscle in region view (atlas fills are full-body only). */
  function regionGlbFor(nodeId: string): string {
    const entry = Object.entries(muscleModelsManifest.regions).find(
      ([region, value]) =>
        !region.startsWith('atlas_') && value.meshes?.some((mesh) => mesh.nodeId === nodeId),
    );
    if (!entry) throw new Error(`No region GLB draws ${nodeId}`);
    return path.basename(entry[1].glbUrl);
  }

  const claimed = ALL_NODES.filter((node) => node.originBoneId && node.insertionBoneId);

  it('finds muscles that claim attachments', () => {
    expect(claimed.length).toBeGreaterThan(0);
  });

  it.each(claimed.map((node) => node.id))('%s gets both sites, apart', async (id) => {
    const { origin, insertion } = await sitesFor(id, regionGlbFor(id));
    expect(origin.distanceTo(insertion)).toBeGreaterThan(0.05);
  }, 20_000);
});
