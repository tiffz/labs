import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GuidanceCallout from './GuidanceCallout';
import type { GuidancePayload } from '../guidance/computeGuidance';
import { CONCEPT_INTROS } from '../curriculum/concepts';

describe('GuidanceCallout', () => {
  it('returns null when there are no concept intros', () => {
    const { container } = render(
      <GuidanceCallout
        payload={{ concepts: [] }}
        onDismiss={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders concept titles and bodies in the order they appear in the payload', () => {
    const payload: GuidancePayload = {
      concepts: [CONCEPT_INTROS.pentascalePattern, CONCEPT_INTROS.freeTempo],
    };
    render(<GuidanceCallout payload={payload} onDismiss={() => {}} />);

    expect(screen.getByText(CONCEPT_INTROS.pentascalePattern.title)).toBeTruthy();
    expect(screen.getByText(CONCEPT_INTROS.freeTempo.title)).toBeTruthy();
    expect(screen.getByText(CONCEPT_INTROS.pentascalePattern.body)).toBeTruthy();
    expect(screen.getByText(CONCEPT_INTROS.freeTempo.body)).toBeTruthy();
  });

  it('fires onDismiss when the Got it button is clicked', () => {
    const onDismiss = vi.fn();
    const payload: GuidancePayload = {
      concepts: [CONCEPT_INTROS.freeTempo],
    };
    render(<GuidanceCallout payload={payload} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /Got it/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('exposes an accessible dialog titled "New for you"', () => {
    const payload: GuidancePayload = {
      concepts: [CONCEPT_INTROS.metronome],
    };
    render(<GuidanceCallout payload={payload} onDismiss={() => {}} />);

    const dialog = screen.getByRole('dialog', { name: /New for you/i });
    expect(dialog).toBeTruthy();
  });
});
