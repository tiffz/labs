/**
 * Loop an AudioBuffer for offline/export rendering in Beat analysis.
 */
export function repeatAudioBuffer(source: AudioBuffer, loops: number): AudioBuffer {
  const safeLoops = Math.max(1, loops);
  const outLength = source.length * safeLoops;
  const context = new OfflineAudioContext(source.numberOfChannels, outLength, source.sampleRate);
  const out = context.createBuffer(source.numberOfChannels, outLength, source.sampleRate);
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const sourceData = source.getChannelData(channel);
    const targetData = out.getChannelData(channel);
    for (let loop = 0; loop < safeLoops; loop += 1) {
      targetData.set(sourceData, loop * source.length);
    }
  }
  return out;
}
