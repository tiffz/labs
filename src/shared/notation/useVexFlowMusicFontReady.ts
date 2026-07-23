import { useEffect, useState } from 'react';
import { ensureVexFlowFontsLoaded } from '../vexflow/vexFlowFontExport';

/** Cap the first-draw wait so a stalled font load degrades to a fallback draw. */
const MUSIC_FONT_READY_TIMEOUT_MS = 3000;

/**
 * VexFlow 5 draws music glyphs (noteheads, clefs, rests) as SVG `<text>` in the
 * Bravura SMuFL font, which registers as a `FontFace` and loads asynchronously.
 * An interactive renderer that formats and draws before that font resolves
 * paints the noteheads in a system fallback — blank/tofu glyphs offset from any
 * custom symbols drawn imperatively at the formatter's (correct) coordinates.
 * On the Darbuka trainer that surfaced as noteheads briefly "detached" from the
 * drum symbols, self-correcting once the font landed.
 *
 * This hook reports when the music font is usable so a renderer can hold its
 * first draw until then. It returns `true` synchronously once a loaded Bravura
 * face is present — so an in-session remount (navigating between songs, a list
 * of mini-notations) never waits. A fresh page load, including a refresh, does
 * wait: the face registers lazily on first use, so it is not loaded at first
 * mount; that wait is brief and shrinks to a HTTP-cached fetch on refresh.
 * Falls back to `true` where the Font Loading API is unavailable (jsdom, SSR)
 * so tests and non-DOM paths render.
 */
export function useVexFlowMusicFontReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => isMusicFontReadySync());

  useEffect(() => {
    if (ready) {
      return;
    }
    let cancelled = false;
    // Draw in a fallback rather than hold the notation forever if the font load
    // ever stalls (no internal timeout in `loadFonts`). The normal path settles
    // via `document.fonts.ready` long before this fires.
    const settle = () => {
      if (!cancelled) {
        setReady(true);
      }
    };
    const timeout = window.setTimeout(settle, MUSIC_FONT_READY_TIMEOUT_MS);
    ensureVexFlowFontsLoaded()
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(timeout);
        settle();
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [ready]);

  return ready;
}

function isMusicFontReadySync(): boolean {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return true;
  }
  try {
    // Not `document.fonts.check('30px Bravura')`: check() returns true when *no*
    // Bravura face is registered yet, because it would fall back to a system
    // font — which is exactly the state that produces the detached-notehead
    // flash. Require a registered face that has actually finished loading.
    for (const face of document.fonts) {
      if (face.family.replace(/['"]/g, '') === 'Bravura' && face.status === 'loaded') {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}
