import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { StanzaLocalStemMixer } from '../audio/stanzaLocalStemMixer';
import { getStanzaLocalMainMediaElement } from '../utils/stanzaLocalMainMediaElement';
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
  isLocalVideo: boolean;
  stemAudioRefs: MutableRefObject<Map<string, HTMLAudioElement>>;
  /** After `createMediaElementSource`, the element must remount to restore HTML audio output. */
  onMixGraphReleased?: () => void;
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
    isLocalVideo,
    stemAudioRefs,
    onMixGraphReleased,
    onMixResumeFailed,
  } = options;

  const mixerRef = useRef<StanzaLocalStemMixer | null>(null);
  const builtForStemUrlKeyRef = useRef('');
  const prevStemUrlKeyRef = useRef<string | null>(null);
  const [webAudioMixReady, setWebAudioMixReady] = useState(false);
  const isLocalVideoRef = useRef(isLocalVideo);
  isLocalVideoRef.current = isLocalVideo;

  const mixRef = useRef({ primaryMuted, primaryGain, stems });
  mixRef.current = { primaryMuted, primaryGain, stems };

  const releaseMixer = useCallback((opts?: { remountMain?: boolean }) => {
    const wasActive = mixerRef.current?.isActive();
    mixerRef.current?.dispose();
    mixerRef.current = null;
    builtForStemUrlKeyRef.current = '';
    setWebAudioMixReady(false);
    if (wasActive && opts?.remountMain !== false) {
      onMixGraphReleased?.();
    }
  }, [onMixGraphReleased]);

  const getMainElement = useCallback((): HTMLMediaElement | null => {
    return getStanzaLocalMainMediaElement(isLocalVideoRef.current, localAudioRef, localVideoRef);
  }, [localAudioRef, localVideoRef]);

  useEffect(() => {
    const prev = prevStemUrlKeyRef.current;
    prevStemUrlKeyRef.current = stemUrlKey;

    if (!enabled || !stemUrlKey || expectedStemCount <= 0) {
      releaseMixer();
      return;
    }

    if (prev !== null && prev !== stemUrlKey) {
      releaseMixer();
    }
  }, [enabled, stemUrlKey, expectedStemCount, releaseMixer]);

  useEffect(() => {
    return () => {
      releaseMixer();
    };
  }, [releaseMixer]);

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
      releaseMixer();
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

    releaseMixer({ remountMain: false });
    const mixer = new StanzaLocalStemMixer();
    try {
      mixer.rebuild(main, stemMap);
    } catch {
      mixer.dispose();
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
  }, [enabled, stemUrlKey, expectedStemCount, getMainElement, stemAudioRefs, releaseMixer]);

  const abandonWebAudioMix = useCallback(() => {
    releaseMixer();
  }, [releaseMixer]);

  const finalizeStemMixerResume = useCallback(() => {
    void mixerRef.current?.ensureRunning().then((ok) => {
      if (ok) return;
      abandonWebAudioMix();
      onMixResumeFailed?.();
    });
  }, [abandonWebAudioMix, onMixResumeFailed]);

  return { webAudioMixReady, prepareStemMixerForPlaySync, finalizeStemMixerResume, abandonWebAudioMix };
}
