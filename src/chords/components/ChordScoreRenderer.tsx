/**
 * VexFlow renderer for chord progressions
 * Renders grand staff (bass + treble clef) with proper measure-by-measure formatting
 */

import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, StaveConnector, BarlineType } from 'vexflow';
import type { ChordProgressionState } from '../types';
import { progressionToChords } from '../utils/chordTheory';
import { generateVoicing } from '../utils/chordVoicing';
import { formatChordName } from '../utils/chordNaming';
import { generateStyledChordNotes } from '../utils/chordStyling';
import { getKeySignature } from '../utils/keySignature';

interface ChordScoreRendererProps {
  state: ChordProgressionState;
  currentChordIndex?: number | null;
}

/**
 * Converts MIDI note number to VexFlow pitch string
 */
function midiToPitch(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}/${octave}`;
}

/**
 * Converts VexFlow key to proper format for addKeySignature
 * VexFlow expects keys like "C", "G", "F", "Bb", "Eb", etc.
 * For enharmonic keys, convert to standard form
 */
function normalizeKeyForVexFlow(key: string): string {
  const keyMap: Record<string, string> = {
    'A#': 'Bb', // A# major = Bb major
    'C#': 'C#', // Keep as is
    'D#': 'Eb', // D# major = Eb major
    'F#': 'F#', // Keep as is
    'G#': 'Ab', // G# major = Ab major
  };
  return keyMap[key] || key;
}

/**
 * Converts chord notes to VexFlow StaveNote
 * Handles rests with consistent positioning (middle line for all rests)
 */
function notesToStaveNote(notes: number[], duration: string, clef: 'bass' | 'treble'): StaveNote {
  // Handle rests (empty notes array) - use consistent middle line position
  if (notes.length === 0) {
    // Use middle line (B) for all rests - consistent positioning
    // Treble clef: B/4 is middle line, Bass clef: B/3 is middle line
    const restPitch = clef === 'bass' ? 'b/3' : 'b/4';
    const staveNote = new StaveNote({
      keys: [restPitch],
      duration: duration,
      clef: clef,
    });
    return staveNote;
  }
  
  const pitches = notes.map(midiToPitch);
  
  const staveNote = new StaveNote({
    keys: pitches,
    duration: duration,
    clef: clef,
  });
  
  return staveNote;
}


const ChordScoreRenderer: React.FC<ChordScoreRendererProps> = ({ state, currentChordIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    try {
      // Convert progression to actual chords
      const chords = progressionToChords(state.progression.progression, state.key);
      
      if (chords.length === 0) {
        console.warn('No chords to render');
        return;
      }
      
      // Generate voicings for each chord - separate bass and treble
      const trebleVoicings = chords.map(chord => generateVoicing(chord, state.voicingOptions, 'treble'));
      const bassVoicings = chords.map(chord => generateVoicing(chord, state.voicingOptions, 'bass'));
      
      // Generate styled chord notes based on styling strategy
      const styledChords = chords.map((chord, index) => 
        generateStyledChordNotes(chord, trebleVoicings[index], bassVoicings[index], state.stylingStrategy, state.timeSignature)
      );
      
      // Calculate measures per line (wrap to multiple lines)
      // Default to 4 measures per line for better organization
      const containerWidth = containerRef.current.clientWidth || 1200;
      const measureWidth = 280; // Increased width per measure to prevent note overflow
      const defaultMeasuresPerLine = 4; // Default to 4 measures per line
      // Calculate how many measures fit, but prefer 4 if possible
      const maxMeasuresByWidth = Math.floor((containerWidth - 120) / measureWidth);
      const measuresPerLine = maxMeasuresByWidth >= defaultMeasuresPerLine 
        ? defaultMeasuresPerLine 
        : Math.max(1, maxMeasuresByWidth);
      const numLines = Math.ceil(chords.length / measuresPerLine);
      
      // Create renderer - grand staff needs more height per line
      const lineHeight = 300; // Height for grand staff per line
      const lineSpacing = 50; // Space between lines
      const totalHeight = (lineHeight * numLines) + (lineSpacing * (numLines - 1)) + 40;
      
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(containerWidth, totalHeight);
      const context = renderer.getContext();
      
      // Normalize key for VexFlow
      const normalizedKey = normalizeKeyForVexFlow(state.key);
      const keySig = getKeySignature(state.key);
      
      // Render each line
      for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
        const startMeasure = lineIndex * measuresPerLine;
        const endMeasure = Math.min(startMeasure + measuresPerLine, chords.length);
        
        const trebleY = 40 + (lineIndex * (lineHeight + lineSpacing));
        const bassY = trebleY + 120;
        
        // Create separate staves for each measure to ensure proper formatting
        const trebleStaves: Stave[] = [];
        const bassStaves: Stave[] = [];
        
        for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
          const localMeasureIndex = measureIndex - startMeasure;
          const xPosition = 20 + (localMeasureIndex * measureWidth);
          const isLastMeasure = measureIndex === chords.length - 1;
          
          // Create treble stave for this measure
          const trebleStave = new Stave(xPosition, trebleY, measureWidth);
          // Add clef, key signature, and time signature to first measure of each line
          if (localMeasureIndex === 0) {
            trebleStave.addClef('treble');
            if (keySig.count > 0) {
              try {
                trebleStave.addKeySignature(normalizedKey);
              } catch (e) {
                console.warn('Failed to add key signature:', e);
              }
            }
            trebleStave.addTimeSignature(`${state.timeSignature.numerator}/${state.timeSignature.denominator}`);
          }
          // Set barline type before drawing (except for last measure)
          if (!isLastMeasure) {
            trebleStave.setEndBarType(BarlineType.SINGLE);
          }
          trebleStaves.push(trebleStave);
          
          // Create bass stave for this measure
          const bassStave = new Stave(xPosition, bassY, measureWidth);
          // Add clef, key signature, and time signature to first measure of each line
          if (localMeasureIndex === 0) {
            bassStave.addClef('bass');
            if (keySig.count > 0) {
              try {
                bassStave.addKeySignature(normalizedKey);
              } catch (e) {
                console.warn('Failed to add key signature:', e);
              }
            }
            bassStave.addTimeSignature(`${state.timeSignature.numerator}/${state.timeSignature.denominator}`);
          }
          // Set barline type before drawing (except for last measure)
          if (!isLastMeasure) {
            bassStave.setEndBarType(BarlineType.SINGLE);
          }
          bassStaves.push(bassStave);
        }
        
        // Draw all staves (with barlines already set)
        trebleStaves.forEach(stave => stave.setContext(context).draw());
        bassStaves.forEach(stave => stave.setContext(context).draw());
        
        // Add brace for each line (system brackets)
        if (trebleStaves.length > 0 && bassStaves.length > 0) {
          const connector = new StaveConnector(trebleStaves[0], bassStaves[0]);
          connector.setType(StaveConnector.type.BRACE);
          connector.setContext(context).draw();
        }
        
        // Connect staves within the line
        for (let i = 0; i < trebleStaves.length - 1; i++) {
          const connector = new StaveConnector(trebleStaves[i], trebleStaves[i + 1]);
          connector.setType(StaveConnector.type.SINGLE);
          connector.setContext(context).draw();
        }
        for (let i = 0; i < bassStaves.length - 1; i++) {
          const connector = new StaveConnector(bassStaves[i], bassStaves[i + 1]);
          connector.setType(StaveConnector.type.SINGLE);
          connector.setContext(context).draw();
        }
        
        // Render notes measure by measure
        for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
          const localMeasureIndex = measureIndex - startMeasure;
          const trebleStave = trebleStaves[localMeasureIndex];
          const bassStave = bassStaves[localMeasureIndex];
          const styledChord = styledChords[measureIndex];
          
          // Create treble notes for this measure
          const trebleNotes: StaveNote[] = [];
          styledChord.trebleNotes.forEach((trebleGroup) => {
            const trebleNote = notesToStaveNote(trebleGroup.notes, trebleGroup.duration, 'treble');
            if (currentChordIndex === measureIndex) {
              trebleNote.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
            }
            trebleNotes.push(trebleNote);
          });
          
          // Create bass notes for this measure
          const bassNotes: StaveNote[] = [];
          styledChord.bassNotes.forEach((bassGroup) => {
            const bassNote = notesToStaveNote(bassGroup.notes, bassGroup.duration, 'bass');
            if (currentChordIndex === measureIndex) {
              bassNote.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
            }
            bassNotes.push(bassNote);
          });
          
          // Create voices for this measure
          // Use strict mode to ensure notes fit exactly within measure boundaries
          const trebleVoice = new Voice({ 
            numBeats: state.timeSignature.numerator, 
            beatValue: state.timeSignature.denominator 
          });
          trebleVoice.setStrict(true); // Strict mode ensures exact measure boundaries
          trebleVoice.addTickables(trebleNotes);
          
          const bassVoice = new Voice({ 
            numBeats: state.timeSignature.numerator, 
            beatValue: state.timeSignature.denominator 
          });
          bassVoice.setStrict(true); // Strict mode ensures exact measure boundaries
          bassVoice.addTickables(bassNotes);
          
          // Calculate format width - account for clef/key/time signature on first measure
          // First measure needs more space (approximately 100px for clef/key/time signature)
          // Subsequent measures need less space (approximately 25px for barline)
          const leftPadding = localMeasureIndex === 0 ? 100 : 25;
          const rightPadding = 25; // Space for barline and safety margin
          const formatWidth = measureWidth - leftPadding - rightPadding;
          
          // Format and draw voices for this measure
          // Format both voices together so they align properly
          const formatter = new Formatter();
          formatter.joinVoices([trebleVoice, bassVoice]);
          // Format with the calculated width - VexFlow will ensure notes fit within this width
          // Use a more conservative width to ensure notes don't escape measures
          // Reduce by 20px to account for note spacing and ledger lines
          formatter.format([trebleVoice, bassVoice], formatWidth - 20);
          
          // Draw voices - VexFlow will position notes within the stave boundaries
          trebleVoice.draw(context, trebleStave);
          bassVoice.draw(context, bassStave);
        }
        
        // Add chord names
        const svgElement = containerRef.current?.querySelector('svg');
        if (svgElement) {
          for (let measureIndex = startMeasure; measureIndex < endMeasure; measureIndex++) {
            const chord = chords[measureIndex];
            const chordName = formatChordName(chord);
            const localMeasureIndex = measureIndex - startMeasure;
            const trebleStave = trebleStaves[localMeasureIndex];
            
            // Calculate x position - account for time signature on first measure of each line
            let xPosition = trebleStave.getX();
            if (localMeasureIndex === 0) {
              // First measure of line: position after time signature (approximately 70px from start)
              xPosition = trebleStave.getX() + 70;
            } else {
              // Other measures: position at measure start + small offset
              xPosition = trebleStave.getX() + 5;
            }
            
            // Position chord name lower, closer to staff (typical sheet music position)
            const yPosition = trebleY + 5; // Lower, closer to staff lines
            
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('x', String(xPosition));
            textElement.setAttribute('y', String(yPosition));
            textElement.setAttribute('font-family', 'Arial, sans-serif');
            textElement.setAttribute('font-size', '13');
            textElement.setAttribute('font-weight', 'bold');
            textElement.setAttribute('fill', '#1e293b');
            textElement.setAttribute('text-anchor', 'start');
            textElement.setAttribute('dominant-baseline', 'baseline');
            textElement.textContent = chordName;
            svgElement.appendChild(textElement);
          }
        }
      }
      
    } catch (error) {
      console.error('Error rendering chord score:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        state: {
          progression: state.progression.name,
          key: state.key,
          timeSignature: state.timeSignature,
          stylingStrategy: state.stylingStrategy,
        },
      });
      // Show error message to user
      if (containerRef.current) {
        containerRef.current.innerHTML = `<p style="color: red; padding: 2rem;">Error rendering chord score: ${error instanceof Error ? error.message : String(error)}. Please try again.</p>`;
      }
    }
  }, [state, currentChordIndex]);

  return (
    <div className="chord-score-container" ref={containerRef} />
  );
};

export default ChordScoreRenderer;
