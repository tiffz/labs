import { describe, expect, it } from 'vitest';

import { DEFAULT_SCRIPT_HTML, parseScriptHtml } from './scriptHtmlParser';

describe('parseScriptHtml', () => {
  it('parses nested bullet pages, panels, and narration', () => {
    const blocks = parseScriptHtml(DEFAULT_SCRIPT_HTML);
    expect(blocks.filter((b) => b.type === 'page_section')).toHaveLength(2);
    expect(blocks.filter((b) => b.type === 'panel')).toHaveLength(2);
    expect(blocks.find((b) => b.type === 'narration')).toMatchObject({
      text: "Wide shot. Rain beads on the courier's coat.",
    });
    expect(blocks.find((b) => b.type === 'dialogue')).toMatchObject({
      character: 'COURIER',
      lines: ["This wasn't on the manifest."],
    });
    expect(blocks.find((b) => b.type === 'sfx')).toMatchObject({ text: 'KNOCK KNOCK' });
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

  it('keeps panel description when nested dialogue follows', () => {
    const html = `<ul><li>The meeting<ul><li>The girl is looking at the sky<ul><li>Eliza: Hello</li><li>Fish: Hi</li></ul></li><li>Test</li></ul></li></ul>`;
    const blocks = parseScriptHtml(html);
    expect(blocks.find((b) => b.type === 'panel' && b.panelNumber === 1)).toMatchObject({
      caption: 'The girl is looking at the sky',
    });
    expect(blocks.filter((b) => b.type === 'dialogue')).toHaveLength(2);
    expect(blocks.find((b) => b.type === 'narration' && b.text === 'Test')).toBeTruthy();
  });

  it('parses sfx markers', () => {
    const html = `<ul><li>Page 1<ul><li>Panel<ul><li>*CRASH*</li></ul></li></ul></li></ul>`;
    const blocks = parseScriptHtml(html);
    expect(blocks.find((b) => b.type === 'sfx')).toMatchObject({ text: 'CRASH' });
  });
});
