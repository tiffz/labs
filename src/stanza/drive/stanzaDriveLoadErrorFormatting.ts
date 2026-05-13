/**
 * User-facing aggregation of Drive load attempt errors (OAuth path + anonymous API-key fallback).
 */
export function formatStanzaDriveLoadErrors(errors: string[]): string {
  const popupLine = errors.find((m) =>
    /popup|Allow popups|blocked.*popup|Failed to open popup/i.test(m),
  );
  const onlyNoise404 = errors.every(
    (m) => m === popupLine || /not found|^404\b|This Drive file was not found/i.test(m),
  );
  if (popupLine && onlyNoise404 && errors.length > 1) {
    return (
      "Google sign-in couldn't open a new window. Your browser may have blocked it. " +
      'Check the address bar for a blocked-popup icon, allow popups for this site, then Retry. ' +
      "Encore uploads stay private until you finish signing in; they won't load without Google access."
    );
  }
  const joined = errors.join('\n\n');
  if (errors.length === 1 && /This Drive file was not found/i.test(errors[0]!)) {
    return (
      `${joined}\n\n` +
      'Private Google Drive files (including most Encore uploads) only open after you sign in with Google in this app. ' +
      'Use the account control in the header, complete sign-in (allow popups if the browser blocks them), then use Retry or reload this page.'
    );
  }
  return joined;
}
