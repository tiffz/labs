import type { TimeSignature } from '../../shared/rhythm/types';

// ... existing imports ...

export function detectTimeSignature(input: string): TimeSignature | null {
    // Regex matches "Digits.DigitsJ" e.g. "2.4J" -> 2/4, "3.8J" -> 3/8
    // Group 1: Numerator, Group 2: Denominator
    const match = /\b(\d+)\.(\d+)J/.exec(input);
    if (match && match[1] && match[2]) {
        const numerator = parseInt(match[1], 10);
        const denominator = parseInt(match[2], 10);
        if (!isNaN(numerator) && numerator > 0 && !isNaN(denominator) && denominator > 0) {
            return { numerator, denominator };
        }
    }
    return null;
}

// Scale Up Strategy:
// App 16th grid (1 tick) represents a 32nd note in Universal Tom.
// 32nd (Z) -> 1 app tick
// 16th (Y) -> 2 app ticks
// 8th (X) -> 4 app ticks
// Quarter (4) -> 8 app ticks
// Half (2) -> 16 app ticks

// Sound Mapping:
// A -> Dum (D)
// B -> Tak (T)
// C -> Ka (K)
// S -> Slap (S)
// H -> Halgh (Map to S as fallback)
// R -> Rest (_)

// Mapping dictionaries from spreadsheet
const COMPOUND_MAP: Record<string, string> = {
    // Complex Compounds first (Longest Match)
    'ajda;dalda;': 'AZCZBZCZ',
    'alda;dalda;': 'BZCZBZCZ',
    'aHda;dalda;': 'SZCZBZCZ',
    'ahda;dalda;': 'HZCZBZCZ',
    'ajda;da;da;': 'AZCZCZCZ',
    'alda;da;da;': 'BZCZCZCZ',

    // Compounds
    'ajssa;': 'AYCY',
    'alssa;': 'BYCY',
    'aHssa;': 'SYCY',
    'ahssa;': 'HYCY',
    'a;ssa;': 'CYCY',

    'ajsalda;': 'AYBZCZ',
    'alsalda;': 'BYBZCZ',
    'aHsalda;': 'SYBZCZ',
    'ahsalda;': 'HYBZCZ',
    'a;salda;': 'CYBZCZ',

    'ajsa;da;': 'AYCZCZ',
    'alsa;da;': 'BYCZCZ',
    'aHsa;da;': 'SYCZCZ',
    'ahsa;da;': 'HYCZCZ',

    'ajda;sal': 'AZCZBY',
    'alda;sal': 'BZCZBY',
    'aHda;sal': 'SZCZBY',
    'ahda;sal': 'HZCZBY',

    'aj.ssga;': 'ANCZ',
    'al.ssga;': 'BNCZ',
    'aH.ssga;': 'SNCZ',
    'ah.ssga;': 'HNCZ',

    'ajsfa;.': 'AZCN',
    'alsfa;.': 'BZCN',
    'aHsfa.;': 'SZCN',
    'ahsfa.;': 'HZCN',

    'ajsfa;sga;': 'AZCYCZ',
    'alsfa;sga;': 'BZCYCZ',
    'aHsfa;sga;': 'SZCYCZ',
    'ahsfa;sga;': 'HZCYCZ',

    'ajda;': 'AZCZ',
    'alda;': 'BZCZ',
    'aHda;': 'SZCZ',
    'ahda;': 'HZCZ',

    'ajssaH': 'AYSY',
    'alssaH': 'BYSY',
    'a;ssaH': 'CYSY',
    'ahssaH': 'HYSY',

    'aHssaj': 'SYAY',
    'aHssal': 'SYBY',
    'aHssah': 'SYHY',
    'aHssaH': 'SYSY',

    'aHsajda;': 'SYAZCZ',

    'ajssah': 'AYHY',
    'alssah': 'BYHY',
    'a;ssah': 'CYHY',
    'ahssaj': 'HYAY',
    'ahssal': 'HYBY',
    'ahsajda;': 'HYAZCZ',
    'ahssah': 'HYHY',

    'yaz': 'BTFTETFTETFTETFT',
    'taz': 'ATFTETFTETFTETFT',

    'ajssaz': 'AYETFTETFT',
    'alssaz': 'BYETFTETFT',
    'aHssaz': 'SYETFTETFT',
    'ahssaz': 'HYETFTETFT',

    'az.ssgaj': 'ETFTETFTETFTAZ',
    'az.ssgal': 'ETFTETFTETFTBZ',
    'az.ssgaH': 'ETFTETFTETFTSZ',

    'azssaj': 'ETFTETFTAY',
    'azssal': 'ETFTETFTBY',
    'azssaH': 'ETFTETFTSY',

    'ajsfazsgaj': 'AZETFTETFTAZ',
    'ajsfazsgal': 'AZETFTETFTBZ',
    'ajsfaz.': 'AZETFTETFTETFT',
    'alsfaz.': 'BZETFTETFTETFT',

    // Basic Tokens
    'qj': 'A4',
    'ql': 'B4',
    'q;': 'C4',
    'qH': 'S4',
    'qh': 'H4',

    'wj': 'A2',
    'wl': 'B2',
    'w;': 'C2',
    'wH': 'S2',
    'wh': 'H2',

    'aj': 'AX',
    'al': 'BX',
    'a;': 'CX',
    'AH': 'SX',
    'ah': 'HX',

    'ej': 'AY',
    'el': 'BY',
    'e;': 'CY',
    'eH': 'SY',
    'eh': 'HY',

    'rj': 'AZ',
    'rl': 'BZ',
    'r;': 'CZ',
    'rH': 'SZ',
    'rh': 'HZ',

    // Special
    '4J': 'A4',
    'ajssaj': 'AYAY',
    'alssal': 'BYBY',
    'ajssal': 'AYBY',
};

