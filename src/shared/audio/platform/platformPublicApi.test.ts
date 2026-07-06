import { describe, expect, it } from 'vitest';
import {
  LoopTransportClock,
  MasterAudioClock,
  MediaTimelineClock,
  ScoreTransportClock,
  MetronomeRuntimeCoordinator,
  createDrumSchedulerAdapter,
  wireDrumAccompanimentToEngine,
  LookAheadAudioScheduler,
} from './index';

/** Ensures platform barrel exports stay wired for agent/docs registry (knip). */
describe('platform public API', () => {
  it('exports clock and coordinator symbols', () => {
    expect(MasterAudioClock).toBeTypeOf('function');
    expect(LoopTransportClock).toBeTypeOf('function');
    expect(ScoreTransportClock).toBeTypeOf('function');
    expect(MediaTimelineClock).toBeTypeOf('function');
    expect(MetronomeRuntimeCoordinator).toBeTypeOf('function');
    expect(createDrumSchedulerAdapter).toBeTypeOf('function');
    expect(wireDrumAccompanimentToEngine).toBeTypeOf('function');
    expect(LookAheadAudioScheduler).toBeTypeOf('function');
  });
});
