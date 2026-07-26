/**
 * stanzaDuplicateHeuristics — pure, read-only duplicate DETECTION for the Stanza "Organize" flow.
 *
 * Scope (Phase 1): this module *finds* candidate duplicate groups and explains why. It performs
 * NO merging, NO Dexie writes, NO mutation of any input — it is a pure analysis over song rows.
 * The apply / merge path (and the lossy cross-source merge in particular) is intentionally NOT
 * built here; see ADR 0027 for the safety contract a future cross-source merge must honor.
 *
 * Two confidence tiers, per the design spike §C with the architecture review's corrections:
 *
 *   Tier 1 (exact, high confidence) — identical `ytId`, `driveSourceFileId`, `encoreSongId`, or
 *   the same uploaded bytes (`localMediaFingerprint`, tolerant match). These reuse the existing
 *   exact identity (`stanzaSongContentKey`, `stanzaLocalMediaFingerprintsMatch`) and are the only
 *   edges allowed to form TRANSITIVE union-find groups: sharing a byte-identical source is a true
 *   equivalence relation, so A≡B and B≡C safely implies A≡C.
 *
 *   Tier 2 (needs confirm) — same normalized title AND either duration within ±2s (duration read
 *   from `localMediaFingerprint` only; NO YouTube metadata fetch) OR matching marker structure.
 *   Tier-2 matches are PAIRWISE and NON-TRANSITIVE: each yields a candidate pair, never a chain.
 *   "Same title + similar length" is corroborating evidence, not an equivalence relation — two
 *   different songs can share a title and length, so a transitive chain could collapse genuinely
 *   distinct songs. This non-transitivity is the architecture review's blocker-adjacent guardrail.
 *
 * Deliberately DROPPED from Phase 1: heuristic M3 ("same title, no duration") — a title-only edge
 * is a dangerous transitive bridge with only medium confidence. See the `// Phase 2:` note below.
 */

import type { StanzaSong } from '../db/stanzaDb';
import {
  stanzaFingerprintDurationSec,
  stanzaLocalMediaFingerprintsMatch,
} from '../utils/stanzaLocalMediaFingerprint';
import { stanzaSongContentKey } from '../utils/stanzaSongDeduplication';

/** Minimal projection of the fields duplicate detection reads. Accepts a full `StanzaSong`. */
export type StanzaDuplicateCandidate = Pick<
  StanzaSong,
  | 'id'
  | 'ytId'
  | 'title'
  | 'markers'
  | 'updatedAt'
  | 'driveSourceFileId'
  | 'encoreSongId'
  | 'localMediaFingerprint'
  | 'localAudioBlob'
>;

/** Tier 1 = exact/byte-identical (transitive). Tier 2 = same-title corroboration (pairwise). */
export type StanzaDuplicateTier = 1 | 2;

/** One reason an edge was drawn between two members, for display in the review UI. */
export interface StanzaDuplicateEdgeReason {
  aId: string;
  bId: string;
  tier: StanzaDuplicateTier;
  /** Human-readable, e.g. "Same YouTube video" / "Same title, same length". */
  reason: string;
}

export interface StanzaDuplicateGroup {
  /** Member ids, in input order. */
  memberIds: string[];
  /** The strongest tier that formed this group (1 beats 2). */
  tier: StanzaDuplicateTier;
  /**
   * `true` for Tier-1 groups (union-find components — a transitive equivalence). `false` for
   * Tier-2 groups, which are always a single non-transitive candidate pair.
   */
  transitive: boolean;
  /** Per-edge reasons explaining why the members were grouped. */
  reasons: StanzaDuplicateEdgeReason[];
  /**
   * Suggested canonical member for DISPLAY ONLY — newest `updatedAt`, tie-broken by smaller `id`
   * (matches the existing `pickWinner`). This module does NOT merge; nothing is dropped here.
   */
  suggestedCanonicalId: string;
}

// ---------------------------------------------------------------------------
// Title normalization
// ---------------------------------------------------------------------------

const TRAILING_DUP_SUFFIX_RE = /(?:\s+copy(?:\s+\d+)?|\s*\(\d+\))$/;

/**
 * `norm(title)`: trim → lowercase → strip trailing duplicate suffixes ("(1)", " copy", " copy 2")
 * → strip punctuation → collapse whitespace. Suffix stripping runs before punctuation removal so
 * "(1)" is recognised while its parentheses are intact; it loops to catch stacked suffixes
 * ("My Song copy (1)"). Mirrors the idea behind Encore's `stripTrailingDuplicateSuffix`.
 */
