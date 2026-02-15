

import { type TimeSignature } from '../types';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';

/**
 * Configuration for rhythm formatting
 */
export interface FormatOptions {
    measuresPerLine?: number;
}

type TokenType = 'notes' | 'repeat' | 'simile' | 'barline' | 'sectionStart' | 'sectionEnd';
interface Token { type: TokenType; value: string }

/**
 * Tokenize rhythm notation into meaningful tokens.
 * Handles note characters, repeat markers (|xN), section repeats (|: :|),
 * simile (%), and standalone barlines (|).
 */
function tokenize(notation: string): Token[] {
    const tokens: Token[] = [];
    // Match patterns in priority order (longer patterns first)
    // |x\d+ = repeat marker, |: = section start, :| = section end
    // % = simile, | = barline, [DdTtKkSs_\-]+ = note chars
    const regex = /(\|x\d+)|(\|:)?(:\|)|(\|:)|(%)|(\|)|([DdTtKkSs_-]+)/g;
    let m;
    while ((m = regex.exec(notation)) !== null) {
        if (m[1]) tokens.push({ type: 'repeat', value: m[1] });
        else if (m[2] && m[3]) tokens.push({ type: 'sectionEnd', value: m[2] + m[3] }); // |:...:| edge case
        else if (m[3]) tokens.push({ type: 'sectionEnd', value: m[3] });
        else if (m[4]) tokens.push({ type: 'sectionStart', value: m[4] });
        else if (m[5]) tokens.push({ type: 'simile', value: m[5] });
        else if (m[6]) tokens.push({ type: 'barline', value: m[6] });
        else if (m[7]) tokens.push({ type: 'notes', value: m[7] });
    }
    return tokens;
}

/**
 * Find the next non-barline token starting from index+1.
 */
function findNextMeaningful(tokens: Token[], index: number): Token | null {
    for (let j = index + 1; j < tokens.length; j++) {
        if (tokens[j].type !== 'barline') return tokens[j];
    }
    return null;
}

/**
 * Safely formats rhythm notation by inserting measure break symbols (|),
 * spaces, and line breaks at appropriate positions.
 * 
 * - Inserts `|` at measure boundaries based on time signature
 * - Adds a space after each `|` and after repeat markers like `|x2`
 * - Inserts line breaks every N measures (computed from time signature)
 * - Preserves repeat syntax (|xN, |:, :|, %)
 * 
 * @param notation Raw notation string
 * @param timeSignature Time signature to determine measure length
 * @param options Formatting options (overrides computed measuresPerLine)
 * @returns Formatted notation string
 */
export function formatRhythm(
    notation: string,
    timeSignature: TimeSignature,
    options?: FormatOptions
): string {
    if (!notation) return '';

    const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);

    // Compute measures per line: target ~64-80 chars per line
    // Each measure ≈ sixteenthsPerMeasure + 2 chars (for "| ")
    const computedMeasuresPerLine = Math.max(2, Math.floor(72 / (sixteenthsPerMeasure + 2)));
    const measuresPerLine = options?.measuresPerLine ?? computedMeasuresPerLine;

    const tokens = tokenize(notation);
    if (tokens.length === 0) return notation;

    let output = '';
    let posInMeasure = 0;
    let measuresOnLine = 0;

    /**
     * Called when a measure is complete. Adds appropriate separator.
     * @param includeBarline Whether to prepend a `|` before the separator
     */
    function endMeasure(includeBarline: boolean) {
        measuresOnLine++;
        if (measuresOnLine >= measuresPerLine) {
            measuresOnLine = 0;
            if (includeBarline) {
                output += '|';
            }
            output = output.trimEnd() + '\n';
        } else {
            if (includeBarline) {
                output += '| ';
            } else {
                // Ensure space after structural markers
                if (output.length > 0 && !output.endsWith(' ') && !output.endsWith('\n')) {
                    output += ' ';
                }
            }
        }
    }

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        switch (token.type) {
            case 'notes': {
                for (let c = 0; c < token.value.length; c++) {
                    output += token.value[c];
                    posInMeasure++;

                    if (posInMeasure >= sixteenthsPerMeasure) {
                        posInMeasure = 0;

                        // Check what follows: if a repeat marker or section end comes next,
                        // don't insert a barline since those tokens include their own
                        const hasMoreInToken = c < token.value.length - 1;
                        const nextMeaningful = hasMoreInToken ? null : findNextMeaningful(tokens, i);

                        if (nextMeaningful && (nextMeaningful.type === 'repeat' || nextMeaningful.type === 'sectionEnd')) {
                            // The repeat/sectionEnd marker will handle the barline
                            // Don't add barline, but do track the measure
                        } else {
                            // Check if there's more content after this measure
                            const hasMoreContent = hasMoreInToken || nextMeaningful !== null;
                            if (hasMoreContent) {
                                endMeasure(true);
                            }
                            // If this is the last content, no trailing barline needed
                        }
                    }
                }
                break;
            }

            case 'simile': {
                output += '%';
                posInMeasure = 0; // simile = one full measure

                const nextMeaningful = findNextMeaningful(tokens, i);
                if (nextMeaningful && (nextMeaningful.type === 'repeat' || nextMeaningful.type === 'sectionEnd')) {
                    // Don't insert barline - repeat/sectionEnd will handle it
                } else if (nextMeaningful) {
                    endMeasure(true);
                }
                break;
            }

            case 'repeat': {
                // Repeat markers like |x3 include the barline
                // Trim trailing space before adding the marker
                output = output.trimEnd();
                output += token.value;
                posInMeasure = 0;
                endMeasure(false);
                break;
            }

            case 'sectionStart': {
                // |: opens a repeat section
                // It acts as a barline at a measure boundary
                if (output.length > 0 && !output.endsWith('\n') && !output.endsWith(' ')) {
                    output += ' ';
                }
                output += '|: ';
                posInMeasure = 0;
                break;
            }

            case 'sectionEnd': {
                // :| closes a repeat section (includes the barline)
                output = output.trimEnd();
                output += ':|';
                posInMeasure = 0;
                endMeasure(false);
                break;
            }

            case 'barline': {
                // Skip standalone barlines - we re-insert them at proper measure boundaries
                break;
            }
        }
    }

    return output.trim();
}
