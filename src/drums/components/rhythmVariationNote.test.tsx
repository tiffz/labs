// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RhythmInfoCard from './RhythmInfoCard';
import { RHYTHM_DATABASE } from '../data/rhythmDatabase';

/**
 * One convention for every variation note.
 *
 * Notes were previously rendered inline inside the card, which made a long citation set the card's
 * height and left short and long notes behaving differently. Now every note lives in a tooltip on
 * the card itself, with a decorative Material icon advertising that it exists.
 *
 * The regression this pins: the inline text was also what gave these controls their ACCESSIBLE
 * NAME. Removing it left them unnamed for screen readers, because the notation is an SVG and the
 * icon is aria-hidden. The name is now set explicitly and no longer depends on what happens to be
 * rendered inside the control.
 */
describe('variation notes', () => {
  const ayoub = RHYTHM_DATABASE.ayoub;

  /*
   * Read the note out of the database rather than repeating its text. These assertions are about
   * WHERE the note goes — accessible name yes, laid-out text no — not about how it is worded. An
   * earlier version hard-coded the string and failed on a copy edit that broke nothing.
   */
  const noted = ayoub.variations.find((v) => v.note)!;
  // Not the current variation — that one renders as a non-interactive button, not a link.
  const unnoted = ayoub.variations.find((v) => !v.note && v.notation !== ayoub.basePattern)!;

  it('names every variation control, with the note when there is one', () => {
    render(
      <RhythmInfoCard rhythm={ayoub} currentNotation={ayoub.basePattern} onSelectVariation={() => {}} />
    );
    // A note-carrying variation includes its note in the accessible name.
    expect(
      screen.getByRole('link', { name: `Variation ${noted.notation}: ${noted.note}` })
    ).toBeInTheDocument();
    // A variation without a note is still named by its notation, never unnamed.
    expect(
      screen.getByRole('link', { name: `Variation ${unnoted.notation}` })
    ).toBeInTheDocument();
  });

  it('does not render note text inline, so it cannot set the card height', () => {
    render(
      <RhythmInfoCard rhythm={ayoub} currentNotation={ayoub.basePattern} onSelectVariation={() => {}} />
    );
    // Present as an accessible name (above), absent as laid-out text.
    expect(screen.queryByText(noted.note!)).toBeNull();
  });

  it('marks note-carrying variations with a decorative icon', () => {
    const { container } = render(
      <RhythmInfoCard rhythm={ayoub} currentNotation={ayoub.basePattern} onSelectVariation={() => {}} />
    );
    const icons = container.querySelectorAll('.rhythm-variation-info');
    const withNotes = ayoub.variations.filter((v) => v.note).length;
    expect(icons.length).toBe(withNotes);
    // Decorative: the tooltip on the card carries the text, so the icon must not be announced.
    icons.forEach((icon) => expect(icon.getAttribute('aria-hidden')).toBe('true'));
  });
});
