import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ScriptBlock } from '../types';
import { ScriptFormattedPreview } from './ScriptFormattedPreview';

const blocks: ScriptBlock[] = [
  {
    type: 'page_section',
    id: 'page-1',
    pageNumber: 1,
    pinnedBeatText: 'Opening',
    sourceLineStart: 1,
    sourceLineEnd: 1,
  },
  {
    type: 'panel',
    id: 'panel-1',
    pageNumber: 1,
    panelNumber: 1,
    sourceLineStart: 2,
    sourceLineEnd: 2,
  },
  {
    type: 'narration',
    id: 'narr-1',
    pageNumber: 1,
    panelNumber: 1,
    text: 'Courier receives a sealed package.',
    sourceLineStart: 3,
    sourceLineEnd: 3,
  },
  {
    type: 'dialogue',
    id: 'dlg-1',
    pageNumber: 1,
    panelNumber: 1,
    character: 'HERO',
    lines: ['What is this?'],
    sourceLineStart: 4,
    sourceLineEnd: 4,
  },
];

describe('ScriptFormattedPreview', () => {
  it('renders empty guidance when there are no blocks', () => {
    render(<ScriptFormattedPreview blocks={[]} />);
    expect(screen.getByTestId('lyrefly-script-preview')).toHaveClass('lyrefly-script-preview--empty');
    expect(screen.getByText(/professionally formatted script/i)).toBeTruthy();
  });

  it('renders page, panel, narration, and dialogue blocks', () => {
    render(<ScriptFormattedPreview blocks={blocks} />);
    expect(screen.getByRole('heading', { name: /page 1/i })).toBeTruthy();
    expect(screen.getByText('Panel 1')).toBeTruthy();
    expect(screen.getByText('Courier receives a sealed package.')).toBeTruthy();
    expect(screen.getByText('HERO')).toBeTruthy();
    expect(screen.getByText('What is this?')).toBeTruthy();
  });
});
