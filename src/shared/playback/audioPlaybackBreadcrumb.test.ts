import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  audioTraceSessionId,
  buildAudioTracePayload,
  clearAudioBreadcrumbTrail,
  postAudioTraceToDevServer,
  readAudioBreadcrumbTrail,
  recordAudioBreadcrumb,
  summarizeAudioBreadcrumbTrail,
} from './audioPlaybackBreadcrumb';
import type { AudioDiagnosticsSnapshot } from './audioDiagnostics';

function snap(voices: number, heapMB: number | null): AudioDiagnosticsSnapshot {
  return { voices, buses: 0, sources: 0, callbacks: 0, instruments: 1, schedulers: 1, heapMB };
}

afterEach(() => clearAudioBreadcrumbTrail());

describe('audioPlaybackBreadcrumb', () => {
  it('persists samples to localStorage (survives an in-page state loss)', () => {
    recordAudioBreadcrumb(snap(3, 100));
    recordAudioBreadcrumb(snap(5, 110));
    // Fresh read (no in-memory state) — the trail comes back from localStorage.
    const trail = readAudioBreadcrumbTrail();
    expect(trail).toHaveLength(2);
    expect(trail[0].voices).toBe(3);
    expect(trail[1].heapMB).toBe(110);
  });

  it('bounds the ring so a long session cannot grow unbounded', () => {
    for (let i = 0; i < 400; i += 1) recordAudioBreadcrumb(snap(i, 100 + i));
    const trail = readAudioBreadcrumbTrail();
    expect(trail.length).toBeLessThanOrEqual(240);
    // Keeps the most-recent samples (the ones nearest a crash).
    expect(trail[trail.length - 1].voices).toBe(399);
  });

  it('summarizes the heap-growth leak signature', () => {
    recordAudioBreadcrumb(snap(2, 100));
    recordAudioBreadcrumb(snap(200, 250));
    recordAudioBreadcrumb(snap(400, 500));
    const s = summarizeAudioBreadcrumbTrail();
    expect(s.samples).toBe(3);
    expect(s.heapStartMB).toBe(100);
    expect(s.heapPeakMB).toBe(500);
    expect(s.heapGrowthMB).toBe(400);
    expect(s.voicesPeak).toBe(400);
  });

  it('never throws when localStorage misbehaves (best-effort under OOM)', () => {
    // A malformed value must not crash reads.
    localStorage.setItem('labs:audio-breadcrumb-v1', 'not json');
    expect(() => readAudioBreadcrumbTrail()).not.toThrow();
    expect(readAudioBreadcrumbTrail()).toEqual([]);
    expect(() => recordAudioBreadcrumb(snap(1, 100))).not.toThrow();
  });
});

describe('audio trace payload (dev-server auto-POST)', () => {
  it('carries a stable per-tab session id the on-disk filename is keyed on', () => {
    expect(typeof audioTraceSessionId).toBe('string');
    expect(audioTraceSessionId.length).toBeGreaterThan(0);
    expect(buildAudioTracePayload().sessionId).toBe(audioTraceSessionId);
  });

  it('strips query + hash-query from the url so no token/secret can leak', () => {
    const original = window.location.href;
    // jsdom lets us override the route via history for the duration of the test.
    window.history.replaceState(null, '', '/chords/?token=SECRET#section?again=SECRET');
    try {
      const { url } = buildAudioTracePayload();
      expect(url).not.toBeNull();
      expect(url).not.toContain('SECRET');
      expect(url).not.toContain('token');
      expect(url).toContain('/chords/');
    } finally {
      window.history.replaceState(null, '', original);
    }
  });

  it('POSTs the trail to /__debug_audio_trace in dev (import.meta.env.DEV)', () => {
    vi.stubEnv('DEV', true);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}'));
    try {
      recordAudioBreadcrumb(snap(4, 120));
      postAudioTraceToDevServer();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [endpoint, init] = fetchSpy.mock.calls[0];
      expect(endpoint).toBe('/__debug_audio_trace');
      expect(init).toMatchObject({ method: 'POST', keepalive: true });
      const body = JSON.parse(String((init as RequestInit).body));
      expect(body.sessionId).toBe(audioTraceSessionId);
      expect(body.trail.length).toBeGreaterThan(0);
    } finally {
      fetchSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it('does NOT POST when import.meta.env.DEV is false (prod safety)', () => {
    vi.stubEnv('DEV', false);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}'));
    try {
      postAudioTraceToDevServer();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
