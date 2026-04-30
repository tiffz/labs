const STORAGE_KEY = 'encore_spotify_privacy_ack_v1';

export function hasSpotifyPrivacyAck(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSpotifyPrivacyAck(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}
