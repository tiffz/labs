import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  handleSpaLinkClick,
  handleSpaRowActivate,
  isModifiedOrNonPrimaryClick,
  openAppLinkInBackgroundTab,
  resolveAppLinkUrl,
} from './spaLinkClick';

describe('isModifiedOrNonPrimaryClick', () => {
  it('detects modifier and non-primary buttons', () => {
    expect(isModifiedOrNonPrimaryClick({ metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, button: 0 })).toBe(true);
    expect(isModifiedOrNonPrimaryClick({ metaKey: false, ctrlKey: false, shiftKey: true, altKey: false, button: 0 })).toBe(true);
    expect(isModifiedOrNonPrimaryClick({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 1 })).toBe(true);
    expect(isModifiedOrNonPrimaryClick({ metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 })).toBe(false);
  });
});

describe('resolveAppLinkUrl', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/encore/?debug=1#/library');
  });

  it('resolves hash routes against the current page', () => {
    expect(resolveAppLinkUrl('#/song/abc')).toBe(`${window.location.origin}/encore/?debug=1#/song/abc`);
  });

  it('resolves path and query hrefs', () => {
    expect(resolveAppLinkUrl('/stanza/?v=abc12345678')).toBe(`${window.location.origin}/stanza/?v=abc12345678`);
  });
});

describe('handleSpaLinkClick', () => {
  it('prevents default and navigates on plain primary click', () => {
    const onNavigate = vi.fn();
    const preventDefault = vi.fn();
    handleSpaLinkClick(
      { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0, preventDefault },
      onNavigate,
    );
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('leaves modifier clicks to the browser', () => {
    const onNavigate = vi.fn();
    const preventDefault = vi.fn();
    handleSpaLinkClick(
      { metaKey: false, ctrlKey: false, shiftKey: true, altKey: false, button: 0, preventDefault },
      onNavigate,
    );
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

describe('handleSpaRowActivate', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/encore/?debug=1#/library');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a background tab for modifier clicks', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const onNavigate = vi.fn();
    handleSpaRowActivate(
      { metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, button: 0 },
      '#/song/abc',
      onNavigate,
    );
    expect(open).toHaveBeenCalledWith(`${window.location.origin}/encore/?debug=1#/song/abc`, '_blank', 'noopener,noreferrer');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('navigates in-app on plain primary click', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const onNavigate = vi.fn();
    handleSpaRowActivate(
      { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 },
      '#/song/abc',
      onNavigate,
    );
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});

describe('openAppLinkInBackgroundTab', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/encore/?debug=1#/library');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates to window.open with noopener', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    openAppLinkInBackgroundTab('#/practice');
    expect(open).toHaveBeenCalledWith(`${window.location.origin}/encore/?debug=1#/practice`, '_blank', 'noopener,noreferrer');
  });
});
