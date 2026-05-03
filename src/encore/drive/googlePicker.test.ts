import { describe, expect, it } from 'vitest';
import {
  augmentGooglePickerSetupErrorMessage,
  googlePickerAppIdFromClientId,
  googlePickerSetOriginFromEnvAndWindow,
  resolvePickerAppId,
} from './googlePicker';

describe('augmentGooglePickerSetupErrorMessage', () => {
  it('appends setup hints for invalid developer key errors', () => {
    const out = augmentGooglePickerSetupErrorMessage('The API developer key is invalid.');
    expect(out).toContain('The API developer key is invalid.');
    expect(out).toMatch(/Google Picker API/i);
    expect(out).toMatch(/Google Drive API/i);
    expect(out).toMatch(/same Google Cloud project/i);
    expect(out).toMatch(/setOrigin/i);
  });

  it('passes through unrelated messages', () => {
    expect(augmentGooglePickerSetupErrorMessage('Network error')).toBe('Network error');
  });
});

describe('googlePickerAppIdFromClientId', () => {
  it('extracts numeric Cloud project prefix from a Web client id', () => {
    expect(googlePickerAppIdFromClientId('811234567890-abc123xyz.apps.googleusercontent.com')).toBe('811234567890');
  });

  it('returns null when there is no numeric prefix', () => {
    expect(googlePickerAppIdFromClientId('not-a-client-id')).toBeNull();
    expect(googlePickerAppIdFromClientId('')).toBeNull();
    expect(googlePickerAppIdFromClientId('  ')).toBeNull();
  });

  it('requires at least six digits before the hyphen', () => {
    expect(googlePickerAppIdFromClientId('12345-short.apps.googleusercontent.com')).toBeNull();
    expect(googlePickerAppIdFromClientId('123456-short.apps.googleusercontent.com')).toBe('123456');
  });
});

describe('googlePickerSetOriginFromEnvAndWindow', () => {
  it('uses VITE value when set', () => {
    const win = {
      self: {} as Window,
      top: {} as Window,
      location: { origin: 'http://127.0.0.1:5173' },
    };
    win.self = win as unknown as Window;
    win.top = win as unknown as Window;
    expect(googlePickerSetOriginFromEnvAndWindow(' https://parent.example ', win)).toBe('https://parent.example');
  });

  it('returns null for top-level window', () => {
    const topObj = {
      location: { origin: 'http://127.0.0.1:5173' },
    };
    const win = {
      self: topObj,
      top: topObj,
      location: { origin: 'http://127.0.0.1:5173' },
    };
    expect(googlePickerSetOriginFromEnvAndWindow(undefined, win as unknown as Window)).toBeNull();
  });

  it('uses top frame origin when embedded (same-origin)', () => {
    const topObj = { location: { origin: 'https://parent.test' } };
    const win = {
      self: { x: 1 },
      top: topObj,
      location: { origin: 'https://child.test' },
    };
    expect(googlePickerSetOriginFromEnvAndWindow(undefined, win as unknown as Window)).toBe('https://parent.test');
  });

  it('returns null when parent is cross-origin (no env)', () => {
    const win = {
      self: {},
      get top() {
        throw new Error('Blocked a frame with origin');
      },
      location: { origin: 'https://child.test' },
    };
    win.self = win;
    expect(googlePickerSetOriginFromEnvAndWindow(undefined, win as unknown as Window)).toBeNull();
  });
});

describe('resolvePickerAppId', () => {
  it('prefers VITE_GOOGLE_PICKER_APP_ID when set', () => {
    expect(
      resolvePickerAppId({
        VITE_GOOGLE_PICKER_APP_ID: ' 987654321 ',
        VITE_GOOGLE_CLIENT_ID: '111111111111-xxx.apps.googleusercontent.com',
      }),
    ).toBe('987654321');
  });

  it('falls back to client id prefix', () => {
    expect(
      resolvePickerAppId({
        VITE_GOOGLE_CLIENT_ID: '661075115725-abc.apps.googleusercontent.com',
      }),
    ).toBe('661075115725');
  });

  it('ignores non-numeric override', () => {
    expect(
      resolvePickerAppId({
        VITE_GOOGLE_PICKER_APP_ID: 'abc',
        VITE_GOOGLE_CLIENT_ID: '661075115725-abc.apps.googleusercontent.com',
      }),
    ).toBe('661075115725');
  });
});
