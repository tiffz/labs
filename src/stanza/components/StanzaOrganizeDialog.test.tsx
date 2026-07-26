import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaDuplicateGroup } from '../organize/stanzaDuplicateHeuristics';
import { StanzaOrganizeDialogView } from './StanzaOrganizeDialog';

function song(overrides: Partial<StanzaSong> & { id: string }): StanzaSong {
  return {
    ytId: null,
    title: 'Untitled',
    markers: [],
    stats: {},
    updatedAt: 0,
    ...overrides,
  } as StanzaSong;
}

function reason(text: string) {
  return { aId: 'x', bId: 'y', tier: 1 as const, reason: text };
}

const rows: StanzaSong[] = [
  song({ id: 'a1', ytId: 'v1', title: 'Alpha', markers: [{ id: 'm', time: 10, label: 'V' }], updatedAt: 20 }),
  song({ id: 'a2', ytId: 'v1', title: 'Alpha', updatedAt: 10 }),
  song({ id: 'b1', ytId: 'vb1', title: 'Beta', localMediaFingerprint: '10:100.00', updatedAt: 20 }),
  song({ id: 'b2', ytId: 'vb2', title: 'Beta', localMediaFingerprint: '20:100.00', updatedAt: 10 }),
  song({ id: 'c1', ytId: 'vc1', title: 'Gamma', updatedAt: 20 }),
  song({ id: 'c2', title: 'Gamma', localAudioBlob: new Blob(['x']), localMediaFingerprint: '30:90.00', updatedAt: 10 }),
];

const groups: StanzaDuplicateGroup[] = [
  { memberIds: ['a1', 'a2'], tier: 1, transitive: true, reasons: [reason('Same YouTube video')], suggestedCanonicalId: 'a1' },
  { memberIds: ['b1', 'b2'], tier: 2, transitive: false, reasons: [reason('Same title, same length')], suggestedCanonicalId: 'b1' },
  { memberIds: ['c1', 'c2'], tier: 2, transitive: false, reasons: [reason('Same title, same length')], suggestedCanonicalId: 'c1' },
];

function renderView(overrides: Partial<Parameters<typeof StanzaOrganizeDialogView>[0]> = {}) {
  const onMerge = vi.fn();
  const onClose = vi.fn();
  render(
    <StanzaOrganizeDialogView
      open
      rows={rows}
      groups={groups}
      onMerge={onMerge}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onMerge, onClose };
}

describe('StanzaOrganizeDialogView', () => {
  it('renders each group with a confidence chip and its members', () => {
    renderView();
    expect(screen.getByText('Organize library')).toBeInTheDocument();
    expect(screen.getByText('Exact match')).toBeInTheDocument();
    expect(screen.getAllByText('Likely duplicate')).toHaveLength(2);
    expect(screen.getAllByText('Alpha')).not.toHaveLength(0);
    expect(screen.getAllByText('Beta')).not.toHaveLength(0);
  });

  it('shows the empty state when there are no groups', () => {
    renderView({ groups: [] });
    expect(screen.getByText('No duplicates found.')).toBeInTheDocument();
  });

  it('shows "Play from" only for a mergeable cross-source group', () => {
    renderView();
    // Group A is same-source (no choice); group C is refused (no choice); only group B qualifies.
    expect(screen.getAllByText('Play from:')).toHaveLength(1);
  });

  it('pre-checks Tier-1 and merges only it by default', () => {
    const { onMerge } = renderView();
    fireEvent.click(screen.getByRole('button', { name: /Merge selected/ }));
    expect(onMerge).toHaveBeenCalledTimes(1);
    expect(onMerge.mock.calls[0][0]).toEqual([
      { memberIds: ['a1', 'a2'], canonicalId: 'a1', playFromId: 'a1' },
    ]);
  });

  it('opts a Tier-2 group in and includes it in the merge', () => {
    const { onMerge } = renderView();
    // Checkboxes render in group order: [0]=A (exact), [1]=B (likely), [2]=C (refused).
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByRole('button', { name: /Merge selected/ }));
    expect(onMerge.mock.calls[0][0]).toEqual([
      { memberIds: ['a1', 'a2'], canonicalId: 'a1', playFromId: 'a1' },
      { memberIds: ['b1', 'b2'], canonicalId: 'b1', playFromId: 'b1' },
    ]);
  });

  it('refuses a group with un-backed audio: shows the reason and disables its checkbox', () => {
    renderView();
    expect(screen.getByText(/isn't backed up/)).toBeInTheDocument();
    // Group C's checkbox is disabled, so it can never be merged.
    expect(screen.getAllByRole('checkbox')[2]).toBeDisabled();
  });
});
