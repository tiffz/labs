import { useEffect, useRef, useState } from 'react';
import TextField from '@mui/material/TextField';

import GlossaryMenu from './GlossaryMenu';
import {
  ajnasJoins,
  ajnasSpans,
  maqamatByFamily,
  scaleDegreeLabels,
  type MaqamPreset,
} from '../data/maqamPresets';

interface MaqamCardProps {
  preset: MaqamPreset;
  presetId: string;
  onSelectPreset: (id: string) => void;
  /**
   * False only once a degree the maqam USES has been retuned. Bending a note
   * it does not use leaves every claim in this card true, so it must not
   * trigger the warning.
   */
  isPresetTuning: boolean;
  /** The jins the reader is pointing at, or `null` for "show me all of them". */
  activeJinsId: string | null;
  onActiveJinsChange: (id: string | null) => void;
}

/**
 * Everything about the maqam, in one card: which one, what it is called, what
 * it is built from, and the words.
 *
 * These were four separate things in three places — a picker in the app bar, a
 * glossary button beside it, a panel of cells here, and the maqam's name
 * inside that panel. Choosing a maqam and reading about the one you chose is a
 * single activity, so it is a single surface.
 *
 * The cells are CHIPS, and the chips are controls. Pointing at one draws only
 * that jins's bracket over the staff and lights only its notes, on the staff
 * and on the keyboard — which is what finally makes the overlap legible. Two
 * brackets drawn at once have to answer "which of you owns this note", and no
 * amount of stacking or ringing answers it as directly as showing one at a
 * time and letting the reader see the shared note belong to each in turn.
 */
