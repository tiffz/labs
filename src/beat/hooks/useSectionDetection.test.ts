import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSectionDetection } from './useSectionDetection';

// Mock the sectionDetector module
vi.mock('../utils/sectionDetector', () => ({
  detectSections: vi.fn(),
  mergeSections: vi.fn((sections, a, b) => {
    if (a < 0 || b < 0 || a >= sections.length || b >= sections.length || a === b) {
      return sections;
    }
    const [minIdx, maxIdx] = a < b ? [a, b] : [b, a];
    const merged = [...sections];
    merged[minIdx] = {
      ...merged[minIdx],
      endTime: merged[maxIdx].endTime,
      label: `${merged[minIdx].label}-${merged[maxIdx].label}`,
    };
    merged.splice(maxIdx, 1);
    return merged;
  }),
  splitSection: vi.fn((sections, index, splitTime) => {
    if (index < 0 || index >= sections.length) return sections;
    const section = sections[index];
    if (splitTime <= section.startTime || splitTime >= section.endTime) return sections;
    
    const newSections = [...sections];
    const firstPart = { ...section, endTime: splitTime, id: `${section.id}-a` };
    const secondPart = { ...section, startTime: splitTime, id: `${section.id}-b` };
    newSections.splice(index, 1, firstPart, secondPart);
    return newSections;
  }),
  updateSectionBoundary: vi.fn((sections, index, boundary, time) => {
    if (index < 0 || index >= sections.length) return sections;
    const updated = [...sections];
    if (boundary === 'start') {
      updated[index] = { ...updated[index], startTime: time };
    } else {
      updated[index] = { ...updated[index], endTime: time };
    }
    return updated;
  }),
}));

import { detectSections } from '../utils/sectionDetector';

describe('useSectionDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty sections', () => {
    const { result } = renderHook(() => useSectionDetection());

    expect(result.current.sections).toEqual([]);
    expect(result.current.isDetecting).toBe(false);
    expect(result.current.confidence).toBe(0);
    expect(result.current.warnings).toEqual([]);
  });

  it('should detect sections from audio buffer', async () => {
    const mockSections = [
      { id: 'section-0', startTime: 0, endTime: 30, label: 'M1-15', color: '#fff', confidence: 1 },
      { id: 'section-1', startTime: 30, endTime: 60, label: 'M15-30', color: '#fff', confidence: 0.8 },
    ];

    (detectSections as ReturnType<typeof vi.fn>).mockResolvedValue({
      sections: mockSections,
      confidence: 0.85,
      warnings: ['Low dynamic range'],
    });

    const { result } = renderHook(() => useSectionDetection());

    // Create a mock AudioBuffer
    const mockAudioBuffer = {
      duration: 60,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 60 * 44100,
      getChannelData: vi.fn(() => new Float32Array(60 * 44100)),
    } as unknown as AudioBuffer;

    await act(async () => {
      await result.current.detectSectionsFromBuffer(mockAudioBuffer);
    });

    expect(result.current.sections).toEqual(mockSections);
    expect(result.current.confidence).toBe(0.85);
    expect(result.current.warnings).toEqual(['Low dynamic range']);
    expect(result.current.isDetecting).toBe(false);
  });

  it('should handle detection errors gracefully', async () => {
    (detectSections as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Detection failed'));

    const { result } = renderHook(() => useSectionDetection());

    const mockAudioBuffer = {
      duration: 60,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 60 * 44100,
      getChannelData: vi.fn(() => new Float32Array(60 * 44100)),
    } as unknown as AudioBuffer;

    await act(async () => {
      await result.current.detectSectionsFromBuffer(mockAudioBuffer);
    });

    expect(result.current.sections).toEqual([]);
    expect(result.current.confidence).toBe(0);
    expect(result.current.warnings).toContain('Section detection failed - please try again');
  });

  it('should clear sections', async () => {
    const mockSections = [
      { id: 'section-0', startTime: 0, endTime: 30, label: 'M1-15', color: '#fff', confidence: 1 },
    ];

    (detectSections as ReturnType<typeof vi.fn>).mockResolvedValue({
      sections: mockSections,
      confidence: 0.9,
      warnings: [],
    });

    const { result } = renderHook(() => useSectionDetection());

    const mockAudioBuffer = {
      duration: 60,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 60 * 44100,
      getChannelData: vi.fn(() => new Float32Array(60 * 44100)),
    } as unknown as AudioBuffer;

    await act(async () => {
      await result.current.detectSectionsFromBuffer(mockAudioBuffer);
    });

    expect(result.current.sections).toHaveLength(1);

    act(() => {
      result.current.clearSections();
    });

    expect(result.current.sections).toEqual([]);
    expect(result.current.confidence).toBe(0);
  });

  it('should merge sections', async () => {
    const mockSections = [
      { id: 'section-0', startTime: 0, endTime: 30, label: 'M1-15', color: '#fff', confidence: 1 },
      { id: 'section-1', startTime: 30, endTime: 60, label: 'M15-30', color: '#fff', confidence: 0.8 },
    ];

    (detectSections as ReturnType<typeof vi.fn>).mockResolvedValue({
      sections: mockSections,
      confidence: 0.9,
      warnings: [],
    });

    const { result } = renderHook(() => useSectionDetection());

    const mockAudioBuffer = {
      duration: 60,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 60 * 44100,
      getChannelData: vi.fn(() => new Float32Array(60 * 44100)),
    } as unknown as AudioBuffer;

    await act(async () => {
      await result.current.detectSectionsFromBuffer(mockAudioBuffer);
    });

    expect(result.current.sections).toHaveLength(2);

    act(() => {
      result.current.merge(0, 1);
    });

    expect(result.current.sections).toHaveLength(1);
  });

  it('should split sections', async () => {
    const mockSections = [
      { id: 'section-0', startTime: 0, endTime: 60, label: 'M1-30', color: '#fff', confidence: 1 },
    ];

    (detectSections as ReturnType<typeof vi.fn>).mockResolvedValue({
      sections: mockSections,
      confidence: 0.9,
      warnings: [],
    });

    const { result } = renderHook(() => useSectionDetection());

    const mockAudioBuffer = {
      duration: 60,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 60 * 44100,
      getChannelData: vi.fn(() => new Float32Array(60 * 44100)),
    } as unknown as AudioBuffer;

    await act(async () => {
      await result.current.detectSectionsFromBuffer(mockAudioBuffer);
    });

    expect(result.current.sections).toHaveLength(1);

    act(() => {
      result.current.split(0, 30);
    });

    expect(result.current.sections).toHaveLength(2);
  });
});
