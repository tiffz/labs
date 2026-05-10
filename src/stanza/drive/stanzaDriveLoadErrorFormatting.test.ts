import { describe, expect, it } from 'vitest';
import { formatStanzaDriveLoadErrors } from './stanzaDriveLoadErrorFormatting';

describe('formatStanzaDriveLoadErrors', () => {
  it('replaces mixed popup + 404 noise with a blocked-popup hint', () => {
    const msg = formatStanzaDriveLoadErrors([
      'Failed to open popup window on url: … Maybe blocked by the browser?',
      'This Drive file was not found.',
    ]);
    expect(msg).toContain('blocked it');
    expect(msg).toContain('allow popups');
    expect(msg).not.toMatch(/^This Drive file was not found\.$/m);
  });

  it('appends a sign-in hint for a lone anonymous 404', () => {
    const msg = formatStanzaDriveLoadErrors(['This Drive file was not found.']);
    expect(msg).toContain('This Drive file was not found.');
    expect(msg).toContain('sign in with Google');
  });

  it('joins unrelated errors as-is', () => {
    expect(formatStanzaDriveLoadErrors(['Network error', 'Other'])).toBe('Network error\n\nOther');
  });
});
