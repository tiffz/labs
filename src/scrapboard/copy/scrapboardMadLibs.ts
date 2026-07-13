import type { PanelCharacterId, PanelTextBlock } from '../../shared/comic';

const ADJECTIVES = [
  'suspicious',
  'tiny',
  'overflowing',
  'haunted',
  'sparkly',
  'unlicensed',
  'forbidden',
  'sleepy',
  'dramatic',
  'feral',
];

const NOUNS = [
  'goose',
  'submarine',
  'ladder',
  'sandwich',
  'metronome',
  'umbrella',
  'treasure map',
  'houseplant',
  'accordion',
  'traffic cone',
];

const PLACES = [
  'the supply closet',
  'panel three',
  'the parking lot',
  'a hedge maze',
  'the green room',
  'low tide',
  'the wrong timeline',
  'backstage',
];

const CAPTION_TEMPLATES = [
  'Meanwhile, near {place}…',
  'Some time later.',
  'Cut to: {adjective} {noun}.',
  'Exactly {adjective} o’clock.',
  'Across {place}.',
];

const DIALOGUE_TEMPLATES = [
  'Okay but why is there a {adjective} {noun} in {place}?',
  'I told you not to bring the {noun}.',
  'Does anyone else smell {adjective} {noun}?',
  'Quick, hide the {noun} behind the {place}.',
  'This is not how {place} works.',
  'We are absolutely not discussing the {noun} again.',
];

const EXCHANGE_PRESETS: Array<Array<{ speaker: PanelCharacterId; template: string }>> = [
  [
    { speaker: 'a', template: 'Is that a {adjective} {noun}?' },
    { speaker: 'b', template: 'Worse. It is mine.' },
  ],
  [
    { speaker: 'b', template: 'We should leave {place}.' },
    { speaker: 'a', template: 'After I grab the {noun}.' },
    { speaker: 'c', template: 'Both of you, no.' },
  ],
  [
    { speaker: 'c', template: 'Who invited the {noun}?' },
    { speaker: 'a', template: 'It followed us from {place}.' },
  ],
];

function seeded(seed: number): () => number {
  let state = Math.abs(seed) >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function fillTemplate(template: string, rng: () => number): string {
  return template
    .replaceAll('{adjective}', pick(rng, ADJECTIVES))
    .replaceAll('{noun}', pick(rng, NOUNS))
    .replaceAll('{place}', pick(rng, PLACES));
}

export function generateMadLibsBlocks(seed: number, panelIndex: number): PanelTextBlock[] {
  const rng = seeded(seed + panelIndex * 131);
  const roll = rng();
  if (roll < 0.12) return [];

  const blocks: PanelTextBlock[] = [];
  if (roll < 0.35) {
    blocks.push({
      kind: 'caption',
      content: fillTemplate(pick(rng, CAPTION_TEMPLATES), rng),
    });
  }

  if (roll < 0.55) {
    const exchange = pick(rng, EXCHANGE_PRESETS);
    for (const line of exchange) {
      blocks.push({
        kind: 'dialogue',
        characterId: line.speaker,
        content: fillTemplate(line.template, rng),
      });
    }
    return blocks;
  }

  blocks.push({
    kind: 'dialogue',
    characterId: pick(rng, ['a', 'b', 'c'] as PanelCharacterId[]),
    content: fillTemplate(pick(rng, DIALOGUE_TEMPLATES), rng),
  });

  if (roll > 0.82) {
    blocks.push({
      kind: 'dialogue',
      characterId: pick(rng, ['a', 'b', 'c'] as PanelCharacterId[]),
      content: fillTemplate(pick(rng, DIALOGUE_TEMPLATES), rng),
    });
  }

  return blocks;
}

export function madLibsTemplateKey(block: PanelTextBlock): string {
  if (block.kind === 'caption') return `caption:${block.content}`;
  if (block.kind === 'dialogue') return `dialogue:${block.content}`;
  return `sfx:${block.content}`;
}
