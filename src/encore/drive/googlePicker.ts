/**
 * Google Picker (Drive) — in-app modal file/folder selection.
 * Works with OAuth scope `drive.file`: user grants access per file/folder they pick.
 * @see https://developers.google.com/drive/picker/guides/overview
 * @see https://developers.google.com/drive/api/guides/api-specific-auth (Picker + drive.file)
 */

const GAPI_SCRIPT = 'https://apis.google.com/js/api.js';

export type DrivePickerSelection = { id: string; name: string; mimeType?: string };

export type OpenGoogleDrivePickerOptions = {
  accessToken: string;
  /** Browser API key (same Cloud project; HTTP referrer–restricted). */
  developerKey: string;
  /** Cloud project number = numeric prefix of OAuth Web client id (e.g. `811…` from `811…-xxx.apps.googleusercontent.com`). */
  appId: string;
  title?: string;
  /** Open picker rooted in this Drive folder (folder id). */
  parentFolderId?: string | null;
  /** Comma-separated MIME types (e.g. `application/pdf,video/mp4`). Omit for broad Drive view. */
  mimeTypes?: string;
  /** When true, user can pick a folder (e.g. bulk performance import). */
  selectFolder?: boolean;
  onPicked: (files: DrivePickerSelection[]) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
};

type GapiWithLoad = {
  load: (
    api: string,
    opts: {
      callback: () => void;
      onerror?: (err: unknown) => void;
      timeout?: number;
      ontimeout?: () => void;
    },
  ) => void;
};

let pickerApiPromise: Promise<void> | null = null;

function scriptAlreadyLoaded(src: string): boolean {
  return [...document.querySelectorAll('script[src]')].some((el) => el.getAttribute('src') === src);
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scriptAlreadyLoaded(src)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
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

function assertGooglePickerReady(): void {
  const google = (window as unknown as { google?: { picker?: unknown } }).google;
  if (!google?.picker) {
    throw new Error('Google Picker API is not loaded yet.');
  }
}

/**
 * Loads `api.js` and the `picker` module once per page lifetime.
 */
export function loadGooglePickerApi(): Promise<void> {
  if (pickerApiPromise) return pickerApiPromise;
  pickerApiPromise = (async () => {
    await loadScriptOnce(GAPI_SCRIPT);
    const gapi = (window as unknown as { gapi?: GapiWithLoad }).gapi;
    if (!gapi?.load) {
      throw new Error('Google gapi is not available after loading api.js.');
    }
    await new Promise<void>((resolve, reject) => {
      gapi.load('picker', {
        callback: () => resolve(),
        onerror: (err) => reject(err instanceof Error ? err : new Error(String(err))),
        timeout: 60_000,
        // gapi throws if `timeout` is set without `ontimeout` (see browser console).
        ontimeout: () => reject(new Error('Google Picker API load timed out.')),
      });
    });
    assertGooglePickerReady();
  })().catch((e) => {
    pickerApiPromise = null;
    throw e;
  });
  return pickerApiPromise;
}

/** MIME filters Encore uses for chart/backing uploads (Drive picker). */
export const ENCORE_DRIVE_CHART_MIME_TYPES = [
  'application/pdf',
  'application/xml',
  'application/vnd.recordare.musicxml+xml',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
].join(',');

export const ENCORE_DRIVE_RECORDING_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'application/pdf',
  'application/xml',
  'application/vnd.recordare.musicxml+xml',
].join(',');

export const ENCORE_DRIVE_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
].join(',');

type PickerCallbackData = Record<string, unknown>;

/**
 * Opens the Google-hosted Picker overlay. Call from a user gesture (click).
 */
