import { describe, expect, it } from 'vitest';
import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import {
  eligibleOriginalsSlotsForFiles,
  eligibleOriginalsSlotsForUrlDrop,
  isOriginalsTakeMediaFile,
} from './originalsSongFileDrag';
import { ORIGINALS_DEMO_TAKE_ACCEPT } from './originalsSongFileSlots';

/** Browser `accept` semantics: `.ext` matches the name, `type/*` the MIME family, else exact MIME. */
function acceptAllows(accept: string, file: File): boolean {
  const name = file.name.toLowerCase();
  const mime = (file.type || inferMediaMimeType(file)).toLowerCase();
  return accept.split(',').some((raw) => {
    const token = raw.trim().toLowerCase();
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1));
    return mime === token;
  });
}

// iPhone voice memos and camera clips, with and without the browser filling in `File.type`.
const TAKE_FILES = [
  new File(['x'], 'IMG_0412.MOV', { type: 'video/quicktime' }),
  new File(['x'], 'IMG_0412.mov', { type: '' }),
  new File(['x'], 'clip.mp4', { type: 'video/mp4' }),
  new File(['x'], 'demo.m4a', { type: '' }),
  new File(['x'], 'demo.mp3', { type: 'audio/mpeg' }),
  new File(['x'], 'demo.wav', { type: 'audio/wav' }),
];

describe('originalsSongFileDrag', () => {
  it('routes audio files to demo takes and references', () => {
    const file = new File(['x'], 'demo.m4a', { type: 'audio/mp4' });
    expect(eligibleOriginalsSlotsForFiles([file])).toEqual(new Set(['demoTakes', 'references']));
  });

  it('routes PDF files to references and brainstorm', () => {
    const file = new File(['x'], 'chart.pdf', { type: 'application/pdf' });
    expect(eligibleOriginalsSlotsForFiles([file])).toEqual(new Set(['references', 'brainstormRefs']));
  });

  it('routes a .mov to demo takes', () => {
    for (const file of TAKE_FILES.slice(0, 2)) {
      expect(eligibleOriginalsSlotsForFiles([file])).toEqual(new Set(['demoTakes']));
    }
  });

  it.each(TAKE_FILES.map((f) => [f.name, f.type, f] as const))(
    'accepts %s (%s) as a take in both the picker and the drop zone',
    (_name, _type, file) => {
      expect(isOriginalsTakeMediaFile(file)).toBe(true);
      expect(acceptAllows(ORIGINALS_DEMO_TAKE_ACCEPT, file)).toBe(true);
    },
  );

  it('rejects a PDF as a take', () => {
    const file = new File(['x'], 'chart.pdf', { type: 'application/pdf' });
    expect(isOriginalsTakeMediaFile(file)).toBe(false);
    expect(acceptAllows(ORIGINALS_DEMO_TAKE_ACCEPT, file)).toBe(false);
  });

  it('routes URL drops to link-capable groups only', () => {
    expect(eligibleOriginalsSlotsForUrlDrop()).toEqual(new Set(['references', 'brainstormRefs']));
  });
});
