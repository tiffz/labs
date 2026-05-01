/** Latest `YYYY-MM-DD` (lexicographic max) per song; guest list + publishes use this order. */
export function orderSnapshotSongsByLatestPerformanceDesc<
  TSong extends { id: string; title: string },
  TPerf extends { songId: string; date: string },
>(songs: TSong[], performances: TPerf[]): TSong[] {
  const lastBySong = new Map<string, string>();
  for (const p of performances) {
    const cur = lastBySong.get(p.songId);
    if (!cur || p.date > cur) lastBySong.set(p.songId, p.date);
  }
  return [...songs].sort((a, b) => {
    const da = lastBySong.get(a.id);
    const db = lastBySong.get(b.id);
    const aHas = Boolean(da);
    const bHas = Boolean(db);
    if (aHas && bHas && da !== db) return db!.localeCompare(da!);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    const t = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
}
