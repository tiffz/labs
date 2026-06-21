import type { MidiAppMode, TransportConfig } from './types';
import { DEFAULT_TRANSPORT } from './types';

const KEY_TRANSPORT = 'midi:transport:v1';
const KEY_STRICTNESS = 'midi:strictness:v1';
const KEY_CAPTURE_BARS = 'midi:captureBars:v1';
const KEY_MODE = 'midi:mode:v1';

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

export function readPersistedTransport(): TransportConfig {
  const raw = safeGet(KEY_TRANSPORT);
  if (!raw) return DEFAULT_TRANSPORT;
  try {
    const parsed = JSON.parse(raw) as Partial<TransportConfig>;
    return {
      ...DEFAULT_TRANSPORT,
      ...parsed,
      timeSignature: parsed.timeSignature ?? DEFAULT_TRANSPORT.timeSignature,
    };
  } catch {
    return DEFAULT_TRANSPORT;
  }
}

export function writePersistedTransport(transport: TransportConfig): void {
  safeSet(KEY_TRANSPORT, JSON.stringify(transport));
}

export function readPersistedStrictness(): number {
  const raw = safeGet(KEY_STRICTNESS);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.35;
}

export function writePersistedStrictness(value: number): void {
  safeSet(KEY_STRICTNESS, String(Math.max(0, Math.min(1, value))));
}

export function readPersistedCaptureBars(): number {
  const raw = safeGet(KEY_CAPTURE_BARS);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.max(1, Math.min(16, Math.round(n))) : 4;
}

export function writePersistedCaptureBars(count: number): void {
  safeSet(KEY_CAPTURE_BARS, String(Math.max(1, Math.min(16, Math.round(count)))));
}

export function readPersistedMode(): MidiAppMode {
  const raw = safeGet(KEY_MODE);
  if (raw === 'compose' || raw === 'guide' || raw === 'scratchpad') return raw;
  return 'scratchpad';
}

export function writePersistedMode(mode: MidiAppMode): void {
  safeSet(KEY_MODE, mode);
}
