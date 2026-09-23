import { encoreDb } from '../db/encoreDb';
import type { EncoreOriginalSong } from '../originals/types';

/**
 * A local Encore library shaped like a real one, for performance work.
 *
 * Why this exists: a reported typing lag could not be reproduced against a handful of synthetic
 * rows — 0 long tasks at 1 and at 61 originals — while the real library stutters badly. The
 * difference is not one number but the whole shape: repertoire, performances and originals all
 * load into shared context providers, so the originals page pays for rows it never renders.
 * Guessing at that shape by hand cost a session; this pins it.
 *
 * ## It cannot touch real data
 *
 * The owner's localhost syncs to the same Drive storage as production, so a fixture that seeded
 * the wrong device would corrupt the one copy of her songwriting. Three independent gates, any one
 * of which is sufficient:
 *
 *  1. `import.meta.env.DEV` — registration is compiled out of production builds, so the function
 *     does not exist in the deployed bundle.
 *  2. Hostname must be loopback. Deliberately NOT `isLabsE2eHarness()`, whose comment claims it is
 *     "never true on production Pages deploy" while its own `?labsE2e` branch makes it true there.
 *  3. Refuses when a Google identity is present. A signed-in device can push, and no fixture
 *     should ever be a push candidate.
 *
 * Rows use the `perf-fixture-` id prefix so they are identifiable, and {@link clearEncorePerfFixture}
 * deletes exactly those and nothing else.
 */

export const ENCORE_PERF_FIXTURE_ID_PREFIX = 'perf-fixture-';

export function assertSafeToSeedEncorePerfFixture(
  env: { hostname: string; googleIdentity: string | null } ,
): void {
  const { hostname, googleIdentity } = env;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]') {
    throw new Error(
      `perf fixture refused: hostname "${hostname}" is not loopback. This seeds a large fake ` +
        'library and must never run against a device whose Dexie syncs to real Drive data.',
    );
  }
  if (googleIdentity && googleIdentity.trim() && googleIdentity !== 'null') {
    throw new Error(
      'perf fixture refused: a Google identity is present, so this device can push to Drive. ' +
        'Sign out (or use a clean browser profile) before seeding.',
    );
  }
}

function readEnv(): { hostname: string; googleIdentity: string | null } {
  if (typeof window === 'undefined') throw new Error('perf fixture: no window');
  let googleIdentity: string | null = null;
  try {
    googleIdentity = window.localStorage.getItem('encore.google.identity');
  } catch {
    googleIdentity = null;
  }
  return { hostname: window.location.hostname, googleIdentity };
}

function lyricsOfLines(lines: number): string {
  const out: string[] = ['Key: C', ''];
  for (let i = 0; i < lines; i += 1) {
    if (i % 8 === 0) {
      out.push(`[${['Verse', 'Chorus', 'Bridge'][Math.floor(i / 8) % 3]} ${Math.floor(i / 8) + 1}]`);
    }
    out.push(`[C]Line ${i} with [F]chords across [G]the bar and [Am]words to wrap`);
  }
  return out.join('\n');
}

export interface EncorePerfFixtureShape {
  songs: number;
  performancesPerSong: number;
  originals: number;
  lyricLinesPerOriginal: number;
  takesPerOriginal: number;
  historyPerOriginal: number;
}

/** Sized to the reported library (~60 repertoire songs). */
export const DEFAULT_ENCORE_PERF_FIXTURE: EncorePerfFixtureShape = {
  songs: 60,
  performancesPerSong: 4,
  originals: 20,
  lyricLinesPerOriginal: 60,
  takesPerOriginal: 3,
  historyPerOriginal: 20,
};

export async function seedEncorePerfFixture(
  shape: Partial<EncorePerfFixtureShape> = {},
): Promise<{ songs: number; performances: number; originals: number }> {
  assertSafeToSeedEncorePerfFixture(readEnv());
  const s = { ...DEFAULT_ENCORE_PERF_FIXTURE, ...shape };
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const p = ENCORE_PERF_FIXTURE_ID_PREFIX;

  const songs = Array.from({ length: s.songs }, (_, i) => ({
    id: `${p}song-${i}`,
    title: `Fixture Song ${i}`,
    artist: `Fixture Artist ${i % 15}`,
    updatedAt: new Date(now - i * 1000).toISOString(),
    createdAt: nowIso,
    journalMarkdown: '',
    practicing: i % 3 === 0,
  }));

  const performances = songs.flatMap((song, si) =>
    Array.from({ length: s.performancesPerSong }, (_, pi) => ({
      id: `${p}perf-${si}-${pi}`,
      songId: song.id,
      date: new Date(now - (si * 7 + pi) * 86_400_000).toISOString().slice(0, 10),
      venueTag: `Venue ${(si + pi) % 9}`,
      updatedAt: new Date(now - (si * 7 + pi) * 1000).toISOString(),
      createdAt: nowIso,
    })),
  );

  const lyrics = lyricsOfLines(s.lyricLinesPerOriginal);
  const originals = Array.from({ length: s.originals }, (_, i) => ({
    id: `${p}original-${i}`,
    title: `Fixture Original ${i}`,
    key: 'C',
    tempo: 84 + (i % 40),
    lyricsAndChords: lyrics,
    takes: Array.from({ length: s.takesPerOriginal }, (_, t) => ({
      id: `${p}take-${i}-${t}`,
      label: `Take ${t + 1}`,
      createdAt: nowIso,
    })),
    mainTakeId: null,
    history: Array.from({ length: s.historyPerOriginal }, (_, h) => ({
      timestamp: now - h * 60_000,
      lyricsAndChords: lyrics,
    })),
    startedAt: nowIso.slice(0, 10),
    createdAt: nowIso,
    updatedAt: now - i * 1000,
  })) as unknown as EncoreOriginalSong[];

  await encoreDb.transaction(
    'rw',
    encoreDb.songs,
    encoreDb.performances,
    encoreDb.originals,
    async () => {
      await encoreDb.songs.bulkPut(songs);
      await encoreDb.performances.bulkPut(performances);
      await encoreDb.originals.bulkPut(originals);
    },
  );

  return { songs: songs.length, performances: performances.length, originals: originals.length };
}

/** Remove only fixture rows, leaving anything else on the device untouched. */
export async function clearEncorePerfFixture(): Promise<void> {
  assertSafeToSeedEncorePerfFixture(readEnv());
  await encoreDb.transaction(
    'rw',
    encoreDb.songs,
    encoreDb.performances,
    encoreDb.originals,
    async () => {
      for (const table of [encoreDb.songs, encoreDb.performances, encoreDb.originals]) {
        const ids = (await table.toArray())
          .map((row) => (row as { id: string }).id)
          .filter((id) => id.startsWith(ENCORE_PERF_FIXTURE_ID_PREFIX));
        if (ids.length) await table.bulkDelete(ids);
      }
    },
  );
}

declare global {
  interface Window {
    __labsSeedEncorePerfFixture?: typeof seedEncorePerfFixture;
    __labsClearEncorePerfFixture?: typeof clearEncorePerfFixture;
  }
}

/** Dev-only registration — compiled out of production builds. */
export function exposeEncorePerfFixture(): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  window.__labsSeedEncorePerfFixture = seedEncorePerfFixture;
  window.__labsClearEncorePerfFixture = clearEncorePerfFixture;
}
