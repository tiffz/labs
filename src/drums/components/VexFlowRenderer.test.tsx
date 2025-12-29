import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import VexFlowRenderer from './VexFlowRenderer';
import type { TimeSignature } from '../types';
import { parseRhythm } from '../utils/rhythmParser';

describe('VexFlowRenderer', () => {
  const defaultTimeSignature: TimeSignature = { numerator: 4, denominator: 4 };

  describe('measure numbers conditional rendering', () => {
    it('should render without crashing', () => {
      const notation = 'DKTK';
      const rhythm = parseRhythm(notation, defaultTimeSignature);
      
      const { container } = render(
        <VexFlowRenderer rhythm={rhythm} timeSignature={defaultTimeSignature} />
      );
      
      // Component should render successfully
      expect(container.querySelector('.vexflow-container')).toBeTruthy();
    });

    it('should render longer rhythms without crashing', () => {
      // Create a rhythm with many measures by repeating the pattern
      const notation = 'DKTK-DKTK-DKTK-DKTK-DKTK-DKTK';
      const rhythm = parseRhythm(notation, defaultTimeSignature);
      
      const { container } = render(
        <VexFlowRenderer rhythm={rhythm} timeSignature={defaultTimeSignature} />
      );
      
      // Component should render successfully
      expect(container.querySelector('.vexflow-container')).toBeTruthy();
    });
  });
});

