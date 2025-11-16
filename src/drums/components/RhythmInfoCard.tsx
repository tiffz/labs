import React from 'react';
import type { RhythmDefinition } from '../utils/rhythmRecognition';
import type { TimeSignature } from '../types';
import SimpleVexFlowNote from './SimpleVexFlowNote';

interface RhythmInfoCardProps {
  rhythm: RhythmDefinition;
  currentNotation: string;
  onSelectVariation: (notation: string, timeSignature: TimeSignature) => void;
}

/**
 * Determines the time signature for a rhythm based on its pattern length
 */
function inferTimeSignature(notation: string): TimeSignature {
  // Remove spaces and newlines
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  
  // Count the total duration in sixteenths
  let totalSixteenths = 0;
  let i = 0;
  
  while (i < cleanNotation.length) {
    const char = cleanNotation[i];
    
    if (char === 'D' || char === 'T' || char === 'K' || char === '_') {
      let duration = 1;
      let j = i + 1;
      
      if (char === '_') {
        while (j < cleanNotation.length && cleanNotation[j] === '_') {
          duration++;
          j++;
        }
      } else {
        while (j < cleanNotation.length && cleanNotation[j] === '-') {
          duration++;
          j++;
        }
      }
      
      totalSixteenths += duration;
      i = j;
    } else {
      i++;
    }
  }
  
  // Determine time signature based on total sixteenths
  // 8 sixteenths = 2/4
  // 16 sixteenths = 4/4
  // 12 sixteenths could be 3/4 or 6/8
  if (totalSixteenths === 8) {
    return { numerator: 2, denominator: 4 };
  } else if (totalSixteenths === 16) {
    return { numerator: 4, denominator: 4 };
  } else if (totalSixteenths === 12) {
    return { numerator: 3, denominator: 4 };
  }
  
  // Default to 4/4
  return { numerator: 4, denominator: 4 };
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
  return (
    <div className="rhythm-info-card">
      {/* Header */}
      <div className="rhythm-info-header">
        <h3 className="rhythm-info-title">{rhythm.name}</h3>
      </div>
      
      {/* Description */}
      <p className="rhythm-info-description">{rhythm.description}</p>
      
      {/* Variations */}
      {rhythm.variations.length > 1 && (
        <div className="rhythm-info-variations">
          <h4 className="rhythm-info-variations-title">Try these variations:</h4>
          <div className="rhythm-variations-grid">
            {rhythm.variations.map((variation, index) => {
              const isCurrent = isCurrentVariation(variation.notation, currentNotation);
              return (
                <button
                  key={index}
                  className={`palette-button notation-button ${isCurrent ? 'rhythm-variation-current' : ''}`}
                  onClick={() => onSelectVariation(variation.notation, inferTimeSignature(variation.notation))}
                  type="button"
                  disabled={isCurrent}
                >
                  <SimpleVexFlowNote 
                    pattern={variation.notation} 
                    width={120}
                    height={70}
                  />
                  {variation.note && (
                    <span className="rhythm-variation-note">{variation.note}</span>
                  )}
                </button>
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
    </div>
  );
};

export default RhythmInfoCard;
