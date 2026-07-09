import { describe, expect, it } from 'vitest';

import { DEFAULT_SCRIPT_HTML, parseScriptHtml } from './scriptHtmlParser';

describe('parseScriptHtml', () => {
  it('parses nested bullet pages, panels, and narration', () => {
    const blocks = parseScriptHtml(DEFAULT_SCRIPT_HTML);
    expect(blocks.filter((b) => b.type === 'page_section')).toHaveLength(2);
    expect(blocks.filter((b) => b.type === 'panel')).toHaveLength(2);
    expect(blocks.find((b) => b.type === 'narration')).toMatchObject({
      text: 'Courier receives a sealed package.',
    });
  });

  it('parses CHARACTER: dialogue at panel depth', () => {
    const html = `<ul><li>Page 1<ul><li>Beat<ul><li>HERO: Hello there.</li><li>Rooftop wide shot.</li></ul></li></ul></li></ul>`;
    const blocks = parseScriptHtml(html);
    expect(blocks.find((b) => b.type === 'dialogue')).toMatchObject({
      character: 'HERO',
      lines: ['Hello there.'],
    });
    expect(blocks.find((b) => b.type === 'narration')).toMatchObject({
      text: 'Rooftop wide shot.',
    });
  });

  it('parses sfx markers', () => {
    const html = `<ul><li>Page 1<ul><li>Panel<ul><li>*CRASH*</li></ul></li></ul></li></ul>`;
    const blocks = parseScriptHtml(html);
    expect(blocks.find((b) => b.type === 'sfx')).toMatchObject({ text: 'CRASH' });
  });
});
