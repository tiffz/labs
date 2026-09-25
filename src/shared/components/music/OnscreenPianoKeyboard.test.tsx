// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OnscreenPianoKeyboard from './OnscreenPianoKeyboard';

/**
 * These cover WCAG 2.1.1 (Keyboard) for an instrument, which is a stricter
 * contract than "the button is focusable": a key must SOUND on press and STOP
 * on release, and it must not get stuck sounding when focus leaves mid-note.
 *
 * The component shipped with `onPointerDown` only, so every key was a focusable
 * button that did nothing when you pressed Space on it — worse than an inert
 * control, because it advertised itself as operable.
 */
function setup() {
  const onNoteOn = vi.fn();
  const onNoteOff = vi.fn();
  render(<OnscreenPianoKeyboard octaves={[4]} onNoteOn={onNoteOn} onNoteOff={onNoteOff} />);
  // C4 = MIDI 60.
  const c4 = screen.getByRole('button', { name: /^C4$/ });
  return { onNoteOn, onNoteOff, c4 };
}

describe('OnscreenPianoKeyboard keyboard operation', () => {
  it.each([' ', 'Enter'])('sounds a note on %s and releases it on key up', (key) => {
    const { onNoteOn, onNoteOff, c4 } = setup();

    fireEvent.keyDown(c4, { key });
    expect(onNoteOn).toHaveBeenCalledWith(60);
    expect(onNoteOff).not.toHaveBeenCalled();

    fireEvent.keyUp(c4, { key });
    expect(onNoteOff).toHaveBeenCalledWith(60);
  });

  it('holds one note rather than restriking it while the key auto-repeats', () => {
    const { onNoteOn, c4 } = setup();
    fireEvent.keyDown(c4, { key: ' ' });
    fireEvent.keyDown(c4, { key: ' ', repeat: true });
    fireEvent.keyDown(c4, { key: ' ', repeat: true });
    expect(onNoteOn).toHaveBeenCalledTimes(1);
  });

  it('ignores keys that are not Space or Enter', () => {
    const { onNoteOn, c4 } = setup();
    fireEvent.keyDown(c4, { key: 'Tab' });
    fireEvent.keyDown(c4, { key: 'a' });
    expect(onNoteOn).not.toHaveBeenCalled();
  });

  /**
   * The worst failure available here: tab away mid-note and no `keyup` ever
   * arrives, so the note drones until the page is reloaded.
   */
  it('releases a held note when focus leaves', () => {
    const { onNoteOff, c4 } = setup();
    fireEvent.keyDown(c4, { key: ' ' });
    fireEvent.blur(c4);
    expect(onNoteOff).toHaveBeenCalledWith(60);
  });

  it('does not release a note it never sounded', () => {
    const { onNoteOff, c4 } = setup();
    fireEvent.keyUp(c4, { key: ' ' });
    fireEvent.blur(c4);
    // A stray keyup must not cut a note being sounded by MIDI or by playback.
    expect(onNoteOff).not.toHaveBeenCalled();
  });

  it('releases a blurred note only once', () => {
    const { onNoteOff, c4 } = setup();
    fireEvent.keyDown(c4, { key: ' ' });
    fireEvent.blur(c4);
    fireEvent.keyUp(c4, { key: ' ' });
    expect(onNoteOff).toHaveBeenCalledTimes(1);
  });

  it('tracks each key separately', () => {
    const { onNoteOn, onNoteOff } = setup();
    const d4 = screen.getByRole('button', { name: /^D4$/ });
    const e4 = screen.getByRole('button', { name: /^E4$/ });
    fireEvent.keyDown(d4, { key: ' ' });
    fireEvent.keyDown(e4, { key: ' ' });
    expect(onNoteOn.mock.calls.map(([m]) => m)).toEqual([62, 64]);
    fireEvent.keyUp(e4, { key: ' ' });
    expect(onNoteOff.mock.calls.map(([m]) => m)).toEqual([64]);
  });

  it('reaches the black keys too', () => {
    const { onNoteOn } = setup();
    fireEvent.keyDown(screen.getByRole('button', { name: /^C#4$/ }), { key: ' ' });
    expect(onNoteOn).toHaveBeenCalledWith(61);
  });
});

describe('OnscreenPianoKeyboard pointer operation', () => {
  /**
   * `setPointerCapture` throws `InvalidPointerId` when the pointer is already
   * up — a real case on a fast tap. It used to run BEFORE `onNoteOn`, so the
   * throw ate the note and the key was silent.
   */
  it('still sounds the note when pointer capture is unavailable', () => {
    const onNoteOn = vi.fn();
    render(<OnscreenPianoKeyboard octaves={[4]} onNoteOn={onNoteOn} onNoteOff={vi.fn()} />);
    const c4 = screen.getByRole('button', { name: /^C4$/ });
    c4.setPointerCapture = () => {
      throw new DOMException('InvalidPointerId');
    };
    fireEvent.pointerDown(c4, { pointerId: 1 });
    expect(onNoteOn).toHaveBeenCalledWith(60);
  });

  it('releases the note even when capture release throws', () => {
    const onNoteOff = vi.fn();
    render(<OnscreenPianoKeyboard octaves={[4]} onNoteOn={vi.fn()} onNoteOff={onNoteOff} />);
    const c4 = screen.getByRole('button', { name: /^C4$/ });
    c4.hasPointerCapture = () => true;
    c4.releasePointerCapture = () => {
      throw new DOMException('InvalidPointerId');
    };
    fireEvent.pointerDown(c4, { pointerId: 1 });
    fireEvent.pointerUp(c4, { pointerId: 1 });
    expect(onNoteOff).toHaveBeenCalledWith(60);
  });
});
