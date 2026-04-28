declare global {
  interface Window {
    /** Optional app-specific blob included in {@link copyLabsDebugBundleToClipboard}. */
    __LABS_DEBUG__?: unknown;
  }
}

export type LabsDebugBundle = {
  version: 1;
  capturedAt: string;
  href: string;
  userAgent: string;
  /** Present when {@link Window.__LABS_DEBUG__} was set by the host app. */
  appPayload?: unknown;
};

export function buildLabsDebugBundle(): LabsDebugBundle {
  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    href: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    appPayload: typeof window !== 'undefined' ? window.__LABS_DEBUG__ : undefined,
  };
}

/** Serializes a small JSON bundle for pasting into an IDE or LLM session. */
export async function copyLabsDebugBundleToClipboard(): Promise<void> {
  const text = JSON.stringify(buildLabsDebugBundle(), null, 2);
  await navigator.clipboard.writeText(text);
}
