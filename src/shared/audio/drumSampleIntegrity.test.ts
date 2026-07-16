/**
 * Pin teacher-recorded drum samples so agents do not "fix" thin-speaker
 * distortion by remastering the WAVs. Dum is intentionally a deep bass tone;
 * that can distort on small laptop speakers — use headphones there, keep the
 * original recording for playback and export.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SOUNDS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../drums/assets/sounds');

/** SHA-256 of the teacher-sourced takes (do not remaster in place). */
const DRUM_SAMPLE_SHA256 = {
  'dum.wav': 'd96cc4e3f4ace9dd24a8a63d63349e62485546bb4448b3106518eb4682750c62',
  'tak.wav': 'addfea63fb3dd11ceccd52247e5cd907066d91eb31bf06666dfec54af5628581',
  'ka.wav': '0c94ee78ee192ad9fa4dd002d770300e40edead9f4d76e4b0c132c90256d562d',
  'slap2.wav': '7169dfcadfbfc0fba200c96fcfe8420c1743b4e73e5ebf5a1244c7f58578bdba',
} as const;

describe('drum sample integrity (teacher recordings)', () => {
  for (const [file, expected] of Object.entries(DRUM_SAMPLE_SHA256)) {
    it(`keeps ${file} byte-identical to the sourced recording`, () => {
      const hash = createHash('sha256').update(readFileSync(join(SOUNDS_DIR, file))).digest('hex');
      expect(hash).toBe(expected);
    });
  }
});
