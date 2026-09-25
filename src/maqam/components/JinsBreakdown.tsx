import { useEffect, useRef, useState } from 'react';

import { ajnasJoin, scaleDegreeLabels, type MaqamPreset } from '../data/maqamPresets';

interface JinsBreakdownProps {
  preset: MaqamPreset;
}

/**
 * The maqam's two ajnas and the degree they share.
 *
 * Shown beside the staff rather than under it, because the ajnas ARE the
 * structure of the maqam — demoting them to a footnote is what made the first
 * version read as "a scale with odd accidentals".
 *
 * The maqam's own description lives here too. It used to sit under the melody
 * controls as a second loose paragraph of grey text, so the left column ended
 * in two unrelated explanations stacked on nothing, and the reader had to work
 * out which one described the pattern and which the maqam. Every sentence about
 * what this maqam IS is now in one region, beside its name.
 *
 * The scale line moved the other way, down to the keyboard: it names the keys
 * that are lit, so reading it beside the board is one glance instead of two.
 */
export default function JinsBreakdown({ preset }: JinsBreakdownProps) {
  /**
   * Derived, not asserted. The panel used to say "Joined on G, where the first
   * cell ends and the second begins" for every maqam, printed directly under
   * the intervals that disprove it: Rast's lower jins is C D E½♭ F, so it ends
   * on F and the second cell starts a whole tone above. Rast, Nahawand and
   * Ajam are disjunct, and the app taught the opposite by default.
   */
  const join = ajnasJoin(preset);
  const labels = scaleDegreeLabels(preset.scaleDegrees);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  /**
   * On a short window this panel is the part that scrolls, so it has to say so.
   * Clipped flat at the boundary it read as a rendering fault — the user's own
   * screenshot of it cut the Arabic name in half. CSS cannot ask whether an
   * element overflows, so it measures itself and the fade follows.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === 'undefined') return;
    const measure = () => setOverflowing(panel.scrollHeight - panel.clientHeight > 1);
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    measure();
    return () => observer.disconnect();
  }, [preset]);

  return (
    <div className="maqam-jins" ref={panelRef} data-overflowing={overflowing}>
      <div className="maqam-jins__title">
        <span className="maqam-jins__arabic" lang="ar" dir="rtl">
          {preset.arabicName}
        </span>
        <span className="maqam-jins__translit">{preset.transliteration}</span>
      </div>

      <p className="maqam-jins__lede">{preset.description}</p>

      <h2 className="maqam-eyebrow">Built from</h2>

      <ol className="maqam-jins__list">
        {preset.primaryAjnas.map((jins) => (
          <li key={jins.id} className="maqam-jins__item">
            <span className="maqam-jins__name">{jins.name}</span>
            <span className="maqam-jins__steps">
              {jins.intervalsInCents.join(' · ')}
              <span className="maqam-jins__unit"> cents</span>
            </span>
          </li>
        ))}
      </ol>

      {join && join.shared && (
        <p className="maqam-jins__note">
          Both cells claim {labels[join.ghammazIndex]}. The first ends there and the second starts
          there, which is what joins them.
        </p>
      )}
      {join && !join.shared && (
        <p className="maqam-jins__note">
          The cells do not touch. The first ends on {labels[join.lowerTopIndex]} and the second
          starts a step higher on {labels[join.ghammazIndex]}.
        </p>
      )}
      {preset.primaryAjnas.length === 1 && (
        <p className="maqam-jins__note">
          Only the lower cell is settled for this maqam. Sources disagree about the upper region, so
          it is left out rather than guessed.
        </p>
      )}

      {!preset.repeatsAtOctave && (
        <p className="maqam-jins__note">
          Stops at the seventh. This maqam does not return to its tonic an octave up.
        </p>
      )}
    </div>
  );
}
