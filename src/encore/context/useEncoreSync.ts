import { useContext } from 'react';
import { EncoreSyncContext, type EncoreSyncContextValue } from './encoreSyncContextStore';

export function useEncoreSync(): EncoreSyncContextValue {
  const ctx = useContext(EncoreSyncContext);
  if (!ctx) throw new Error('useEncoreSync outside EncoreSyncProvider');
  return ctx;
}
