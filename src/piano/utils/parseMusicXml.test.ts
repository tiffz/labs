import { describe, it, expect } from 'vitest';
import { parseMusicXml } from './parseMusicXml';

function wrap(measures: string, attrs = '', partListExtra = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <movement-title>Test Score</movement-title>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
    ${partListExtra}
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        ${attrs}
      </attributes>
      ${measures}
    </measure>
  </part>
</score-partwise>`;
}

describe('parseMusicXml', () => {
  it('parses a simple C major scale', () => {
    const notes = ['C', 'D', 'E', 'F'].map(step =>
      `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>`
    ).join('\n');

    const score = parseMusicXml(wrap(notes));
    expect(score.title).toBe('Test Score');
    expect(score.key).toBe('C');
    expect(score.timeSignature).toEqual({ numerator: 4, denominator: 4 });
    expect(score.parts).toHaveLength(2);

    const rh = score.parts[0];
    expect(rh.measures).toHaveLength(1);
    expect(rh.measures[0].notes).toHaveLength(4);
    expect(rh.measures[0].notes[0].pitches).toEqual([60]); // C4
    expect(rh.measures[0].notes[1].pitches).toEqual([62]); // D4
    expect(rh.measures[0].notes[2].pitches).toEqual([64]); // E4
    expect(rh.measures[0].notes[3].pitches).toEqual([65]); // F4
    expect(rh.measures[0].notes[0].duration).toBe('quarter');
  });

  it('parses rests', () => {
    const xml = wrap(`
      <note><rest/><duration>2</duration><type>half</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
    `);
    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes[0].rest).toBe(true);
    expect(notes[0].duration).toBe('half');
    expect(notes[1].rest).toBeUndefined();
    expect(notes[1].pitches).toEqual([60]);
  });

  it('parses dotted notes', () => {
    const xml = wrap(`
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>3</duration><type>half</type><dot/></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    `);
    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes[0].dotted).toBe(true);
    expect(notes[0].duration).toBe('half');
    expect(notes[0].pitches).toEqual([67]); // G4
  });

  it('parses chords (notes with <chord/> tag)', () => {
    const xml = wrap(`
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    `);
    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].pitches).toEqual([60, 64, 67]); // C E G
    expect(notes[0].duration).toBe('whole');
  });

  it('handles sharps and flats via alter', () => {
    const xml = wrap(`
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><rest/><duration>1</duration><type>quarter</type></note>
    `);
    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes[0].pitches).toEqual([66]); // F#4
    expect(notes[1].pitches).toEqual([70]); // Bb4
  });

  it('splits two staves into rh and lh parts', () => {
    const xml = wrap(`
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type><staff>1</staff></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type><staff>2</staff></note>
    `, '<staves>2</staves>');

    const score = parseMusicXml(xml);
    expect(score.parts[0].measures[0].notes).toHaveLength(1);
    expect(score.parts[0].measures[0].notes[0].pitches).toEqual([72]); // C5 in treble
    expect(score.parts[1].measures[0].notes).toHaveLength(1);
    expect(score.parts[1].measures[0].notes[0].pitches).toEqual([48]); // C3 in bass
  });

  it('parses key signature from fifths', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
    <part id="P1"><measure number="1">
      <attributes><divisions>1</divisions><key><fifths>2</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure></part></score-partwise>`;

    const score = parseMusicXml(xml);
    expect(score.key).toBe('D');
  });

  it('parses tempo from direction element', () => {
    const xml = wrap(`
      <direction><sound tempo="96"/></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    `);
    const score = parseMusicXml(xml);
    expect(score.tempo).toBe(96);
  });

  it('handles multiple measures', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
    <part id="P1">
      <measure number="1">
        <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure>
      <measure number="2">
        <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure>
      <measure number="3">
        <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure>
    </part></score-partwise>`;

    const score = parseMusicXml(xml);
    expect(score.parts[0].measures).toHaveLength(3);
    expect(score.parts[1].measures).toHaveLength(3);
  });

  it('auto-splits notes by pitch when no staff info', () => {
    const xml = wrap(`
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><type>half</type></note>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>2</duration><type>half</type></note>
    `);
    const score = parseMusicXml(xml);
    const rh = score.parts[0].measures[0].notes;
    const lh = score.parts[1].measures[0].notes;
    expect(rh.some(n => n.pitches.includes(72))).toBe(true); // C5 in treble
    expect(lh.some(n => n.pitches.includes(36))).toBe(true); // C2 in bass
  });

  it('infers duration from divisions when type is missing', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
    <part id="P1"><measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration></note>
    </measure></part></score-partwise>`;

    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes[0].duration).toBe('quarter'); // 4/4 = 1 beat
    expect(notes[1].duration).toBe('half');     // 8/4 = 2 beats
    expect(notes[2].duration).toBe('eighth');   // 2/4 = 0.5 beats
  });

  it('throws on invalid XML', () => {
    expect(() => parseMusicXml('not xml at all <><>')).toThrow();
  });

  it('parses ties (start and stop)', () => {
    const xml = wrap(`
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>2</duration><type>half</type>
        <tie type="start"/>
        <notations><tied type="start"/></notations>
      </note>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>2</duration><type>half</type>
        <tie type="stop"/>
        <notations><tied type="stop"/></notations>
      </note>
    `);
    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes).toHaveLength(2);
    expect(notes[0].tieStart).toBe(true);
    expect(notes[1].tieStop).toBe(true);
  });

  it('parses tuplets (time-modification)', () => {
    const triplet = (step: string) => `
      <note>
        <pitch><step>${step}</step><octave>4</octave></pitch>
        <duration>1</duration><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
      </note>`;
    const xml = wrap(`${triplet('C')}${triplet('D')}${triplet('E')}
      <note><rest/><duration>1</duration><type>quarter</type></note>
    `);
    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes[0].tuplet).toEqual({ actual: 3, normal: 2 });
    expect(notes[1].tuplet).toEqual({ actual: 3, normal: 2 });
    expect(notes[2].tuplet).toEqual({ actual: 3, normal: 2 });
    expect(notes[3].tuplet).toBeUndefined();
  });

  it('parses grace notes', () => {
    const xml = wrap(`
      <note>
        <grace slash="yes"/>
        <pitch><step>D</step><octave>4</octave></pitch>
        <type>eighth</type>
      </note>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration><type>whole</type>
      </note>
    `);
    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes[0].grace).toBe(true);
    expect(notes[1].grace).toBeUndefined();
  });

  it('handles backup/forward for multi-voice', () => {
    const xml = wrap(`
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type><voice>1</voice><staff>1</staff></note>
      <backup><duration>4</duration></backup>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><voice>2</voice><staff>1</staff></note>
    `, '<staves>2</staves>');
    const score = parseMusicXml(xml);
    const rhNotes = score.parts[0].measures[0].notes;
    expect(rhNotes).toHaveLength(1);
    expect(rhNotes[0].pitches).toContain(72); // C5
    expect(rhNotes[0].pitches).toContain(64); // E4 merged as chord
  });

  it('parses navigation markers (segno, coda, D.S.)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
    <part id="P1">
      <measure number="1">
        <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
        <direction><direction-type><segno/></direction-type></direction>
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure>
      <measure number="2">
        <direction><sound tocoda="coda1"/></direction>
        <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure>
      <measure number="3">
        <direction><sound dalsegno="segno1"/></direction>
        <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure>
      <measure number="4">
        <direction><direction-type><coda/></direction-type></direction>
        <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure>
    </part></score-partwise>`;
    const score = parseMusicXml(xml);
    expect(score.navigation).toBeDefined();
    expect(score.navigation!.segnoMeasure).toBe(0);
    expect(score.navigation!.tocodaMeasure).toBe(1);
    expect(score.navigation!.dalsegnoMeasure).toBe(2);
    expect(score.navigation!.codaMeasure).toBe(3);
  });

  it('selects piano part when multiple parts exist', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise>
      <part-list>
        <score-part id="P1"><part-name>Voice</part-name></score-part>
        <score-part id="P2"><part-name>Piano</part-name></score-part>
      </part-list>
      <part id="P1">
        <measure number="1">
          <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
          <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
        </measure>
      </part>
      <part id="P2">
        <measure number="1">
          <attributes><divisions>1</divisions><staves>2</staves><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
          <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>whole</type><staff>1</staff></note>
          <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type><staff>2</staff></note>
        </measure>
      </part>
    </score-partwise>`;
    const score = parseMusicXml(xml);
    expect(score.parts[0].measures[0].notes[0].pitches).toEqual([76]); // E5 from piano
    expect(score.parts[1].measures[0].notes[0].pitches).toEqual([48]); // C3 from piano bass
  });

  it('parses work-title from work element', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise>
      <work><work-title>Sonata in C</work-title></work>
      <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
      <part id="P1"><measure number="1">
        <attributes><divisions>1</divisions></attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure></part>
    </score-partwise>`;

    const score = parseMusicXml(xml);
    expect(score.title).toBe('Sonata in C');
  });

  it('handles sixteenth notes', () => {
    const notes = ['C', 'D', 'E', 'F'].map(step =>
      `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration><type>16th</type></note>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
    <part id="P1"><measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      ${notes}
    </measure></part></score-partwise>`;

    const score = parseMusicXml(xml);
    expect(score.parts[0].measures[0].notes[0].duration).toBe('sixteenth');
  });

  it('parses vocal part from a separate part', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise>
      <part-list>
        <score-part id="P1"><part-name>Piano</part-name></score-part>
        <score-part id="P2"><part-name>Voice</part-name></score-part>
      </part-list>
      <part id="P1"><measure number="1">
        <attributes><divisions>1</divisions><staves>2</staves></attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><staff>1</staff><voice>1</voice></note>
        <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type><staff>2</staff><voice>2</voice></note>
      </measure></part>
      <part id="P2"><measure number="1">
        <attributes><divisions>1</divisions></attributes>
        <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
      </measure></part>
    </score-partwise>`;

    const score = parseMusicXml(xml);
    expect(score.parts.length).toBe(3);
    const vocalPart = score.parts.find(p => p.hand === 'voice');
    expect(vocalPart).toBeDefined();
    expect(vocalPart!.measures[0].notes.length).toBe(1);
    expect(vocalPart!.measures[0].notes[0].pitches[0]).toBe(76); // E5
  });

  it('parses chord symbols from harmony elements', () => {
    const xml = wrap(
      `<harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
       <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
       <harmony><root><root-step>G</root-step></root><kind>dominant</kind></harmony>
       <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>`
    );

    const score = parseMusicXml(xml);
    const notes = score.parts[0].measures[0].notes;
    expect(notes[0].chordSymbol).toBe('C');
    expect(notes[1].chordSymbol).toBe('G7');
  });

  it('parses chord symbols with bass notes', () => {
    const xml = wrap(
      `<harmony>
         <root><root-step>C</root-step></root>
         <kind>major</kind>
         <bass><bass-step>E</bass-step></bass>
       </harmony>
       <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>`
    );

    const score = parseMusicXml(xml);
    expect(score.parts[0].measures[0].notes[0].chordSymbol).toBe('C/E');
  });

  it('parses chord symbols with alterations', () => {
    const xml = wrap(
      `<harmony>
         <root><root-step>B</root-step><root-alter>-1</root-alter></root>
         <kind>minor</kind>
       </harmony>
       <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>`
    );

    const score = parseMusicXml(xml);
    expect(score.parts[0].measures[0].notes[0].chordSymbol).toBe('Bbm');
  });

  it('parses lyrics from vocal part notes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise>
      <part-list>
        <score-part id="P1"><part-name>Piano</part-name></score-part>
        <score-part id="P2"><part-name>Vocal</part-name></score-part>
      </part-list>
      <part id="P1"><measure number="1">
        <attributes><divisions>1</divisions><staves>2</staves></attributes>
        <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><staff>1</staff><voice>1</voice></note>
        <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type><staff>2</staff><voice>2</voice></note>
      </measure></part>
      <part id="P2"><measure number="1">
        <attributes><divisions>1</divisions></attributes>
        <note>
          <pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><type>half</type>
          <lyric><syllabic>single</syllabic><text>Hel</text></lyric>
        </note>
        <note>
          <pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><type>half</type>
          <lyric><syllabic>begin</syllabic><text>lo</text></lyric>
        </note>
      </measure></part>
    </score-partwise>`;

    const score = parseMusicXml(xml);
    const vocalPart = score.parts.find(p => p.hand === 'voice');
    expect(vocalPart).toBeDefined();
    expect(vocalPart!.measures[0].notes[0].lyric).toBe('Hel');
    expect(vocalPart!.measures[0].notes[1].lyric).toBe('lo-');
  });

  it('does not create vocal part when no vocal part exists', () => {
    const xml = wrap(
      `<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>`
    );
    const score = parseMusicXml(xml);
    expect(score.parts.length).toBe(2);
    expect(score.parts.every(p => p.hand !== 'voice')).toBe(true);
  });
});
