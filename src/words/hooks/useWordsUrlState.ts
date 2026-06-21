import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { SOUND_OPTIONS, type SoundType } from '../../shared/music/soundOptions';
import type { SongKey } from '../../shared/music/songKeyFormat';
import { isValidSongKey } from '../../shared/music/songKeyFormat';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { SongSection } from '../../shared/music/songSections';
import {
  subscribeToPopState,
  syncUrlWithHistory,
  type UrlRoutingHistoryState,
} from '../../shared/utils/urlRouting';
import { parseOptionalNumberParam } from '../../shared/utils/urlParams';
import {
  decodeGenerationSettingsJson,
  encodeGenerationSettingsJson,
  mergePartialGenerationSettings,
} from '../utils/generationSettingsCodec';
import { decodeBase64UrlUtf8, encodeBase64UrlUtf8 } from '../utils/urlStateCodec';
import { normalizeSectionsSnapshot } from '../utils/sectionSnapshot';
import type { WordRhythmGenerationSettings } from '../utils/prosodyEngine';
import {
  APP_DEFAULT_GENERATION_SETTINGS,
  DEFAULT_SECTIONS,
  DEFAULT_SONG_KEY,
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_WORD_RESULT,
  TIME_SIGNATURE_OPTIONS,
  URL_HISTORY_DEBOUNCE_MS,
  URL_HISTORY_REPLACE_DEBOUNCE_PARAMS,
  URL_PARAM_AUTOFOLLOW,
  URL_PARAM_BPM,
  URL_PARAM_CHORD_KEY,
  URL_PARAM_CHORD_SOUND,
  URL_PARAM_CHORD_VOLUME,
  URL_PARAM_DRUMS_VOLUME,
  URL_PARAM_GENERATION_SETTINGS,
  URL_PARAM_LYRICS,
  URL_PARAM_METRONOME,
  URL_PARAM_PATTERN,
  URL_PARAM_PATTERN_B64,
  URL_PARAM_SECTIONS,
  URL_PARAM_TIME,
} from '../utils/wordsAppDefaults';

export type WordsUrlStateSetters = {
  setSections: React.Dispatch<React.SetStateAction<SongSection[]>>;
  setSongKey: React.Dispatch<React.SetStateAction<SongKey>>;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  setNotation: React.Dispatch<React.SetStateAction<string>>;
  setTimeSignature: React.Dispatch<React.SetStateAction<TimeSignature>>;
  setMetronomeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setAutoFollowPlayback: React.Dispatch<React.SetStateAction<boolean>>;
  setGenerationSettings: React.Dispatch<
    React.SetStateAction<WordRhythmGenerationSettings>
  >;
  setDrumsVolume: React.Dispatch<React.SetStateAction<number>>;
  setChordSoundType: React.Dispatch<React.SetStateAction<SoundType>>;
  setChordVolume: React.Dispatch<React.SetStateAction<number>>;
};

