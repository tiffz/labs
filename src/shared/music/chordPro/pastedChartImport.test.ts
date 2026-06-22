import { describe, expect, it } from 'vitest';
import {
  extractChartPortionForImport,
  importPastedChartFromClipboard,
  isChordOnlyLine,
  looksLikePastedChart,
  parsePastedChartToChartLayout,
} from './pastedChartImport';
import { serializeChartLayoutToChordPro } from './chordChartLayout';
import { MEET_ME_AROUND_LYRIC, MEET_ME_MOON_PASTE } from './fixtures';
import { GEORGIA_COAST_PASTE } from './georgiaCoastPaste.fixture';

const MEET_ME_MOON = MEET_ME_MOON_PASTE;

const ROYAL_FLUSH = `Verse 1
Cm
You crawled from the black, out of the night
Ab
Faced all you lack, in a shivering fight
Fm                                  G7
Held your tears through the menace of the years

Chorus
Eb               Bb
A royal flush, and you're set!

Bridge
Ab
You crossed the gate,
Bb/Ab
But lost your grip on fate

Chorus 3
Cm
You earned your get
Ab
Cause you never made a bet
Fm
Ab       G7             Cm(add2)
You just won someone else's game`;

describe('pastedChartImport', () => {
  it('detects chord-over-lyrics paste', () => {
    expect(looksLikePastedChart(MEET_ME_MOON)).toBe(true);
    expect(looksLikePastedChart('Hello world\nplain text')).toBe(false);
  });

  it('recognizes chord-only lines', () => {
    expect(isChordOnlyLine('Fm                    Bb')).toBe(true);
    expect(isChordOnlyLine('Ab     Bb')).toBe(true);
    expect(isChordOnlyLine('Bb/Ab')).toBe(true);
    expect(isChordOnlyLine('F                                   Csus')).toBe(true);
    expect(isChordOnlyLine('Am                      Gsus7              C/E')).toBe(true);
    expect(isChordOnlyLine("I'm not like you")).toBe(false);
  });

  it('parses section headers and chord positions', () => {
    const layout = parsePastedChartToChartLayout(MEET_ME_MOON);
    expect(layout.sections.map((s) => s.header)).toEqual([
      'Verse 1',
      'Chorus 1',
      'Bridge',
      'Instrumental',
      'Outro',
    ]);

    const instrumental = layout.sections.find((s) => s.header === 'Instrumental')!;
    expect(instrumental.lines[0]?.chords.map((c) => c.chordName)).toEqual(['Ab', 'Bb']);
    expect(instrumental.lines[0]?.chords[1]?.charIndex).toBeGreaterThan(0);

    const verse = layout.sections[0]!;
    expect(verse.lines[0]?.text).toBe("I'm not like you, and you're not like me");
    expect(verse.lines[0]?.chords.map((c) => [c.chordName, c.charIndex])).toEqual([
      ['Fm', 0],
      ['Bb', 22],
    ]);
    expect(verse.lines[1]?.chords[0]?.chordName).toBe('Eb');
  });

  it('handles slash chords and parenthetical extensions', () => {
    const layout = parsePastedChartToChartLayout(ROYAL_FLUSH);
    expect(layout.sections.some((s) => s.header === 'Chorus')).toBe(true);

    const bridge = layout.sections.find((s) => s.header === 'Bridge')!;
    const slashLine = bridge.lines.find((l) => l.text.includes('But lost your grip'));
    expect(slashLine?.chords[0]?.chordName).toBe('Bb/Ab');

    const lastSection = layout.sections.find((s) => s.header === 'Chorus 3')!;
    const extended = lastSection.lines.find((l) => l.text.includes("someone else's game"));
    expect(extended?.chords.some((c) => c.chordName === 'Cm(add2)')).toBe(true);
  });

  it('round-trips through ChordPro serialization', () => {
    const layout = parsePastedChartToChartLayout(`Verse 1
Fm
Hello world`);
    const chordPro = serializeChartLayoutToChordPro(layout);
    expect(chordPro).toContain('[Verse 1]');
    expect(chordPro).toContain('[Fm]Hello world');
  });

  it('imports inline ChordPro paste', () => {
    const layout = parsePastedChartToChartLayout(`[Verse 1]
[Fm]I'm not like [Bb]you`);
    expect(layout.sections[0]?.lines[0]?.chords).toHaveLength(2);
  });

  it('parses full Meet Me on the Moon chart including Instrumental chords', () => {
    const full = `${MEET_ME_MOON.split('Outro')[0]!.trim()}
Chorus 2
Ab
So please meet me on the moon
Bb
It's cold up here, so please come soon

Bridge
Cm
You know the moon can be a lonely place
Bb
And smiles wide but hides its dark side 

Ab     Bb
[Instrumental]

Outro
Ab
So thanks for stopping by the moon`;

    const layout = parsePastedChartToChartLayout(full);
    const instrumental = layout.sections.find((s) => s.header === 'Instrumental')!;
    expect(instrumental.lines[0]?.chords.map((c) => c.chordName)).toEqual(['Ab', 'Bb']);
    expect(serializeChartLayoutToChordPro({ sections: [instrumental] })).toBe('[Instrumental]\n[Ab][Bb]');
  });

  it('excerpts trailing chart from long mixed paste', () => {
    const prose = Array.from({ length: 90 }, (_, i) => `Brainstorm line ${i} with some words.`).join('\n');
    const mixed = `${prose}\n\n${MEET_ME_MOON}`;
    const { text, excerpted } = extractChartPortionForImport(mixed);
    expect(excerpted).toBe(true);
    expect(text).toContain('Verse 1');
    expect(text).not.toContain('Brainstorm line 0');
    const imported = importPastedChartFromClipboard(mixed);
    expect(imported.ok).toBe(true);
    expect(imported.excerpted).toBe(true);
    expect(imported.notifyUser).toBe(true);
    expect(imported.sectionCount).toBeGreaterThan(2);
  });

  it('snaps trailing outro chords onto the last word', () => {
    const layout = parsePastedChartToChartLayout(`Outro
Fm                                Bb       Eb
You'll have to show me around`);
    const line = layout.sections[0]?.lines[0];
    expect(line?.text).toBe(MEET_ME_AROUND_LYRIC);
    const around = line!.text.indexOf('around');
    expect(line?.chords.map((c) => [c.chordName, c.charIndex])).toEqual([
      ['Fm', 0],
      ['Bb', around],
      ['Eb', around],
    ]);
  });

  it('overlays chord-only lines across blank lines before lyrics', () => {
    const layout = parsePastedChartToChartLayout(`Bridge
Ab

But I love how the moon calls the wolves and pulls the tide`);
    const bridge = layout.sections[0];
    expect(bridge?.lines).toHaveLength(1);
    expect(bridge?.lines[0]?.text).toContain('But I love');
    expect(bridge?.lines[0]?.chords[0]?.chordName).toBe('Ab');
    expect(bridge?.lines[0]?.chords[0]?.charIndex).toBe(0);
  });

  it('does not treat [Chorus] / [Bridge] headers as inline ChordPro', () => {
    const chart = `[Verse]
Am                         F
  The lawns aren't    quite so pretty
C                            G
  Just an hour north   of the city

[Chorus]
F                          C
And we were just surviving
G              Am
    As you kept on driving

[Bridge]
Dm                                 Am
Can you love a home that's haunted?`;

    expect(looksLikePastedChart(chart)).toBe(true);
    const layout = parsePastedChartToChartLayout(chart);
    expect(layout.sections.map((s) => s.header)).toEqual(['Verse', 'Chorus', 'Bridge']);
    const verseFirst = layout.sections[0]?.lines[0];
    expect(verseFirst?.text).toContain('lawns');
    expect(verseFirst?.chords.map((c) => c.chordName)).toEqual(['Am', 'F']);
    const fOnQuite = verseFirst?.chords.find((c) => c.chordName === 'F');
    expect(fOnQuite?.charIndex).toBe(verseFirst!.text.indexOf('quite'));
    const imported = importPastedChartFromClipboard(chart);
    expect(imported.ok).toBe(true);
    expect(imported.notifyUser).toBe(true);
    expect(imported.sectionCount).toBe(3);
  });

  it('parses V-C-V-C-B-C chart with slash chords and minor variants (kindness-style paste)', () => {
    const chart = `[Verse]
G                         C
You ever know a child
           D                          G
With a loveless mom and dad?
  Em                A7
It may seem a little wild
       C                        D
But such a life might not be so bad

[Chorus]
G                                                   A7
Cause you showed me kindness isn't rare
C                                Cm
Treated us stray kids like your own

[Bridge]
G                            C/G
Oh, there's money and there's fame
       D/G                                C/G
But family's the kind of thing you can't just buy

[Chorus]
G                                                   A7
And even when you were no longer here
C               Cm                              G
Your voice stayed when we were grown`;

    expect(looksLikePastedChart(chart)).toBe(true);
    const layout = parsePastedChartToChartLayout(chart);
    expect(layout.sections.map((s) => s.header)).toEqual(['Verse', 'Chorus', 'Bridge', 'Chorus']);

    const verse = layout.sections[0]!;
    expect(verse.lines[0]?.text).toContain('You ever know a child');
    expect(verse.lines[0]?.chords.map((c) => c.chordName)).toEqual(['G', 'C']);
    const momLine = verse.lines.find((l) => l.text.includes('loveless mom'));
    expect(momLine?.chords.some((c) => c.chordName === 'D')).toBe(true);

    const bridge = layout.sections.find((s) => s.header === 'Bridge')!;
    expect(bridge.lines[0]?.chords.some((c) => c.chordName === 'C/G')).toBe(true);
    expect(bridge.lines[1]?.chords.some((c) => c.chordName === 'D/G')).toBe(true);

    const chorus = layout.sections[1]!;
    expect(chorus.lines[1]?.chords.some((c) => c.chordName === 'Cm')).toBe(true);

    const imported = importPastedChartFromClipboard(chart);
    expect(imported.ok).toBe(true);
    expect(imported.sectionCount).toBe(4);
    expect(imported.lineCount).toBeGreaterThan(8);
  });

  it('parses annotated section headers (Starts on G3) without treating markers as chords', () => {
    expect(looksLikePastedChart(GEORGIA_COAST_PASTE)).toBe(true);
    const layout = parsePastedChartToChartLayout(GEORGIA_COAST_PASTE);
    expect(layout.sections.map((s) => s.header)).toEqual([
      'Verse 1',
      'Instrumental',
      'Chorus 1',
      'Verse 2',
      'Chorus 2',
      'Bridge',
      'Chorus 3',
      'Instrumental',
      'Outro',
    ]);

    const verse1 = layout.sections[0]!;
    expect(verse1.lines.some((l) => l.text.includes('[Verse 1]'))).toBe(false);
    expect(verse1.lines.some((l) => l.chords.some((c) => c.chordName === 'Verse 1'))).toBe(false);
    expect(verse1.lines[0]?.text).toContain('90 degrees');
    expect(verse1.lines[0]?.chords.map((c) => c.chordName)).toEqual(['C', 'G']);
    expect(verse1.lines[1]?.text).toContain('Brings me back');
    expect(verse1.lines[1]?.chords.map((c) => c.chordName)).toEqual(['F', 'Csus']);
    expect(verse1.lines[2]?.chords.map((c) => c.chordName)).toEqual(['C', 'G']);
    expect(verse1.lines[3]?.chords.map((c) => c.chordName)).toEqual(['F', 'Csus', 'C']);

    const verse2 = layout.sections.find((s) => s.header === 'Verse 2')!;
    const thunderLine = verse2.lines.find((l) => l.text.includes('thunder cracked'));
    expect(thunderLine?.chords.map((c) => c.chordName)).toEqual(['Am', 'Gsus7', 'C/E']);

    const outro = layout.sections.find((s) => s.header === 'Outro')!;
    expect(outro.lines[0]?.text).toContain('90 degrees');
    expect(outro.lines[0]?.chords.map((c) => c.chordName)).toEqual(['Csus', 'Gsus']);
    expect(outro.lines[1]?.text).toContain('hills and Bay');
    expect(outro.lines[1]?.chords.map((c) => c.chordName)).toEqual(['Fsus', 'Csus']);
    expect(outro.lines[2]?.chords.map((c) => c.chordName).sort()).toEqual(['Am', 'C', 'F', 'G']);

    const imported = importPastedChartFromClipboard(GEORGIA_COAST_PASTE);
    expect(imported.ok).toBe(true);
    expect(imported.sectionCount).toBe(9);
  });
});
