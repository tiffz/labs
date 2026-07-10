import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';

/** Primary local blob identity: id + size (omit MIME — Drive/Dexie hydrate can flip type). */
export function stanzaPrimaryLocalBlobKey(selected: StanzaSong | null): string {
  if (!selected?.localAudioBlob) return '';
  return `${selected.id}:${selected.localAudioBlob.size}`;
}

/**
 * Sorted stem id+size list so library order / Dexie array order does not churn object URLs.
 */
export function stanzaStemBlobIdentityKeySorted(stems: StanzaStemTrack[] | undefined): string {
  if (!stems?.length) return '';
  return [...stems]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => `${s.id}:${s.localBlob.size}`)
    .join('\0');
}

/**
 * Full stem graph identity for Web Audio + blob URL lifecycle (sorted stem entries).
 * Includes {@link stanzaPrimaryLocalBlobKey} so primary `blob:` churn (e.g. Dexie rehydrate) does not
 * leave a Web Audio graph on `volume === 0` while the `<audio>` / `<video>` `src` has been replaced.
 */
export function stanzaStemUrlKeyFromSong(selected: StanzaSong | null): string {
  if (!selected || !(selected.stems?.length ?? 0)) return '';
  const sorted = [...selected.stems!].sort((a, b) => a.id.localeCompare(b.id));
  const stemPart = [selected.id, ...sorted.map((s) => `${s.id}:${s.localBlob.size}`)].join('\0');
  const primary = stanzaPrimaryLocalBlobKey(selected);
  return primary ? `${primary}\0${stemPart}` : stemPart;
}
