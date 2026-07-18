import { describe, expect, it } from 'vitest';

import {
  createDefaultCast,
  normalizeDialogueBlocks,
  resolvePanelArrangement,
  resolvePanelSpeakerIds,
  slotForSpeakerIndex,
} from './comicCast';

describe('comicCast', () => {
  it('seeds three default cast members', () => {
    const cast = createDefaultCast();
    expect(cast).toHaveLength(3);
    expect(cast.every((row) => row.emoji.length > 0)).toBe(true);
  });

  it('derives speakers from dialogue slots when speakerIds missing', () => {
    const cast = createDefaultCast();
    const speakers = resolvePanelSpeakerIds(
      {
        panelIndex: 0,
        blocks: [
          { kind: 'dialogue', characterId: 'a', content: 'Hi' },
          { kind: 'dialogue', characterId: 'b', content: 'Yo' },
        ],
      },
      cast,
    );
    expect(speakers).toEqual([cast[0]!.id, cast[1]!.id]);
  });

  it('normalizes dialogue castMemberId and slots from speakerIds', () => {
    const cast = createDefaultCast();
    const speakerIds = [cast[1]!.id, cast[0]!.id];
    const blocks = normalizeDialogueBlocks(
      [{ kind: 'dialogue', characterId: 'a', content: 'Hello', castMemberId: cast[1]!.id }],
      speakerIds,
      cast,
    );
    expect(blocks[0]).toMatchObject({
      kind: 'dialogue',
      castMemberId: cast[1]!.id,
      characterId: 'a',
    });
  });

  it('defaults arrangement from speaker count', () => {
    expect(resolvePanelArrangement(undefined, 2)).toBe('facing');
    expect(slotForSpeakerIndex(2)).toBe('c');
  });
});
