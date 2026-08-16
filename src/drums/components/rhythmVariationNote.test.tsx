// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RhythmInfoCard from './RhythmInfoCard';
import { RHYTHM_DATABASE } from '../data/rhythmDatabase';

/**
 * Provenance text must not set a variation card's height.
 *
 * Rendering `variation.note` inline made the citation
 * "Variation from 30 Pieces For Daf and Frame Drum (Amir School of Music)" wrap to three lines,
 * leaving that card visibly taller than its neighbours in the same grid row. Citations are
 * secondary information and will only get longer as sources are added.
 *
 * The split is by LENGTH, not presence: short captions stay inline because they are glanceable
 * labels that cost nothing, and hiding them would be a regression in its own right.
 */
describe('variation note affordance', () => {
  it('short captions stay inline; long citations move behind an info trigger', () => {
    const ayoub = RHYTHM_DATABASE.ayoub;
    render(<RhythmInfoCard rhythm={ayoub} currentNotation={ayoub.basePattern} onSelectVariation={() => {}} />);
    // Short caption still visible as text.
    expect(screen.getByText('La Bass Fe Eyne variation')).toBeInTheDocument();
    // Long citation is NOT inline text...
    expect(screen.queryByText(/Variation from 30 Pieces For Daf/)).toBeNull();
    // ...it is reachable via a labelled trigger.
    const info = screen.getByRole('button', { name: /About this variation: Variation from 30 Pieces For Daf/ });
    expect(info).toBeInTheDocument();
  });
});