export function stanzaNormalizeSongTitle(title: string | null | undefined): string {
  let text = (title ?? '').trim().toLowerCase();
  let previous: string;
  do {
    previous = text;
    text = text.replace(TRAILING_DUP_SUFFIX_RE, '').trimEnd();
  } while (text !== previous);
  // Strip punctuation to spaces (so "a-b" → "a b", never "ab"), then collapse whitespace.
  text = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

// ---------------------------------------------------------------------------
// Duration + marker structure comparison
// ---------------------------------------------------------------------------

const DURATION_TOLERANCE_SEC = 2;
const MARKER_TIME_TOLERANCE_SEC = 1;

function candidateDurationSec(song: StanzaDuplicateCandidate): number | null {
  // Duration comes ONLY from the local-upload fingerprint. No YouTube metadata fetch (Phase 2).
  return stanzaFingerprintDurationSec(song.localMediaFingerprint);
}

function durationsWithinTolerance(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= DURATION_TOLERANCE_SEC;
}

/**
 * True when both songs have the same marker count (≥1) and every corresponding marker time (sorted)
 * lands within ±1s. Empty marker sets never match — absence of structure is not evidence.
 */
function markerStructureMatches(a: StanzaDuplicateCandidate, b: StanzaDuplicateCandidate): boolean {
  const aTimes = (a.markers ?? []).map((m) => m.time).sort((x, y) => x - y);
  const bTimes = (b.markers ?? []).map((m) => m.time).sort((x, y) => x - y);
  if (aTimes.length === 0 || aTimes.length !== bTimes.length) return false;
  return aTimes.every((t, i) => Math.abs(t - bTimes[i]) <= MARKER_TIME_TOLERANCE_SEC);
}

// ---------------------------------------------------------------------------
// Union-find (Tier-1 transitive grouping only)
// ---------------------------------------------------------------------------

class UnionFind {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }
  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }
}

// ---------------------------------------------------------------------------
// Canonical (display-only) pick
// ---------------------------------------------------------------------------

