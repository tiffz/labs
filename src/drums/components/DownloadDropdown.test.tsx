import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DownloadDropdown from './DownloadDropdown';
import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import * as audioExport from '../utils/audioExport';

// Mock audio export functions
vi.mock('../utils/audioExport', () => ({
  renderRhythmAudio: vi.fn(),
  exportAudioBuffer: vi.fn(),
  calculateRhythmDuration: vi.fn(),
  formatDuration: vi.fn(),
}));

describe('DownloadDropdown', () => {
  const mockRhythm: ParsedRhythm = {
    isValid: true,
    measures: [
      {
        notes: [
          {
            sound: 'dum',
            duration: 'sixteenth',
            durationInSixteenths: 1,
            isDotted: false,
          },
        ],
        totalDuration: 1,
      },
    ],
    timeSignature: { numerator: 4, denominator: 4 },
    measureMapping: [{ sourceMeasureIndex: 0, sourceStringIndex: 0 }],
  };

  const mockPlaybackSettings: PlaybackSettings = DEFAULT_SETTINGS;
  const mockBpm = 120;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(audioExport, 'calculateRhythmDuration').mockReturnValue(2.0);
    vi.spyOn(audioExport, 'formatDuration').mockReturnValue('2.0s');

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Bind the *real* prototype methods, not document's own (possibly still
    // spied) properties — under Vitest 4, re-binding a live spy as the
    // "original" recurses infinitely on the first passthrough call.
    const originalCreateElement = Document.prototype.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: vi.fn(),
        } as unknown as HTMLElement;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(window, 'alert').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when closed', () => {
    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={false}
          onClose={vi.fn()}
        />
      </div>
    );

    expect(screen.queryByText('Format')).not.toBeInTheDocument();
  });

  it('should not render when rhythm is invalid', () => {
    const invalidRhythm: ParsedRhythm = {
      ...mockRhythm,
      isValid: false,
    };

    render(
      <div>
        <DownloadDropdown
          rhythm={invalidRhythm}
          notation="D-T-"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={vi.fn()}
        />
      </div>
    );

    expect(screen.queryByText('Format')).not.toBeInTheDocument();
  });

  it('should render when open and rhythm is valid', () => {
    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-__T-D---T---"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={vi.fn()}
        />
      </div>
    );

    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('Loops')).toBeInTheDocument();
    expect(screen.getByText(/preview duration/i)).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should show duration preview', () => {
    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-__T-D---T---"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={vi.fn()}
        />
      </div>
    );

    expect(audioExport.formatDuration).toHaveBeenCalled();
    expect(screen.getByText('2.0s')).toBeInTheDocument();
  });

  it('should allow changing format', async () => {
    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-__T-D---T---"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={vi.fn()}
        />
      </div>
    );

    const mp3Button = screen.getByRole('button', { name: 'MP3' });
    fireEvent.click(mp3Button);
    expect(screen.getByRole('button', { name: 'MP3' })).toHaveClass('is-active');
  });

  it('should allow changing loop count', async () => {
    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-__T-D---T---"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={vi.fn()}
        />
      </div>
    );

    const loopsInput = screen.getByLabelText('Loops');
    expect(loopsInput).toBeInTheDocument();

    fireEvent.change(loopsInput, { target: { value: '5' } });
    expect(loopsInput).toHaveValue(5);
  });

  it('should handle download for WAV format', async () => {
    const mockAudioBuffer = {
      length: 1000,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: () => new Float32Array(1000),
      duration: 1,
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer;

    const mockBlob = new Blob(['test'], { type: 'audio/wav' });

    vi.spyOn(audioExport, 'renderRhythmAudio').mockResolvedValue(mockAudioBuffer);
    vi.spyOn(audioExport, 'exportAudioBuffer').mockResolvedValue(mockBlob);

    const onClose = vi.fn();

    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={onClose}
        />
      </div>
    );

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(audioExport.renderRhythmAudio).toHaveBeenCalledWith(
        mockRhythm,
        mockBpm,
        1, // default loops
        mockPlaybackSettings,
        false // metronomeEnabled
      );
    });

    await waitFor(() => {
      expect(audioExport.exportAudioBuffer).toHaveBeenCalledWith(mockAudioBuffer, 'wav');
    });
  });

  it('should handle download for MP3 format', async () => {
    const mockAudioBuffer = {
      length: 1000,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: () => new Float32Array(1000),
      duration: 1,
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer;

    const mockBlob = new Blob(['test'], { type: 'audio/mp3' });

    vi.spyOn(audioExport, 'renderRhythmAudio').mockResolvedValue(mockAudioBuffer);
    vi.spyOn(audioExport, 'exportAudioBuffer').mockResolvedValue(mockBlob);

    const onClose = vi.fn();

    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={onClose}
        />
      </div>
    );

    // Change format to MP3
    fireEvent.click(screen.getByRole('button', { name: 'MP3' }));

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(audioExport.exportAudioBuffer).toHaveBeenCalledWith(mockAudioBuffer, 'mp3');
    });
  });

  it('should show exporting state during download', async () => {
    const mockAudioBuffer = {
      length: 1000,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: () => new Float32Array(1000),
      duration: 1,
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer;

    const mockBlob = new Blob(['test'], { type: 'audio/wav' });

    // Create a promise that we can control
    let resolveRender: (value: AudioBuffer) => void;
    const renderPromise = new Promise<AudioBuffer>((resolve) => {
      resolveRender = resolve;
    });

    vi.spyOn(audioExport, 'renderRhythmAudio').mockReturnValue(renderPromise);
    vi.spyOn(audioExport, 'exportAudioBuffer').mockResolvedValue(mockBlob);

    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-__T-D---T---"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={vi.fn()}
        />
      </div>
    );

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    // Should show exporting state
    await waitFor(() => {
      expect(screen.getByText(/exporting/i)).toBeInTheDocument();
    });

    // Resolve the promise
    resolveRender!(mockAudioBuffer);

    // Should return to normal state
    await waitFor(() => {
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });

  it('should handle download errors gracefully', async () => {
    vi.spyOn(audioExport, 'renderRhythmAudio').mockRejectedValue(new Error('Export failed'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

    render(
      <div>
        <DownloadDropdown
          rhythm={mockRhythm}
          notation="D-T-__T-D---T---"
          bpm={mockBpm}
          playbackSettings={mockPlaybackSettings}
          metronomeEnabled={false}
          isOpen={true}
          onClose={vi.fn()}
        />
      </div>
    );

    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to export audio: Export failed. Try again.');
    });

    alertSpy.mockRestore();
  });
});

