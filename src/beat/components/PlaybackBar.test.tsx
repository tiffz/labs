import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import PlaybackBar from './PlaybackBar';
import type { Section } from '../utils/sectionDetector';
import type { PlaybackState, LoopState, SectionControls } from './PlaybackBar';

describe('PlaybackBar', () => {
  const defaultPlayback: PlaybackState = {
    currentTime: 30,
    duration: 180,
    musicStartTime: 0,
    syncStartTime: 0,
    isInSyncRegion: true,
  };

  const defaultLoop: LoopState = {
    region: null,
    enabled: false,
  };

  const mockSections: Section[] = [
    { id: 'section-0', startTime: 0, endTime: 30, label: 'M1-15', color: '#9d8ec7', confidence: 1, laneId: 'lane-1' } as Section,
    { id: 'section-1', startTime: 30, endTime: 60, label: 'M15-30', color: '#9d8ec7', confidence: 1, laneId: 'lane-1' } as Section,
    { id: 'section-2', startTime: 60, endTime: 90, label: 'M30-45', color: '#9d8ec7', confidence: 1, laneId: 'lane-1' } as Section,
  ];

  const defaultSectionControls: SectionControls = {
    sections: [],
    selectedIds: [],
    isDetecting: false,
    practiceLanes: [{ id: 'lane-1', name: 'My Sections', createdAt: 1 }],
  };

  const defaultProps = {
    playback: defaultPlayback,
    loop: defaultLoop,
    sectionControls: defaultSectionControls,
    onSeek: vi.fn(),
    onSyncStartChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render time displays', () => {
    render(<PlaybackBar {...defaultProps} />);

    expect(screen.getByText('0:30 / 3:00')).toBeInTheDocument();
  });

  it('should not render loop controls (moved to App)', () => {
    render(<PlaybackBar {...defaultProps} />);

    // Loop controls have been moved to the App transport controls
    expect(screen.queryByText('Play through')).not.toBeInTheDocument();
    expect(screen.queryByText('Loop track')).not.toBeInTheDocument();
    expect(screen.queryByText('Loop section')).not.toBeInTheDocument();
  });

  it('should render section labels when sections are provided', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{ ...defaultSectionControls, sections: mockSections }}
      />
    );

    expect(screen.getByText('M1')).toBeInTheDocument();
    expect(screen.getByText('M15')).toBeInTheDocument();
    expect(screen.getByText('M30')).toBeInTheDocument();
  });

  it('should call onSelect when clicking a section label', () => {
    const onSelect = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{ ...defaultSectionControls, sections: mockSections, onSelect }}
      />
    );

    const sectionBtn = screen.getByText('M15');
    fireEvent.click(sectionBtn);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockSections[1], false);
  });

  it('should call onSelect with extendSelection=true when shift-clicking', () => {
    const onSelect = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{ ...defaultSectionControls, sections: mockSections, onSelect }}
      />
    );

    const sectionBtn = screen.getByText('M15');
    fireEvent.click(sectionBtn, { shiftKey: true });

    expect(onSelect).toHaveBeenCalledWith(mockSections[1], true);
  });

  it('should highlight selected sections', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{ ...defaultSectionControls, sections: mockSections, selectedIds: ['section-1'] }}
      />
    );

    const buttons = screen.getAllByRole('button');
    const sectionButtons = buttons.filter(b => b.classList.contains('section-label-btn'));
    const selectedBtn = sectionButtons.find(b => b.classList.contains('selected'));

    expect(selectedBtn).toBeDefined();
    expect(selectedBtn?.textContent).toContain('M15');
  });

  it('should show Deselect button when sections are selected', () => {
    const { container } = render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-1'],
          onClear: vi.fn(),
        }}
      />
    );

    expect(container.querySelector('.section-action-btn.deselect')).toBeInTheDocument();
  });

  it('should call onClear when Deselect button is clicked', () => {
    const onClear = vi.fn();
    const { container } = render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-1'],
          onClear,
        }}
      />
    );

    const deselectBtn = container.querySelector('.section-action-btn.deselect') as HTMLButtonElement;
    fireEvent.click(deselectBtn);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('should deselect section when clicking on a selected section', () => {
    const onClear = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-1'],
          onClear,
        }}
      />
    );

    const sectionBtn = screen.getByText('M15');
    fireEvent.click(sectionBtn);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('should auto-select section when clicking on playback bar to seek', () => {
    const onSeek = vi.fn();
    const onSelect = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        playback={{ ...defaultPlayback, duration: 180 }}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: [],
          onSelect,
        }}
        onSeek={onSeek}
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
    expect(onSelect).toHaveBeenCalledWith(mockSections[1], false);
  });

  it('should not re-select section when clicking in already-selected section', () => {
    const onSeek = vi.fn();
    const onSelect = vi.fn();
    render(
      <PlaybackBar
        {...defaultProps}
        playback={{ ...defaultPlayback, duration: 180 }}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-1'], // Already selected
          onSelect,
        }}
        onSeek={onSeek}
      />
    );

    const slider = screen.getByRole('slider');
    const mockRect = { left: 0, right: 200, width: 200, top: 0, bottom: 20, height: 20, x: 0, y: 0, toJSON: () => {} };
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(mockRect);
    
    // Click at 25% (45s) - in section-1 which is already selected
    fireEvent.click(slider, { clientX: 50 });

    expect(onSeek).toHaveBeenCalled();
    // Should NOT call onSelect since section-1 is already selected
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should show Combine button when multiple sections are selected', () => {
    const { container } = render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-0', 'section-1'],
          onCombine: vi.fn(),
        }}
      />
    );

    const combineBtn = Array.from(container.querySelectorAll('.section-action-btn')).find(
      (button) => button.textContent?.includes('merge')
    );
    expect(combineBtn).toBeInTheDocument();
  });

  it('should call onCombine when Combine button is clicked', () => {
    const onCombine = vi.fn();
    const { container } = render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-0', 'section-1'],
          onCombine,
        }}
      />
    );

    const combineBtn = Array.from(container.querySelectorAll('.section-action-btn')).find(
      (button) => button.textContent?.includes('merge')
    ) as HTMLButtonElement;
    fireEvent.click(combineBtn);

    expect(onCombine).toHaveBeenCalledTimes(1);
  });

  it('should show split-at-current-time button when callback is provided', () => {
    const { container } = render(
      <PlaybackBar
        {...defaultProps}
        playback={{ ...defaultPlayback, currentTime: 45 }} // Within section-1 (30-60)
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-1'],
          onSplitAtCurrentTime: vi.fn(),
        }}
      />
    );

    const splitBtn = Array.from(container.querySelectorAll('.section-action-btn')).find(
      (button) => button.textContent?.includes('content_cut')
    );
    expect(splitBtn).toBeInTheDocument();
  });

  it('should call onSplitAtCurrentTime when split button is clicked', () => {
    const onSplitAtCurrentTime = vi.fn();
    const { container } = render(
      <PlaybackBar
        {...defaultProps}
        playback={{ ...defaultPlayback, currentTime: 45 }}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-1'],
          onSplitAtCurrentTime,
        }}
      />
    );

    const splitBtn = Array.from(container.querySelectorAll('.section-action-btn')).find(
      (button) => button.textContent?.includes('content_cut')
    ) as HTMLButtonElement;
    fireEvent.click(splitBtn);

    expect(onSplitAtCurrentTime).toHaveBeenCalledTimes(1);
  });

  it('keeps split-at-current-time enabled when present', () => {
    const { container } = render(
      <PlaybackBar
        {...defaultProps}
        playback={{ ...defaultPlayback, currentTime: 10 }}
        sectionControls={{
          ...defaultSectionControls,
          sections: mockSections,
          selectedIds: ['section-1'],
          onSplitAtCurrentTime: vi.fn(),
        }}
      />
    );

    const splitBtn = Array.from(container.querySelectorAll('.section-action-btn')).find(
      (button) => button.textContent?.includes('content_cut')
    ) as HTMLButtonElement;
    expect(splitBtn).toBeEnabled();
  });

  // Note: Loop control tests have been removed as those controls
  // are now in App.tsx, not PlaybackBar

  it('should show detecting indicator when isDetecting is true', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{ ...defaultSectionControls, isDetecting: true }}
      />
    );

    expect(screen.getByText('Detecting sections...')).toBeInTheDocument();
  });

  it('should not show detecting indicator when isDetecting is false', () => {
    render(
      <PlaybackBar
        {...defaultProps}
        sectionControls={{ ...defaultSectionControls, isDetecting: false }}
      />
    );

    expect(screen.queryByText('Detecting sections...')).not.toBeInTheDocument();
  });

  describe('selection label', () => {
    it('should show measure range when single section is selected', () => {
      render(
        <PlaybackBar
          {...defaultProps}
          sectionControls={{
            ...defaultSectionControls,
            sections: mockSections,
            selectedIds: ['section-1'],
            onClear: vi.fn(),
          }}
        />
      );

      // M15-30 section selected, should show "M15–30:"
      expect(screen.getByText(/M15–30/)).toBeInTheDocument();
    });

    it('should show combined measure range when multiple sections are selected', () => {
      render(
        <PlaybackBar
          {...defaultProps}
          sectionControls={{
            ...defaultSectionControls,
            sections: mockSections,
            selectedIds: ['section-0', 'section-1'],
            onClear: vi.fn(),
            onCombine: vi.fn(),
          }}
        />
      );

      // M1-15 and M15-30 selected, should show combined range "M1–30:"
      expect(screen.getByText(/M1–30/)).toBeInTheDocument();
    });
  });

  describe('lane ui', () => {
    it('renders generated lane controls when reference sections are present', () => {
      const onCreateLane = vi.fn();
      const onCloneGeneratedLane = vi.fn();
      const { container } = render(
        <PlaybackBar
          {...defaultProps}
          sectionControls={{
            ...defaultSectionControls,
            referenceSections: [{ id: 'ref-1', startTime: 0, endTime: 20, label: 'M1-8', color: '#999', confidence: 1 }],
            generatedLaneLabel: 'Generated Sections',
            onCreateLane,
            onCloneGeneratedLane,
          }}
        />
      );

      expect(screen.getByText('Generated Sections')).toBeInTheDocument();
      const menuTrigger = container.querySelector('.lane-menu-trigger') as HTMLButtonElement;
      fireEvent.click(menuTrigger);
      fireEvent.click(screen.getByText('Clone lane'));
      fireEvent.click(screen.getByText('New lane'));
      expect(onCloneGeneratedLane).toHaveBeenCalledTimes(1);
      expect(onCreateLane).toHaveBeenCalledTimes(1);
    });

    it('renders practice sections in their matching lane rows', () => {
      const { container } = render(
        <PlaybackBar
          {...defaultProps}
          sectionControls={{
            ...defaultSectionControls,
            practiceLanes: [
              { id: 'lane-a', name: 'My Sections', createdAt: 1 },
              { id: 'lane-b', name: 'Alt Sections', createdAt: 2 },
            ],
            sections: [
              { id: 'a1', startTime: 0, endTime: 20, label: 'A1', color: '#999', confidence: 1, laneId: 'lane-a' } as Section,
              { id: 'b1', startTime: 20, endTime: 40, label: 'B1', color: '#999', confidence: 1, laneId: 'lane-b' } as Section,
            ],
            selectedIds: [],
          }}
        />
      );

      const laneRows = container.querySelectorAll('.lane-row');
      expect(laneRows.length).toBe(2);
      expect(screen.getByDisplayValue('My Sections')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Alt Sections')).toBeInTheDocument();
      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('B1')).toBeInTheDocument();
    });
  });

  describe('section dividers', () => {
    it('should render section dividers for all sections except the first', () => {
      const { container } = render(
        <PlaybackBar
          {...defaultProps}
          sectionControls={{ ...defaultSectionControls, sections: mockSections }}
        />
      );

      const dividers = container.querySelectorAll('.section-divider');
      // Divider lines were intentionally removed for multi-lane clarity.
      expect(dividers.length).toBe(0);
    });
  });

  describe('hover card', () => {
    it('should show hover card when hovering over a section', () => {
      const { container } = render(
        <PlaybackBar
          {...defaultProps}
          sectionControls={{ ...defaultSectionControls, sections: mockSections }}
        />
      );

      const sectionBtn = screen.getByText('M15').closest('button') as HTMLButtonElement;
      fireEvent.mouseEnter(sectionBtn);

      // Hover card should appear with full label
      expect(screen.getByText('M15-30')).toBeInTheDocument();
      // Check for hover card element
      const hoverCard = container.querySelector('.section-hover-card');
      expect(hoverCard).toBeInTheDocument();
    });

    it('should hide hover card when mouse leaves', () => {
      vi.useFakeTimers();
      const { container } = render(
        <PlaybackBar
          {...defaultProps}
          sectionControls={{ ...defaultSectionControls, sections: mockSections }}
        />
      );

      const sectionBtn = screen.getByText('M15').closest('button') as HTMLButtonElement;
      fireEvent.mouseEnter(sectionBtn);
      expect(screen.getByText('M15-30')).toBeInTheDocument();

      fireEvent.mouseLeave(sectionBtn);
      act(() => {
        vi.advanceTimersByTime(180);
      });
      expect(container.querySelector('.section-hover-card')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('allows editing practice section name from hover card', () => {
      const onRenameSection = vi.fn();
      render(
        <PlaybackBar
          {...defaultProps}
          sectionControls={{ ...defaultSectionControls, sections: mockSections, onRenameSection }}
        />
      );

      const sectionBtn = screen.getByText('M15').closest('button') as HTMLButtonElement;
      fireEvent.mouseEnter(sectionBtn);
      const input = screen.getByDisplayValue('M15-30');
      fireEvent.change(input, { target: { value: 'Verse Groove' } });
      fireEvent.blur(input);
      expect(onRenameSection).toHaveBeenCalledWith('section-1', 'Verse Groove');
    });
  });
});
