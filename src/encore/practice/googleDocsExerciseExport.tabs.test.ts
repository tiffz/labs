import { describe, expect, it } from 'vitest';
import { allDocumentTabIdsForClearing } from './googleDocsExerciseExport';

describe('allDocumentTabIdsForClearing', () => {
  it('collects root tabs and nested childTabs that have a documentTab.body', () => {
    const doc = {
      tabs: [
        {
          tabProperties: { tabId: 'root-1' },
          documentTab: { body: { content: [{ startIndex: 1, endIndex: 2, paragraph: {} }] } },
          childTabs: [
            {
              tabProperties: { tabId: 'child-a' },
              documentTab: { body: { content: [{ startIndex: 1, endIndex: 2, paragraph: {} }] } },
            },
          ],
        },
        {
          tabProperties: { tabId: 'root-2' },
          documentTab: { body: { content: [] } },
        },
      ],
    };
    expect(allDocumentTabIdsForClearing(doc).sort()).toEqual(['child-a', 'root-1', 'root-2'].sort());
  });

  it('returns empty when tabs are missing', () => {
    expect(allDocumentTabIdsForClearing({})).toEqual([]);
  });
});
