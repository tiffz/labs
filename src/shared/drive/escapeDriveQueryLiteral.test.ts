import { describe, expect, it } from 'vitest';
import { escapeDriveQueryLiteral } from './escapeDriveQueryLiteral';

describe('escapeDriveQueryLiteral', () => {
  it('escapes single quotes', () => {
    expect(escapeDriveQueryLiteral("O'Brien")).toBe("O\\'Brien");
  });

  it('escapes backslashes before quotes so literals cannot break out', () => {
    expect(escapeDriveQueryLiteral("a\\'b")).toBe("a\\\\\\'b");
  });

  it('leaves ordinary names unchanged', () => {
    expect(escapeDriveQueryLiteral('Comics')).toBe('Comics');
  });
});
