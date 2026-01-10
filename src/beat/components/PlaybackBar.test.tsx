import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlaybackBar from './PlaybackBar';
import type { Section } from '../utils/sectionDetector';

describe('PlaybackBar', () => {
  const defaultProps = {
    currentTime: 30,
    duration: 180,
    musicStartTime: 0,
    syncStartTime: 0,
    onSeek: vi.fn(),
    onSyncStartChange: vi.fn(),
    isInSyncRegion: true,
  };

  const mockSections: Section[] = [
    { id: 'section-0', startTime: 0, endTime: 30, label: 'M1-15', color: '#9d8ec7', confidence: 1 },
    { id: 'section-1', startTime: 30, endTime: 60, label: 'M15-30', color: '#9d8ec7', confidence: 1 },
    { id: 'section-2', startTime: 60, endTime: 90, label: 'M30-45', color: '#9d8ec7', confidence: 1 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render time displays', () => {
    render(<PlaybackBar {...defaultProps} />);

    expect(screen.getByText('0:30')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('should not render loop controls (moved to App)', () => {
    render(<PlaybackBar {...defaultProps} />);

    // Loop controls have been moved to the App transport controls
    expect(screen.queryByText('Play through')).not.toBeInTheDocument();
    expect(screen.queryByText('Loop track')).not.toBeInTheDocument();
    expect(screen.queryByText('Loop section')).not.toBeInTheDocument();
  });

  it('should render section labels when sections are provided', () => {
    render(<PlaybackBar {...defaultProps} sections={mockSections} />);

    expect(screen.getByText('M1')).toBeInTheDocument();
    expect(screen.getByText('M15')).toBeInTheDocument();
    expect(screen.getByText('M30')).toBeInTheDocument();
  });

  it('should call onSelectSection when clicking a section label', () => {
    const onSelectSection = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        sections={mockSections}
        onSelectSection={onSelectSection}
      />
    );

    const sectionBtn = screen.getByText('M15');
    fireEvent.click(sectionBtn);

    expect(onSelectSection).toHaveBeenCalledTimes(1);
    expect(onSelectSection).toHaveBeenCalledWith(mockSections[1], false);
  });

  it('should call onSelectSection with extendSelection=true when shift-clicking', () => {
    const onSelectSection = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        sections={mockSections}
        onSelectSection={onSelectSection}
      />
    );

    const sectionBtn = screen.getByText('M15');
    fireEvent.click(sectionBtn, { shiftKey: true });

    expect(onSelectSection).toHaveBeenCalledWith(mockSections[1], true);
  });

  it('should highlight selected sections', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        sections={mockSections}
        selectedSectionIds={['section-1']}
      />
    );

    const buttons = screen.getAllByRole('button');
    const sectionButtons = buttons.filter(b => b.classList.contains('section-label-btn'));
    const selectedBtn = sectionButtons.find(b => b.classList.contains('selected'));

    expect(selectedBtn).toBeDefined();
    expect(selectedBtn?.textContent).toContain('M15');
  });

  it('should show Deselect button when sections are selected', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        sections={mockSections}
        selectedSectionIds={['section-1']}
        onClearSelection={vi.fn()}
      />
    );

    expect(screen.getByText('Deselect')).toBeInTheDocument();
  });

  it('should call onClearSelection when Deselect button is clicked', () => {
    const onClearSelection = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        sections={mockSections}
        selectedSectionIds={['section-1']}
        onClearSelection={onClearSelection}
      />
    );

    const deselectBtn = screen.getByText('Deselect');
    fireEvent.click(deselectBtn);

    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('should deselect section when clicking on a selected section', () => {
    const onClearSelection = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        sections={mockSections}
        selectedSectionIds={['section-1']}
        onClearSelection={onClearSelection}
      />
    );

    const sectionBtn = screen.getByText('M15');
    fireEvent.click(sectionBtn);

    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('should auto-select section when clicking on playback bar to seek', () => {
    const onSeek = vi.fn();
    const onSelectSection = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        duration={180}
        onSeek={onSeek}
        sections={mockSections}
        selectedSectionIds={[]}
        onSelectSection={onSelectSection}
      />
    );

    // Click on the playback bar (slider)
    const slider = screen.getByRole('slider');
    // Mock getBoundingClientRect for the click position calculation
    const mockRect = { left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20, x: 0, y: 0, toJSON: () => {} };
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(mockRect);
    
    // Click at 25% of the bar (45s) - should be in section-1 (30-60s)
    // 45s / 180s = 0.25, so clientX = 0.25 * 200 = 50
    fireEvent.click(slider, { clientX: 50 });

    expect(onSeek).toHaveBeenCalled();
    // Should auto-select section-1 (the section at 45s, which spans 30-60)
    expect(onSelectSection).toHaveBeenCalledWith(mockSections[1], false);
  });

  it('should not re-select section when clicking in already-selected section', () => {
    const onSeek = vi.fn();
    const onSelectSection = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        duration={180}
        onSeek={onSeek}
        sections={mockSections}
        selectedSectionIds={['section-1']} // Already selected
        onSelectSection={onSelectSection}
      />
    );

    const slider = screen.getByRole('slider');
    const mockRect = { left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20, x: 0, y: 0, toJSON: () => {} };
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(mockRect);
    
    // Click at 25% (45s) - in section-1 which is already selected
    fireEvent.click(slider, { clientX: 50 });

    expect(onSeek).toHaveBeenCalled();
    // Should NOT call onSelectSection since section-1 is already selected
    expect(onSelectSection).not.toHaveBeenCalled();
  });

  it('should show Combine button when multiple sections are selected', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        sections={mockSections}
        selectedSectionIds={['section-0', 'section-1']}
        onCombineSections={vi.fn()}
      />
    );

    expect(screen.getByText('Combine')).toBeInTheDocument();
  });

  it('should call onCombineSections when Combine button is clicked', () => {
    const onCombineSections = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        sections={mockSections}
        selectedSectionIds={['section-0', 'section-1']}
        onCombineSections={onCombineSections}
      />
    );

    const combineBtn = screen.getByText('Combine');
    fireEvent.click(combineBtn);

    expect(onCombineSections).toHaveBeenCalledTimes(1);
  });

  it('should show Split button when one section is selected and playhead is within it', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        currentTime={45} // Within section-1 (30-60)
        sections={mockSections}
        selectedSectionIds={['section-1']}
        onSplitSection={vi.fn()}
      />
    );

    expect(screen.getByText('Split here')).toBeInTheDocument();
  });

  it('should call onSplitSection when Split button is clicked', () => {
    const onSplitSection = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        currentTime={45}
        sections={mockSections}
        selectedSectionIds={['section-1']}
        onSplitSection={onSplitSection}
      />
    );

    const splitBtn = screen.getByText('Split here');
    fireEvent.click(splitBtn);

    expect(onSplitSection).toHaveBeenCalledWith('section-1', 45);
  });

  it('should disable Split button when playhead is outside selected section', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        currentTime={10} // Outside section-1 (30-60)
        sections={mockSections}
        selectedSectionIds={['section-1']}
        onSplitSection={vi.fn()}
      />
    );

    const splitBtn = screen.getByText('Split here').closest('button');
    expect(splitBtn).toBeDisabled();
  });

  // Note: Loop control tests have been removed as those controls
  // are now in App.tsx, not PlaybackBar

  it('should show detecting indicator when isDetectingSections is true', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        isDetectingSections={true}
      />
    );

    expect(screen.getByText('Detecting sections...')).toBeInTheDocument();
  });

  it('should not show detecting indicator when isDetectingSections is false', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        isDetectingSections={false}
      />
    );

    expect(screen.queryByText('Detecting sections...')).not.toBeInTheDocument();
  });

  describe('selection label', () => {
    it('should show measure range when single section is selected', () => {
      render(
        <PlaybackBar
          {...defaultProps}
          sections={mockSections}
          selectedSectionIds={['section-1']}
          onClearSelection={vi.fn()}
        />
      );

      // M15-30 section selected, should show "M15–30:"
      expect(screen.getByText(/M15–30/)).toBeInTheDocument();
    });

    it('should show combined measure range when multiple sections are selected', () => {
      render(
        <PlaybackBar
          {...defaultProps}
          sections={mockSections}
          selectedSectionIds={['section-0', 'section-1']}
          onClearSelection={vi.fn()}
          onCombineSections={vi.fn()}
        />
      );

      // M1-15 and M15-30 selected, should show combined range "M1–30:"
      expect(screen.getByText(/M1–30/)).toBeInTheDocument();
    });
  });

  describe('section dividers', () => {
    it('should render section dividers for all sections except the first', () => {
      const { container } = render(
        <PlaybackBar
          {...defaultProps}
          sections={mockSections}
        />
      );

      const dividers = container.querySelectorAll('.section-divider');
      // First section starts at 0%, so no divider. Sections 2 and 3 have dividers.
      expect(dividers.length).toBe(2);
    });
  });

  describe('hover card', () => {
    it('should show hover card when hovering over a section', () => {
      const { container } = render(
        <PlaybackBar
          {...defaultProps}
          sections={mockSections}
        />
      );

      const sectionBtn = screen.getByText('M15');
      fireEvent.mouseEnter(sectionBtn);

      // Hover card should appear with full label
      expect(screen.getByText('M15-30')).toBeInTheDocument();
      // Check for hover card element
      const hoverCard = container.querySelector('.section-hover-card');
      expect(hoverCard).toBeInTheDocument();
    });

    it('should hide hover card when mouse leaves', () => {
      const { container } = render(
        <PlaybackBar
          {...defaultProps}
          sections={mockSections}
        />
      );

      const sectionBtn = screen.getByText('M15');
      fireEvent.mouseEnter(sectionBtn);
      expect(screen.getByText('M15-30')).toBeInTheDocument();

      fireEvent.mouseLeave(sectionBtn);
      expect(container.querySelector('.section-hover-card')).not.toBeInTheDocument();
    });
  });
});
