
import { useState, useCallback, useEffect, type RefObject } from 'react';
import { getPatternDuration, replacePatternAtIndex, insertPatternAtIndex, mapLogicalToStringIndex } from '../utils/dragAndDrop';
import { expandSimileMeasure } from '../utils/notationUtils';
import { parseRhythm, findMeasureIndexAtTick, findMeasureIndexFromVisualTick, measureLayoutOf } from '../../shared/rhythm/rhythmParser';
import { visualToLogicalTick } from '../../shared/rhythm/measureLayout';
// getSixteenthsPerMeasure removed (unused)
import type { TimeSignature, ParsedRhythm } from '../types';
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
    parsedRhythm: ParsedRhythm;
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
    parsedRhythm,
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

    // Handle replacing selected notes with a pattern
    const handleReplaceSelection = useCallback((pattern: string) => {
        if (selection.startCharPosition === null || selection.endCharPosition === null) {
            return;
        }

        const patternDuration = getPatternDuration(pattern);
        // FIX Phase 39: Use findMeasureIndexFromVisualTick (Visual Coordinate Fix)
        // Selection comes from Visual Coordinates (VexFlow), which skips ghosts.
        const lookup = findMeasureIndexFromVisualTick(parsedRhythm, selection.startCharPosition);
        const startMeasureIdx = lookup.index;
        // Calculate Logical Char Position for string mapping
        const logicalCharPosition = lookup.logicalMeasureStartTick + lookup.localTick;

        let currentNotation = notation;
        let currentParsed = parsedRhythm;

        // FIX Phase 37 Correction 3: Check for Simile/Ghost Expansion
        const expanded = expandSimileMeasure(currentNotation, startMeasureIdx, currentParsed);
        if (expanded !== currentNotation) {
            currentNotation = expanded;
            currentParsed = parseRhythm(currentNotation, timeSignature);
            setNotationWithoutHistory(currentNotation);
        }

        // Convert Logical Position (Ticks) -> String Index using Updated Rhythm
        // Note: findMeasureIndexAtTick logic relies on ParsedRhythm structure.
        // If we expanded, we should ideally re-calculate index? 
        // But logical ticks (selection.startCharPosition) are invariant relative to structure timeline.
        // So we can map directly.
        const map = mapLogicalToStringIndex(
            currentNotation,
            logicalCharPosition,
            currentParsed,
            timeSignature
        );

        let startIndex = map.index;

        // The mapped index can land on a space between note groups; the selected note is the
        // next one. (Walking back over spaces, as this once did, replaced the note BEFORE it.)
        // Landing on a '-' means mid-note, so walk back to that note's head.
        while (startIndex < currentNotation.length && /\s/.test(currentNotation[startIndex])) {
            startIndex++;
        }
        while (startIndex > 0 && currentNotation[startIndex] === '-') {
            startIndex--;
        }

        addToHistory(notation);

        // Use replacePatternAtIndex with the SNAPPED start position
        const result = replacePatternAtIndex(
            currentNotation,
            startIndex,
            pattern,
            patternDuration
        );



        setNotationWithoutHistory(result.newNotation);

        // Update selection to the newly inserted pattern
        setSelectionState({
            startCharPosition: selection.startCharPosition,
            endCharPosition: selection.startCharPosition + patternDuration,
            isSelecting: false,
            anchorPosition: null,
        });
        setSelectionDuration(patternDuration);
    }, [notation, selection, addToHistory, setNotationWithoutHistory, parsedRhythm, timeSignature]);

    // Handle deleting selected notes
    // Phase 27: Support for Simile Expansion
    const handleDeleteSelection = useCallback(() => {
        if (selection.startCharPosition === null || selection.endCharPosition === null) {
            return;
        }

        // Convert Logical positions to String Indices
        // Phase 27: Check if we are targeting a Simile Measure
        // FIX Phase 39: Use findMeasureIndexFromVisualTick
        const lookup = findMeasureIndexFromVisualTick(parsedRhythm, selection.startCharPosition);
        const startMeasureIdx = lookup.index;
        const logicalCharPosition = lookup.logicalMeasureStartTick + lookup.localTick;

        let currentNotation = notation;
        let currentParsed = parsedRhythm;

        // Try to expand
        const expanded = expandSimileMeasure(currentNotation, startMeasureIdx, currentParsed);

        if (expanded !== currentNotation) {
            currentNotation = expanded;
            // Re-parse to ensure mapping is correct for the new explicit notation
            currentParsed = parseRhythm(currentNotation, timeSignature);
            // Update state so UI reflects expansion immediately
            setNotationWithoutHistory(currentNotation);
        }

        // The end is exclusive: a selection ending on a barline must resolve to the end of its own
        // measure, not to the start of the next visible one (which, after a section repeat, lies
        // past the hidden copies and the `:|xN` token).
        const logicalEndCharPosition = visualToLogicalTick(measureLayoutOf(currentParsed), selection.endCharPosition, 'end');

        const startMap = mapLogicalToStringIndex(currentNotation, logicalCharPosition, currentParsed, timeSignature);
        const endMap = mapLogicalToStringIndex(currentNotation, logicalEndCharPosition, currentParsed, timeSignature, 'end');

        addToHistory(notation); // Save OLD notation to history

        // Just splice the string
        const before = currentNotation.slice(0, startMap.index);
        const after = currentNotation.slice(endMap.index);
        const newNotation = before + after;

        setNotationWithoutHistory(newNotation);
        clearSelection();
    }, [notation, selection, addToHistory, setNotationWithoutHistory, clearSelection, parsedRhythm, timeSignature]);

    // Handle moving selected notes to a new position.
    // The renderer reports drawn-score (visual) ticks; resolve them to played ticks before touching
    // the string, or a move after a section repeat lands on the hidden copy's measure.
    const handleMoveSelection = useCallback((fromStartVisual: number, fromEndVisual: number, toPositionVisual: number) => {
        let currentNotation = notation;
        let currentParsed = parsedRhythm;

        const layout = measureLayoutOf(parsedRhythm);
        const fromStartLogical = visualToLogicalTick(layout, fromStartVisual);
        const fromEndLogical = visualToLogicalTick(layout, fromEndVisual, 'end');
        const toPositionLogical = visualToLogicalTick(layout, toPositionVisual);

        const startMeasureIdx = findMeasureIndexAtTick(parsedRhythm, fromStartLogical).index;
        const targetMeasureIdx = findMeasureIndexAtTick(parsedRhythm, toPositionLogical).index;

        let expanded = expandSimileMeasure(currentNotation, startMeasureIdx, currentParsed);
        if (expanded !== currentNotation) {
            currentNotation = expanded;
            currentParsed = parseRhythm(currentNotation, timeSignature);
        }

        // Moving into a simile measure needs its notes written out first.
        expanded = expandSimileMeasure(currentNotation, targetMeasureIdx, currentParsed);
        if (expanded !== currentNotation) {
            currentNotation = expanded;
            currentParsed = parseRhythm(currentNotation, timeSignature);
        }

        // Convert all Logical Ticks -> String Indices (using Updated Notation)
        const startMap = mapLogicalToStringIndex(currentNotation, fromStartLogical, currentParsed, timeSignature);
        const endMap = mapLogicalToStringIndex(currentNotation, fromEndLogical, currentParsed, timeSignature, 'end');
        const targetMap = mapLogicalToStringIndex(currentNotation, toPositionLogical, currentParsed, timeSignature);

        // 1. Extract content. Nothing to move means the selection is padding the parser added
        // (an implicit rest), which has no characters in the string.
        const content = currentNotation.slice(startMap.index, endMap.index);
        if (!content.trim()) {
            clearSelection();
            return;
        }

        // 2. Remove content
        const remainingNotation = currentNotation.slice(0, startMap.index) + currentNotation.slice(endMap.index);

        // 3. Determine insertion point
        // If target was after selection, it shifted left by (endMap.index - startMap.index)
        let targetIndex = targetMap.index;
        const selectionLength = endMap.index - startMap.index;

        if (targetIndex >= endMap.index) {
            targetIndex -= selectionLength;
        }

        // 4. Insert at target index
        const finalNotation = insertPatternAtIndex(remainingNotation, targetIndex, content);

        // 5. Update state
        addToHistory(notation);
        setNotationWithoutHistory(finalNotation);
        clearSelection();

    }, [notation, addToHistory, clearSelection, setNotationWithoutHistory, parsedRhythm, timeSignature]);

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
