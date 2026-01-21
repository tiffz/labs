

import { type TimeSignature } from '../types';

/**
 * Configuration for rhythm formatting
 */
export interface FormatOptions {
    measuresPerLine?: number;
}

/**
 * Safely formats rhythm notation by standardizing spacing
 * while preserving repeat syntax and special tokens.
 * 
 * @param notation Raw notation string
 * @param timeSignature Time signature to determine measure length
 * @param options Formatting options
 * @returns Formatted notation string
 */
export function formatRhythm(
    notation: string,
    _timeSignature: TimeSignature,
    _options: FormatOptions = { measuresPerLine: 2 } // eslint-disable-line @typescript-eslint/no-unused-vars
): string {
    if (!notation) return '';

    // const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);

    // 1. Tokenize keeping repeat syntax intact
    // We want to split by spaces/newlines but keep |xN, |:, :| together
    // Actually, we can just split by whitespace and then process

    // Replace newlines with space to process as stream
    const flat = notation.replace(/\n/g, ' ');

    // Split by whitespace
    const tokens = flat.split(/\s+/).filter(t => t.length > 0);

    let formatted = '';


    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // Check if token is a repeat marker or structural
        if (token.includes('|x') || token.includes('|:') || token.includes(':|')) {
            // Just append it with a space
            formatted = formatted.trimEnd() + ' ' + token + ' ';

            // If it's a repeat |xN, it usually ends a phrase/line visually
            if (token.match(/\|x\d+/)) {
                // Maybe force newline?
                // For now, let's treat it as neutral or checking repeats
                formatted = formatted.trimEnd() + '\n';
                formatted = formatted.trimEnd() + '\n';
            }
            continue;
        }

        // Check if it's a barline |
        if (token === '|') {
            formatted = formatted.trimEnd() + ' | ';
            continue;
        }

        // Assume it's a note pattern
        // Calculate duration
        // Assume it's a note pattern
        // Just keeping it simple for now

        // If adding this token exceeds measure?
        // Using a simpler heuristic: Just clean up spaces.
        // And add newlines every N measures if we can detect them.
        // If we can't reliably detect measure boundaries from tokens (e.g. split tokens),
        // we should just join with spaces.

        // But user wants "Auto-formatting that adds space separators".
        // So `D-T-D-T-` -> `D-T- D-T-`?
        // Only if they were split.

        // If the input was `D-T-____D-T-____`, it is one token?
        // No, loop above split by space.
        // If input was `D-T-____ D-T-____`. 2 tokens.
        // We join them with space.

        formatted += token + ' ';
    }

    return formatted.trim();
}
