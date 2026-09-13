/**
 * Common Patterns
 * 
 * Frequently used rhythm patterns that appear in the note palette for quick insertion.
 *
 * Order is meaningful: patterns sharing a rhythm structure sit together, so the palette reads as
 * "same rhythm, different voicing" rather than an arbitrary list. Within a group, dum-led patterns
 * come first. Adding a pattern means placing it in its structural group, not appending.
 *
 *   DKTK TKTK            four sixteenths
 *   D-K- D-D- D-S- T-K-  two eighths
 *   D-TK T-TK            eighth + two sixteenths
 *   TKT- DKD-            two sixteenths + eighth
 */
export const COMMON_PATTERNS: string[] = [
  'DKTK',
  'TKTK',
  'D-K-',
  'D-D-',
  'D-S-',
  'T-K-',
  'D-TK',
  'T-TK',
  'TKT-',
  'DKD-',
  'DK-T',
  'D--K',
  'DK--',
  '__D-',
  '__K-',
  '__T-',
];
