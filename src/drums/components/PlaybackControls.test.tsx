import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlaybackControls from './PlaybackControls';
import type { TimeSignature } from '../types';

describe('PlaybackControls', () => {
  const defaultTimeSignature: TimeSignature = { numerator: 4, denominator: 4 };

  const defaultProps = {
    bpm: 120,
    onBpmChange: vi.fn(),
    timeSignature: defaultTimeSignature,
    onTimeSignatureChange: vi.fn(),
    isPlaying: false,
    onPlay: vi.fn(),
    onStop: vi.fn(),
    metronomeEnabled: false,
    onMetronomeToggle: vi.fn(),
    onSettingsClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render metronome button', () => {
    render(<PlaybackControls {...defaultProps} />);
    
    const metronomeButton = screen.getByLabelText('Toggle metronome');
    expect(metronomeButton).toBeInTheDocument();
    expect(screen.getByText('Metronome')).toBeInTheDocument();
  });

  it('should show active state when metronome is enabled', () => {
    render(<PlaybackControls {...defaultProps} metronomeEnabled={true} />);
    
    const metronomeButton = screen.getByLabelText('Toggle metronome');
    expect(metronomeButton).toHaveClass('active');
    expect(metronomeButton).toHaveAttribute('title', 'Metronome: On');
  });

  it('should show inactive state when metronome is disabled', () => {
    render(<PlaybackControls {...defaultProps} metronomeEnabled={false} />);
    
    const metronomeButton = screen.getByLabelText('Toggle metronome');
    expect(metronomeButton).not.toHaveClass('active');
    expect(metronomeButton).toHaveAttribute('title', 'Metronome: Off');
  });

  it('should call onMetronomeToggle with opposite value when clicked', () => {
    const onMetronomeToggle = vi.fn();
    render(<PlaybackControls {...defaultProps} metronomeEnabled={false} onMetronomeToggle={onMetronomeToggle} />);
    
    const metronomeButton = screen.getByLabelText('Toggle metronome');
    fireEvent.click(metronomeButton);
    
    expect(onMetronomeToggle).toHaveBeenCalledTimes(1);
    expect(onMetronomeToggle).toHaveBeenCalledWith(true);
  });

  it('should call onMetronomeToggle with false when disabling', () => {
    const onMetronomeToggle = vi.fn();
    render(<PlaybackControls {...defaultProps} metronomeEnabled={true} onMetronomeToggle={onMetronomeToggle} />);
    
    const metronomeButton = screen.getByLabelText('Toggle metronome');
    fireEvent.click(metronomeButton);
    
    expect(onMetronomeToggle).toHaveBeenCalledTimes(1);
    expect(onMetronomeToggle).toHaveBeenCalledWith(false);
  });

  it('should render play button when not playing', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={false} />);
    
    const playButton = screen.getByLabelText('Play rhythm (Spacebar)');
    expect(playButton).toBeInTheDocument();
  });

  it('should render stop button when playing', () => {
    render(<PlaybackControls {...defaultProps} isPlaying={true} />);
    
    const stopButton = screen.getByLabelText('Stop playback (Spacebar)');
    expect(stopButton).toBeInTheDocument();
  });

  it('should call onPlay when play button is clicked', () => {
    const onPlay = vi.fn();
    render(<PlaybackControls {...defaultProps} isPlaying={false} onPlay={onPlay} />);
    
    const playButton = screen.getByLabelText('Play rhythm (Spacebar)');
    fireEvent.click(playButton);
    
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('should call onStop when stop button is clicked', () => {
    const onStop = vi.fn();
    render(<PlaybackControls {...defaultProps} isPlaying={true} onStop={onStop} />);
    
    const stopButton = screen.getByLabelText('Stop playback (Spacebar)');
    fireEvent.click(stopButton);
    
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('should render settings button', () => {
    render(<PlaybackControls {...defaultProps} />);
    
    const settingsButton = screen.getByLabelText('Open settings');
    expect(settingsButton).toBeInTheDocument();
  });

  it('should call onSettingsClick when settings button is clicked', () => {
    const onSettingsClick = vi.fn();
    render(<PlaybackControls {...defaultProps} onSettingsClick={onSettingsClick} />);
    
    const settingsButton = screen.getByLabelText('Open settings');
    fireEvent.click(settingsButton);
    
    expect(onSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('should render BPM input', () => {
    render(<PlaybackControls {...defaultProps} />);
    
    const bpmInput = screen.getByPlaceholderText('BPM') as HTMLInputElement;
    expect(bpmInput).toBeInTheDocument();
    expect(bpmInput.value).toBe('120');
  });

  it('should call onBpmChange when BPM input changes', () => {
    const onBpmChange = vi.fn();
    render(<PlaybackControls {...defaultProps} onBpmChange={onBpmChange} />);
    
    const bpmInput = screen.getByPlaceholderText('BPM');
    fireEvent.change(bpmInput, { target: { value: '140' } });
    
    expect(onBpmChange).toHaveBeenCalledWith(140);
  });
});

