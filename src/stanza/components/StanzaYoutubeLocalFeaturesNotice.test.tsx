import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StanzaYoutubeLocalFeaturesNotice from './StanzaYoutubeLocalFeaturesNotice';

describe('StanzaYoutubeLocalFeaturesNotice', () => {
  it('shows upload guidance when no file is attached yet', () => {
    const { container } = render(<StanzaYoutubeLocalFeaturesNotice />);

    expect(screen.getByRole('heading', { name: 'Upload for analysis' })).toBeInTheDocument();
    expect(
      screen.getByText("YouTube links can't be analyzed here. Add the same recording for:"),
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Analysis features that need an uploaded file' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Tempo detection')).toBeInTheDocument();
    expect(screen.getByText('Key detection')).toBeInTheDocument();
    expect(screen.getByText('Key shifting')).toBeInTheDocument();
    expect(screen.queryByText('Sections')).not.toBeInTheDocument();
    expect(container.querySelector('.stanza-youtube-local-flow')).not.toBeInTheDocument();
    expect(container.querySelector('.stanza-youtube-local-feature-lock')).not.toBeInTheDocument();
  });

  it('renders a full-row FYI that switches source on click', () => {
    const onSwitchToUploaded = vi.fn();
    render(
      <StanzaYoutubeLocalFeaturesNotice hasUploadedFile onSwitchToUploaded={onSwitchToUploaded} />,
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/unlock/i)).not.toBeInTheDocument();

    const fyi = screen.getByRole('button', {
      name: 'Switch to Uploaded file for analysis tools',
    });
    expect(fyi).toHaveClass('stanza-youtube-local-fyi');
    expect(fyi.querySelector('.stanza-youtube-local-fyi-icon')).toBeTruthy();

    fireEvent.click(fyi);
    expect(onSwitchToUploaded).toHaveBeenCalledTimes(1);
  });
});