/** Newest `updatedAt` wins, tie-broken by smaller `id` — matches `pickWinner` in the merge engine. */
function suggestedCanonical(members: StanzaDuplicateCandidate[]): string {
  return members.reduce((best, next) => {
    if (next.updatedAt !== best.updatedAt) return next.updatedAt > best.updatedAt ? next : best;
    return next.id < best.id ? next : best;
  }).id;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

interface Tier1Edge {
  a: number;
  b: number;
  reason: string;
}

/**
 * Group indices by a stable string key (empty/nullish keys are skipped — they are not identity).
 * Returns only buckets with ≥2 members.
 */
function bucketByKey(
  songs: readonly StanzaDuplicateCandidate[],
  keyOf: (song: StanzaDuplicateCandidate) => string | null | undefined,
): number[][] {
  const buckets = new Map<string, number[]>();
  songs.forEach((song, index) => {
    const key = keyOf(song)?.trim();
    if (!key) return;
    const existing = buckets.get(key);
    if (existing) existing.push(index);
    else buckets.set(key, [index]);
  });
  return [...buckets.values()].filter((indices) => indices.length >= 2);
}

/**
 * Detect duplicate groups across a Stanza library. Pure and read-only: inputs are never mutated
 * and no side effects occur. Tier-1 groups are transitive union-find components; Tier-2 groups are
 * non-transitive candidate pairs. A pair already unified by Tier-1 is never re-emitted as Tier-2.
 */
export function detectStanzaDuplicateGroups(
  songs: readonly StanzaDuplicateCandidate[],
): StanzaDuplicateGroup[] {
  const n = songs.length;
  if (n < 2) return [];

  // --- Tier 1: exact identity edges (transitive) -------------------------------------------
  const tier1Edges: Tier1Edge[] = [];

  // Link every member of a bucket to the bucket's first member — enough to connect the component
  // and to explain each membership, without O(n^2) noise.
  const addBucketEdges = (buckets: number[][], reason: string) => {
    for (const indices of buckets) {
      const [first, ...rest] = indices;
      for (const other of rest) tier1Edges.push({ a: first, b: other, reason });
    }
  };

  // Same source content (reuses `stanzaSongContentKey`): identical ytId / driveSourceFileId /
  // local fingerprint / blob-derived fingerprint. The `local:<id>` fallback is unique per row, so
  // skip it — two rows with no shared source identity are not duplicates.
  const contentKeyOf = (song: StanzaDuplicateCandidate): string | null => {
    const key = stanzaSongContentKey(song);
    if (key.startsWith('local:')) return null;
    return key;
  };
  for (const indices of bucketByKey(songs, contentKeyOf)) {
    const [first, ...rest] = indices;
    const key = stanzaSongContentKey(songs[first]);
    const reason = key.startsWith('yt:')
      ? 'Same YouTube video'
      : key.startsWith('drive:')
        ? 'Same Drive file'
        : 'Same uploaded file';
    for (const other of rest) tier1Edges.push({ a: first, b: other, reason });
  }

  // Identical ytId / driveSourceFileId even when masked behind a higher-priority content key
  // (e.g. one row has both a ytId and a driveSourceFileId, the other only the Drive file).
  addBucketEdges(
    bucketByKey(songs, (s) => (s.ytId ? s.ytId : null)),
    'Same YouTube video',
  );
  addBucketEdges(
    bucketByKey(songs, (s) => s.driveSourceFileId),
    'Same Drive file',
  );

  // Identical Encore federation link (not part of the content key).
  addBucketEdges(
    bucketByKey(songs, (s) => s.encoreSongId),
    'Linked to the same Encore song',
  );

  // Tolerant local-fingerprint match (±0.5s) — catches size+duration vs size+name drift that a
  // plain string bucket misses. Pairwise, but still Tier-1 (byte-identical upload) → transitive.
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (
        stanzaLocalMediaFingerprintsMatch(
          songs[i].localMediaFingerprint,
          songs[j].localMediaFingerprint,
        )
      ) {
        tier1Edges.push({ a: i, b: j, reason: 'Same uploaded file' });
      }
    }
  }

  const uf = new UnionFind(n);
  for (const edge of tier1Edges) uf.union(edge.a, edge.b);

  // Assemble Tier-1 components.
  const componentMembers = new Map<number, number[]>();
  for (let i = 0; i < n; i += 1) {
    const root = uf.find(i);
    const list = componentMembers.get(root);
    if (list) list.push(i);
    else componentMembers.set(root, [i]);
  }

  const groups: StanzaDuplicateGroup[] = [];
  const tier1RootOrder = [...componentMembers.keys()].sort(
    (a, b) => Math.min(...componentMembers.get(a)!) - Math.min(...componentMembers.get(b)!),
  );

  for (const root of tier1RootOrder) {
    const indices = componentMembers.get(root)!;
    if (indices.length < 2) continue;
    const members = indices.map((i) => songs[i]);
    const memberIndexSet = new Set(indices);
    const reasons: StanzaDuplicateEdgeReason[] = [];
    const seen = new Set<string>();
    for (const edge of tier1Edges) {
      if (!memberIndexSet.has(edge.a) || !memberIndexSet.has(edge.b)) continue;
      const key = `${edge.a}|${edge.b}|${edge.reason}`;
      if (seen.has(key)) continue;
      seen.add(key);
      reasons.push({ aId: songs[edge.a].id, bId: songs[edge.b].id, tier: 1, reason: edge.reason });
    }
    groups.push({
      memberIds: indices.map((i) => songs[i].id),
      tier: 1,
      transitive: true,
      reasons,
      suggestedCanonicalId: suggestedCanonical(members),
    });
  }

  // --- Tier 2: same-title corroboration (PAIRWISE, non-transitive) --------------------------
  // Phase 2: title-only edges ("same title, no duration", design M3) are intentionally excluded —
  // a title-only bridge is a low-confidence transitive hazard. Fuzzy title / marker-label overlap
  // across differing titles (M4–M5, W tiers) are also deferred.
  const titleBuckets = bucketByKey(songs, (s) => {
    const norm = stanzaNormalizeSongTitle(s.title);
    return norm ? `title:${norm}` : null;
  });

  for (const indices of titleBuckets) {
    for (let x = 0; x < indices.length; x += 1) {
      for (let y = x + 1; y < indices.length; y += 1) {
        const i = indices[x];
        const j = indices[y];
        // A pair already proven byte-identical (Tier-1) needs no weaker Tier-2 edge.
        if (uf.connected(i, j)) continue;

        const a = songs[i];
        const b = songs[j];
        const edgeReasons: string[] = [];
        if (durationsWithinTolerance(candidateDurationSec(a), candidateDurationSec(b))) {
          edgeReasons.push('Same title, same length');
        }
        if (markerStructureMatches(a, b)) {
          edgeReasons.push('Same title, same section structure');
        }
        if (edgeReasons.length === 0) continue;

        const members = [a, b];
        groups.push({
          memberIds: [a.id, b.id],
          tier: 2,
          transitive: false,
          reasons: edgeReasons.map((reason) => ({ aId: a.id, bId: b.id, tier: 2, reason })),
          suggestedCanonicalId: suggestedCanonical(members),
        });
      }
    }
  }

  return groups;
}
