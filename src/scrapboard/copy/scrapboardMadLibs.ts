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
  'damp',
  'glowing',
  'slightly cursed',
  'budget',
  'overconfident',
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
  'spare key',
  'lunchbox',
  'fog machine',
  'library card',
  'rubber chicken',
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
  'the freight elevator',
  'row G',
  'the loading dock',
  'nowhere useful',
];

const CAPTION_TEMPLATES = [
  'Meanwhile, near {place}…',
  'Some time later.',
  'Cut to: {adjective} {noun}.',
  'Exactly {adjective} o’clock.',
  'Across {place}.',
  'Elsewhere.',
  'Not long after.',
  'In {place}, somehow.',
  'Behold: the {noun}.',
  'Seconds later.',
];

const DIALOGUE_TEMPLATES = [
  'Okay but why is there a {adjective} {noun} in {place}?',
  'I told you not to bring the {noun}.',
  'Does anyone else smell {adjective} {noun}?',
  'Quick, hide the {noun} behind the {place}.',
  'This is not how {place} works.',
  'We are absolutely not discussing the {noun} again.',
  'I can explain the {noun}.',
  'Please stop poking the {adjective} one.',
  'That {noun} was not on the call sheet.',
  'Who left {place} unlocked?',
  'Pass me the {noun} — carefully.',
  'If this is a prank, it is too {adjective}.',
  'I refuse to name the {noun}.',
  'Check {place} one more time.',
  'My plan did not include a {noun}.',
  'Keep the {noun} between us.',
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
  [
    { speaker: 'a', template: 'Do not look at the {noun}.' },
    { speaker: 'b', template: 'Too late.' },
  ],
  [
    { speaker: 'b', template: 'I found another {adjective} {noun}.' },
    { speaker: 'c', template: 'Put it back.' },
    { speaker: 'a', template: 'Or… collect them?' },
  ],
  [
    { speaker: 'c', template: '{place} is compromised.' },
    { speaker: 'a', template: 'By what?' },
    { speaker: 'b', template: 'A very confident {noun}.' },
  ],
  [
    { speaker: 'a', template: 'Trade you a {noun} for silence.' },
    { speaker: 'b', template: 'Make it {adjective}.' },
  ],
  [
    { speaker: 'b', template: 'Why is the {noun} humming?' },
    { speaker: 'c', template: 'It always does that near {place}.' },
  ],
  [
    { speaker: 'a', template: 'Plan B!' },
    { speaker: 'b', template: 'We never finished Plan A.' },
    { speaker: 'c', template: 'Good — skip to C.' },
  ],
  [
    { speaker: 'c', template: 'Nobody panic.' },
    { speaker: 'a', template: 'I am panicking about the {noun}.' },
  ],
];

const SFX_TEMPLATES = ['THONK', 'SKRR', 'WHOMP', 'PING', 'FWOOSH', 'CLACK', 'BZZT', 'SPLISH'];

export type MadLibsOptions = {
  /** Prefer templates/exchanges not already used on this page. */
  usedKeys?: Set<string>;
};

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

function pickFresh<T>(
  rng: () => number,
  list: readonly T[],
  usedKeys: Set<string> | undefined,
  keyFor: (item: T) => string,
): T {
  if (!usedKeys || usedKeys.size === 0) return pick(rng, list);
  const fresh = list.filter((item) => !usedKeys.has(keyFor(item)));
  return pick(rng, fresh.length > 0 ? fresh : list);
}

function fillTemplate(template: string, rng: () => number): string {
  return template
    .replaceAll('{adjective}', pick(rng, ADJECTIVES))
    .replaceAll('{noun}', pick(rng, NOUNS))
    .replaceAll('{place}', pick(rng, PLACES));
}

function exchangeKey(exchange: Array<{ speaker: PanelCharacterId; template: string }>): string {
  return `ex:${exchange.map((line) => `${line.speaker}:${line.template}`).join('|')}`;
}

export function generateMadLibsBlocks(
  seed: number,
  panelIndex: number,
  options?: MadLibsOptions,
): PanelTextBlock[] {
  const rng = seeded(seed + panelIndex * 9973 + 7919);
  const usedKeys = options?.usedKeys;
  const roll = rng();
  if (roll < 0.1) return [];

  const blocks: PanelTextBlock[] = [];
  if (roll < 0.28) {
    const template = pickFresh(rng, CAPTION_TEMPLATES, usedKeys, (t) => `cap:${t}`);
    usedKeys?.add(`cap:${template}`);
    blocks.push({
      kind: 'caption',
      content: fillTemplate(template, rng),
    });
  }

  if (roll < 0.62) {
    const exchange = pickFresh(rng, EXCHANGE_PRESETS, usedKeys, exchangeKey);
    usedKeys?.add(exchangeKey(exchange));
    for (const line of exchange) {
      blocks.push({
        kind: 'dialogue',
        characterId: line.speaker,
        content: fillTemplate(line.template, rng),
      });
    }
    if (roll > 0.9) {
      const word = pick(rng, SFX_TEMPLATES);
      blocks.push({
        kind: 'sfx',
        content: word,
        loudness: pick(rng, ['normal', 'loud', 'loud', 'quiet'] as const),
      });
    }
    return blocks;
  }

  const firstTemplate = pickFresh(rng, DIALOGUE_TEMPLATES, usedKeys, (t) => `dlg:${t}`);
  usedKeys?.add(`dlg:${firstTemplate}`);
  blocks.push({
    kind: 'dialogue',
    characterId: pick(rng, ['a', 'b', 'c'] as PanelCharacterId[]),
    content: fillTemplate(firstTemplate, rng),
  });

  if (roll > 0.78) {
    const secondTemplate = pickFresh(rng, DIALOGUE_TEMPLATES, usedKeys, (t) => `dlg:${t}`);
    usedKeys?.add(`dlg:${secondTemplate}`);
    blocks.push({
      kind: 'dialogue',
      characterId: pick(rng, ['a', 'b', 'c'] as PanelCharacterId[]),
      content: fillTemplate(secondTemplate, rng),
    });
  }

  if (roll > 0.92) {
    blocks.push({
      kind: 'sfx',
      content: pick(rng, SFX_TEMPLATES),
      loudness: pick(rng, ['normal', 'loud', 'quiet'] as const),
    });
  }

  return blocks;
}

/** Generate one page of copy, minimizing repeated exchange/template keys across panels. */
export function generateMadLibsPage(seed: number, panelCount: number): PanelTextBlock[][] {
  const usedKeys = new Set<string>();
  return Array.from({ length: panelCount }, (_, panelIndex) =>
    generateMadLibsBlocks(seed, panelIndex, { usedKeys }),
  );
}

export function madLibsTemplateKey(block: PanelTextBlock): string {
  if (block.kind === 'caption') return `caption:${block.content}`;
  if (block.kind === 'dialogue') return `dialogue:${block.content}`;
  return `sfx:${block.content}`;
}
