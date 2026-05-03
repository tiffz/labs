/**
 * Google Picker (Drive) — setup helpers retained for docs/tests. In-app selection uses “open Drive
 * in browser” + paste instead of the Picker overlay (avoids browser API key + `files.list` issues).
 * @see https://developers.google.com/drive/picker/guides/overview
 */

/**
 * Adds setup hints when Google’s Picker reports an invalid developer key (often: Picker API
 * not enabled, or API key restrictions omit Picker / Drive).
 */
export function augmentGooglePickerSetupErrorMessage(message: string): string {
  const t = message.trim();
  const lower = t.toLowerCase();
  if (
    lower.includes('developer key') &&
    (lower.includes('invalid') || lower.includes('not valid'))
  ) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'this site’s origin';
    const portSegment =
      typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
    return [
      t,
      '',
      'This usually means the browser API key (VITE_GOOGLE_API_KEY) is not allowed to run the Picker for this app. Check all of the following. Each item must use the same Google Cloud project as your Web OAuth client (VITE_GOOGLE_CLIENT_ID):',
      `• Same project: create the API key under APIs & Services → Credentials in that project (not a different project).`,
      `• Enable APIs (Library): Google Picker API and Google Drive API.`,
      `• Key “API restrictions”: restricted key → allow at least Google Picker API and Google Drive API.`,
      `• Key “Application restrictions” (HTTP referrers): include your dev and prod origins with a path wildcard, e.g. ${origin}/*. If you use Vite on loopback, also add http://127.0.0.1${portSegment}/* and http://localhost${portSegment}/*.`,
      `• Picker app id: Encore sets this from the numeric prefix of VITE_GOOGLE_CLIENT_ID (Cloud “Project number”). If yours is unusual, set VITE_GOOGLE_PICKER_APP_ID to the Project number from the Cloud Console dashboard.`,
      '• Encore only sends Picker setOrigin when the app is in an iframe (or when VITE_GOOGLE_PICKER_ORIGIN is set). If you still see this error, double-check the bullets above in Cloud Console.',
      '• After changing .env, restart npm run dev (or redeploy). See Encore README → Browser API key.',
    ].join('\n');
  }
  return t;
}

/**
 * Numeric Cloud project id from a Web OAuth client id (`NNNNNN-xxx.apps.googleusercontent.com`).
 * Google Picker `setAppId` expects this number string.
 */
export function googlePickerAppIdFromClientId(clientId: string): string | null {
  const t = clientId.trim();
  const m = t.match(/^(\d{6,})-/);
  return m?.[1] ?? null;
}

type PickerAppIdEnv = {
  VITE_GOOGLE_PICKER_APP_ID?: string;
  VITE_GOOGLE_CLIENT_ID?: string;
};

/** Resolves Picker `appId`: explicit env, else numeric prefix of Web client id. */
export function resolvePickerAppId(env: PickerAppIdEnv): string | null {
  const explicit = env.VITE_GOOGLE_PICKER_APP_ID?.trim() ?? '';
  if (explicit && /^\d+$/.test(explicit)) return explicit;
  return googlePickerAppIdFromClientId(env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '');
}

/**
 * Picker `setOrigin` is for the **top-level** page origin when the app runs in an iframe.
 * Google's minimal sample omits it for a normal top-level app; always passing `location.origin`
 * can surface as “The API developer key is invalid” in some setups.
 *
 * @see https://developers.google.com/workspace/drive/picker/reference/picker.pickerbuilder.setorigin
 */
export function googlePickerSetOriginFromEnvAndWindow(
  vitePickerOrigin: string | undefined,
  win: Pick<Window, 'self' | 'top'> & { location: Pick<Location, 'origin'> },
): string | null {
  const explicit = vitePickerOrigin?.trim() ?? '';
  if (explicit) return explicit;
  try {
    const topWin = win.top;
    if (topWin != null && win.self !== topWin) {
      return topWin.location.origin;
    }
  } catch {
    /* cross-origin parent: cannot read top origin */
    return null;
  }
  return null;
}
