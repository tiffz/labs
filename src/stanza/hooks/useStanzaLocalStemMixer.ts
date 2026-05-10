import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { StanzaLocalStemMixer } from '../audio/stanzaLocalStemMixer';
import { stemPlaybackMuted } from '../utils/stanzaPlaybackMute';

export interface StanzaStemMixRow {
  id: string;
  muted?: boolean;
  gain?: number;
}

/**
 * When local playback has stems, builds a Web Audio graph (main + stems → GainNodes → destination)
 * so mix is one bus; transport still drives HTMLMediaElement play/seek/rate (ADR 0004).
 *
 * The graph is built from **`prepareStemMixerForPlaySync()`** in the **same synchronous turn** as
 * `HTMLMediaElement.play()` so autoplay / user-activation rules are satisfied (an `await` before
 * `play()` can drop activation). **`finalizeStemMixerResume()`** runs after `play()` to await a
 * fully running context when the browser needs extra ticks.
 */
export function useStanzaLocalStemMixer(options: {
  enabled: boolean;
  stemUrlKey: string;
  expectedStemCount: number;
  primaryMuted: boolean;
  primaryGain: number;
  stems: StanzaStemMixRow[];
  localVideoRef: MutableRefObject<HTMLVideoElement | null>;
  localAudioRef: MutableRefObject<HTMLAudioElement | null>;
  stemAudioRefs: MutableRefObject<Map<string, HTMLAudioElement>>;
  /** When `AudioContext` cannot reach `running`, graph is torn down; call to restore `volume` / `muted` on media elements. */
  onMixResumeFailed?: () => void;
}): {
  webAudioMixReady: boolean;
  /** Sync: (re)build graph if needed, apply gains, `void context.resume()`. Returns false → use HTML volumes. */
  prepareStemMixerForPlaySync: () => boolean;
  /** Call after `main.play()`; async tail so context reaches `running` if needed. */
  finalizeStemMixerResume: () => void;
  /** Drop Web Audio routing (e.g. `play()` rejected); caller should restore element volumes if transport was prepared. */
  abandonWebAudioMix: () => void;
} {
  const {
    enabled,
    stemUrlKey,
    expectedStemCount,
    primaryMuted,
    primaryGain,
    stems,
    localVideoRef,
    localAudioRef,
    stemAudioRefs,
    onMixResumeFailed,
  } = options;

  const mixerRef = useRef<StanzaLocalStemMixer | null>(null);
  const builtForStemUrlKeyRef = useRef('');
  const prevStemUrlKeyRef = useRef<string | null>(null);
  const [webAudioMixReady, setWebAudioMixReady] = useState(false);

  const mixRef = useRef({ primaryMuted, primaryGain, stems });
  mixRef.current = { primaryMuted, primaryGain, stems };

  const getMainElement = useCallback((): HTMLMediaElement | null => {
    // Match `StanzaWorkspace` transport (`localAudioRef` first) so we attach the same element as `playUnified`.
    return (localAudioRef.current ?? localVideoRef.current) as HTMLMediaElement | null;
  }, [localAudioRef, localVideoRef]);

  useEffect(() => {
    const prev = prevStemUrlKeyRef.current;
    prevStemUrlKeyRef.current = stemUrlKey;

    if (!enabled || !stemUrlKey || expectedStemCount <= 0) {
      mixerRef.current?.dispose();
      mixerRef.current = null;
      builtForStemUrlKeyRef.current = '';
      setWebAudioMixReady(false);
      return;
    }

    if (prev !== null && prev !== stemUrlKey) {
      mixerRef.current?.dispose();
      mixerRef.current = null;
      builtForStemUrlKeyRef.current = '';
      setWebAudioMixReady(false);
    }
  }, [enabled, stemUrlKey, expectedStemCount]);

  useEffect(() => {
    return () => {
      mixerRef.current?.dispose();
      mixerRef.current = null;
      builtForStemUrlKeyRef.current = '';
      setWebAudioMixReady(false);
    };
  }, []);

  useEffect(() => {
    const mixer = mixerRef.current;
    if (!webAudioMixReady || !mixer?.isActive()) return;
    const { primaryMuted: pm, primaryGain: pg, stems: rows } = mixRef.current;
    mixer.setPrimaryMix(pm, pg ?? 1);
    for (const s of rows) {
      mixer.setStemMix(s.id, stemPlaybackMuted(s), s.gain ?? 1);
    }
  }, [webAudioMixReady, primaryMuted, primaryGain, stems]);

  const prepareStemMixerForPlaySync = useCallback((): boolean => {
    if (!enabled || !stemUrlKey || expectedStemCount <= 0) return true;

    const main = getMainElement();
    const stemMap = new Map(stemAudioRefs.current);
    if (!main || stemMap.size < expectedStemCount) {
      // Do not leave `webAudioMixReady` true with a half-built graph (e.g. stem `<audio>` refs not
      // mounted yet, or count mismatch).
      mixerRef.current?.dispose();
      mixerRef.current = null;
      builtForStemUrlKeyRef.current = '';
      setWebAudioMixReady(false);
      return false;
    }

    const { primaryMuted: pm, primaryGain: pg, stems: rows } = mixRef.current;

    const existing = mixerRef.current;
    if (existing?.isActive() && builtForStemUrlKeyRef.current === stemUrlKey) {
      existing.setPrimaryMix(pm, pg ?? 1);
      for (const s of rows) {
        existing.setStemMix(s.id, stemPlaybackMuted(s), s.gain ?? 1);
      }
      existing.kickResumeSync();
      return true;
    }

    mixerRef.current?.dispose();
    const mixer = new StanzaLocalStemMixer();
    try {
      mixer.rebuild(main, stemMap);
    } catch {
      mixer.dispose();
      mixerRef.current = null;
      builtForStemUrlKeyRef.current = '';
      setWebAudioMixReady(false);
      return false;
    }

    mixerRef.current = mixer;
    builtForStemUrlKeyRef.current = stemUrlKey;
    setWebAudioMixReady(true);
    mixer.setPrimaryMix(pm, pg ?? 1);
    for (const s of rows) {
      mixer.setStemMix(s.id, stemPlaybackMuted(s), s.gain ?? 1);
    }
    mixer.kickResumeSync();
    return true;
  }, [enabled, stemUrlKey, expectedStemCount, getMainElement, stemAudioRefs]);

  const abandonWebAudioMix = useCallback(() => {
    mixerRef.current?.dispose();
    mixerRef.current = null;
    builtForStemUrlKeyRef.current = '';
    setWebAudioMixReady(false);
  }, []);

  const finalizeStemMixerResume = useCallback(() => {
    void mixerRef.current?.ensureRunning().then((ok) => {
      if (ok) return;
      abandonWebAudioMix();
      onMixResumeFailed?.();
    });
  }, [abandonWebAudioMix, onMixResumeFailed]);

  return { webAudioMixReady, prepareStemMixerForPlaySync, finalizeStemMixerResume, abandonWebAudioMix };
}
