import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StanzaYoutubeLocalFeaturesNotice from './StanzaYoutubeLocalFeaturesNotice';

describe('StanzaYoutubeLocalFeaturesNotice', () => {
  it('shows a quiet limitation note and subtle feature labels', () => {
    const { container } = render(<StanzaYoutubeLocalFeaturesNotice />);

    expect(screen.getByRole('heading', { name: 'Upload for full tools' })).toBeInTheDocument();
    expect(screen.getByText("YouTube links can't be analyzed here.")).toBeInTheDocument();
    expect(screen.getByText('Upload the same recording to unlock:')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Analysis features that need an uploaded file' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Tempo detection')).toBeInTheDocument();
    expect(screen.getByText('Key detection')).toBeInTheDocument();
    expect(screen.getByText('Key shifting')).toBeInTheDocument();
    expect(screen.queryByText('Sections')).not.toBeInTheDocument();
    expect(container.querySelector('.stanza-youtube-local-flow')).not.toBeInTheDocument();
    expect(container.querySelector('.stanza-youtube-local-feature-lock')).not.toBeInTheDocument();
  });
});
