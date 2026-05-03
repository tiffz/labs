export const ENCORE_ROOT_FOLDER = 'Encore_App';
export const ENCORE_PERFORMANCES_FOLDER = 'Performances';
export const ENCORE_SHEET_MUSIC_FOLDER = 'SheetMusic';
export const ENCORE_RECORDINGS_FOLDER = 'Song recordings';
export const REPERTOIRE_FILE_NAME = 'repertoire_data.json';
export const PUBLIC_SNAPSHOT_FILE_NAME = 'public_snapshot.json';

/**
 * Sharded repertoire layout (Phase 5). The folder lives under `Encore_App/<SHARDED>/`
 * and contains a small `manifest.json` (row id → shard fileId index) plus per-row JSON files
 * grouped into `song/`, `performance/`, and `extras/` subfolders. Behind
 * `VITE_ENCORE_SHARDED_SYNC` until per-row push/pull is fully wired in production.
 */
export const ENCORE_SHARDED_REPERTOIRE_FOLDER = 'repertoire';
export const ENCORE_SHARDED_MANIFEST_FILE = 'manifest.json';
export const ENCORE_SHARDED_SONG_FOLDER = 'song';
export const ENCORE_SHARDED_PERFORMANCE_FOLDER = 'performance';
export const ENCORE_SHARDED_EXTRAS_FOLDER = 'extras';
export const ENCORE_SHARDED_EXTRAS_FILE = 'default.json';
