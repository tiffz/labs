import { useCallback } from 'react';
import type {
  AlignmentStrength,
  NoteValueBias,
  WordRhythmGenerationSettings,
} from '../utils/prosodyEngine';
import { APP_DEFAULT_GENERATION_SETTINGS } from '../utils/wordsAppDefaults';

export function useGenerationSettingsHandlers(
  setGenerationSettings: React.Dispatch<
    React.SetStateAction<WordRhythmGenerationSettings>
  >
) {
  const setRule = useCallback(
    (key: keyof WordRhythmGenerationSettings, value: boolean) => {
      setGenerationSettings((previous) => ({ ...previous, [key]: value }));
    },
    [setGenerationSettings]
  );

  const setNoteValueBias = useCallback(
    (key: keyof NoteValueBias, value: number) => {
      setGenerationSettings((previous) => ({
        ...previous,
        noteValueBias: { ...previous.noteValueBias, [key]: value },
      }));
    },
    [setGenerationSettings]
  );

  const setStressAlignment = useCallback(
    (value: AlignmentStrength) => {
      setGenerationSettings((previous) => ({ ...previous, stressAlignment: value }));
    },
    [setGenerationSettings]
  );

  const setWordStartAlignment = useCallback(
    (value: AlignmentStrength) => {
      setGenerationSettings((previous) => ({
        ...previous,
        wordStartAlignment: value,
      }));
    },
    [setGenerationSettings]
  );

  const handleSelectAllRules = useCallback(() => {
    setGenerationSettings((previous) => ({
      ...previous,
      fillRests: true,
      subdivideNotes: true,
      mergeNotes: true,
      freestyle: true,
      naturalWordRhythm: true,
      stressAlignment: 'strong',
      wordStartAlignment: 'strong',
    }));
  }, [setGenerationSettings]);

  const handleClearAllRules = useCallback(() => {
    setGenerationSettings((previous) => ({
      ...previous,
      fillRests: false,
      subdivideNotes: false,
      mergeNotes: false,
      freestyle: false,
      naturalWordRhythm: false,
      stressAlignment: 'off',
      wordStartAlignment: 'off',
    }));
  }, [setGenerationSettings]);

  const handleResetGenerationSettings = useCallback(() => {
    setGenerationSettings(APP_DEFAULT_GENERATION_SETTINGS);
  }, [setGenerationSettings]);

  return {
    setRule,
    setNoteValueBias,
    setStressAlignment,
    setWordStartAlignment,
    handleSelectAllRules,
    handleClearAllRules,
    handleResetGenerationSettings,
  };
}
