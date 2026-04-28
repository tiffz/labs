import type { PianoScore } from './scoreTypes';
import { parseMusicXml, type ParsedSections } from './parseMusicXml';
import { parseMidi } from './parseMidi';
import type { MidiFile } from './parseMidi';
import JSZip from 'jszip';

export type ImportFormat = 'musicxml' | 'mxl' | 'mscz' | 'midi';

export interface ImportResult {
  score: PianoScore;
  sections?: ParsedSections[];
}

export interface ImportProgress {
  stage: 'detecting' | 'unpacking' | 'converting' | 'parsing' | 'done';
  message: string;
}

function detectFormat(file: File): ImportFormat {
  const name = file.name.toLowerCase();
  if (name.endsWith('.mxl')) return 'mxl';
  if (name.endsWith('.mscz') || name.endsWith('.mscx')) return 'mscz';
  if (name.endsWith('.mid') || name.endsWith('.midi')) return 'midi';
  if (name.endsWith('.musicxml') || name.endsWith('.xml')) return 'musicxml';

  // Content sniffing fallback
  if (file.type === 'application/xml' || file.type === 'text/xml') return 'musicxml';
  if (file.type === 'audio/midi' || file.type === 'audio/x-midi') return 'midi';

  throw new Error(`Unsupported file format: ${file.name}. Supported: .musicxml, .xml, .mxl, .mid, .midi, .mscz`);
}

async function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function importMusicXml(file: File, onProgress: (p: ImportProgress) => void): Promise<ImportResult> {
  onProgress({ stage: 'parsing', message: 'Parsing MusicXML...' });
  const text = await readAsText(file);
  const result = parseMusicXml(text);
  const { sections, ...score } = result;
  return { score, sections };
}

async function importMxl(file: File, onProgress: (p: ImportProgress) => void): Promise<ImportResult> {
  onProgress({ stage: 'unpacking', message: 'Unpacking compressed MusicXML...' });
  const buffer = await readAsArrayBuffer(file);
  const zip = await JSZip.loadAsync(buffer);

  let xmlContent: string | null = null;

  const containerFile = zip.file('META-INF/container.xml');
  if (containerFile) {
    const containerXml = await containerFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(containerXml, 'application/xml');
    const rootfile = doc.querySelector('rootfile');
    const fullPath = rootfile?.getAttribute('full-path');
    if (fullPath) {
      const musicFile = zip.file(fullPath);
      if (musicFile) {
        xmlContent = await musicFile.async('string');
      }
    }
  }

  if (!xmlContent) {
    for (const [path, entry] of Object.entries(zip.files)) {
      if (!entry.dir && (path.endsWith('.xml') || path.endsWith('.musicxml')) && !path.startsWith('META-INF')) {
        xmlContent = await entry.async('string');
        break;
      }
    }
  }

  if (!xmlContent) throw new Error('No MusicXML file found inside the .mxl archive');

  onProgress({ stage: 'parsing', message: 'Parsing MusicXML...' });
  const result = parseMusicXml(xmlContent);
  const { sections, ...score } = result;
  return { score, sections };
}

async function importMscz(file: File, onProgress: (p: ImportProgress) => void): Promise<ImportResult> {
  onProgress({ stage: 'converting', message: 'Loading MuseScore engine (first time may be slow)...' });
  const WebMscore = (await import('webmscore')).default;
  await WebMscore.ready;

  onProgress({ stage: 'converting', message: 'Converting MuseScore file to MusicXML...' });
  const buffer = await readAsArrayBuffer(file);
  const data = new Uint8Array(buffer);

  const format = file.name.toLowerCase().endsWith('.mscx') ? 'mscx' : 'mscz';
  const mscore = await WebMscore.load(format, data, [], false);
  const xmlString = await mscore.saveXml();
  mscore.destroy();

  onProgress({ stage: 'parsing', message: 'Parsing MusicXML...' });
  const result = parseMusicXml(xmlString);
  const { sections, ...score } = result;
  return { score, sections };
}

let midiParserLoaded: typeof import('midi-json-parser') | null = null;

async function getMidiParser() {
  if (!midiParserLoaded) {
    // Lazy-load to avoid worker initialization on page load
    midiParserLoaded = await import('midi-json-parser');
  }
  return midiParserLoaded;
}

async function importMidi(file: File, onProgress: (p: ImportProgress) => void): Promise<ImportResult> {
  onProgress({ stage: 'parsing', message: 'Parsing MIDI file...' });
  const buffer = await readAsArrayBuffer(file);

  const { parseArrayBuffer } = await getMidiParser();
  const midiJson = await parseArrayBuffer(buffer) as unknown as MidiFile;

  return { score: parseMidi(midiJson) };
}

export async function importScore(
  file: File,
  onProgress: (p: ImportProgress) => void = () => {},
): Promise<ImportResult> {
  onProgress({ stage: 'detecting', message: 'Detecting file format...' });
  const format = detectFormat(file);

  let result: ImportResult;
  switch (format) {
    case 'musicxml': result = await importMusicXml(file, onProgress); break;
    case 'mxl': result = await importMxl(file, onProgress); break;
    case 'mscz': result = await importMscz(file, onProgress); break;
    case 'midi': result = await importMidi(file, onProgress); break;
  }

  onProgress({ stage: 'done', message: 'Import complete!' });
  return result;
}
