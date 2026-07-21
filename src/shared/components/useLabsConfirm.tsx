import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LabsConfirmDialog } from './LabsConfirmDialog';

export interface LabsConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Drop-in async replacement for `window.confirm()` that renders a themed
 * dialog instead of the browser's native one. Preserves the same calling
 * shape (`await confirm(...)` resolves to a boolean) so existing
 * `if (!window.confirm(msg)) return;` guards migrate with a small diff:
 *
 * ```tsx
 * const { confirm, dialog } = useLabsConfirm();
 * // ...
 * if (!(await confirm({ title: 'Delete this?', message: 'This cannot be undone.' }))) return;
 * // ...
 * return <>{dialog}{...rest of the component}</>;
 * ```
 *
 * `open` reports whether a dialog is currently showing. Gate global keyboard
 * shortcuts on it — the native `confirm()` blocked the main thread, so
 * window-level hotkeys never fired while it was up; this dialog does not, so a
 * host that listens on `window` must suppress those keys itself while `open`.
 */
export function useLabsConfirm(): {
  confirm: (options: LabsConfirmOptions) => Promise<boolean>;
  dialog: ReactNode;
  open: boolean;
} {
  const [pending, setPending] = useState<LabsConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: LabsConfirmOptions): Promise<boolean> => {
    // A second prompt before the first resolves would strand the earlier
    // caller's `await` forever. Settle it as cancelled before taking over.
    resolverRef.current?.(false);
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback((result: boolean) => {
    setPending(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  // Unmounting mid-prompt should cancel, not hang the awaiting caller.
  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    []
  );

  const dialog = pending ? (
    <LabsConfirmDialog
      open
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      destructive={pending.destructive}
      onConfirm={() => resolve(true)}
      onCancel={() => resolve(false)}
    />
  ) : null;

  return { confirm, dialog, open: pending !== null };
}
