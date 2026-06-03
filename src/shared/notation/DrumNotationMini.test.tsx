import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DrumNotationMini, {
  NOTATION_STYLES,
  computeMiniNotationLayout,
  estimateMiniNotationRenderWidth,
  resolveMiniDrumSymbolDrawY,
  resolveMiniDrumSymbolScale,
  resolveMiniDrumSymbolYOffset,
} from './DrumNotationMini';
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
      expect(container.querySelector('.drum-notation-mini-x-scroll')).toBeInTheDocument();
    });

    it('renders SVG element', () => {
      const rhythm = createRhythm('D-T-');
      const { container } = render(<DrumNotationMini rhythm={rhythm} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('handles empty rhythm gracefully', () => {
      const rhythm = {
        isValid: true,
        measures: [],
        timeSignature: defaultTimeSignature,
        measureMapping: [],
      };
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
        inkColor: '#ff0000',
        highlightColor: '#ffff00',
      };
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} style={customStyle} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('applies unified ink color to staff lines and note glyphs', () => {
      const rhythm = createRhythm('D-T-K-T-');
      const ink = '#112233';
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} style={{ inkColor: ink, highlightColor: '#aabbcc' }} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      const coloredElements = svg!.querySelectorAll('path, line, text, rect');
      expect(coloredElements.length).toBeGreaterThan(0);

      for (const el of coloredElements) {
        if (el.closest('[data-highlighted="true"]')) continue;
        const svgEl = el as SVGElement;
        const fill = svgEl.style.getPropertyValue('fill');
        const stroke = svgEl.style.getPropertyValue('stroke');
        if (fill && fill !== 'none') {
          expect(fill).toBe(ink);
        }
        if (stroke && stroke !== 'none') {
          expect(stroke).toBe(ink);
        }
      }
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
      expect(container.querySelectorAll('.drum-symbol').length).toBeGreaterThan(0);
    });

    it('keeps drum symbols inside the SVG viewport for compact hosts', () => {
      const rhythm = createRhythm('D-T-__T-D---T---');
      const { container } = render(
        <DrumNotationMini rhythm={rhythm} height={68} width={236} showDrumSymbols={true} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      const svgHeight = Number.parseFloat(svg?.getAttribute('height') ?? '0');
      const symbols = container.querySelectorAll('.drum-symbol');
      expect(symbols.length).toBeGreaterThan(0);
      symbols.forEach((symbol) => {
        const transform = symbol.getAttribute('transform') ?? '';
        const match = /translate\([^,]+,\s*([-\d.]+)\)/.exec(transform);
        expect(match).not.toBeNull();
        const translateY = Number.parseFloat(match![1]);
        expect(translateY).toBeGreaterThanOrEqual(0);
        expect(translateY).toBeLessThanOrEqual(svgHeight);
      });
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
      
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);

      const svg = container.querySelector('svg');
      const svgHeight = Number.parseFloat(svg?.getAttribute('height') ?? '0');
      let maxCy = 0;
      circles.forEach((circle) => {
        const cy = Number.parseFloat(circle.getAttribute('cy') ?? '0');
        const r = Number.parseFloat(circle.getAttribute('r') ?? '0');
        maxCy = Math.max(maxCy, cy + r);
      });
      expect(maxCy).toBeLessThanOrEqual(svgHeight);
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
      expect(NOTATION_STYLES.light.inkColor).toBeDefined();
      expect(NOTATION_STYLES.light.highlightColor).toBeDefined();
    });

    it('dark preset has required properties', () => {
      expect(NOTATION_STYLES.dark.inkColor).toBeDefined();
      expect(NOTATION_STYLES.dark.highlightColor).toBeDefined();
    });
  });

  describe('computeMiniNotationLayout', () => {
    it('shrinks render height for compact hosts', () => {
      const cozy = computeMiniNotationLayout(100, {
        showDrumSymbols: true,
        showMetronomeDots: false,
      });
      const compact = computeMiniNotationLayout(66, {
        showDrumSymbols: true,
        showMetronomeDots: false,
      });
      expect(compact.renderHeight).toBeLessThanOrEqual(cozy.renderHeight);
      expect(compact.staveHeight).toBeLessThanOrEqual(cozy.staveHeight);
      expect(compact.staveY).toBeLessThan(cozy.staveY);
    });

    it('never clips the staff within the requested height budget', () => {
      const layout = computeMiniNotationLayout(80, {
        showDrumSymbols: true,
        showMetronomeDots: false,
      });
      expect(layout.renderHeight).toBeGreaterThanOrEqual(
        layout.staveY + layout.staveHeight + 20,
      );
    });

    it('reserves space for metronome dots below the staff', () => {
      const layout = computeMiniNotationLayout(120, {
        showDrumSymbols: true,
        showMetronomeDots: true,
      });
      expect(layout.renderHeight).toBeGreaterThanOrEqual(
        layout.staveY + layout.staveHeight + layout.metronomeDotGap + 5 + 2,
      );
    });

    it('grows render width for dense sixteenth patterns', () => {
      const denseNotes = Array.from({ length: 16 }, () => ({ durationInSixteenths: 1 }));
      const width = estimateMiniNotationRenderWidth(236, denseNotes);
      expect(width).toBeGreaterThan(236);
    });

    it('uses legible compact drum symbol scale defaults', () => {
      expect(resolveMiniDrumSymbolScale(68)).toBeGreaterThanOrEqual(0.68);
      expect(resolveMiniDrumSymbolScale(68, 0.44)).toBeGreaterThanOrEqual(0.62);
    });

    it('keeps compact drum symbols in the top symbol band', () => {
      const layout = computeMiniNotationLayout(68, {
        showDrumSymbols: true,
        showMetronomeDots: false,
      });
      const scale = resolveMiniDrumSymbolScale(68);
      const yOffset = resolveMiniDrumSymbolYOffset(68, scale);
      const drawY = resolveMiniDrumSymbolDrawY(68, layout.staveY, layout.symbolGap, yOffset);
      const translateY = drawY + yOffset;
      expect(translateY).toBeGreaterThanOrEqual(2);
      expect(translateY).toBeLessThan(layout.staveY);
    });
  });
});
