import { describe, expect, it } from 'vitest';
import { resolvePrematureMediaEndResume } from './stanzaMediaDuration';

describe('resolvePrematureMediaEndResume', () => {
  it('resumes when seekable extends past a short metadata end', () => {
    const got = resolvePrematureMediaEndResume({
      currentTime: 174.99,
      reportedDuration: 175,
      seekableEnd: 182.4,
      bufferedEnd: 180,
    });
    expect(got?.shouldResume).toBe(true);
    expect(got!.nextDuration).toBeCloseTo(182.4);
    expect(got!.seekTo).toBeGreaterThan(174.99);
    expect(got!.seekTo).toBeLessThan(182.4);
  });

  it('resumes when only buffered extends past the freeze point', () => {
    const got = resolvePrematureMediaEndResume({
      currentTime: 120,
      reportedDuration: 120,
      seekableEnd: null,
      bufferedEnd: 128.5,
    });
    expect(got?.shouldResume).toBe(true);
    expect(got!.nextDuration).toBeCloseTo(128.5);
  });

  it('resumes from decoded/fingerprint horizon when seekable matches short metadata (VBR)', () => {
    const got = resolvePrematureMediaEndResume({
      currentTime: 175,
      reportedDuration: 175,
      seekableEnd: 175,
      bufferedEnd: 175,
      knownHorizonSec: 188.2,
    });
    expect(got?.shouldResume).toBe(true);
    expect(got!.nextDuration).toBeCloseTo(188.2);
    expect(got!.seekTo).toBeGreaterThan(175);
  });

  it('does not resume without evidence when ranges and horizon match the freeze', () => {
    expect(
      resolvePrematureMediaEndResume({
        currentTime: 180,
        reportedDuration: 180,
        seekableEnd: 180,
        bufferedEnd: 180,
        knownHorizonSec: 180,
      }),
    ).toBeNull();
  });

  it('does not speculative-nudge when only short metadata exists (no horizon)', () => {
    expect(
      resolvePrematureMediaEndResume({
        currentTime: 120,
        reportedDuration: 120,
        seekableEnd: 120,
        bufferedEnd: 120,
        knownHorizonSec: null,
      }),
    ).toBeNull();
  });

  it('does not resume mid-track before reported duration', () => {
    expect(
      resolvePrematureMediaEndResume({
        currentTime: 60,
        reportedDuration: 180,
        seekableEnd: 180,
        bufferedEnd: 90,
        knownHorizonSec: 200,
      }),
    ).toBeNull();
  });
});
