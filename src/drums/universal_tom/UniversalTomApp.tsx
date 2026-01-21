import React, { useState, useMemo } from 'react';
import { parseUniversalTom, detectTimeSignature } from '../utils/universalTomParser';
import VexFlowRenderer from '../components/VexFlowRenderer';
import { parseRhythm } from '../utils/rhythmParser';

const UniversalTomApp: React.FC = () => {
    const [input, setInput] = useState('');

    const parsedNotation = useMemo(() => {
        try {
            return parseUniversalTom(input);
        } catch {
            return '';
        }
    }, [input]);

    const timeSignature = useMemo(() => {
        return detectTimeSignature(input) || { numerator: 4, denominator: 4 };
    }, [input]);

    const parsedRhythm = useMemo(() => {
        if (!parsedNotation) return null;
        return parseRhythm(parsedNotation, timeSignature);
    }, [parsedNotation, timeSignature]);

    const handleOpenInTrainer = () => {
        if (!parsedNotation) return;
        // Redirect to main app with rhythm param
        let url = `/drums/?rhythm=${encodeURIComponent(parsedNotation)}`;
        if (timeSignature.numerator !== 4 || timeSignature.denominator !== 4) {
            url += `&time=${timeSignature.numerator}/${timeSignature.denominator}`;
        }
        window.open(url, '_blank');
    };

    return (
        <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex-none h-16 px-6 border-b border-purple-900/30 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3 overflow-visible">
                    <span className="material-symbols-outlined text-purple-400 text-3xl flex-shrink-0 overflow-visible">auto_fix_high</span>
                    <h1 className="text-xl font-bold text-purple-100 uppercase tracking-widest">
                        Universal Tom Importer
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <a href="/drums/" className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
                        Cancel
                    </a>
                    <button
                        onClick={handleOpenInTrainer}
                        disabled={!parsedNotation}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-bold shadow-lg shadow-purple-900/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <span>Open in Trainer</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                </div>
            </header>

            {/* Main Content - 2 Column Layout */}
            <main className="flex-grow p-6 grid grid-cols-2 gap-6 overflow-hidden">

                {/* Left Column: Input + Raw Source */}
                <div className="flex flex-col h-full space-y-4">

                    {/* Top: Source Input (50%) */}
                    <div className="flex-1 flex flex-col space-y-2 min-h-0">
                        <div className="flex justify-between items-baseline">
                            <label className="text-purple-300 text-xs font-bold uppercase tracking-wider">
                                Source Text
                            </label>
                        </div>

                        <textarea
                            className="w-full flex-grow bg-gray-900 border border-purple-500/20 rounded-lg p-6 text-purple-100 font-mono text-sm leading-relaxed focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-none shadow-inner transition-colors scrollbar-thin scrollbar-thumb-purple-900/50"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Paste Universal Tom font text here... (e.g. 2.4J alda...)"
                            spellCheck={false}
                            autoFocus
                        />
                    </div>

                    {/* Bottom: Raw Output (50%) */}
                    <div className="flex-1 flex flex-col space-y-2 min-h-0">
                        <label className="text-purple-300 text-xs font-bold uppercase tracking-wider">
                            Converted Notation
                        </label>
                        <div className="flex-grow bg-gray-900 border border-purple-500/20 rounded-lg p-6 font-mono text-xs text-gray-400 overflow-auto scrollbar-thin scrollbar-thumb-purple-900/50">
                            {parsedNotation ? (
                                <p className="break-words leading-relaxed">{parsedNotation}</p>
                            ) : (
                                <span className="opacity-30 italic">Converted Darbuka notation will appear here...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Preview (Full Height) */}
                <div className="flex flex-col h-full space-y-2">
                    <div className="flex justify-between items-baseline">
                        <label className="text-purple-300 text-xs font-bold uppercase tracking-wider">
                            Notation Preview
                        </label>
                        {timeSignature && (
                            <span className="text-xs text-purple-400/70 font-mono">
                                {timeSignature.numerator}/{timeSignature.denominator} Time
                            </span>
                        )}
                    </div>

                    <div className="flex-grow bg-white rounded-lg border border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex-grow overflow-auto p-8">
                            {parsedRhythm ? (
                                <div className="text-black">
                                    <VexFlowRenderer
                                        rhythm={parsedRhythm}
                                        dragDropMode="replace"
                                        notation={parsedNotation}
                                        currentNote={null}
                                        metronomeEnabled={false}
                                        timeSignature={timeSignature}
                                        compactMode={true}
                                    />
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <span className="material-symbols-outlined text-5xl opacity-20">music_note</span>
                                    <p className="text-sm font-medium opacity-60">
                                        Notation preview will appear here
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UniversalTomApp;
