import { describe, expect, it, beforeEach } from 'vitest';
import { readInitialStanzaViewerIntent } from './readInitialStanzaViewerIntent';

describe('readInitialStanzaViewerIntent', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/stanza/');
    localStorage.clear();
  });

  it('expects viewer shell when last selected id is stored', () => {
    localStorage.setItem('stanza_last_selected_song_id', 'song-abc');
    const intent = readInitialStanzaViewerIntent();
    expect(intent.initialSelectedId).toBe('song-abc');
    expect(intent.expectViewerShell).toBe(true);
  });

  it('prefers youtube deep link over last selected', () => {
    localStorage.setItem('stanza_last_selected_song_id', 'song-abc');
    window.history.replaceState({}, '', '/stanza/?v=dQw4w9WgXcQ');
    const intent = readInitialStanzaViewerIntent();
    expect(intent.initialSelectedId).toBeNull();
    expect(intent.expectViewerShell).toBe(true);
  });
});
