export function getLatestAttackTime(
  played: number[],
  midiTimes: ReadonlyMap<number, number>
): number | null {
  let latest: number | null = null;
  for (const midi of played) {
    const t = midiTimes.get(midi);
    if (t === undefined) continue;
    if (latest === null || t > latest) latest = t;
  }
  return latest;
}

export function canAdvanceWhileWaitingForRelease(args: {
  played: number[];
  midiTimes: ReadonlyMap<number, number>;
  lastAdvanceInputTime: number;
  canBypassForTieContinuation: boolean;
}): boolean {
  if (args.canBypassForTieContinuation) return true;
  const latestAttack = getLatestAttackTime(args.played, args.midiTimes);
  if (latestAttack === null) return false;
  return latestAttack > args.lastAdvanceInputTime + 1;
}
