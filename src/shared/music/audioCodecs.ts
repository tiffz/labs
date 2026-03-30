// @ts-expect-error - lamejs package has no maintained types
import * as lamejs from 'lamejsfixbug121';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ExportFormat } from './exportTypes';

interface LameJsEncoder {
  encodeBuffer(left: Int16Array, right: Int16Array): Int8Array | undefined;
  flush(): Int8Array | undefined;
}

interface LameJsLibrary {
  Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => LameJsEncoder;
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

function ensureFfmpegLoaded(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return Promise.resolve(ffmpegInstance);
  }
  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }
  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
    const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm');
    await ffmpeg.load({ coreURL, wasmURL });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();
  return ffmpegLoadPromise;
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export function audioBufferToMp3(buffer: AudioBuffer, bitrate = 160): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const sampleRate = buffer.sampleRate;
      const numberOfChannels = buffer.numberOfChannels;
      const length = buffer.length;
      if (length === 0) {
        reject(new Error('Audio buffer is empty'));
        return;
      }

      const leftChannel = buffer.getChannelData(0);
      const rightChannel = numberOfChannels > 1 ? buffer.getChannelData(1) : leftChannel;
      const leftSamples = new Int16Array(length);
      const rightSamples = new Int16Array(length);
      for (let i = 0; i < length; i += 1) {
        const left = Math.max(-1, Math.min(1, leftChannel[i]));
        const right = numberOfChannels > 1
          ? Math.max(-1, Math.min(1, rightChannel[i]))
          : left;
        leftSamples[i] = left < 0 ? left * 0x8000 : left * 0x7fff;
        rightSamples[i] = right < 0 ? right * 0x8000 : right * 0x7fff;
      }

      const Mp3Encoder = (lamejs as unknown as LameJsLibrary).Mp3Encoder;
      if (!Mp3Encoder || typeof Mp3Encoder !== 'function') {
        reject(new Error('MP3 encoder not available'));
        return;
      }

      const encoder = new Mp3Encoder(numberOfChannels, sampleRate, bitrate);
      const sampleBlockSize = 1152;
      const encoded: Int8Array[] = [];

      for (let i = 0; i < length; i += sampleBlockSize) {
        const leftChunk = leftSamples.subarray(i, i + sampleBlockSize);
        const rightChunk = rightSamples.subarray(i, i + sampleBlockSize);
        const chunk = encoder.encodeBuffer(leftChunk, rightChunk);
        if (chunk && chunk.length > 0) {
          encoded.push(chunk);
        }
      }
      const tail = encoder.flush();
      if (tail && tail.length > 0) {
        encoded.push(tail);
      }
      if (encoded.length === 0) {
        reject(new Error('MP3 encoding produced no data'));
        return;
      }

      const totalLength = encoded.reduce((sum, part) => sum + part.length, 0);
      const out = new Uint8Array(totalLength);
      let offset = 0;
      encoded.forEach((part) => {
        out.set(new Uint8Array(part.buffer, part.byteOffset, part.byteLength), offset);
        offset += part.length;
      });
      resolve(new Blob([out], { type: 'audio/mp3' }));
    } catch (error) {
      reject(error);
    }
  });
}

async function transcodeWavBlob(
  wavBlob: Blob,
  target: 'ogg' | 'flac'
): Promise<Blob> {
  const ffmpeg = await ensureFfmpegLoaded();
  const inName = `input-${Date.now()}.wav`;
  const outName = `output-${Date.now()}.${target}`;
  await ffmpeg.writeFile(inName, await fetchFile(wavBlob));
  if (target === 'ogg') {
    await ffmpeg.exec(['-i', inName, '-c:a', 'libvorbis', '-qscale:a', '5', outName]);
  } else {
    await ffmpeg.exec(['-i', inName, '-c:a', 'flac', outName]);
  }
  const data = await ffmpeg.readFile(outName);
  await ffmpeg.deleteFile(inName);
  await ffmpeg.deleteFile(outName);
  const bytes =
    data instanceof Uint8Array
      ? data
      : typeof data === 'string'
        ? new TextEncoder().encode(data)
        : new Uint8Array(data as ArrayBuffer);
  return new Blob([bytes], { type: target === 'ogg' ? 'audio/ogg' : 'audio/flac' });
}

export async function encodeAudioBuffer(
  buffer: AudioBuffer,
  format: ExportFormat,
  options?: { mp3BitrateKbps?: number }
): Promise<Blob> {
  if (format === 'wav') return audioBufferToWav(buffer);
  if (format === 'mp3') return audioBufferToMp3(buffer, options?.mp3BitrateKbps ?? 160);
  if (format === 'ogg' || format === 'flac') {
    const wavBlob = audioBufferToWav(buffer);
    return transcodeWavBlob(wavBlob, format);
  }
  throw new Error(`Unsupported audio format: ${format}`);
}
