/**
 * Escape a string for embedding in a Google Drive `q` filter literal
 * (`name='…'`, `'id' in parents`, etc.).
 *
 * Drive query syntax treats `\` as an escape, so backslashes must be escaped
 * before single quotes — otherwise `foo\'bar` can break out of the literal.
 */
export function escapeDriveQueryLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
