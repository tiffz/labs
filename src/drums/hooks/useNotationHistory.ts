import { useState, useCallback } from 'react';

/**
 * Custom hook for managing notation history (undo/redo)
 * Provides a consistent way to update notation while tracking history
 */
export function useNotationHistory(initialNotation: string) {
  const [notation, setNotation] = useState<string>(initialNotation);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  /**
   * Add current notation to history (called before making changes)
   */
  const addToHistory = useCallback((currentNotation: string) => {
    setHistory(prev => [...prev, currentNotation]);
    // Clear redo stack when new action is taken
    setRedoStack([]);
  }, []);

  /**
   * Update notation and add previous state to history
   */
  const updateNotation = useCallback((newNotation: string) => {
    addToHistory(notation);
    setNotation(newNotation);
  }, [notation, addToHistory]);

  /**
   * Update notation without adding to history (for internal operations)
   */
  const setNotationWithoutHistory = useCallback((newNotation: string) => {
    setNotation(newNotation);
  }, []);

  /**
   * Undo the last notation change
   */
  const undo = useCallback(() => {
    if (history.length === 0) return;
    
    const previousNotation = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, notation]);
    setNotation(previousNotation);
  }, [history, notation]);

  /**
   * Redo the last undone change
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const nextNotation = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setHistory(prev => [...prev, notation]);
    setNotation(nextNotation);
  }, [redoStack, notation]);

  return {
    notation,
    setNotation: updateNotation,
    setNotationWithoutHistory,
    addToHistory,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
  };
}

