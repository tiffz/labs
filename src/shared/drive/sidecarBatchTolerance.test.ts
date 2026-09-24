import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DriveHttpError } from './driveFetchErrors';
import {
  formatMissingSidecarsMessage,
  isBatchStoppingSidecarError,
  isMissingSidecarError,
  runSidecarBatch,
} from './sidecarBatchTolerance';

describe('runSidecarBatch', () => {
  /**
   * The live bug. A bare `for` loop awaiting each download aborted on the first 404, so every later
   * item in the library went unfetched — on that sync and every one after it.
   */
  it('keeps going when one sidecar is gone from Drive', async () => {
    const seen: string[] = [];
    const outcome = await runSidecarBatch(
      ['a', 'b', 'c', 'd'],
      async (item) => {
        seen.push(item);
        if (item === 'b') throw new DriveHttpError('gone', 404);
      },
      { labelOf: (item) => item },
    );

    expect(seen, 'items after the missing one must still be attempted').toEqual(['a', 'b', 'c', 'd']);
    expect(outcome.succeeded).toBe(3);
    expect(outcome.missing).toEqual(['b']);
  });

  it.each([404, 410])('treats %i as a missing sidecar', async (status) => {
    const outcome = await runSidecarBatch(
      ['only'],
      async () => {
        throw new DriveHttpError('gone', status);
      },
      { labelOf: () => 'only' },
    );
    expect(outcome.missing).toEqual(['only']);
  });

  /**
   * The other half. Grinding through hundreds of items that will all fail the same way is the
   * API-abuse pattern `driveRequestGovernor` exists to prevent, and an expired token needs a
   * refresh, not persistence.
   */
  it.each([401, 403, 429, 500, 503])('stops the batch on %i', async (status) => {
    const seen: string[] = [];
    await expect(
      runSidecarBatch(
        ['a', 'b', 'c'],
        async (item) => {
          seen.push(item);
          if (item === 'a') throw new DriveHttpError('stop', status);
        },
        { labelOf: (item) => item },
      ),
    ).rejects.toThrow();
    expect(seen, 'must not keep calling Drive after an auth or rate-limit failure').toEqual(['a']);
  });

  it('stops on an unrecognised failure rather than assuming it is per-item', async () => {
    await expect(
      runSidecarBatch(
        ['a', 'b'],
        async () => {
          throw new Error('something else entirely');
        },
        { labelOf: (item) => item },
      ),
    ).rejects.toThrow('something else entirely');
  });

  it('classifies statuses', () => {
    expect(isMissingSidecarError(new DriveHttpError('x', 404))).toBe(true);
    expect(isMissingSidecarError(new DriveHttpError('x', 401))).toBe(false);
    expect(isBatchStoppingSidecarError(new DriveHttpError('x', 429))).toBe(true);
    expect(isBatchStoppingSidecarError(new DriveHttpError('x', 404))).toBe(false);
    expect(isBatchStoppingSidecarError(new Error('no status'))).toBe(true);
  });

  it('names what could not be fetched instead of failing silently', () => {
    expect(formatMissingSidecarsMessage({ attempted: 3, succeeded: 3, missing: [] })).toBeNull();
    expect(formatMissingSidecarsMessage({ attempted: 3, succeeded: 2, missing: ['Zine A'] })).toContain('Zine A');
    const many = formatMissingSidecarsMessage({
      attempted: 9,
      succeeded: 4,
      missing: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(many).toContain('5 files');
    expect(many).toContain('and 2 more');
  });
});

/**
 * Guard-parity contract, as named in PROCESS_BACKLOG § Drive-sync red-team (#12).
 *
 * The set is DERIVED — any app config declaring `downloadSidecars` is enrolled by existing, so a
 * new app cannot quietly ship the bare-loop version. A source scan, and it says so: the behavioural
 * proof is the `runSidecarBatch` suite above.
 */
describe('every app that downloads sidecars tolerates a missing one', () => {
  const SRC = path.join(process.cwd(), 'src');

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (entry.name.endsWith('.ts') && !entry.name.includes('.test.')) out.push(full);
    }
    return out;
  }

  const configs = walk(SRC).filter((file) => {
    if (file.includes(`${path.sep}shared${path.sep}drive${path.sep}`)) return false;
    return /\bdownloadSidecars\s*:/.test(fs.readFileSync(file, 'utf8'));
  });

  it('finds the app configs it governs', () => {
    expect(configs.length).toBeGreaterThanOrEqual(3);
  });

  it.each(configs.map((f) => [path.relative(SRC, f), f]))(
    '%s routes its sidecar downloads through a tolerant batch',
    (_rel, file) => {
      const source = fs.readFileSync(file as string, 'utf8');
      const inlineArrow = /downloadSidecars\s*:\s*async?\s*\(/.test(source);
      const delegates = /downloadSidecars\s*:\s*[A-Za-z_$][\w$]*\s*,/.test(source);
      const wrapped = source.includes('runSidecarBatch');

      // Either it delegates to a named downloader (checked below via its own module) or, if the
      // work is inline here, it must use the tolerant batch itself.
      expect(
        delegates || wrapped || !inlineArrow,
        'inline downloadSidecars must use runSidecarBatch',
      ).toBe(true);
    },
  );

  it('the named downloaders use the tolerant batch', () => {
    const downloaders = walk(SRC).filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return /export async function download(Missing|One)\w*/.test(source) && /driveGetMedia|downloadOne/.test(source);
    });
    expect(downloaders.length).toBeGreaterThanOrEqual(2);

    const unguarded = downloaders.filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      if (!/export async function downloadMissing\w*/.test(source)) return false;
      return !source.includes('runSidecarBatch');
    });
    expect(unguarded.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
