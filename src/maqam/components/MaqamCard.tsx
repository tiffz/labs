import { useEffect, useRef, useState } from 'react';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import GlossaryMenu from './GlossaryMenu';
import MaqamPicker from './MaqamPicker';
import {
  ajnasJoins,
  ajnasSpans,
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
   * The chip the pointer is on, and the element to hang the card off.
   *
   * The detail used to render INLINE under the chips, which grew the card by a
   * line the moment you pointed at one — and this card is the taller of the
   * two stage columns, so the whole page moved. A hovercard costs no layout.
   */
  const [hovered, setHovered] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const hoveredJins = preset.primaryAjnas.find((jins) => jins.id === hovered?.id);

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

  const point = (id: string, anchor: HTMLElement) => {
    setHovered({ id, anchor });
    onActiveJinsChange(id);
  };
  const clear = () => {
    setHovered(null);
    onActiveJinsChange(null);
  };

  return (
    <div className="maqam-card" ref={panelRef} data-overflowing={overflowing}>
      {/* The card's heading, for heading navigation. The visible name is
          painted by the trigger below, which is the element that announces
          it — so the two cannot drift, both rendering from `preset`. */}
      <h2 className="maqam-visually-hidden" id="maqam-card-heading">
        {preset.transliteration}
      </h2>

      {/*
        The title IS the picker. The card used to carry an outlined field
        reading "Kurd on D · Maqam Kurd" and, under it, a heading reading
        "Maqam Kurd" — the same fact twice, once as a form and once as type.
      */}
      <MaqamPicker preset={preset} presetId={presetId} onSelectPreset={onSelectPreset} />

      {/* h3: the maqam's name is the card's h2 now, so heading navigation
          lands on the card's subject rather than on a section label. */}
      <h3 className="maqam-eyebrow" data-stale={!isPresetTuning}>
        {isPresetTuning ? 'Built from' : 'Built from, as written'}
      </h3>

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
                /* Leave clears on the CHIP rather than on the list around it:
                   a <ul> carrying a mouse handler is a non-interactive element
                   pretending to be one. Moving between two chips fires leave
                   then enter, so the state settles on the one under the
                   pointer. */
                onMouseEnter={(event) => point(jins.id, event.currentTarget)}
                onMouseLeave={clear}
                onFocus={(event) => point(jins.id, event.currentTarget)}
                onBlur={clear}
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

      {/*
        A hovercard, not a panel that grows.

        `disableAutoFocus` / `disableEnforceFocus` are deliberate here and are
        what this pattern needs: a hovercard that took focus would move the
        caret off the chip the reader is on, and one that trapped it would
        strand a keyboard user in a surface with nothing to activate. It shows
        the same thing on focus as on hover, so the keyboard path IS the
        pointer path. `pointerEvents: none` keeps it from swallowing the leave
        event that closes it.
      */}
      <AnchoredPopover
        open={hoveredJins !== undefined}
        anchorEl={hovered?.anchor ?? null}
        onClose={clear}
        /* Below the chip, inside the card's own column. `left-start` put it
           over the staff — i.e. over the notes it had just highlighted. */
        placement="bottom-end"
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        slotProps={{ root: { style: { pointerEvents: 'none' } } }}
      >
        <div className="maqam-portal maqam-jinscard">
          {hoveredJins && (
            <>
              <p className="maqam-jinscard__name">{hoveredJins.name}</p>
              <p className="maqam-jinscard__steps">
                {hoveredJins.intervalsInCents.join(' · ')} cents
              </p>
              {/* The source says "either/or", so "or" here. Listing one and
                  dropping the other implies a settled decomposition. */}
              {hoveredJins.alternatives?.map((alternative) => (
                <p className="maqam-jinscard__alt" key={alternative.id}>
                  or {alternative.name}
                </p>
              ))}
            </>
          )}
        </div>
      </AnchoredPopover>

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

      {/* The source link lives here now. It was the heading, and a heading
          cannot be both a menu trigger and a link — two affordances on one
          word. The foot is where this card's outbound affordances live. */}
      <div className="maqam-card__foot">
        <GlossaryMenu />
        <a
          className="maqam-card__source"
          href={preset.source}
          target="_blank"
          rel="noreferrer noopener"
        >
          maqamworld
        </a>
      </div>
    </div>
  );
}
