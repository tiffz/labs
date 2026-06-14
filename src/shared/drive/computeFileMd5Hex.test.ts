import { describe, expect, it } from 'vitest';
import { computeFileMd5Hex } from './computeFileMd5Hex';

describe('computeFileMd5Hex', () => {
  it('hashes empty blob', async () => {
    await expect(computeFileMd5Hex(new Blob([]))).resolves.toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('hashes known text', async () => {
    const hello = new Blob([new TextEncoder().encode('hello')]);
    await expect(computeFileMd5Hex(hello)).resolves.toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('hashes multi-chunk blobs', async () => {
    const chunk = 'a'.repeat(1024 * 1024);
    const blob = new Blob([chunk, chunk, chunk]);
    const hash = await computeFileMd5Hex(blob);
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
    expect(hash).toBe(await computeFileMd5Hex(blob));
  });
});
