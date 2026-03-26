import type { PracticeRun } from '../types';

export interface PracticeRecord {
  id: string;
  timestamp: number;
  scoreId: string;
  scoreTitle: string;
  exerciseType?: string;
  exerciseParams?: {
    key?: string;
    quality?: string;
    type?: string;
    direction?: string;
    octaves?: number;
    subdivision?: number;
    progression?: string;
  };
  tempo: number;
  runs: PracticeRun[];
  bestAccuracy: number;
  averageAccuracy: number;
  totalDurationMs: number;
  practiceMode: 'practice' | 'free-practice';
  handsUsed: string[];
}

const HISTORY_KEY = 'piano-practice-history';
const MAX_RECORDS = 1000;
const MAX_RUNS_PER_RECORD = 64;
const MAX_RESULTS_PER_RUN = 800;

function getAll(): PracticeRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function compactRecord(record: PracticeRecord): PracticeRecord {
  const runs = (record.runs ?? []).slice(-MAX_RUNS_PER_RECORD).map((run) => ({
    ...run,
    // Keep timing/pitch judgments but strip large pitch arrays from historical snapshots.
    results: (run.results ?? []).slice(-MAX_RESULTS_PER_RUN).map((res) => ({
      ...res,
      noteId: res.noteId ?? '',
      expectedPitches: [],
      playedPitches: [],
      timingOffsetMs: Number.isFinite(res.timingOffsetMs) ? Math.round(res.timingOffsetMs) : 0,
      pitchCorrect: !!res.pitchCorrect,
    })),
  }));
  return { ...record, runs };
}

function trySave(records: PracticeRecord[]): boolean {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function saveAll(records: PracticeRecord[]): void {
  if (trySave(records)) return;

  // First pass: compact payload-heavy run data.
  let next = records.map(compactRecord);
  if (trySave(next)) return;

  // Second pass: evict oldest records until storage succeeds.
  while (next.length > 1) {
    next = next.slice(0, Math.max(1, next.length - Math.ceil(next.length * 0.15)));
    if (trySave(next)) return;
  }

  // Final fallback: keep app responsive even if persistence is unavailable.
  try {
    localStorage.removeItem(HISTORY_KEY);
    if (next.length > 0) {
      void trySave([compactRecord(next[0])]);
    }
  } catch {
    // Ignore storage failures; practice mode should still stop cleanly.
  }
}

export function getAllRecords(): PracticeRecord[] {
  return getAll();
}

export function addRecord(record: PracticeRecord): void {
  const records = getAll();
  records.unshift(compactRecord(record));
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
  saveAll(records);
}

export function getTotalPracticeTime(since?: number): number {
  return getAll()
    .filter(r => !since || r.timestamp >= since)
    .reduce((sum, r) => sum + r.totalDurationMs, 0);
}

export function getPracticeStreak(): number {
  const records = getAll();
  if (records.length === 0) return 0;

  const daySet = new Set(records.map(r => {
    const d = new Date(r.timestamp);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }));

  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (daySet.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function getKeyProficiency(): Map<string, { avgAccuracy: number; count: number }> {
  const records = getAll();
  const byKey = new Map<string, { total: number; count: number }>();

  for (const r of records) {
    const key = r.exerciseParams?.key;
    if (!key) continue;
    const existing = byKey.get(key) ?? { total: 0, count: 0 };
    existing.total += r.averageAccuracy;
    existing.count++;
    byKey.set(key, existing);
  }

  const result = new Map<string, { avgAccuracy: number; count: number }>();
  for (const [key, val] of byKey) {
    result.set(key, { avgAccuracy: Math.round(val.total / val.count), count: val.count });
  }
  return result;
}

export function getTimingAnalysis(): {
  earlyPct: number;
  latePct: number;
  perfectPct: number;
  wrongPitchPct: number;
  missedPct: number;
} {
  const records = getAll();
  let early = 0, late = 0, perfect = 0, wrongPitch = 0, missed = 0;

  for (const r of records) {
    for (const run of r.runs) {
      for (const res of run.results) {
        switch (res.timing) {
          case 'early': early++; break;
          case 'late': late++; break;
          case 'perfect': perfect++; break;
          case 'wrong_pitch': wrongPitch++; break;
          case 'missed': missed++; break;
        }
      }
    }
  }

  const total = early + late + perfect + wrongPitch + missed;
  if (total === 0) {
    return { earlyPct: 0, latePct: 0, perfectPct: 0, wrongPitchPct: 0, missedPct: 0 };
  }

  return {
    earlyPct: Math.round((early / total) * 100),
    latePct: Math.round((late / total) * 100),
    perfectPct: Math.round((perfect / total) * 100),
    wrongPitchPct: Math.round((wrongPitch / total) * 100),
    missedPct: Math.round((missed / total) * 100),
  };
}

export function getRecommendations(records: PracticeRecord[]): string[] {
  const recs: string[] = [];
  if (records.length === 0) return ['Start practicing to get personalized recommendations!'];

  const recent = records.slice(0, 20);
  const avgAccuracy = recent.reduce((s, r) => s + r.averageAccuracy, 0) / recent.length;

  if (avgAccuracy > 90) {
    const tempos = recent.map(r => r.tempo);
    const maxTempo = Math.max(...tempos);
    recs.push(`You're averaging ${Math.round(avgAccuracy)}% accuracy — try increasing tempo to ${maxTempo + 10} BPM.`);
  }

  const keyMap = new Map<string, number[]>();
  for (const r of records) {
    const key = r.exerciseParams?.key;
    if (!key) continue;
    const arr = keyMap.get(key) ?? [];
    arr.push(r.averageAccuracy);
    keyMap.set(key, arr);
  }
  let weakestKey = '', weakestAvg = 100;
  for (const [key, accs] of keyMap) {
    const avg = accs.reduce((s, a) => s + a, 0) / accs.length;
    if (avg < weakestAvg) { weakestAvg = avg; weakestKey = key; }
  }
  if (weakestKey && weakestAvg < 80) {
    recs.push(`${weakestKey} is your weakest key at ${Math.round(weakestAvg)}% — consider focusing practice here.`);
  }

  const timing = getTimingAnalysis();
  if (timing.earlyPct > 30) {
    recs.push(`You tend to rush — ${timing.earlyPct}% of notes are early. Try using the metronome at a slower tempo.`);
  } else if (timing.latePct > 30) {
    recs.push(`You tend to drag — ${timing.latePct}% of notes are late. Try listening ahead to the metronome.`);
  }
  if (timing.wrongPitchPct > 20) {
    recs.push(
      `Pitch mismatches are ${timing.wrongPitchPct}% of attempts. Try slower chord transitions and lock each shape before moving.`
    );
  }

  const daysSincePractice = new Map<string, number>();
  for (const r of records) {
    const key = r.exerciseParams?.key;
    if (!key || daysSincePractice.has(key)) continue;
    daysSincePractice.set(key, Math.floor((Date.now() - r.timestamp) / (1000 * 60 * 60 * 24)));
  }
  for (const [key, days] of daysSincePractice) {
    if (days >= 14) {
      recs.push(`You haven't practiced ${key} in ${days} days.`);
      break;
    }
  }

  return recs.length > 0 ? recs : ['Keep up the great practice!'];
}
