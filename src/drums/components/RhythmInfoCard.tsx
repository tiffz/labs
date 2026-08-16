import React, { useState, useEffect, lazy, Suspense } from 'react';
import type { RhythmDefinition } from '../utils/rhythmRecognition';
import type { TimeSignature } from '../types';
import { RHYTHM_DATABASE } from '../data/rhythmDatabase';
import { drumsRhythmHref } from '../routes/drumsAppUrl';
import { handleSpaLinkClick } from '../../shared/navigation/spaLinkClick';
import LabsDisclosureChevron from '../../shared/components/LabsDisclosureChevron';
import AppTooltip from '../../shared/components/AppTooltip';
import { useIsNarrowViewport } from '../../shared/layout/useViewportMatch';

const SimpleVexFlowNote = lazy(() => import('./SimpleVexFlowNote'));

interface RhythmInfoCardProps {
  rhythm: RhythmDefinition;
  currentNotation: string;
  onSelectVariation: (notation: string, timeSignature: TimeSignature) => void;
}

/**
 * Longest note that still reads as a CAPTION rather than a citation.
 *
 * Provenance text is secondary information, but rendering it inline made it set the card's height:
 * "Variation from 30 Pieces For Daf and Frame Drum (Amir School of Music)" wrapped to three lines
 * and left that card visibly taller than its neighbours in the same grid row. Every caption
 * actually in the database is <= 25 characters ("La Bass Fe Eyne variation", "8/8 quarter-note
 * anchors"); only the citations exceed this. So the split is by LENGTH, not by presence — hiding
 * the short captions behind an affordance would cost a glanceable label to solve a problem they
 * do not cause.
 */
const INLINE_VARIATION_NOTE_MAX_CHARS = 32;

/**
 * Normalizes notation for comparison
 */
function normalizeNotation(notation: string): string {
  return notation.toUpperCase().replace(/[\s\n]/g, '');
}

/**
 * Checks if a variation is currently selected
 */
function isCurrentVariation(variationNotation: string, currentNotation: string): boolean {
  return normalizeNotation(variationNotation) === normalizeNotation(currentNotation);
}

const RhythmInfoCard: React.FC<RhythmInfoCardProps> = ({
  rhythm,
  currentNotation,
  onSelectVariation,
}) => {
  const isMobile = useIsNarrowViewport(640);
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [vexMiniReady, setVexMiniReady] = useState(false);

  useEffect(() => {
    const enable = () => setVexMiniReady(true);
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(enable, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const timer = window.setTimeout(enable, 50);
    return () => window.clearTimeout(timer);
  }, []);
  const relatedRhythms = (rhythm.relatedRhythmIds ?? [])
    .map((id) => RHYTHM_DATABASE[id])
    .filter((candidate): candidate is RhythmDefinition => Boolean(candidate));
  
  // Reset expanded state when mobile state changes
  useEffect(() => {
    setIsExpanded(!isMobile);
  }, [isMobile]);

  const mobileHeaderInteractions = isMobile
    ? {
        onClick: () => setIsExpanded(!isExpanded),
        role: 'button' as const,
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        },
      }
    : {};
  
  return (
    <div className="rhythm-info-card">
      {/* Header - clickable on mobile */}
      <div 
        className={`rhythm-info-header ${isMobile ? 'rhythm-info-header-clickable' : ''}`}
        {...mobileHeaderInteractions}
      >
        <h3 className="rhythm-info-title">{rhythm.name}</h3>
        {isMobile && (
          <span
            className={`rhythm-info-toggle ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
            aria-hidden
          >
            <LabsDisclosureChevron />
          </span>
        )}
      </div>
      
      {/* Collapsible content */}
      {isExpanded && (
        <>
          {/* Description */}
          <p className="rhythm-info-description">{rhythm.description}</p>
      
      {/* Variations */}
      {rhythm.variations.length > 1 && (
        <div className="rhythm-info-variations">
          <h4 className="rhythm-info-variations-title">Try these variations:</h4>
          <div className="rhythm-variations-grid">
            {rhythm.variations.map((variation, index) => {
              const variationTimeSignature = variation.timeSignature ?? rhythm.timeSignature;
              const isCurrent = isCurrentVariation(variation.notation, currentNotation);
              const note = variation.note;
              const noteIsInline = Boolean(note) && note!.length <= INLINE_VARIATION_NOTE_MAX_CHARS;
              const variationContent = (
                <>
                  {vexMiniReady ? (
                    <Suspense fallback={<span className="palette-pattern-fallback">{variation.notation}</span>}>
                      <SimpleVexFlowNote
                        pattern={variation.notation}
                        width={120}
                        height={70}
                        timeSignature={variationTimeSignature}
                      />
                    </Suspense>
                  ) : (
                    <span className="palette-pattern-fallback">{variation.notation}</span>
                  )}
                  {noteIsInline && <span className="rhythm-variation-note">{note}</span>}
                </>
              );

              /*
               * Long notes render OUTSIDE the button/anchor, as a sibling in the cell.
               *
               * They cannot go inside it: an interactive info trigger nested in an `<a>` is invalid
               * HTML and traps keyboard users. Making the cell the grid item and the link its child
               * keeps the trigger a valid sibling and lets every card keep the same height whatever
               * its provenance text says.
               */
              const noteAffordance =
                note && !noteIsInline ? (
                  <AppTooltip title={note} interactive placement="bottom">
                    <button
                      type="button"
                      className="rhythm-variation-info"
                      aria-label={`About this variation: ${note}`}
                    >
                      <span aria-hidden="true">&#9432;</span>
                    </button>
                  </AppTooltip>
                ) : null;

              if (isCurrent) {
                return (
                  <div key={index} className="rhythm-variation-cell">
                    <button
                      className="palette-button notation-button rhythm-variation-current"
                      type="button"
                      disabled
                      aria-current="true"
                    >
                      {variationContent}
                    </button>
                    {noteAffordance}
                  </div>
                );
              }

              const href = drumsRhythmHref(variation.notation, variationTimeSignature);
              return (
                <div key={index} className="rhythm-variation-cell">
                  <a
                    href={href}
                    className="palette-button notation-button"
                    onClick={(e) =>
                      handleSpaLinkClick(e, () =>
                        onSelectVariation(variation.notation, variationTimeSignature)
                      )
                    }
                  >
                    {variationContent}
                  </a>
                  {noteAffordance}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Learn More Links */}
      {rhythm.learnMoreLinks.length > 0 && (
        <div className="rhythm-info-learn-more">
          <strong>Learn more:</strong>
          <div className="rhythm-info-links">
            {rhythm.learnMoreLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rhythm-info-link"
              >
                {link.title}
                <span className="material-symbols-outlined">open_in_new</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {relatedRhythms.length > 0 && (
        <div className="rhythm-info-related">
          <strong>Related rhythms:</strong>
          <div className="rhythm-info-related-links">
            {relatedRhythms.map((related) => {
              const href = drumsRhythmHref(related.basePattern, related.timeSignature);
              return (
                <a
                  key={related.id}
                  href={href}
                  className="rhythm-related-button"
                  onClick={(e) =>
                    handleSpaLinkClick(e, () =>
                      onSelectVariation(related.basePattern, related.timeSignature)
                    )
                  }
                >
                  {related.name}
                </a>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default RhythmInfoCard;
