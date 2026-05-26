import { describe, expect, it } from 'vitest';
import {
  isRichTextEmpty,
  normalizeRichTextLinkHref,
  plainOrHtmlToEditorHtml,
  richTextLinkPreview,
  richTextPlainText,
} from './richTextContent';

describe('richTextContent', () => {
  it('migrates plain text to paragraph html', () => {
    expect(plainOrHtmlToEditorHtml('Hello world')).toBe('<p>Hello world</p>');
    expect(plainOrHtmlToEditorHtml('Line one\nLine two')).toBe('<p>Line one<br>Line two</p>');
  });

  it('passes through existing html', () => {
    expect(plainOrHtmlToEditorHtml('<p><strong>Bold</strong></p>')).toBe('<p><strong>Bold</strong></p>');
  });

  it('extracts plain text from html', () => {
    expect(richTextPlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('detects empty rich text', () => {
    expect(isRichTextEmpty('')).toBe(true);
    expect(isRichTextEmpty('<p></p>')).toBe(true);
    expect(isRichTextEmpty('<p>Hi</p>')).toBe(false);
  });

  it('normalizes link hrefs safely', () => {
    expect(normalizeRichTextLinkHref('example.com')).toBe('https://example.com');
    expect(normalizeRichTextLinkHref('https://a.com/x')).toBe('https://a.com/x');
    expect(normalizeRichTextLinkHref('mailto:hi@x.com')).toBe('mailto:hi@x.com');
    expect(normalizeRichTextLinkHref('javascript:alert(1)')).toBe(null);
    expect(normalizeRichTextLinkHref('')).toBe(null);
  });

  it('builds link hover preview lines', () => {
    expect(richTextLinkPreview('https://www.notion.so/page?q=1')).toEqual({
      href: 'https://www.notion.so/page?q=1',
      title: 'notion.so',
      subtitle: 'notion.so/page?q=1',
    });
    expect(richTextLinkPreview('https://example.com')).toEqual({
      href: 'https://example.com/',
      title: 'example.com',
      subtitle: 'https://example.com/',
    });
  });
});
