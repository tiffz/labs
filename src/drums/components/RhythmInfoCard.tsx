import React, { useState, useEffect, lazy, Suspense } from 'react';
import type { RhythmDefinition } from '../utils/rhythmRecognition';
import type { TimeSignature } from '../types';
import { RHYTHM_DATABASE } from '../data/rhythmDatabase';
import { drumsRhythmHref } from '../routes/drumsAppUrl';
import { handleSpaLinkClick } from '../../shared/navigation/spaLinkClick';
import LabsDisclosureChevron from '../../shared/components/LabsDisclosureChevron';
import { useIsNarrowViewport } from '../../shared/layout/useViewportMatch';

const SimpleVexFlowNote = lazy(() => import('./SimpleVexFlowNote'));

interface RhythmInfoCardProps {
  rhythm: RhythmDefinition;
  currentNotation: string;
  onSelectVariation: (notation: string, timeSignature: TimeSignature) => void;
}

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
                  {variation.note && (
                    <span className="rhythm-variation-note">{variation.note}</span>
                  )}
                </>
              );

              if (isCurrent) {
                return (
                  <button
                    key={index}
                    className="palette-button notation-button rhythm-variation-current"
                    type="button"
                    disabled
                    aria-current="true"
                  >
                    {variationContent}
                  </button>
                );
              }

              const href = drumsRhythmHref(variation.notation, variationTimeSignature);
              return (
                <a
                  key={index}
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
