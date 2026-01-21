
import { useState, useCallback, useEffect, type RefObject } from 'react';
import { getPatternDuration, replacePatternAtIndex, insertPatternAtIndex, mapLogicalToStringIndex } from '../utils/dragAndDrop';
import { expandSimileMeasure } from '../utils/notationUtils';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import { getSixteenthsPerMeasure } from '../utils/timeSignatureUtils';
import type { TimeSignature, ParsedRhythm } from '../types';

interface UseRhythmSelectionProps {
    notation: string;
    timeSignature: TimeSignature;
    addToHistory: (notation: string) => void;
    setNotationWithoutHistory: (notation: string) => void;
    noteDisplayRef: RefObject<HTMLElement>;
    measureSourceMapping?: Record<number, number>;
    parsedRhythm: ParsedRhythm;
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
            // Only process if there's an active selection
            if (selection.startCharPosition === null) return;

            // Check if click is inside the note display container
            if (noteDisplayRef.current && noteDisplayRef.current.contains(e.target as Node)) {
                return; // Click is inside note display, don't clear
            }

            // Check if click is inside the palette sidebar (allow palette interactions)
            const paletteSidebar = document.querySelector('.palette-sidebar');
            if (paletteSidebar && paletteSidebar.contains(e.target as Node)) {
                return; // Click is inside palette, don't clear
            }

            // Check if click is inside the rhythm notation input section
            const inputSection = document.querySelector('.input-section');
            if (inputSection && inputSection.contains(e.target as Node)) {
                return; // Click is inside input section, don't clear
            }

            // Click is outside all interactive areas, clear the selection
            clearSelection();
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
    }, [selection.startCharPosition, clearSelection, noteDisplayRef]);

    // Handle replacing selected notes with a pattern
    const handleReplaceSelection = useCallback((pattern: string) => {
        if (selection.startCharPosition === null || selection.endCharPosition === null) {
            return;
        }

        const patternDuration = getPatternDuration(pattern);

        // Convert Logical Position (Ticks) -> String Index
        // VexFlow provides selection.startCharPosition as a Logical Time offset (in sixteenths).
        // We must map this to the actual character index in the string.
        const map = mapLogicalToStringIndex(
            notation,
            selection.startCharPosition,
            parsedRhythm,
            timeSignature
        );

        let startIndex = map.index;

        // "Wrong Note" Bug Fix (Phase 24) - Refined for Mapped Indices
        // Ensure we handle snapping if the mapped index lands on a dash 'sub-beat'
        // mapLogicalToStringIndex usually points to the start of the beat, but let's be safe.
        // We look backwards from startIndex to find the note head if we landed on a dash/space
        // that belongs to the previous note?
        // Actually, mapLogicalToStringIndex is robust.
        // However, if the USER selected a range starting mid-note (e.g. on the 2nd dash),
        // we want to replace the whole note.
        // But mapLogicalToStringIndex simply finds the string index covering that tick.
        // If that tick is a dash '-', it returns the index of that dash.
        // So we DO need to snap backwards to the Note Head.

        while (startIndex > 0 && (notation[startIndex] === '-' || notation[startIndex] === ' ')) {
            startIndex--;
        }

        addToHistory(notation);

        // Use replacePatternAtIndex with the SNAPPPED start position
        const result = replacePatternAtIndex(
            notation,
            startIndex,
            pattern,
            patternDuration
        );

        setNotationWithoutHistory(result.newNotation);

        // Update selection to the newly inserted pattern
        // Note: For selection highlight to work, we'd need to know the new endIndex
        // calculating exactly would require re-parsing. For now, clear selection or guess.
        setSelectionState({
            startCharPosition: selection.startCharPosition,
            endCharPosition: selection.startCharPosition + pattern.length, // Approximate
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
        // We calculate measure index via simple division assuming rigid 16th grid
        const sixteenths = getSixteenthsPerMeasure(timeSignature);
        const startMeasureIdx = Math.floor(selection.startCharPosition / sixteenths);

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

        // Re-calculate String Indices using potentially Updated Notation/ParsedRhythm
        const startMap = mapLogicalToStringIndex(currentNotation, selection.startCharPosition, currentParsed, timeSignature);
        const endMap = mapLogicalToStringIndex(currentNotation, selection.endCharPosition, currentParsed, timeSignature);

        // ... wait, I need to add imports first.

        addToHistory(notation); // Save OLD notation to history

        // Just splice the string
        const before = currentNotation.slice(0, startMap.index);
        const after = currentNotation.slice(endMap.index);
        const newNotation = before + after;

        setNotationWithoutHistory(newNotation);
        clearSelection();
    }, [notation, selection, addToHistory, setNotationWithoutHistory, clearSelection, parsedRhythm, timeSignature]);

    // Handle moving selected notes to a new position
    // Now using string indices exclusively
    const handleMoveSelection = useCallback((fromStartLogical: number, fromEndLogical: number, toPositionLogical: number) => {
        let currentNotation = notation;
        let currentParsed = parsedRhythm;

        // Phase 27: Expand Multi-Measure Repeats at Source AND Target?
        // Source Expansion
        const sixteenths = getSixteenthsPerMeasure(timeSignature);
        const startMeasureIdx = Math.floor(fromStartLogical / sixteenths);
        const targetMeasureIdx = Math.floor(toPositionLogical / sixteenths);

        let expanded = expandSimileMeasure(currentNotation, startMeasureIdx, currentParsed);
        if (expanded !== currentNotation) {
            currentNotation = expanded;
            currentParsed = parseRhythm(currentNotation, timeSignature);
        }

        // Target Expansion (if moving INTO a simile measure)
        // If we drop into a Simile, we must expand it to insert.
        // But wait, if we are inserting, we shift things?
        // Drag/Drop logic usually replaces or inserts.
        // If replace, we need explicit content.

        // Note: expandSimileMeasure uses parsedRhythm.
        // We must re-check if target is Simile in the NEW parsed layout?
        // If we expanded Source, Target index might have shifted?
        // Actually, expandSimileMeasure uses Logical Measure Index.
        // Logical Measure Indices don't shift (unless we inserted measures?).
        // Expansion just changes string form.

        expanded = expandSimileMeasure(currentNotation, targetMeasureIdx, currentParsed);
        if (expanded !== currentNotation) {
            currentNotation = expanded;
            currentParsed = parseRhythm(currentNotation, timeSignature);
        }

        // Convert all Logical Ticks -> String Indices (using Updated Notation)
        const startMap = mapLogicalToStringIndex(currentNotation, fromStartLogical, currentParsed, timeSignature);
        const endMap = mapLogicalToStringIndex(currentNotation, fromEndLogical, currentParsed, timeSignature);
        const targetMap = mapLogicalToStringIndex(currentNotation, toPositionLogical, currentParsed, timeSignature);

        // 1. Extract content
        const content = currentNotation.slice(startMap.index, endMap.index);

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
