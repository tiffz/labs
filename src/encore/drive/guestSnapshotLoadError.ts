/** Typed failures for guest snapshot loads — UI maps kinds to copy (dev setup vs generic). */
export type GuestSnapshotErrorKind = 'dev_missing_api_key' | 'not_configured';

export class GuestSnapshotLoadError extends Error {
  readonly kind: GuestSnapshotErrorKind;

  constructor(kind: GuestSnapshotErrorKind, message?: string) {
    super(message ?? guestSnapshotErrorMessage(kind));
    this.name = 'GuestSnapshotLoadError';
    this.kind = kind;
  }
}

export function guestSnapshotErrorMessage(kind: GuestSnapshotErrorKind): string {
  switch (kind) {
    case 'dev_missing_api_key':
      return 'Guest snapshots need a Google browser API key in local dev.';
    case 'not_configured':
      return 'This site is not configured to open shared snapshots.';
    default:
      return 'Could not load this snapshot.';
  }
}

export function guestSnapshotErrorKindFromUnknown(error: unknown): GuestSnapshotErrorKind | 'generic' {
  if (error instanceof GuestSnapshotLoadError) return error.kind;
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === 'MISSING_API_KEY'
  ) {
    return 'dev_missing_api_key';
  }
  return 'generic';
}

/** Dev-only setup steps (missing API key / dev proxy 503). Never show in production builds. */
export function shouldShowGuestSnapshotDevSetup(kind: GuestSnapshotErrorKind | 'generic' | null): boolean {
  return import.meta.env.DEV && kind === 'dev_missing_api_key';
}
