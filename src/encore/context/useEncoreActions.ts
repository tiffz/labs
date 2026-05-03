import { useContext } from 'react';
import { EncoreActionsContext, type EncoreActionsContextValue } from './EncoreActionsContext';

export function useEncoreActions(): EncoreActionsContextValue {
  const ctx = useContext(EncoreActionsContext);
  if (!ctx) throw new Error('useEncoreActions outside EncoreActionsProvider');
  return ctx;
}
