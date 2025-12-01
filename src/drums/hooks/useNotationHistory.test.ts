import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotationHistory } from './useNotationHistory';

describe('useNotationHistory', () => {
  it('should initialize with the provided notation', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    expect(result.current.notation).toBe('D-T-K-');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update notation and add to history', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    act(() => {
      result.current.setNotation('D-T-K-T-');
    });
    
    expect(result.current.notation).toBe('D-T-K-T-');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear redo stack when new action is taken', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    // Make initial change
    act(() => {
      result.current.setNotation('D-T-K-T-');
    });
    
    // Undo
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.canRedo).toBe(true);
    
    // Make new change - should clear redo stack
    act(() => {
      result.current.setNotation('D-D-K-');
    });
    
    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it('should undo notation changes', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    act(() => {
      result.current.setNotation('D-T-K-T-');
    });
    
    act(() => {
      result.current.setNotation('D-T-K-T-D-');
    });
    
    expect(result.current.notation).toBe('D-T-K-T-D-');
    
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.notation).toBe('D-T-K-T-');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
    
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.notation).toBe('D-T-K-');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo notation changes', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    act(() => {
      result.current.setNotation('D-T-K-T-');
    });
    
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.notation).toBe('D-T-K-');
    
    act(() => {
      result.current.redo();
    });
    
    expect(result.current.notation).toBe('D-T-K-T-');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should not undo when history is empty', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.notation).toBe('D-T-K-');
    expect(result.current.canUndo).toBe(false);
  });

  it('should not redo when redo stack is empty', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    act(() => {
      result.current.setNotation('D-T-K-T-');
    });
    
    act(() => {
      result.current.redo();
    });
    
    expect(result.current.notation).toBe('D-T-K-T-');
  });

  it('should update notation without history using setNotationWithoutHistory', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    act(() => {
      result.current.setNotation('D-T-K-T-');
    });
    
    expect(result.current.canUndo).toBe(true);
    
    act(() => {
      result.current.setNotationWithoutHistory('D-D-D-');
    });
    
    expect(result.current.notation).toBe('D-D-D-');
    // History should remain unchanged
    expect(result.current.canUndo).toBe(true);
  });

  it('should allow manual history addition with addToHistory', () => {
    const { result } = renderHook(() => useNotationHistory('D-T-K-'));
    
    act(() => {
      result.current.addToHistory('D-T-K-');
      result.current.setNotationWithoutHistory('D-T-K-T-');
    });
    
    expect(result.current.notation).toBe('D-T-K-T-');
    expect(result.current.canUndo).toBe(true);
    
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.notation).toBe('D-T-K-');
  });
});

