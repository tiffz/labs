export interface MidiNoteEvent {
  midi: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  channel: number;
}

function clampMidiValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function encodeVarLen(value: number): number[] {
  let buffer = value & 0x7f;
  const out: number[] = [];
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    out.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
  return out;
}

export function buildSingleTrackMidi(
  events: MidiNoteEvent[],
  bpm: number,
): Uint8Array {
  const ticksPerQuarter = 480;
  const trackData: number[] = [];
  const microsecondsPerQuarter = clampMidiValue(
    Math.floor(60000000 / Math.max(1, bpm)),
    1,
    0xffffff
  );
  trackData.push(
    0x00,
    0xff,
    0x51,
    0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff
  );

  const timeline: Array<{
    tick: number;
    type: 'on' | 'off';
    midi: number;
    velocity: number;
    channel: number;
  }> = [];

  events.forEach((event) => {
    const startTick = Math.max(0, event.startTick);
    const endTick = Math.max(startTick + 1, startTick + event.durationTicks);
    timeline.push({
      tick: startTick,
      type: 'on',
      midi: clampMidiValue(event.midi, 0, 127),
      velocity: clampMidiValue(event.velocity, 1, 127),
      channel: clampMidiValue(event.channel, 0, 15),
    });
    timeline.push({
      tick: endTick,
      type: 'off',
      midi: clampMidiValue(event.midi, 0, 127),
      velocity: 0,
      channel: clampMidiValue(event.channel, 0, 15),
    });
  });

  timeline.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type !== b.type) return a.type === 'off' ? -1 : 1;
    return a.midi - b.midi;
  });

  let previousTick = 0;
  timeline.forEach((event) => {
    const delta = Math.max(0, event.tick - previousTick);
    trackData.push(...encodeVarLen(delta));
    if (event.type === 'on') {
      trackData.push(0x90 | event.channel, event.midi, event.velocity);
    } else {
      trackData.push(0x80 | event.channel, event.midi, 0x00);
    }
    previousTick = event.tick;
  });

  trackData.push(0x00, 0xff, 0x2f, 0x00);

  const header: number[] = [
    0x4d, 0x54, 0x68, 0x64,
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x00,
    0x00, 0x01,
    (ticksPerQuarter >> 8) & 0xff,
    ticksPerQuarter & 0xff,
  ];
  const trackHeader: number[] = [
    0x4d, 0x54, 0x72, 0x6b,
    (trackData.length >> 24) & 0xff,
    (trackData.length >> 16) & 0xff,
    (trackData.length >> 8) & 0xff,
    trackData.length & 0xff,
  ];
  return new Uint8Array([...header, ...trackHeader, ...trackData]);
}

