/**
 * Copy a wall-clock subrange of an AudioBuffer into a new buffer (t=0 at slice start).
 */
export function sliceAudioBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.ceil(endSec * sampleRate));
  const frameCount = Math.max(0, endSample - startSample);
  const out = new AudioBuffer({
    length: frameCount,
    numberOfChannels: channels,
    sampleRate,
  });
  for (let c = 0; c < channels; c += 1) {
    const src = buffer.getChannelData(c);
    out.getChannelData(c).set(src.subarray(startSample, endSample));
  }
  return out;
}
