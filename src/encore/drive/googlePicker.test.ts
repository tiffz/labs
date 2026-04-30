import { describe, expect, it } from 'vitest';
import { googlePickerAppIdFromClientId } from './googlePicker';

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
