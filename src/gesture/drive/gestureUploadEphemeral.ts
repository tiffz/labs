import type { GesturePack } from '../types';

/** Upload ledger fields — local Dexie + manifest only; never authoritative from Drive sync. */
export function stripEphemeralUploadFields(pack: GesturePack): GesturePack {
  const next = { ...pack };
  delete next.uploadStatus;
  delete next.expectedFileCount;
  delete next.uploadedFileCount;
  delete next.uploadSourceFolderName;
  return next;
}

export function stripEphemeralUploadFieldsFromPayload(packs: GesturePack[]): GesturePack[] {
  return packs.map(stripEphemeralUploadFields);
}
