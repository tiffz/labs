import { useState, useCallback, useEffect } from 'react';
import {
    parseDrumTab,
    isDrumTab,
    type ParsedDrumTab,
    type DrumTabParseOptions,
    DEFAULT_PARSE_OPTIONS as DEFAULT_DRUM_OPTIONS
} from '../utils/drumTabParser';
// Guitar parser imports would go here once we align interfaces
import { parseGuitarTab, isGuitarTab, type GuitarTabParseOptions, type ParsedGuitarTab, DEFAULT_GUITAR_OPTIONS } from '../utils/guitarTabParser';

export type ImportStep = 'input' | 'processing' | 'selection';
export type TabType = 'drum' | 'guitar' | 'unknown';
export type ImportMode = 'song' | 'patterns' | null;

export interface TabImportState {
    step: ImportStep;
    rawText: string;
    detectedType: TabType;
    selectedType: TabType;
    mode: ImportMode;

    // Parse Results
    drumResult: ParsedDrumTab | null;
    guitarResult: ParsedGuitarTab | null; // Placeholder until guitar interface is aligned

    // Options
    drumOptions: DrumTabParseOptions;
    guitarOptions: GuitarTabParseOptions;

    // Selection
    selectedSections: Set<number>; // Indices of sections to import
    selectedPatterns: Set<string>; // Notation strings of patterns to import
}

export function useTabImport(initialRawText = '', initialType: TabType = 'unknown') {
    const [state, setState] = useState<TabImportState>({
        step: 'input',
        rawText: initialRawText,
        detectedType: initialType,
        selectedType: initialType === 'unknown' ? 'drum' : initialType,
        mode: null,
        drumResult: null,
        guitarResult: null,
        drumOptions: DEFAULT_DRUM_OPTIONS,
        guitarOptions: DEFAULT_GUITAR_OPTIONS,
        selectedSections: new Set(),
        selectedPatterns: new Set(),
    });

    const setRawText = useCallback((text: string) => {
        setState(prev => {
            // Auto-detect type
            let type: TabType = prev.selectedType;
            if (isDrumTab(text)) type = 'drum';
            else if (isGuitarTab(text)) type = 'guitar';

            return {
                ...prev,
                rawText: text,
                detectedType: type,
                selectedType: type // Auto-switch selection too? Yes for now.
            };
        });
    }, []);

    const setType = useCallback((type: TabType) => {
        setState(prev => ({ ...prev, selectedType: type }));
    }, []);

    const setMode = useCallback((mode: ImportMode) => {
        setState(prev => ({ ...prev, mode }));
    }, []);

    const setStep = useCallback((step: ImportStep) => {
        setState(prev => ({ ...prev, step }));
    }, []);

    // Analysis Effect
    useEffect(() => {
        if (!state.rawText) return;

        if (state.selectedType === 'drum') {
            const result = parseDrumTab(state.rawText, state.drumOptions);
            setState(prev => ({ ...prev, drumResult: result }));
        } else if (state.selectedType === 'guitar') {
            // Logic for guitar
            const result = parseGuitarTab(state.rawText, state.guitarOptions);
            setState(prev => ({ ...prev, guitarResult: result }));
        }
    }, [state.rawText, state.selectedType, state.drumOptions, state.guitarOptions]);

    // Actions
    const toggleSection = useCallback((index: number) => {
        setState(prev => {
            const newSet = new Set(prev.selectedSections);
            if (newSet.has(index)) newSet.delete(index);
            else newSet.add(index);
            return { ...prev, selectedSections: newSet };
        });
    }, []);

    const togglePattern = useCallback((notation: string) => {
        setState(prev => {
            const newSet = new Set(prev.selectedPatterns);
            if (newSet.has(notation)) newSet.delete(notation);
            else newSet.add(notation);
            return { ...prev, selectedPatterns: newSet };
        });
    }, []);

    const updateDrumOptions = useCallback((options: Partial<DrumTabParseOptions>) => {
        setState(prev => ({
            ...prev,
            drumOptions: { ...prev.drumOptions, ...options }
        }));
    }, []);

    const updateGuitarOptions = useCallback((options: Partial<GuitarTabParseOptions>) => {
        setState(prev => ({
            ...prev,
            guitarOptions: { ...prev.guitarOptions, ...options }
        }));
    }, []);

    const selectAllSections = useCallback(() => {
        setState(prev => {
            const count = prev.selectedType === 'drum' ? prev.drumResult?.sections.length || 0 : prev.guitarResult?.sections.length || 0;
            const newSet = new Set<number>();
            for (let i = 0; i < count; i++) newSet.add(i);
            return { ...prev, selectedSections: newSet };
        });
    }, []);

    const deselectAllSections = useCallback(() => {
        setState(prev => ({ ...prev, selectedSections: new Set() }));
    }, []);

    return {
        state,
        setRawText,
        setType,
        setMode,
        setStep,
        toggleSection,
        togglePattern,
        updateDrumOptions,
        updateGuitarOptions,
        selectAllSections,
        deselectAllSections
    };
}
