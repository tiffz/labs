import { describe, expect, it } from 'vitest';
import {
  clampBpm,
  getTemplateSyncopationScore,
  snapBiasToLevel,
} from './appRhythmHelpers';
import { normalizeSectionsSnapshot } from './sectionSnapshot';
import { decodeBase64UrlUtf8, encodeBase64UrlUtf8 } from './urlStateCodec';
import type { SongSection } from '../../shared/music/songSections';
import {
  buildEffectiveSections,
  buildSectionDisplayNames,
} from './wordsSectionPlans';
import { buildLyricsExportText } from './wordsChordExportText';
import { DEFAULT_SECTIONS } from './wordsAppDefaults';
import { applyRandomizationTransform, pickContrastingTemplate } from './wordsRandomization';
import { estimateSongDuration } from './wordsSongDerived';
import { buildEffectiveDrumPlaybackSettings } from '../../shared/music/playbackVolumeMix';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';

describe('wordsSectionPlans', () => {
  it('inherits chorus lyrics from linked source', () => {
    const sections: SongSection[] = [
      {
        ...DEFAULT_SECTIONS[0],
        id: 'verse-1',
        type: 'verse',
        lyrics: 'Line one',
      },
      {
        ...DEFAULT_SECTIONS[1],
        id: 'chorus-1',
        type: 'chorus',
        lyrics: 'Chorus line',
        linkedToPreviousChorusLyrics: true,
      },
      {
        ...DEFAULT_SECTIONS[1],
        id: 'chorus-2',
        type: 'chorus',
        lyrics: '',
        linkedToPreviousChorusLyrics: true,
      },
    ];
    const effective = buildEffectiveSections(sections);
    expect(effective[2]?.effectiveLyrics).toBe('Chorus line');
  });

  it('labels duplicate section types with numbers', () => {
    const sections: SongSection[] = [
      { ...DEFAULT_SECTIONS[0], id: 'v1', type: 'verse' },
      { ...DEFAULT_SECTIONS[0], id: 'v2', type: 'verse' },
    ];
    expect(buildSectionDisplayNames(sections)).toEqual(['Verse 1', 'Verse 2']);
  });
});

describe('wordsChordExportText', () => {
  it('builds lyrics export with section headings', () => {
    const effective = buildEffectiveSections(DEFAULT_SECTIONS);
    const names = buildSectionDisplayNames(DEFAULT_SECTIONS);
    const text = buildLyricsExportText(effective, names);
    expect(text).toContain('Verse');
    expect(text).toContain('Chorus');
    expect(text).toContain('Sunrise on the shoreline');
  });
});

describe('wordsRandomization', () => {
  it('pickContrastingTemplate returns a pool member', () => {
    const pool = ['D---D---D---D---', 'D-T-D-T-D-T-D-T-'];
    const picked = pickContrastingTemplate(pool, pool[0] ?? '');
    expect(pool).toContain(picked);
  });

  it('applyRandomizationTransform skips locked sections', () => {
    const locked = { ...DEFAULT_SECTIONS[0], isLocked: true };
    const result = applyRandomizationTransform([locked], {
      mode: 'chords',
      nextKey: 'C',
      templateNotationPool: ['D---D---D---D---'],
    });
    expect(result[0]?.chordProgressionInput).toBe(locked.chordProgressionInput);
  });
});

describe('wordsSongDerived', () => {
  it('estimateSongDuration formats mm:ss', () => {
    const rhythm = parseRhythm('D---D---D---D---', { numerator: 4, denominator: 4 });
    expect(estimateSongDuration(rhythm.measures, 120)).toBe('0:02');
  });
});

describe('playbackVolumeMix (shared)', () => {
  it('buildEffectiveDrumPlaybackSettings scales drum volumes', () => {
    const settings = buildEffectiveDrumPlaybackSettings({
      playbackSettings: {
        nonAccentVolume: 100,
        beatGroupAccentVolume: 100,
        measureAccentVolume: 100,
        metronomeVolume: 100,
        emphasizeSimpleRhythms: false,
        reverbStrength: 0,
        autoScrollDuringPlayback: true,
      },
      drumsVolume: 50,
      drumsMuted: false,
      accentMuted: false,
      metronomeMuted: false,
      masterVolume: 100,
      masterMuted: false,
    });
    expect(settings.nonAccentVolume).toBe(50);
  });
});

describe('appRhythmHelpers', () => {
  it('clamps BPM to 40–220', () => {
    expect(clampBpm(10)).toBe(40);
    expect(clampBpm(300)).toBe(220);
  });

  it('snaps bias levels', () => {
    expect(snapBiasToLevel(10)).toBe(0);
    expect(snapBiasToLevel(50)).toBe(50);
    expect(snapBiasToLevel(90)).toBe(90);
  });

  it('scores syncopated templates higher', () => {
    const steady = getTemplateSyncopationScore('D---D---D---D---');
    const syncopated = getTemplateSyncopationScore('D-T-D-T-D-T-D-T-');
    expect(syncopated).toBeGreaterThan(steady);
  });
});

describe('urlStateCodec', () => {
  it('round-trips UTF-8 through base64url', () => {
    const input = 'Hello 世界 🎵';
    const encoded = encodeBase64UrlUtf8(input);
    expect(decodeBase64UrlUtf8(encoded)).toBe(input);
  });
});

describe('sectionSnapshot', () => {
  it('normalizes legacy templateBias away and defaults isLocked', () => {
    const raw = {
      id: 's1',
      type: 'verse' as const,
      lyrics: '  line  ',
      chordProgressionInput: 'C-G',
      chordStyleId: 'simple',
      templateNotation: 'D---',
      templateBias: 50,
    } as SongSection & { templateBias?: number };

    const [normalized] = normalizeSectionsSnapshot([raw]);
    expect(normalized.isLocked).toBe(false);
    expect('templateBias' in normalized).toBe(false);
    expect(normalized.lyrics).toBe('  line  ');
  });
});