const SOUND_MAP: Record<string, string> = {
    'A': 'D',
    'B': 'T',
    'C': 'K',
    'S': 'S',
    'H': 'S', // Fallback Halgh to Slap
    'R': '_', // Rest
    'E': 'D', // In compounds like BTFTET... E likely Dum?
    'F': 'T', // In compounds like BTFT... F likely Tak?
    'N': '_', // Likely Rest/Null
};

// Map duration codes to app ticks (Standard 16th Grid)
// 1 tick = 16th note
// 2 ticks = 8th note
// 4 ticks = Quarter note
const DURATION_MAP: Record<string, number> = {
    'T': 0.5, // 32nd -> 0.5 ticks (Approx)
    'F': 0.5,
    'E': 0.5,
    'Z': 1, // 16th -> 1 tick
    'Y': 2, // 8th -> 2 ticks
    'N': 3, // Dotted Eighth -> 3 ticks (Fixed from 6)
    'X': 4, // Quarter -> 4 ticks
    '4': 16, // Whole -> 16 ticks
    '2': 8, // Half -> 8 ticks
};

function decodeValue(code: string): string {
    // Code format: [Sound][Duration] e.g. "A4" or "AX"
    if (code.length < 2) return '';

    const soundCode = code[0];
    const durationCode = code[1];

    const sound = SOUND_MAP[soundCode] || '_'; // Default to rest if unknown

    let ticks = DURATION_MAP[durationCode];

    if (!ticks) {
        // Fallback for special chars
        if (durationCode === 'N') ticks = 4; // Fallback
        else ticks = 1; // Default to 32nd
    }

    // Build notation string: Sound + dashes/spaces
    // D + 3 dashes = D--- (4 ticks)
    // _ + 3 underscores = ____ (4 ticks)

    if (sound === '_') {
        return '_'.repeat(ticks);
    } else {
        return sound + '-'.repeat(ticks - 1);
    }
}

export function parseUniversalTom(input: string): string {
    let result = '';
    // Remove spaces, newlines, tabs from input?
    // User input has spaces: "1.4J  alda;dalda; ..."
    // We should preserve structure if possible or valid tokens.
    // The font tokens rely on adjacency.

    let remaining = input.trim();

    // Clean input: Remove measure/line metadata like "1.4J", "2.4J"
    // Regex: Start of line, digits, dot, space?, digits, J
    remaining = remaining.replace(/^\d+\.\s*\d*J\s*/gm, '');
    // Remove bar lines and other structural chars for now?
    // Keep structure if we can map it.
    // The user input has `[` and `:{` which look like repeats or section markers.
    // `[` might be start repeat? `:{` end repeat?
    // Let's first just focus on note tokens.

    while (remaining.length > 0) {
        // Skip whitespace
        if (/^\s/.test(remaining[0])) {
            // result += ' '; // Preserve spacing?
            // Actually standard parser handles spacing.
            remaining = remaining.slice(1);
            continue;
        }

        // Check for structural chars
        if (remaining.startsWith('|')) {
            result += '| ';
            remaining = remaining.slice(1);
            continue;
        }
        if (remaining.startsWith('[')) {
            // result += '| '; // User requested to ignore structure
            remaining = remaining.slice(1);
            continue;
        }
        if (remaining.startsWith(':{')) {
            // result += ' :| '; // User requested to ignore structure
            remaining = remaining.slice(2);
            continue;
        }
        // `aj` `al` etc.

        // Find longest match from COMPOUND_MAP
        let match = '';
        let code = '';

        // Sort keys by length descending to ensure longest match
        // Optimization: In a real app we'd pre-sort keys. 
        // For now, iterate.
        const keys = Object.keys(COMPOUND_MAP).sort((a, b) => b.length - a.length);

        for (const key of keys) {
            if (remaining.startsWith(key)) {
                match = key;
                code = COMPOUND_MAP[key];
                break;
            }
        }

        if (match) {
            // Decode the mapped code based on pairs (Sound+Duration)
            // code is like "AZCZBZCZ" -> pairs AZ, CZ, BZ, CZ
            for (let i = 0; i < code.length; i += 2) {
                const pair = code.slice(i, i + 2);
                const decoded = decodeValue(pair);
                result += decoded + ' ';
            }
            remaining = remaining.slice(match.length);
        } else {
            // No match found - skip character
            // Or checking if it is a simple token not in map? 
            // Most simple tokens like `aj` are in map.
            // If we hit unknown char, maybe just skip it to prevent infinite loop
            // console.warn('Unknown token at:', remaining.slice(0, 10));
            remaining = remaining.slice(1);
        }
    }

    return result.trim();
}
