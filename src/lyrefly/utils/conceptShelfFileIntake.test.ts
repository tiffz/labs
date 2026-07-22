import { describe, expect, it } from 'vitest';

import {
  clipboardHasImageFiles,
  collectFilesFromDataTransfer,
  collectImageFilesFromDataTransfer,
  isConceptShelfIntakeDrag,
  isFileDrag,
  resolveConceptShelfPaste,
} from './conceptShelfFileIntake';
import {
  extractConceptShelfImageUrl,
  extractImageUrlFromHtml,
  isLikelyImageUrl,
} from './conceptShelfRemoteImage';

function mockDataTransfer(input: {
  types?: string[];
  files?: File[];
  items?: Array<{ kind: string; type: string; file?: File }>;
  getData?: (type: string) => string;
}): DataTransfer {
  const files = input.files ?? [];
  const items =
    input.items?.map((item) => ({
      kind: item.kind,
      type: item.type,
      getAsFile: () => item.file ?? null,
    })) ?? [];

  return {
    types: input.types ?? [],
    files: {
      length: files.length,
      item: (index: number) => files[index] ?? null,
      [Symbol.iterator]: function* iterateFiles() {
        for (const file of files) yield file;
      },
    },
    items: items as unknown as DataTransferItemList,
    getData: (type: string) => input.getData?.(type) ?? '',
    // Partial DOM DataTransfer fake — only the members the intake helpers read are
    // implemented, so a direct cast cannot structurally overlap the full interface.
  } as unknown as DataTransfer;
}

describe('conceptShelfFileIntake', () => {
  it('detects file drags from image mime types', () => {
    expect(isFileDrag(mockDataTransfer({ types: ['image/png'] }))).toBe(true);
    expect(isFileDrag(mockDataTransfer({ types: ['text/plain'] }))).toBe(false);
  });

  it('detects cross-site image drags from html payloads', () => {
    const dt = mockDataTransfer({
      types: ['text/html', 'text/uri-list'],
      getData: (type) => {
        if (type === 'text/html') return '<img src="https://example.com/art.png">';
        if (type === 'text/uri-list') return 'https://example.com/art.png';
        return '';
      },
    });
    expect(isConceptShelfIntakeDrag(dt)).toBe(true);
    expect(isFileDrag(dt)).toBe(false);
  });

  it('collects clipboard image files from items when files list is empty', () => {
    const file = new File(['pixels'], 'ref.png', { type: 'image/png' });
    const dt = mockDataTransfer({
      items: [{ kind: 'file', type: 'image/png', file }],
    });
    expect(collectFilesFromDataTransfer(dt)).toEqual([file]);
    expect(clipboardHasImageFiles(dt)).toBe(true);
  });

  it('falls back to clipboard items when files list is empty placeholders', () => {
    const file = new File(['pixels'], 'ref.png', { type: 'image/png' });
    const dt = mockDataTransfer({
      files: [new File([], '', { type: '' })],
      items: [{ kind: 'file', type: 'image/png', file }],
    });
    expect(collectFilesFromDataTransfer(dt)).toEqual([file]);
  });

  it('detects clipboard html image paste', () => {
    const dt = mockDataTransfer({
      types: ['text/html'],
      getData: (type) => (type === 'text/html' ? '<img src="https://example.com/ref.jpg">' : ''),
    });
    expect(clipboardHasImageFiles(dt)).toBe(true);
  });

  it('collects safari-style public.png clipboard items', () => {
    const file = new File(['pixels'], 'shot.png', { type: 'image/png' });
    const dt = mockDataTransfer({
      items: [{ kind: 'file', type: 'public.png', file }],
    });
    expect(collectImageFilesFromDataTransfer(dt)).toEqual([file]);
  });
});

describe('resolveConceptShelfPaste', () => {
  it('does not intercept plain text paste in a notes textarea', () => {
    const textarea = document.createElement('textarea');
    const dt = mockDataTransfer({
      types: ['text/plain', 'text/html'],
      getData: (type) => {
        if (type === 'text/plain') return 'mood: rainy alley';
        if (type === 'text/html') return '<p>mood: rainy alley</p>';
        return '';
      },
    });
    expect(resolveConceptShelfPaste(textarea, dt)).toEqual({
      intercept: false,
      files: [],
      imageUrl: null,
    });
  });

  it('does not intercept url text paste in a notes textarea', () => {
    const textarea = document.createElement('textarea');
    const dt = mockDataTransfer({
      types: ['text/plain'],
      getData: (type) => (type === 'text/plain' ? 'https://example.com/ref.png' : ''),
    });
    expect(resolveConceptShelfPaste(textarea, dt).intercept).toBe(false);
  });

  it('intercepts screenshot paste in the brainstorm editor', () => {
    const editor = document.createElement('div');
    editor.className = 'ProseMirror';
    const file = new File(['pixels'], 'shot.png', { type: 'image/png' });
    const dt = mockDataTransfer({
      items: [{ kind: 'file', type: 'image/png', file }],
    });
    expect(resolveConceptShelfPaste(editor, dt)).toEqual({
      intercept: true,
      files: [file],
      imageUrl: null,
    });
  });

  it('intercepts image-only html paste in the brainstorm editor', () => {
    const editor = document.createElement('div');
    editor.className = 'ProseMirror';
    const dt = mockDataTransfer({
      types: ['text/html'],
      getData: (type) =>
        type === 'text/html' ? '<img src="https://example.com/ref.jpg" alt="">' : '',
    });
    expect(resolveConceptShelfPaste(editor, dt)).toEqual({
      intercept: true,
      files: [],
      imageUrl: 'https://example.com/ref.jpg',
    });
  });

  it('does not intercept plain text paste in the brainstorm editor', () => {
    const editor = document.createElement('div');
    editor.className = 'ProseMirror';
    const dt = mockDataTransfer({
      types: ['text/plain'],
      getData: (type) => (type === 'text/plain' ? 'character backstory' : ''),
    });
    expect(resolveConceptShelfPaste(editor, dt).intercept).toBe(false);
  });
});

describe('conceptShelfRemoteImage', () => {
  it('extracts image src from html', () => {
    expect(extractImageUrlFromHtml('<div><img src="https://example.com/a.png" /></div>')).toBe(
      'https://example.com/a.png',
    );
  });

  it('extracts image url from uri-list before plain text', () => {
    const dt = mockDataTransfer({
      getData: (type) => {
        if (type === 'text/html') return '<img src="https://example.com/from-html.png">';
        if (type === 'text/uri-list') return 'https://example.com/from-uri.png';
        return '';
      },
    });
    expect(extractConceptShelfImageUrl(dt)).toBe('https://example.com/from-html.png');
  });

  it('recognizes common image extensions', () => {
    expect(isLikelyImageUrl('https://example.com/photo.webp?v=1')).toBe(true);
    expect(isLikelyImageUrl('https://example.com/page')).toBe(false);
    expect(isLikelyImageUrl('data:image/png;base64,abc')).toBe(true);
  });
});
