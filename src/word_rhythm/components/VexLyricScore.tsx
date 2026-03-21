import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Dot, BarlineType, Beam } from 'vexflow';
import type { ParsedRhythm, TimeSignature } from '../../drums/types';
import { drawDrumSymbol } from '../../drums/assets/drumSymbols';
import type { SyllableHit } from '../../drums/wordRhythm/prosodyEngine';

interface VexLyricScoreProps {
  rhythm: ParsedRhythm;
  timeSignature: TimeSignature;
  currentNote?: { measureIndex: number; noteIndex: number } | null;
  hitMap: Map<string, SyllableHit>;
}

const DURATION_MAP: Record<string, string> = {
  sixteenth: '16',
  eighth: '8',
  quarter: 'q',
  half: 'h',
  whole: 'w',
};

const SOUND_TO_PITCH: Record<string, string> = {
  dum: 'f/4',
  tak: 'f/4',
  ka: 'f/4',
  slap: 'f/4',
  rest: 'b/4',
  simile: 'b/4',
};

const VexLyricScore: React.FC<VexLyricScoreProps> = ({ rhythm, timeSignature, currentNote, hitMap }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    if (rhythm.measures.length === 0) return;

    const leftPad = 16;
    const topPad = 16;
    const lineGap = 146;
    const availableWidth = Math.max(320, containerRef.current.clientWidth || 960);
    const maxLineWidth = availableWidth - leftPad * 2;

    const measureWidths = rhythm.measures.map((measure, measureIndex) => {
      const soundingNotes = measure.notes.filter((note) => note.sound !== 'rest').length;
      const activeSixteenths = measure.notes
        .filter((note) => note.sound !== 'rest')
        .reduce((sum, note) => sum + note.durationInSixteenths, 0);
      const totalSixteenths = Math.max(
        1,
        measure.notes.reduce((sum, note) => sum + note.durationInSixteenths, 0)
      );
      const density = activeSixteenths / totalSixteenths;
      const baseWidth = 118 + soundingNotes * 18 + Math.round(density * 42);
      const withTimeSigOffset = measureIndex === 0 ? baseWidth + 26 : baseWidth;
      return Math.max(132, Math.min(220, withTimeSigOffset));
    });
    const lines: number[][] = [];
    let currentLine: number[] = [];
    let currentWidth = 0;
    measureWidths.forEach((width, measureIndex) => {
      if (currentLine.length > 0 && currentWidth + width > maxLineWidth) {
        lines.push(currentLine);
        currentLine = [measureIndex];
        currentWidth = width;
      } else {
        currentLine.push(measureIndex);
        currentWidth += width;
      }
    });
    if (currentLine.length > 0) lines.push(currentLine);

    const totalWidth = availableWidth;
    const totalHeight = Math.max(180, topPad + lines.length * lineGap + 28);

    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    renderer.resize(totalWidth, totalHeight);
    const context = renderer.getContext();
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    lines.forEach((line, lineIndex) => {
      let x = leftPad;
      const staveY = topPad + lineIndex * lineGap + 14;
      line.forEach((measureIndex) => {
        const measure = rhythm.measures[measureIndex];
        const measureWidth = measureWidths[measureIndex];
        const stave = new Stave(x, staveY, measureWidth);

        if (measureIndex === 0) {
          stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
        }
        if (measureIndex === rhythm.measures.length - 1) {
          stave.setEndBarType(BarlineType.END);
        }
        stave.setContext(context).draw();

        const vexNotes = measure.notes.map((note, noteIndex) => {
          let duration = DURATION_MAP[note.duration] || 'q';
          if (note.isDotted) duration += 'd';
          if (note.sound === 'rest') duration += 'r';

          const staveNote = new StaveNote({
            keys: [SOUND_TO_PITCH[note.sound] || 'f/4'],
            duration,
            clef: 'percussion',
          });
          if (note.isDotted) Dot.buildAndAttach([staveNote], { all: true });

          const isCurrent = currentNote?.measureIndex === measureIndex && currentNote?.noteIndex === noteIndex;
          if (isCurrent) {
            staveNote.setStyle({ fillStyle: '#ef4444', strokeStyle: '#ef4444' });
          }
          return staveNote;
        });

        if (vexNotes.length === 0) {
          x += measureWidth;
          return;
        }

        const voice = new Voice({
          numBeats: timeSignature.numerator,
          beatValue: timeSignature.denominator,
        });
        voice.setStrict(false);
        voice.addTickables(vexNotes);
        new Formatter().joinVoices([voice]).format([voice], measureWidth - 40);
        const beams = Beam.generateBeams(vexNotes, { beam_rests: false });
        voice.draw(context, stave);
        beams.forEach((beam) => beam.setContext(context).draw());

        vexNotes.forEach((vexNote, noteIndex) => {
          const note = measure.notes[noteIndex];
          if (note.sound === 'rest') return;

          const noteX = vexNote.getAbsoluteX() + 10;
          const noteY = stave.getYForLine(2);
          const key = `${measureIndex}-${noteIndex}`;
          const hit = hitMap.get(key);
          const isCurrent = currentNote?.measureIndex === measureIndex && currentNote?.noteIndex === noteIndex;

          drawDrumSymbol(svg, noteX, noteY, note.sound, isCurrent ? '#ef4444' : '#1f2937', 0.9, -40);

          if (hit) {
            if (isCurrent) {
              const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              const approxWidth = Math.max(16, hit.syllable.length * 7 + 8);
              highlight.setAttribute('x', String(noteX - approxWidth / 2));
              highlight.setAttribute('y', String(staveY + 80));
              highlight.setAttribute('width', String(approxWidth));
              highlight.setAttribute('height', '15');
              highlight.setAttribute('rx', '4');
              highlight.setAttribute('ry', '4');
              highlight.setAttribute('fill', 'rgba(251, 191, 36, 0.35)');
              svg.appendChild(highlight);
            }

            const syllable = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            syllable.setAttribute('x', String(noteX));
            syllable.setAttribute('y', String(staveY + 92));
            syllable.setAttribute('text-anchor', 'middle');
            syllable.setAttribute('font-size', '11');
            syllable.setAttribute('font-family', 'Roboto, sans-serif');
            syllable.setAttribute('font-weight', isCurrent ? '900' : '700');
            syllable.setAttribute('fill', '#111111');
            const displaySyllable =
              hit.syllableIndex === 0 && hit.wordIndex > 0 ? `\u2009${hit.syllable}` : hit.syllable;
            syllable.textContent = displaySyllable;
            const info = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            info.textContent = `word: ${hit.word} | syllable: ${hit.syllable} | source: ${hit.source} | stress: ${hit.stress}`;
            syllable.appendChild(info);
            svg.appendChild(syllable);
          }
        });

        x += measureWidth;
      });
    });
  }, [rhythm, timeSignature, currentNote, hitMap]);

  return <div className="words-vex-score" ref={containerRef} />;
};

export default VexLyricScore;
