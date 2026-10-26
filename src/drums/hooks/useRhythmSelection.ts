
import { useState, useCallback, useEffect, type RefObject } from 'react';
import { getPatternDuration } from '../utils/dragAndDrop';
import { deleteRange, moveRange, replaceRange } from '../utils/notationEdits';
import type { TimeSignature } from '../types';
import {
    isDrumsSelectionProtectedTarget,
    shouldClearDrumsSelectionOnOutsideClick,
} from '../utils/drumsSelectionProtectedZones';

interface UseRhythmSelectionProps {
    notation: string;
    timeSignature: TimeSignature;
    addToHistory: (notation: string) => void;
    setNotationWithoutHistory: (notation: string) => void;
    noteDisplayRef: RefObject<HTMLElement>;
    /**
     * Live playback flag. A ref because `isPlaying` is declared after this hook in `App`, and
     * because the listener below must read the current value rather than a captured one.
     */
    isPlayingRef?: RefObject<boolean>;
}

export interface SelectionState {
    startCharPosition: number | null;
    endCharPosition: number | null;
    isSelecting: boolean;
    anchorPosition: number | null;
}

export function useRhythmSelection({
    notation,
    timeSignature,
    addToHistory,
    setNotationWithoutHistory,
    noteDisplayRef,
    isPlayingRef,
}: UseRhythmSelectionProps) {
    const [selection, setSelectionState] = useState<SelectionState>({
        startCharPosition: null, // String index
        endCharPosition: null,
        isSelecting: false,
        anchorPosition: null, // Original click position for drag-to-select
    });
    const [selectionDuration, setSelectionDuration] = useState<number>(0);

    const clearSelection = useCallback(() => {
        setSelectionState({
            startCharPosition: null,
            endCharPosition: null,
            isSelecting: false,
            anchorPosition: null,
        });
        setSelectionDuration(0);
    }, []);

    // Handle selection change from VexFlowRenderer (final selection, not during drag)
    const handleSelectionChange = useCallback((
        start: number | null,
        end: number | null,
        duration: number,
        isShiftPressed: boolean = false
    ) => {
        // If Shift is pressed and we have an anchor (or existing selection), extend the selection
        if (isShiftPressed && start !== null) {
            setSelectionState(prev => {
                // Use existing anchor or current start as anchor
                let anchor = prev.anchorPosition;
                if (anchor === null) {
                    if (prev.startCharPosition !== null) {
                        anchor = prev.startCharPosition;
                    } else {
                        anchor = start;
                    }
                }

                return {
                    startCharPosition: Math.min(anchor, start),
                    endCharPosition: Math.max(anchor, start === prev.startCharPosition && prev.endCharPosition ? prev.endCharPosition : (end ?? start + duration)),
                    isSelecting: false,
                    anchorPosition: anchor,
                };
            });
            // Approximate duration update?
            // setSelectionDuration(duration); // This might be wrong if range expanded.
            return;
        }

        setSelectionState({
            startCharPosition: start,
            endCharPosition: end,
            isSelecting: false,
            anchorPosition: null,
        });
        setSelectionDuration(duration);
    }, []);

    // Handling global click to clear selection
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const shouldClear = shouldClearDrumsSelectionOnOutsideClick({
                hasSelection: selection.startCharPosition !== null,
                isPlaying: isPlayingRef?.current === true,
                targetProtected: isDrumsSelectionProtectedTarget(e.target),
                insideNoteDisplay: noteDisplayRef.current?.contains(e.target as Node) === true,
            });
            if (shouldClear) clearSelection();
        };

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // If focus is in Palette, we want to return focus to Note Display and preserve selection
                // (Currently, Esc might trigger generic blur handling or something)
                const paletteSidebar = document.querySelector('.palette-sidebar');
                if (paletteSidebar && paletteSidebar.contains(document.activeElement)) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Refocus the notation editor
                    if (noteDisplayRef.current) {
                        const container = noteDisplayRef.current.querySelector('.vexflow-container') as HTMLElement;
                        if (container) {
                            container.focus();
                        }
                    }
                    // Do NOT clear selection
                    return;
                }
            }
        };

        // Use mousedown to catch clicks before they're processed by other handlers
        document.addEventListener('mousedown', handleGlobalClick);
        document.addEventListener('keydown', handleGlobalKeyDown, true); // Capture phase to intervene early
        return () => {
            document.removeEventListener('mousedown', handleGlobalClick);
            document.removeEventListener('keydown', handleGlobalKeyDown, true);
        };
    }, [selection.startCharPosition, clearSelection, noteDisplayRef, isPlayingRef]);

    // The edits themselves live in `notationEdits.ts`, pure and fuzz-tested; these wire them to
    // selection state and history. A `null` result changes nothing and records no undo step.
    const handleReplaceSelection = useCallback((pattern: string) => {
        if (selection.startCharPosition === null || selection.endCharPosition === null) {
            return;
        }
        const next = replaceRange(notation, timeSignature, { start: selection.startCharPosition, end: selection.endCharPosition }, pattern);
        if (next === null) return;
        addToHistory(notation);
        setNotationWithoutHistory(next);

        const patternDuration = getPatternDuration(pattern);
        setSelectionState({
            startCharPosition: selection.startCharPosition,
            endCharPosition: selection.startCharPosition + patternDuration,
            isSelecting: false,
            anchorPosition: null,
        });
        setSelectionDuration(patternDuration);
    }, [notation, selection, addToHistory, setNotationWithoutHistory, timeSignature]);

    const handleDeleteSelection = useCallback(() => {
        if (selection.startCharPosition === null || selection.endCharPosition === null) {
            return;
        }
        const next = deleteRange(notation, timeSignature, { start: selection.startCharPosition, end: selection.endCharPosition });
        if (next !== null) {
            addToHistory(notation);
            setNotationWithoutHistory(next);
        }
        clearSelection();
    }, [notation, selection, addToHistory, setNotationWithoutHistory, clearSelection, timeSignature]);

    // The renderer reports drawn-score (visual) ticks; `moveRange` resolves them.
    const handleMoveSelection = useCallback((fromStartVisual: number, fromEndVisual: number, toPositionVisual: number) => {
        const next = moveRange(notation, timeSignature, { start: fromStartVisual, end: fromEndVisual }, toPositionVisual);
        if (next !== null) {
            addToHistory(notation);
            setNotationWithoutHistory(next);
        }
        clearSelection();
    }, [notation, addToHistory, clearSelection, setNotationWithoutHistory, timeSignature]);

    return {
        selection,
        selectionDuration,
        setSelectionState, // Exposed for VexFlowRenderer
        handleSelectionChange,
        clearSelection,
        handleReplaceSelection,
        handleDeleteSelection,
        handleMoveSelection,
        // handleShiftClick logic will be integrated into handleSelectionChange or exposed
    };
}
