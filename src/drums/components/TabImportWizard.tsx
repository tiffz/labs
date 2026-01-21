import { useState, useEffect } from 'react';
import { useTabImport, type TabType } from '../hooks/useTabImport';
import type { DrumPattern } from '../utils/drumTabParser';

interface TabImportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (notation: string, sections?: { name: string; notation: string }[]) => void;
    rawTabText?: string;
    initialTabType?: TabType;
}

export function TabImportWizard({ isOpen, onClose, onImport, rawTabText = '', initialTabType = 'unknown' }: TabImportWizardProps) {
    const {
        state,
        setRawText,
        setType,
        setMode,
        toggleSection,
        togglePattern,
        updateDrumOptions,
        selectAllSections,
        deselectAllSections,
    } = useTabImport(rawTabText, initialTabType);

    const [activeTab, setActiveTab] = useState<'sections' | 'patterns'>('sections');

    // Set mode based on active tab
    useEffect(() => {
        setMode(activeTab === 'sections' ? 'song' : 'patterns');
    }, [activeTab, setMode]);

    if (!isOpen) return null;

    // Helper to condense identical consecutive sections into repeats
    // Uses |: ... :| xN syntax for better compatibility with section repeats
    const condenseRepeats = (sections: { name: string; notation: string }[]): string => {
        if (sections.length === 0) return '';

        const result: string[] = [];
        let currentNotation = sections[0].notation.trim();
        let count = 1;

        for (let i = 1; i < sections.length; i++) {
            const nextNotation = sections[i].notation.trim();
            if (nextNotation === currentNotation) {
                count++;
            } else {
                if (count > 1) {
                    result.push(`|: ${currentNotation} :| x${count}`);
                } else {
                    result.push(currentNotation);
                }
                currentNotation = nextNotation;
                count = 1;
            }
        }

        if (count > 1) {
            result.push(`|: ${currentNotation} :| x${count}`);
        } else {
            result.push(currentNotation);
        }

        return result.join(' ');
    };

    // Helper to condense identical consecutive measures within a single notation string
    // e.g. "D-T- D-T- D-T-" -> "D-T- |x3"
    const condenseMeasureRepeats = (notation: string): string => {
        // Split into measures (assuming 16 chars per measure for 16th notes, or just split by space if cleaner)
        // The parser output puts spaces between measures.
        const measureStrs = notation.trim().split(/\s+/);
        if (measureStrs.length < 2) return notation;

        const result: string[] = [];
        let currentMeasure = measureStrs[0];
        let count = 1;

        for (let i = 1; i < measureStrs.length; i++) {
            if (measureStrs[i] === currentMeasure) {
                count++;
            } else {
                if (count > 1) {
                    result.push(`${currentMeasure} |x${count}`);
                } else {
                    result.push(currentMeasure);
                }
                currentMeasure = measureStrs[i];
                count = 1;
            }
        }

        if (count > 1) {
            result.push(`${currentMeasure} |x${count}`);
        } else {
            result.push(currentMeasure);
        }

        return result.join(' ');
    };

    const handleImport = () => {
        if (activeTab === 'sections' && state.drumResult) {
            const selected = state.drumResult.sections.filter((_, i) => state.selectedSections.has(i));
            if (selected.length === 0) return;

            // Pre-process sections to condense internal measure repeats
            const processed = selected.map(s => ({
                ...s,
                notation: condenseMeasureRepeats(s.notation)
            }));

            onImport(condenseRepeats(processed), processed);
        } else if (activeTab === 'sections' && state.guitarResult) {
            const selected = state.guitarResult.sections.filter((_, i) => state.selectedSections.has(i));
            if (selected.length === 0) return;

            // Use s.notation (converted) instead of patterns (raw)
            const mappedSelected = selected.map(s => ({
                name: s.name,
                notation: condenseMeasureRepeats(s.notation),
                patterns: s.patterns
            }));

            onImport(condenseRepeats(mappedSelected), mappedSelected);
        } else if (activeTab === 'patterns') {
            const patterns = state.selectedType === 'guitar' ? state.guitarResult?.patterns : state.drumResult?.patterns;
            if (!patterns) return;
            const selectedPats = patterns.filter(p => state.selectedPatterns.has(p.notation));
            if (selectedPats.length === 0) return;
            // Patterns are single measures, no consolidation needed
            const notation = selectedPats.map(p => p.notation).join(' ');
            onImport(notation);
        }
        onClose();
    };

    const sections = state.selectedType === 'guitar' ? state.guitarResult?.sections : state.drumResult?.sections;
    const patterns = state.selectedType === 'guitar' ? state.guitarResult?.patterns : state.drumResult?.patterns;

    const sectionsCount = sections?.length || 0;
    const patternsCount = patterns?.length || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-[1100px] h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-purple-600">library_music</span>
                            Import Tab
                        </h2>
                        <div className="flex bg-gray-200 rounded-lg p-1">
                            <button
                                onClick={() => setType('drum')}
                                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${state.selectedType === 'drum' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Drum {state.detectedType === 'drum' && '✨'}
                            </button>
                            <button
                                onClick={() => setType('guitar')}
                                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${state.selectedType === 'guitar' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Guitar {state.detectedType === 'guitar' && '✨'}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                        <a
                            href={state.selectedType === 'drum' ? "https://en.wikipedia.org/wiki/Drum_tablature" : "https://en.wikipedia.org/wiki/Tablature#Guitar_and_bass_tablature"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 font-medium"
                        >
                            <span className="material-symbols-outlined text-[14px]">help</span>
                            About {state.selectedType === 'drum' ? 'Drum' : 'Guitar'} Tabs
                        </a>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Main Content (2 Columns) */}
                <div className="flex-1 flex overflow-hidden min-h-0">
                    {/* Left: Input */}
                    <div className="w-1/2 flex flex-col border-r bg-gray-50/50">
                        <div className="p-4 flex-1 flex flex-col min-h-0">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tab Text</label>
                            <textarea
                                value={state.rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="flex-1 w-full p-4 font-mono text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-shadow"
                                placeholder={state.selectedType === 'drum' ? "Paste drum tab...\\nHH|x-x-x-x-|" : "Paste guitar tab...\\n[tab]...[/tab]\\nor\\ne|---0---|"}
                                spellCheck={false}
                            />
                            <p className="text-xs text-gray-400 mt-2 text-right">
                                {state.rawText.length} chars
                            </p>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="w-1/2 flex flex-col bg-white min-h-0">
                        {/* Tabs */}
                        <div className="flex border-b px-4 gap-6 flex-shrink-0">
                            <button
                                onClick={() => setActiveTab('sections')}
                                className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'sections' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Sections
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                    {sectionsCount}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('patterns')}
                                className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'patterns' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Patterns
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                    {patternsCount}
                                </span>
                            </button>
                        </div>

                        {/* Results Content - SCROLLABLE */}
                        <div className="flex-1 overflow-y-auto p-4 min-h-0">
                            {sectionsCount > 0 || patternsCount > 0 ? (
                                <>
                                    {activeTab === 'sections' && sections && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center mb-2 px-1 gap-2">
                                                <span className="text-xs text-gray-500">Select sections to import</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={selectAllSections}
                                                        className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline"
                                                    >
                                                        Select All
                                                    </button>
                                                    <span className="text-gray-300">|</span>
                                                    <button
                                                        onClick={deselectAllSections}
                                                        className="text-xs font-bold text-gray-400 hover:text-gray-600 hover:underline"
                                                    >
                                                        Deselect All
                                                    </button>
                                                </div>
                                            </div>
                                            {sections.map((section: any, idx: number) => (
                                                <label
                                                    key={idx}
                                                    className={`group p-3 border rounded-lg cursor-pointer transition-all flex items-start gap-3 hover:shadow-md ${state.selectedSections.has(idx) ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-purple-300'}`}
                                                >
                                                    <div className="mt-1 flex-shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={state.selectedSections.has(idx)}
                                                            onChange={() => toggleSection(idx)}
                                                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 transition-all cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-baseline mb-1">
                                                            <h4 className="font-bold text-gray-800 text-sm truncate">{section.name || `Section ${idx + 1}`}</h4>
                                                            <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                                                        </div>
                                                        <div className="font-mono text-[10px] text-gray-500 bg-white/50 p-1 rounded border border-gray-100 truncate">
                                                            {condenseMeasureRepeats(section.notation)}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {activeTab === 'patterns' && patterns && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {patterns.map((p: DrumPattern, idx: number) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => togglePattern(p.notation)}
                                                    className={`p-3 border rounded-lg cursor-pointer transition-all ${state.selectedPatterns.has(p.notation) ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{(p.frequency * 100).toFixed(0)}% of song</span>
                                                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold">{p.count}x</span>
                                                    </div>
                                                    <div className="font-mono text-xs text-center bg-white p-1 rounded border overflow-hidden whitespace-nowrap">
                                                        {p.notation}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-20">content_paste</span>
                                    <p className="text-sm">Paste tab text to detect {activeTab}</p>
                                    {state.selectedType === 'guitar' && (
                                        <p className="text-xs text-red-400 mt-2">
                                            Ensure code blocks like [tab]...[/tab] are included for best results.
                                        </p>
                                    )}
                                    {state.detectedType && state.detectedType !== state.selectedType && (
                                        <p className="text-xs text-purple-600 mt-4 font-bold bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-100" onClick={() => setType(state.detectedType as 'drum' | 'guitar')}>
                                            ✨ We detected {state.detectedType} tab content! Switch to {state.detectedType}?
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Options Footer (Guitar/Drum specific) */}
                        {state.selectedType === 'drum' && (
                            <div className="border-t p-3 bg-gray-50 text-xs flex gap-4 text-gray-600 flex-shrink-0">
                                <label className="flex items-center gap-2 cursor-pointer select-none hover:text-purple-700" title="Import Bass Drum hits">
                                    <input
                                        type="checkbox"
                                        checked={state.drumOptions.includeBass}
                                        onChange={e => updateDrumOptions({ includeBass: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 transition-all"
                                    />
                                    Bass &rarr; Dum
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none hover:text-purple-700" title="Import Snare hits">
                                    <input
                                        type="checkbox"
                                        checked={state.drumOptions.includeSnare}
                                        onChange={e => updateDrumOptions({ includeSnare: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 transition-all"
                                    />
                                    Snare &rarr; Tek
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none hover:text-purple-700" title="Import Hi-Hat hits (mapped to Ka)">
                                    <input
                                        type="checkbox"
                                        checked={state.drumOptions.includeHiHat}
                                        onChange={e => updateDrumOptions({ includeHiHat: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 accent-purple-600 transition-all"
                                    />
                                    Hi-Hat &rarr; Ka
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t bg-white flex justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:text-gray-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={(activeTab === 'sections' && state.selectedSections.size === 0) || (activeTab === 'patterns' && state.selectedPatterns.size === 0)}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold shadow-sm hover:bg-purple-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        Import Selected ({activeTab === 'sections' ? state.selectedSections.size : state.selectedPatterns.size})
                    </button>
                </div>
            </div>
        </div>
    );
}
