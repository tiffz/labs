import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLabsConfirm, type LabsConfirmOptions } from './useLabsConfirm';

type Harness = {
  confirm: (options: LabsConfirmOptions) => Promise<boolean>;
  open: boolean;
};

function renderConfirm() {
  const ref: { current: Harness | null } = { current: null };
  function Host() {
    const { confirm, dialog, open } = useLabsConfirm();
    ref.current = { confirm, open };
    return <>{dialog}</>;
  }
  const view = render(<Host />);
  return { ref, view };
}

const OPTS: LabsConfirmOptions = { title: 'Delete this?', message: 'This cannot be undone.' };

describe('useLabsConfirm', () => {
  it('reports open only while a prompt is pending', async () => {
    const { ref } = renderConfirm();
    expect(ref.current?.open).toBe(false);

    let pending!: Promise<boolean>;
    act(() => {
      pending = ref.current!.confirm(OPTS);
    });
    expect(ref.current?.open).toBe(true);

    // Confirming closes the dialog and resolves true.
    const button = document.body.querySelector('button:last-of-type') as HTMLButtonElement;
    await act(async () => {
      button.click();
      await pending;
    });
    expect(ref.current?.open).toBe(false);
    await expect(pending).resolves.toBe(true);
  });

  it('cancels the earlier promise when a second prompt opens before it resolves', async () => {
    const { ref } = renderConfirm();
    let first!: Promise<boolean>;
    act(() => {
      first = ref.current!.confirm(OPTS);
    });
    // A second confirm before dismissing the first must settle the first as
    // cancelled, not strand its awaiter forever.
    act(() => {
      void ref.current!.confirm({ ...OPTS, title: 'A different thing?' });
    });
    await expect(first).resolves.toBe(false);
    expect(ref.current?.open).toBe(true);
  });

  it('cancels a pending prompt on unmount instead of hanging', async () => {
    const { ref, view } = renderConfirm();
    let pending!: Promise<boolean>;
    act(() => {
      pending = ref.current!.confirm(OPTS);
    });
    act(() => {
      view.unmount();
    });
    await expect(pending).resolves.toBe(false);
  });
});
