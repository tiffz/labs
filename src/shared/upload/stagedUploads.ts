/**
 * Staged uploads: the one rule for bringing a file into any Labs app (ADR 0030).
 *
 * Picking, dropping or pasting a file or link only STAGES it. Each staged item is checked and
 * shown with what will happen to it ("Copies into your Drive", "Saved on this device"). Nothing is
 * written to IndexedDB or Drive until the user confirms. An item that cannot be used stays in the
 * list with its reason, and is never written.
 *
 * Why a rule and not a per-surface choice: the owner pasted a Drive link expecting to review it,
 * and the upload had already started. Most surfaces wrote on pick or paste while one (the
 * performance editor) staged until Save, so nobody could predict which kind a surface was.
 *
 * This module is pure state. `useLabsStagedUploads` wraps it for React and `LabsStagedUploadPanel`
 * renders it, so the rule holds no matter which surface uses it.
 */

/** What the user brought in. */
export type LabsStagedUploadSource = { kind: 'file'; file: File } | { kind: 'link'; url: string };

/**
 * The app's verdict on one source, from `inspect`. `outcome` is the short line the row shows to say
 * where the item goes; `plan` is whatever the app needs to carry it out on confirm.
 */
export type LabsStagedUploadInspection<TPlan> =
  | {
      ok: true;
      name: string;
      mimeType: string | null;
      /** `null` when unknown (a Drive link whose size Drive did not report). Never shown as 0. */
      sizeBytes: number | null;
      outcome: string;
      plan: TPlan;
    }
  | { ok: false; name: string; message: string };

export type LabsStagedUpload<TPlan> = { id: string; source: LabsStagedUploadSource } & (
  | { status: 'checking'; name: string }
  | {
      status: 'ready';
      name: string;
      mimeType: string | null;
      sizeBytes: number | null;
      outcome: string;
      plan: TPlan;
    }
  | { status: 'rejected'; name: string; message: string }
);

export type LabsReadyStagedUpload<TPlan> = Extract<LabsStagedUpload<TPlan>, { status: 'ready' }>;

/** Best name to show before `inspect` answers. */
export function stagedSourceName(source: LabsStagedUploadSource): string {
  return source.kind === 'file' ? source.file.name : source.url.trim();
}

export function stageSources<TPlan>(
  items: readonly LabsStagedUpload<TPlan>[],
  sources: readonly LabsStagedUploadSource[],
  newId: () => string,
): { items: LabsStagedUpload<TPlan>[]; added: LabsStagedUpload<TPlan>[] } {
  const added = sources.map(
    (source): LabsStagedUpload<TPlan> => ({
      id: newId(),
      source,
      status: 'checking',
      name: stagedSourceName(source),
    }),
  );
  return { items: [...items, ...added], added };
}

/**
 * Record `inspect`'s answer. Ignores an id that was removed meanwhile, so a slow check cannot bring
 * back an item the user already took out.
 */
export function resolveStagedUpload<TPlan>(
  items: readonly LabsStagedUpload<TPlan>[],
  id: string,
  inspection: LabsStagedUploadInspection<TPlan>,
): LabsStagedUpload<TPlan>[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    if (!inspection.ok) {
      return { id, source: item.source, status: 'rejected', name: inspection.name, message: inspection.message };
    }
    return {
      id,
      source: item.source,
      status: 'ready',
      name: inspection.name,
      mimeType: inspection.mimeType,
      sizeBytes: inspection.sizeBytes,
      outcome: inspection.outcome,
      plan: inspection.plan,
    };
  });
}

export function removeStagedUpload<TPlan>(
  items: readonly LabsStagedUpload<TPlan>[],
  id: string,
): LabsStagedUpload<TPlan>[] {
  return items.filter((item) => item.id !== id);
}

export function readyStagedUploads<TPlan>(
  items: readonly LabsStagedUpload<TPlan>[],
): LabsReadyStagedUpload<TPlan>[] {
  return items.filter((item): item is LabsReadyStagedUpload<TPlan> => item.status === 'ready');
}

/**
 * Confirm is offered only when every item has been checked and at least one can be added. Waiting
 * for the checks means the button never commits a list the user has not finished seeing.
 */
export function canConfirmStagedUploads<TPlan>(items: readonly LabsStagedUpload<TPlan>[]): boolean {
  return items.some((item) => item.status === 'ready') && !items.some((item) => item.status === 'checking');
}

/** "1.2 MB". `null` (unknown) yields `null` so the caller omits it rather than printing "0 B". */
export function formatStagedUploadSize(bytes: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
