const KEY_LATENCY = 'agility:latencyMs:v1';
const KEY_LATENCY_MANUAL = 'agility:latencyManual:v1';
const KEY_HEADPHONES = 'agility:headphones:v1';
const KEY_LOW = 'agility:comfortLow:v1';
const KEY_HIGH = 'agility:comfortHigh:v1';
const KEY_PATH_INDEX = 'agility:pathIndex:v1';
const KEY_CALIB_DONE = 'agility:calibrationDone:v1';

const DEFAULT_LATENCY_MS = 180;
export const DEFAULT_COMFORT_LOW = 55;
export const DEFAULT_COMFORT_HIGH = 76;

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* */
  }
}

export function readLatencyMs(): number {
  const raw = safeGet(KEY_LATENCY);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.round(n) : DEFAULT_LATENCY_MS;
}

export function writeLatencyMs(ms: number): void {
  safeSet(KEY_LATENCY, String(Math.max(0, Math.min(350, Math.round(ms)))));
}

export function readLatencyManualMs(): number {
  const raw = safeGet(KEY_LATENCY_MANUAL);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function writeLatencyManualMs(ms: number): void {
  safeSet(KEY_LATENCY_MANUAL, String(Math.max(-200, Math.min(200, Math.round(ms)))));
}

export function readHeadphonesMode(): boolean {
  return safeGet(KEY_HEADPHONES) === '1';
}

export function writeHeadphonesMode(on: boolean): void {
  safeSet(KEY_HEADPHONES, on ? '1' : '0');
}

export interface ComfortRange {
  low: number;
  high: number;
}

export function readComfortRange(): ComfortRange {
  const lo = safeGet(KEY_LOW);
  const hi = safeGet(KEY_HIGH);
  if (lo === null || hi === null) {
    return { low: DEFAULT_COMFORT_LOW, high: DEFAULT_COMFORT_HIGH };
  }
  const low = Number(lo);
  const high = Number(hi);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) {
    return { low: DEFAULT_COMFORT_LOW, high: DEFAULT_COMFORT_HIGH };
  }
  return { low, high };
}

export function writeComfortRange(range: ComfortRange): void {
  safeSet(KEY_LOW, String(range.low));
  safeSet(KEY_HIGH, String(range.high));
}

export function readPathIndex(): number {
  const raw = safeGet(KEY_PATH_INDEX);
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function writePathIndex(index: number): void {
  safeSet(KEY_PATH_INDEX, String(Math.max(0, Math.floor(index))));
}

export function readCalibrationDone(): boolean {
  return safeGet(KEY_CALIB_DONE) === '1';
}

export function writeCalibrationDone(): void {
  safeSet(KEY_CALIB_DONE, '1');
}

export function totalLatencyCompensationMs(): number {
  return readLatencyMs() + readLatencyManualMs();
}
