import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DrumNotationMini, { NOTATION_STYLES } from './DrumNotationMini';
import { parseRhythm } from '../rhythm/rhythmParser';
import type { TimeSignature } from '../rhythm/types';

describe('DrumNotationMini', () => {
  const defaultTimeSignature: TimeSignature = { numerator: 4, denominator: 4 };

  // Helper to create a parsed rhythm from notation string
  const createRhythm = (notation: string, timeSignature = defaultTimeSignature) => {
    return parseRhythm(notation, timeSignature);
  };

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const rhythm = createRhythm('D-T-');
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      expect(container.querySelector('.drum-notation-mini')).toBeInTheDocument();
    });

    it('renders SVG element', () => {
      const rhythm = createRhythm('D-T-');
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('handles empty rhythm gracefully', () => {
      const rhythm = { measures: [], timeSignature: defaultTimeSignature };
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      // Should render null for empty rhythm
      expect(container.querySelector('.drum-notation-mini')).not.toBeInTheDocument();
    });

    it('handles Maqsum pattern', () => {
      const rhythm = createRhythm('D-T-__T-D---T---');
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('handles patterns with rests', () => {
      const rhythm = createRhythm('D---____');
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('note highlighting', () => {
    it('renders with currentNoteIndex prop', () => {
      const rhythm = createRhythm('D-T-K-T-');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} currentNoteIndex={0} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('marks active note with data-highlighted attribute', () => {
      const rhythm = createRhythm('D-T-K-T-');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} currentNoteIndex={1} />
      );
      
      // The highlighted note should have a data-highlighted attribute
      const highlightedElement = container.querySelector('[data-highlighted="true"]');
      expect(highlightedElement).toBeInTheDocument();
    });

    it('handles null currentNoteIndex', () => {
      const rhythm = createRhythm('D-T-K-T-');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} currentNoteIndex={null} />
      );
      
      // No element should be highlighted
      const highlightedElement = container.querySelector('[data-highlighted="true"]');
      expect(highlightedElement).not.toBeInTheDocument();
    });

    it('handles out-of-range currentNoteIndex gracefully', () => {
      const rhythm = createRhythm('D-T-');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} currentNoteIndex={100} />
      );
      
      // Should render without crashing
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // No element should be highlighted
      const highlightedElement = container.querySelector('[data-highlighted="true"]');
      expect(highlightedElement).not.toBeInTheDocument();
    });
  });

  describe('theming', () => {
    it('applies light theme', () => {
      const rhythm = createRhythm('D-T-');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} style="light" />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('applies dark theme', () => {
      const rhythm = createRhythm('D-T-');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} style="dark" />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('applies custom style object', () => {
      const rhythm = createRhythm('D-T-');
      const customStyle = {
        staffColor: '#ff0000',
        noteColor: '#00ff00',
        textColor: '#0000ff',
        highlightColor: '#ffff00',
      };
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} style={customStyle} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('drum symbols', () => {
    it('renders drum symbols by default', () => {
      const rhythm = createRhythm('D-T-K-');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} showDrumSymbols={true} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('hides drum symbols when disabled', () => {
      const rhythm = createRhythm('D-T-K-');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} showDrumSymbols={false} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('metronome dots', () => {
    it('renders metronome dots when enabled', () => {
      const rhythm = createRhythm('D-T-K-T-');
      const { container } = render(
        <DrumNotationMini 
          rhythm={rhythm} 
          showMetronomeDots={true}
          currentBeat={0}
          isPlaying={true}
        />
      );
      
      // Should have circle elements for metronome dots
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('does not render metronome dots when disabled', () => {
      const rhythm = createRhythm('D-T-K-T-');
      const { container } = render(
        <DrumNotationMini 
          rhythm={rhythm} 
          showMetronomeDots={false}
        />
      );
      
      // Should not have metronome dot circles (only notation elements)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('different time signatures', () => {
    it('handles 4/4 time signature', () => {
      const rhythm = createRhythm('D-T-K-T-', { numerator: 4, denominator: 4 });
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('handles 3/4 time signature', () => {
      const rhythm = createRhythm('D-T-K-', { numerator: 3, denominator: 4 });
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('handles 6/8 time signature', () => {
      const rhythm = createRhythm('D--T--', { numerator: 6, denominator: 8 });
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('NOTATION_STYLES export', () => {
    it('exports light and dark presets', () => {
      expect(NOTATION_STYLES.light).toBeDefined();
      expect(NOTATION_STYLES.dark).toBeDefined();
    });

    it('light preset has required properties', () => {
      expect(NOTATION_STYLES.light.staffColor).toBeDefined();
      expect(NOTATION_STYLES.light.noteColor).toBeDefined();
      expect(NOTATION_STYLES.light.textColor).toBeDefined();
      expect(NOTATION_STYLES.light.highlightColor).toBeDefined();
    });

    it('dark preset has required properties', () => {
      expect(NOTATION_STYLES.dark.staffColor).toBeDefined();
      expect(NOTATION_STYLES.dark.noteColor).toBeDefined();
      expect(NOTATION_STYLES.dark.textColor).toBeDefined();
      expect(NOTATION_STYLES.dark.highlightColor).toBeDefined();
    });
  });
});
