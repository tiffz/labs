import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachTransportVisibilityGuard } from './transportVisibility';

describe('attachTransportVisibilityGuard', () => {
  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('calls onHidden when the tab becomes hidden and onVisible when shown again', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    const onHidden = vi.fn();
    const onVisible = vi.fn();
    const detach = attachTransportVisibilityGuard({ onHidden, onVisible });

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onHidden).toHaveBeenCalledOnce();
    expect(onVisible).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onVisible).toHaveBeenCalledOnce();

    detach();
  });
});
