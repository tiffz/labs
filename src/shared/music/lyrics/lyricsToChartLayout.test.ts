import { describe, expect, it } from 'vitest';
import { parseLyricSections } from '../lyricSectionParser';
import { chartLayoutFromPlainLyrics } from './lyricsToChartLayout';
import { importPlainLyricsFromClipboard } from './pastedLyricsImport';

const THOUSAND_CASTLES = `I carved a castle from the sand
I fought the tide to shape the land
And tried to offer you my hand
But you just dragged it to the deep

Let it crash, let it pour.
You can wreck every castle on this shore
I'll just build another
And I'll build a thousand more

Who are you beneath the blue? 
Are you the storm that sunk the crew? 
The raging wave that rips us through? 
Or the gentle sea that hugs my feet? 

Let it crash, let it pour.
You can wreck every castle on this shore
I'll just build another
And I'll build a thousand more

I see the wreckage in the flood
I hear the thunder in your wake
But I can't escape this ocean mud
So I'll stand here till I break

Let it crash, let it pour.
You can wreck every castle on this shore
I'll just build another
And I'll build a thousand more`;

describe('chartLayoutFromPlainLyrics', () => {
  it('splits double line breaks and labels repeated blocks as chorus', () => {
    const drafts = parseLyricSections(THOUSAND_CASTLES);
    expect(drafts).toHaveLength(6);
    expect(drafts.filter((d) => d.type === 'chorus')).toHaveLength(3);
    expect(drafts.filter((d) => d.type === 'verse')).toHaveLength(2);
    expect(drafts.find((d) => d.type === 'bridge')).toBeTruthy();

    const layout = chartLayoutFromPlainLyrics(THOUSAND_CASTLES);
    expect(layout.sections).toHaveLength(6);
    expect(layout.sections.map((s) => s.header)).toEqual([
      'Verse 1',
      'Chorus',
      'Verse 2',
      'Chorus',
      'Bridge',
      'Chorus',
    ]);
  });

  it('imports via clipboard helper', () => {
    const result = importPlainLyricsFromClipboard(THOUSAND_CASTLES);
    expect(result.ok).toBe(true);
    expect(result.sectionCount).toBe(6);
    expect(result.notifyUser).toBe(true);
  });
});
