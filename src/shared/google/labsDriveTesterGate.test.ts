import { describe, expect, it } from 'vitest';
import {
  getLabsDriveBackupRestrictionHashesFromEnv,
  isEmailAllowedLabsDriveBackup,
  resolveLabsDriveTesterHashSets,
} from './labsDriveTesterGate';

describe('labsDriveTesterGate', () => {
  describe('resolveLabsDriveTesterHashSets (legacy Encore fallback helper)', () => {
    it('uses Drive-specific hashes when present', () => {
      const a = 'aa'.repeat(32);
      const b = 'bb'.repeat(32);
      const s = resolveLabsDriveTesterHashSets(`${a},${b}`, 'cc'.repeat(32));
      expect(s.size).toBe(2);
      expect(s.has(a)).toBe(true);
      expect(s.has(b)).toBe(true);
    });

    it('falls back to Encore allowlist when Drive list is empty', () => {
      const h = 'deadbeef'.repeat(8);
      const s = resolveLabsDriveTesterHashSets(undefined, h);
      expect(s.size).toBe(1);
      expect(s.has(h)).toBe(true);
    });
  });

  describe('isEmailAllowedLabsDriveBackup', () => {
    it('allows any signed-in user when optional restriction list is unset', async () => {
      const prev = import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES;
      import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES = '';
      expect(await isEmailAllowedLabsDriveBackup('user@example.com')).toBe(true);
      import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES = prev;
    });

    it('returns false for empty email', async () => {
      expect(await isEmailAllowedLabsDriveBackup('  ')).toBe(false);
    });
  });

  describe('getLabsDriveBackupRestrictionHashesFromEnv', () => {
    it('reads only the Drive-specific env var', () => {
      const prev = import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES;
      import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES = 'abcd'.repeat(16);
      expect(getLabsDriveBackupRestrictionHashesFromEnv().size).toBe(1);
      import.meta.env.VITE_LABS_DRIVE_TESTER_HASHES = prev;
    });
  });
});
