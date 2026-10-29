import { describe, expect, it } from 'vitest';

import { DEFAULT_SCRIPT_HTML } from '../script/defaultScriptSample';
import { createBlankComicProject, type ComicProject } from '../types';
import { lyreflyScriptHasText, lyreflyWorkPhase, type LyreflyWorkPhaseContext } from './lyreflyWorkPhase';

const here: LyreflyWorkPhaseContext = { pageNodeCount: 0, publishLogCount: 0, packageOnDevice: true };
const work = (patch: Partial<ComicProject> = {}): ComicProject => ({ ...createBlankComicProject(), ...patch });

describe('lyreflyWorkPhase', () => {
  it('a work with only brainstorm material is an idea', () => {
    expect(lyreflyWorkPhase(work({ brainstormHtml: '<p>A moon girl</p>' }), here)).toBe('idea');
  });

  // Opening the Script tab writes the courier sample. That is not the owner developing anything.
  it('the sample script does not make an idea developing', () => {
    expect(lyreflyWorkPhase(work(), { ...here, scriptMarkdown: DEFAULT_SCRIPT_HTML })).toBe('idea');
    expect(lyreflyScriptHasText(DEFAULT_SCRIPT_HTML)).toBe(false);
  });

  it('a script, a page, or "Start developing" makes it developing', () => {
    expect(lyreflyWorkPhase(work(), { ...here, scriptMarkdown: '<ul><li>Page 1</li></ul>' })).toBe('developing');
    expect(lyreflyWorkPhase(work(), { ...here, pageNodeCount: 1 })).toBe('developing');
    expect(lyreflyWorkPhase(work({ developingAt: '2026-10-29T00:00:00Z' }), here)).toBe('developing');
  });

  it('finished or published is complete', () => {
    expect(lyreflyWorkPhase(work({ status: 'finished' }), here)).toBe('complete');
    expect(lyreflyWorkPhase(work(), { ...here, publishLogCount: 1 })).toBe('complete');
  });

  // A summary stub has no script or pages yet; calling it an idea would misfile a real comic.
  it('a work whose package is not on this device is unknown, not an idea', () => {
    expect(lyreflyWorkPhase(work(), { ...here, packageOnDevice: false })).toBeNull();
  });
});