export function useWordsUrlState(
  state: {
    sections: SongSection[];
    songKey: SongKey;
    notation: string;
    bpm: number;
    timeSignature: TimeSignature;
    metronomeEnabled: boolean;
    autoFollowPlayback: boolean;
    generationSettings: WordRhythmGenerationSettings;
    drumsVolume: number;
    chordSoundType: SoundType;
    chordVolume: number;
  },
  setters: WordsUrlStateSetters,
  urlHistoryStateRef: RefObject<UrlRoutingHistoryState>
): void {
  const hasHydratedUrlStateRef = useRef(false);
  const settersRef = useRef(setters);
  settersRef.current = setters;

  const hydrateFromUrlSearch = useCallback((search: string) => {
      const params = new URLSearchParams(search);
      const sectionsParam = params.get(URL_PARAM_SECTIONS);
      const encodedLyrics = params.get(URL_PARAM_LYRICS);
      const encodedPattern = params.get(URL_PARAM_PATTERN_B64);
      const patternParam = params.get(URL_PARAM_PATTERN);
      const bpmParam = Number(params.get(URL_PARAM_BPM));
      const timeParam = params.get(URL_PARAM_TIME);
      const metronomeParam = params.get(URL_PARAM_METRONOME);
      const autoFollowParam = params.get(URL_PARAM_AUTOFOLLOW);
      const generationSettingsParam = params.get(URL_PARAM_GENERATION_SETTINGS);
      const drumsVolumeParam = parseOptionalNumberParam(
        params.get(URL_PARAM_DRUMS_VOLUME)
      );
      const chordSoundParam = params.get(URL_PARAM_CHORD_SOUND);
      const chordVolumeParam = parseOptionalNumberParam(
        params.get(URL_PARAM_CHORD_VOLUME)
      );
      const chordKeyParam = params.get(URL_PARAM_CHORD_KEY);

      if (sectionsParam) {
        const decodedSections = decodeBase64UrlUtf8(sectionsParam);
        if (decodedSections) {
          try {
            const parsed = JSON.parse(decodedSections) as {
              songKey?: SongKey;
              sections?: SongSection[];
            };
            if (parsed.songKey && isValidSongKey(parsed.songKey)) {
              settersRef.current.setSongKey(parsed.songKey);
            }
            if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
              settersRef.current.setSections(normalizeSectionsSnapshot(parsed.sections));
            }
          } catch {
            // Ignore malformed section payload and fall back below.
          }
        }
      } else {
        const decodedLyrics = encodedLyrics
          ? decodeBase64UrlUtf8(encodedLyrics)
          : null;
        if (typeof decodedLyrics === 'string') {
          settersRef.current.setSections((previous) =>
            previous.map((section, index) =>
              index === 0 ? { ...section, lyrics: decodedLyrics } : section
            )
          );
        }
      }

      if (!Number.isNaN(bpmParam) && bpmParam >= 40 && bpmParam <= 220) {
        settersRef.current.setBpm(bpmParam);
      }
      const decodedPattern = encodedPattern
        ? decodeBase64UrlUtf8(encodedPattern)
        : null;
      const nextPattern = decodedPattern ?? patternParam;
      if (nextPattern && nextPattern.trim().length > 0) {
        settersRef.current.setNotation(nextPattern);
      }
      if (timeParam) {
        const [numerator, denominator] = timeParam.split('/').map(Number);
        if (
          Number.isFinite(numerator) &&
          Number.isFinite(denominator) &&
          TIME_SIGNATURE_OPTIONS.some(
            (option) =>
              option.numerator === numerator && option.denominator === denominator
          )
        ) {
          settersRef.current.setTimeSignature({ numerator, denominator });
        }
      }
      if (metronomeParam === '1' || metronomeParam === '0')
        settersRef.current.setMetronomeEnabled(metronomeParam === '1');
      if (autoFollowParam === '1' || autoFollowParam === '0')
        settersRef.current.setAutoFollowPlayback(autoFollowParam === '1');
      if (generationSettingsParam) {
        const decodedSettings = decodeBase64UrlUtf8(generationSettingsParam);
        if (decodedSettings) {
          const parsed = decodeGenerationSettingsJson(decodedSettings);
          if (parsed) {
            settersRef.current.setGenerationSettings((previous) =>
              mergePartialGenerationSettings(previous, parsed)
            );
          }
        }
      }
      if (
        drumsVolumeParam !== null &&
        drumsVolumeParam >= 0 &&
        drumsVolumeParam <= 100
      ) {
        settersRef.current.setDrumsVolume(drumsVolumeParam);
      }
      if (
        chordSoundParam &&
        SOUND_OPTIONS.some((option) => option.value === chordSoundParam)
      ) {
        settersRef.current.setChordSoundType(chordSoundParam as SoundType);
      }
      if (
        chordVolumeParam !== null &&
        chordVolumeParam >= 0 &&
        chordVolumeParam <= 100
      ) {
        settersRef.current.setChordVolume(chordVolumeParam);
      }
      if (chordKeyParam && isValidSongKey(chordKeyParam)) {
        settersRef.current.setSongKey(chordKeyParam);
      }
  }, []);

  useEffect(() => {
    hydrateFromUrlSearch(window.location.search);
    hasHydratedUrlStateRef.current = true;
  }, [hydrateFromUrlSearch]);

  useEffect(
    () =>
      subscribeToPopState(() => {
        hydrateFromUrlSearch(window.location.search);
      }),
    [hydrateFromUrlSearch]
  );

  useEffect(() => {
    if (!hasHydratedUrlStateRef.current) return;
    const params = new URLSearchParams();
    const generationSettingsJson = encodeGenerationSettingsJson(
      state.generationSettings
    );
    const defaultGenerationSettingsJson = encodeGenerationSettingsJson(
      APP_DEFAULT_GENERATION_SETTINGS
    );
    const defaultSectionsJson = JSON.stringify(DEFAULT_SECTIONS);
    const sectionsJson = JSON.stringify(state.sections);
    if (sectionsJson !== defaultSectionsJson || state.songKey !== DEFAULT_SONG_KEY) {
      params.set(
        URL_PARAM_SECTIONS,
        encodeBase64UrlUtf8(JSON.stringify({ sections: state.sections, songKey: state.songKey }))
      );
    }
    if (state.notation !== DEFAULT_WORD_RESULT.notation) {
      params.set(URL_PARAM_PATTERN_B64, encodeBase64UrlUtf8(state.notation));
    }
    if (state.bpm !== 100) params.set(URL_PARAM_BPM, String(state.bpm));
    if (
      state.timeSignature.numerator !== DEFAULT_TIME_SIGNATURE.numerator ||
      state.timeSignature.denominator !== DEFAULT_TIME_SIGNATURE.denominator
    ) {
      params.set(
        URL_PARAM_TIME,
        `${state.timeSignature.numerator}/${state.timeSignature.denominator}`
      );
    }
    if (!state.metronomeEnabled) params.set(URL_PARAM_METRONOME, '0');
    if (!state.autoFollowPlayback) params.set(URL_PARAM_AUTOFOLLOW, '0');
    if (generationSettingsJson !== defaultGenerationSettingsJson) {
      params.set(
        URL_PARAM_GENERATION_SETTINGS,
        encodeBase64UrlUtf8(generationSettingsJson)
      );
    }
    if (state.drumsVolume !== 100) {
      params.set(URL_PARAM_DRUMS_VOLUME, String(state.drumsVolume));
    }
    if (state.chordSoundType !== 'piano') {
      params.set(URL_PARAM_CHORD_SOUND, state.chordSoundType);
    }
    if (state.chordVolume !== 58) {
      params.set(URL_PARAM_CHORD_VOLUME, String(state.chordVolume));
    }
    if (state.songKey !== DEFAULT_SONG_KEY)
      params.set(URL_PARAM_CHORD_KEY, state.songKey);
    const nextUrl =
      params.size > 0
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    syncUrlWithHistory(nextUrl, urlHistoryStateRef.current, {
      debounceMs: URL_HISTORY_DEBOUNCE_MS,
      replaceDebounceParams: URL_HISTORY_REPLACE_DEBOUNCE_PARAMS,
    });
  }, [
    state.sections,
    state.songKey,
    state.notation,
    state.bpm,
    state.timeSignature,
    state.metronomeEnabled,
    state.autoFollowPlayback,
    state.generationSettings,
    state.drumsVolume,
    state.chordSoundType,
    state.chordVolume,
    urlHistoryStateRef,
  ]);
}