export async function openGoogleDrivePicker(options: OpenGoogleDrivePickerOptions): Promise<void> {
  const {
    accessToken,
    developerKey,
    appId,
    title = 'Google Drive',
    parentFolderId,
    mimeTypes,
    selectFolder,
    onPicked,
    onCancel,
    onError,
  } = options;

  const fail = (msg: string) => {
    onError?.(msg);
  };

  const dk = developerKey.trim();
  if (!dk) {
    fail(
      'Missing VITE_GOOGLE_API_KEY. Add a browser API key (AIza…) in src/.env.local and restart dev; see src/encore/README.md → Browser API key.',
    );
    return;
  }
  if (dk.includes('apps.googleusercontent.com')) {
    fail(
      'VITE_GOOGLE_API_KEY looks like an OAuth client id, not a browser API key. Create an API key in Google Cloud Console (Credentials) and use the AIza… value.',
    );
    return;
  }
  if (!appId.trim()) {
    fail('Could not derive Picker app id from VITE_GOOGLE_CLIENT_ID (expected numeric prefix).');
    return;
  }

  try {
    await loadGooglePickerApi();
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
    return;
  }

  const google = (window as unknown as { google: Record<string, unknown> }).google;
  const pickerNs = google.picker as Record<string, unknown>;
  type PickerBuilderChain = {
    setDeveloperKey(k: string): PickerBuilderChain;
    setOAuthToken(t: string): PickerBuilderChain;
    setAppId(id: string): PickerBuilderChain;
    setOrigin(o: string): PickerBuilderChain;
    setTitle(t: string): PickerBuilderChain;
    addView(v: unknown): PickerBuilderChain;
    setCallback(cb: (d: PickerCallbackData) => void): PickerBuilderChain;
    build(): { setVisible(v: boolean): void };
  };
  const PickerBuilder = pickerNs.PickerBuilder as new () => PickerBuilderChain;
  type DocsViewInst = {
    setParent(id: string): DocsViewInst;
    setMimeTypes(m: string): DocsViewInst;
    setIncludeFolders(b: boolean): DocsViewInst;
    setSelectFolderEnabled(b: boolean): DocsViewInst;
  };
  const DocsView = pickerNs.DocsView as new (viewId?: unknown) => DocsViewInst;
  const ViewId = pickerNs.ViewId as { DOCS: unknown };
  const Action = pickerNs.Action as { PICKED: string; CANCEL: string };
  const Response = pickerNs.Response as { ACTION: string; DOCUMENTS: string };

  let docsView: DocsViewInst = new DocsView(ViewId.DOCS);
  if (parentFolderId?.trim()) {
    docsView = docsView.setParent(parentFolderId.trim());
  }
  if (mimeTypes?.trim()) {
    docsView = docsView.setMimeTypes(mimeTypes.trim());
  }
  if (selectFolder) {
    docsView = docsView.setIncludeFolders(true);
    docsView = docsView.setSelectFolderEnabled(true);
  }

  const picker = new PickerBuilder()
    .setDeveloperKey(dk)
    .setOAuthToken(accessToken)
    .setAppId(appId.trim())
    .setOrigin(window.location.origin)
    .setTitle(title)
    .addView(docsView)
    .setCallback((data: PickerCallbackData) => {
      const actionKey = Response.ACTION;
      const docsKey = Response.DOCUMENTS;
      const action = data[actionKey] as string | undefined;
      if (action === Action.PICKED) {
        const raw = (data[docsKey] as Array<{ id?: string; name?: string; mimeType?: string }> | undefined) ?? [];
        const files: DrivePickerSelection[] = raw
          .map((d) => ({
            id: d.id ?? '',
            name: (d.name ?? '').trim() || 'Untitled',
            mimeType: d.mimeType,
          }))
          .filter((d) => d.id);
        if (files.length) onPicked(files);
      } else if (action === Action.CANCEL) {
        onCancel?.();
      }
    })
    .build();
  picker.setVisible(true);
}

export function readPickerDeveloperKey(): string {
  return (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim() ?? '';
}

export function readPickerAppId(): string | null {
  const cid = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';
  return googlePickerAppIdFromClientId(cid);
}

export type OpenEncoreGoogleDrivePickerOptions = Omit<OpenGoogleDrivePickerOptions, 'developerKey' | 'appId'>;

/** Same as {@link openGoogleDrivePicker} but fills `developerKey` / `appId` from Vite env. */
export async function openEncoreGoogleDrivePicker(options: OpenEncoreGoogleDrivePickerOptions): Promise<void> {
  return openGoogleDrivePicker({
    ...options,
    developerKey: readPickerDeveloperKey(),
    appId: readPickerAppId() ?? '',
  });
}
