import { describe, expect, it } from 'vitest';
import {
  resolvePrematureMediaEndResume,
  resolveStickyTransportDurationSec,
} from './stanzaMediaDuration';

describe('resolveStickyTransportDurationSec', () => {
  it('does not let short HTML5 metadata shrink a longer decoded duration', () => {
    expect(
      resolveStickyTransportDurationSec({
        previousDurationSec: 188.2,
        elementDurationSec: 175,
        knownHorizonSec: 188.2,
      }),
    ).toBeCloseTo(188.2);
  });

  it('grows when the element reports a longer seekable/metadata duration', () => {
    expect(
      resolveStickyTransportDurationSec({
        previousDurationSec: 120,
        elementDurationSec: 182.4,
        knownHorizonSec: 120,
      }),
    ).toBeCloseTo(182.4);
  });

  it('keeps previous when element duration is unavailable', () => {
    expect(
      resolveStickyTransportDurationSec({
        previousDurationSec: 200,
        elementDurationSec: null,
        knownHorizonSec: null,
      }),
    ).toBe(200);
  });
});

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

  // Repro for "Stanza playback stops before the song finishes" (Drive-hosted mp4 whose
  // container duration is shorter than the decoded-audio horizon). A media element cannot
  // seek past its own hard `duration`, so resuming on the analyzed horizon alone re-clamps
  // and re-fires `ended` forever. The non-advancing guard must stop at the element's end.
  describe('non-advancing element (hard EOF shorter than analyzed horizon)', () => {
    // First `ended` at the element's hard EOF: no range past the freeze, only a longer
    // decoded horizon. We resume once (the optimistic attempt).
    const firstAttempt = resolvePrematureMediaEndResume({
      currentTime: 175,
      reportedDuration: 175,
      seekableEnd: 175,
      bufferedEnd: 175,
      knownHorizonSec: 188.2,
    });

    it('resumes optimistically on the first premature end', () => {
      expect(firstAttempt?.shouldResume).toBe(true);
      expect(firstAttempt!.seekTo).toBeGreaterThan(175);
    });

    it('stops instead of looping when the element ends again without advancing', () => {
      // The element clamped the seek back to its hard duration and re-fired `ended` at the
      // same freeze. With no element range past the previous target, do not resume again.
      expect(
        resolvePrematureMediaEndResume({
          currentTime: 175,
          reportedDuration: 175,
          seekableEnd: 175,
          bufferedEnd: 175,
          knownHorizonSec: 188.2,
          previousResumeTargetSec: firstAttempt!.seekTo,
        }),
      ).toBeNull();
    });

    it('still resumes when the element actually advanced past the previous target (VBR tail)', () => {
      // A real VBR MP3 plays past its estimated duration; the next `ended` lands well beyond
      // the prior attempt, so the guard does not trip.
      const got = resolvePrematureMediaEndResume({
        currentTime: 184,
        reportedDuration: 184,
        seekableEnd: 184,
        bufferedEnd: 184,
        knownHorizonSec: 188.2,
        previousResumeTargetSec: 175.05,
      });
      expect(got?.shouldResume).toBe(true);
      expect(got!.seekTo).toBeGreaterThan(184);
    });

    it('still resumes when the element exposes real range past the previous target', () => {
      // Streaming/buffering caught up: seekable now extends past the prior attempt, so the
      // element can honor the resume even though we ended near the same time.
      const got = resolvePrematureMediaEndResume({
        currentTime: 175,
        reportedDuration: 175,
        seekableEnd: 188.2,
        bufferedEnd: 188.2,
        knownHorizonSec: 188.2,
        previousResumeTargetSec: 175.05,
      });
      expect(got?.shouldResume).toBe(true);
    });

    it('does not apply the guard to a different, far-earlier freeze point', () => {
      // A later premature end at an unrelated (much earlier) position must not be blocked by
      // a stale target from a prior media identity.
      const got = resolvePrematureMediaEndResume({
        currentTime: 40,
        reportedDuration: 40,
        seekableEnd: 40,
        bufferedEnd: 40,
        knownHorizonSec: 92,
        previousResumeTargetSec: 175.05,
      });
      expect(got?.shouldResume).toBe(true);
    });
  });
});
