import { useEffect, useRef, useState } from 'react';

import { ajnasJoins, scaleDegreeLabels, type MaqamPreset } from '../data/maqamPresets';

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
  /**
   * False only once a degree the maqam USES has been retuned. Bending a note
   * it does not use leaves every claim in this panel true, so it must not
   * trigger the warning.
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
 * It carries no prose about what the maqam IS. Describing a tradition nobody
 * here is expert in was the app claiming an authority it does not have, so the
 * panel states what is checkable — the cells, their intervals, where they meet
 * — and links to maqamworld for the rest.
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
  const joins = ajnasJoins(preset);
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
        {/* The name is the link. A separate "Source:" line said the same thing
            twice and spent a whole row doing it. */}
        <a
          className="maqam-jins__translit"
          href={preset.source}
          target="_blank"
          rel="noreferrer noopener"
        >
          {preset.transliteration}
        </a>
      </div>

      {!isPresetTuning && (
        <p className="maqam-jins__stale" role="status">
          Retuned. Below is the maqam as written, not what the keys now play.
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
            {/* The source says "either/or", so "or" here. Listing one and dropping
                the other implies a settled decomposition. */}
            {jins.alternatives?.map((alternative) => (
              <span className="maqam-jins__alt" key={alternative.id}>
                or{' '}
                <a href={alternative.source} target="_blank" rel="noreferrer noopener">
                  {alternative.name}
                </a>
              </span>
            ))}
          </li>
        ))}
      </ol>

      {joins.map((join, index) =>
        join.shared ? (
          <p className="maqam-jins__note" key={`join-${index}`}>
            Both cells meet on {labels[join.ghammazIndex]}.
          </p>
        ) : (
          <p className="maqam-jins__note" key={`join-${index}`}>
            The cells do not touch: {labels[join.lowerTopIndex]}, then{' '}
            {labels[join.ghammazIndex]}.
          </p>
        ),
      )}
      {preset.primaryAjnas.length === 1 && (
        <p className="maqam-jins__note">
          Only the lower cell is settled. Sources disagree above it.
        </p>
      )}

      {!preset.repeatsAtOctave && (
        <p className="maqam-jins__note">
          Stops at the seventh. It does not return to its tonic.
        </p>
      )}
    </div>
  );
}
