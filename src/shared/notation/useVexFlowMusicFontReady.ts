import { useEffect, useState } from 'react';
import { ensureVexFlowFontsLoaded } from './vexFlowFontExport';

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
 * first draw until then. It returns `true` synchronously when the font is
 * already cached (the common case, and every refresh) so there is no added
 * delay; only a genuine cold load waits. Falls back to `true` where the Font
 * Loading API is unavailable (jsdom, SSR) so tests and non-DOM paths render.
 */
export function useVexFlowMusicFontReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => isMusicFontReadySync());

  useEffect(() => {
    if (ready) {
      return;
    }
    let cancelled = false;
    // Resolves via `document.fonts.ready`, which always settles — the renderer
    // never hangs waiting on the font.
    ensureVexFlowFontsLoaded()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
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