export default function MaqamCard({
  preset,
  presetId,
  onSelectPreset,
  isPresetTuning,
  activeJinsId,
  onActiveJinsChange,
}: MaqamCardProps) {
  /**
   * Derived, not asserted. The panel used to say "Joined on G, where the first
   * cell ends and the second begins" for every maqam, printed directly under
   * the intervals that disprove it.
   */
  const joins = ajnasJoins(preset);
  const labels = scaleDegreeLabels(preset.scaleDegrees);
  const spans = ajnasSpans(preset);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  /**
   * On a short window this card is the part that scrolls, so it has to say so.
   * Clipped flat at the boundary it read as a rendering fault. CSS cannot ask
   * whether an element overflows, so it measures itself and the fade follows.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === 'undefined') return;
    const measure = () =>
      setOverflowing(panel.scrollHeight - panel.clientHeight > 1);
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    measure();
    return () => observer.disconnect();
  }, [preset]);

  return (
    <div className="maqam-card" ref={panelRef} data-overflowing={overflowing}>
      <TextField
        select
        size="small"
        label="Maqam"
        value={presetId}
        onChange={(event) => onSelectPreset(event.target.value)}
        className="maqam-card__picker"
        slotProps={{ select: { native: true } }}
      >
        {/*
          Grouped by family, because that is how maqamat are organised:
          "Maqamat are classified into families based on sharing the same first
          (root) jins" (maqamworld.com). The grouping is derived from each
          maqam's root jins rather than authored, so a new maqam files itself
          and a family can never disagree with the cell it is named for.

          Still a native select: the platform's own picker renders optgroups
          properly on a phone, which a hand-rolled two-tier menu would have to
          reimplement badly.
        */}
        {maqamatByFamily().map(({ family, maqamat }) => (
          <optgroup key={family} label={`${family} family`}>
            {maqamat.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} · {option.transliteration}
              </option>
            ))}
          </optgroup>
        ))}
      </TextField>

      {/*
        The English name leads: this app is written in English for a reader who
        does not yet know these maqamat. The Arabic is still here, and still
        first in the reading order for anyone who does read it.

        The name is also the link out. A separate "Source:" line said the same
        thing twice and spent a whole row doing it.
      */}
      <div className="maqam-card__title">
        <a
          className="maqam-card__name"
          href={preset.source}
          target="_blank"
          rel="noreferrer noopener"
        >
          {preset.transliteration}
        </a>
        <span className="maqam-card__arabic" lang="ar" dir="rtl">
          {preset.arabicName}
        </span>
      </div>

      <h2 className="maqam-eyebrow" data-stale={!isPresetTuning}>
        {isPresetTuning ? 'Built from' : 'Built from, as written'}
      </h2>

      {/*
        One chip per cell, in the cell's own colour — the same colour its
        bracket and its notes take. A four-line list of names, intervals and
        alternatives said the same thing in five times the height, and the
        intervals are the least useful part of it on first read: what a reader
        needs here is "this maqam is these two things, and here is where each
        one lives".
      */}
      <ul className="maqam-card__chips">
        {preset.primaryAjnas.map((jins, index) => {
          const span = spans.find((candidate) => candidate.id === jins.id);
          const active = activeJinsId === jins.id;
          return (
            <li key={jins.id}>
              <button
                type="button"
                className="maqam-chip"
                data-jins={index + 1}
                aria-pressed={active}
                /* Leave clears on the CHIP rather than on the list around
                     it: a <ul> carrying a mouse handler is a non-interactive
                     element pretending to be one. Moving between two chips
                     fires leave then enter, so the state settles on the chip
                     under the pointer. */
                onMouseEnter={() => onActiveJinsChange(jins.id)}
                onMouseLeave={() => onActiveJinsChange(null)}
                onFocus={() => onActiveJinsChange(jins.id)}
                onBlur={() => onActiveJinsChange(null)}
                /* Click LOCKS it, so the bracket survives moving the pointer
                     away to look at the staff — which is the whole reason to
                     point at a chip in the first place. */
                onClick={() => onActiveJinsChange(active ? null : jins.id)}
              >
                <span className="maqam-chip__swatch" aria-hidden="true" />
                <span className="maqam-chip__name">{jins.name}</span>
                {span && (
                  <span className="maqam-chip__degrees">
                    {labels[span.fromIndex]}–{labels[span.toIndex]}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* The intervals, for the cell being pointed at. They were printed under
          every cell at all times, which is four lines of digits for a fact
          that only matters once you are asking about one of them. */}
      {preset.primaryAjnas.map((jins) =>
        activeJinsId === jins.id ? (
          <p className="maqam-card__detail" key={jins.id}>
            <a href={jins.source} target="_blank" rel="noreferrer noopener">
              {jins.name}
            </a>{' '}
            <span className="maqam-card__steps">
              {jins.intervalsInCents.join(' · ')} cents
            </span>
            {/* The source says "either/or", so "or" here. Listing one and
                dropping the other implies a settled decomposition. */}
            {jins.alternatives?.map((alternative) => (
              <span className="maqam-card__alt" key={alternative.id}>
                {' '}
                or{' '}
                <a
                  href={alternative.source}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {alternative.name}
                </a>
              </span>
            ))}
          </p>
        ) : null
      )}

      {joins.map((join, index) =>
        join.shared ? (
          <p className="maqam-card__note" key={`join-${index}`}>
            Both cells meet on {labels[join.ghammazIndex]}.
          </p>
        ) : (
          <p className="maqam-card__note" key={`join-${index}`}>
            The cells do not touch: {labels[join.lowerTopIndex]}, then{' '}
            {labels[join.ghammazIndex]}.
          </p>
        )
      )}
      {preset.primaryAjnas.length === 1 && (
        <p className="maqam-card__note">
          Only the lower cell is settled. Sources disagree above it.
        </p>
      )}
      {!preset.repeatsAtOctave && (
        <p className="maqam-card__note">
          Stops at the seventh. It does not return to its tonic.
        </p>
      )}

      <div className="maqam-card__foot">
        <GlossaryMenu />
      </div>
    </div>
  );
}
