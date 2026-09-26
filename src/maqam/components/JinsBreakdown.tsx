import { useEffect, useRef, useState } from 'react';

import { ajnasJoin, scaleDegreeLabels, type MaqamPreset } from '../data/maqamPresets';

interface JinsBreakdownProps {
  preset: MaqamPreset;
  /**
   * False once the user has bent a key away from the maqam's own tuning.
   *
   * The panel has to know, because every claim in it is about the maqam AS
   * WRITTEN. Bend Rast's E and the board plays a 400-cent third while this
   * column still says "its third and seventh sit half-flat" and prints
   * "0 · 200 · 350 · 500 cents". A learner doing exactly the A/B the app
   * invites hears a major third and reads that it is 350 cents, and concludes
   * that 350 cents sounds like a major third — the precise opposite of the
   * lesson, reached by following the app's own affordances.
   */
  isPresetTuning: boolean;
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
export default function JinsBreakdown({ preset, isPresetTuning }: JinsBreakdownProps) {
  /**
   * Derived, not asserted. The panel used to say "Joined on G, where the first
   * cell ends and the second begins" for every maqam, printed directly under
   * the intervals that disprove it: Rast's lower jins is C D E½♭ F, so it ends
   * on F and the second cell starts a whole tone above. Rast, Nahawand and
   * Ajam looked disjunct, from cell sizes that were themselves wrong. Derived,
   * the panel followed the data to the right answer once the data was fixed.
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

      {!isPresetTuning && (
        <p className="maqam-jins__stale" role="status">
          You have retuned a key, so the keyboard no longer plays this maqam as written. Everything
          below describes the written maqam. Press Reset to hear it again.
        </p>
      )}

      <h2 className="maqam-eyebrow">{isPresetTuning ? 'Built from' : 'Built from, as written'}</h2>

      <ol className="maqam-jins__list">
        {preset.primaryAjnas.map((jins) => (
          <li key={jins.id} className="maqam-jins__item">
            {/* Each cell links to its own page. The intervals below came from
                there, and a reader who wants to know what a jins actually is
                should be reading maqamworld, not us. */}
            <a
              className="maqam-jins__name"
              href={jins.source}
              target="_blank"
              rel="noreferrer noopener"
            >
              {jins.name}
            </a>
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

      {/*
        Credit, and a way to check. Every interval in this panel was taken from
        maqamworld.com, and the reason the first version of this data was wrong
        for months is that there was nowhere for a reader to go and verify it.
        A citation is the difference between teaching and asserting.
      */}
      <p className="maqam-jins__credit">
        Intervals and ajnas from{' '}
        <a href={preset.source} target="_blank" rel="noreferrer noopener">
          {preset.transliteration} on maqamworld.com
        </a>
      </p>
    </div>
  );
}
