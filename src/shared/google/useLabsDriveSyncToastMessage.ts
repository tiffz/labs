import { useEffect, useState } from 'react';
import { labsDriveSyncMessageIsTransientSuccess } from '../drive/labsDriveSyncMessages';

/**
 * Routes transient Drive sync success copy out of the account menu and into a dismissible toast.
 */
export function useLabsDriveSyncToastMessage(
  message: string | null | undefined,
  onDismissMessage?: () => void,
): { toastMessage: string | null; clearToast: () => void } {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    if (!labsDriveSyncMessageIsTransientSuccess(message)) return;
    setToastMessage(message);
    onDismissMessage?.();
  }, [message, onDismissMessage]);

  return {
    toastMessage,
    clearToast: () => setToastMessage(null),
  };
}
