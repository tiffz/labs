/* eslint-disable react-refresh/only-export-components -- context + hooks live together */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ScalesSessionDebugApi } from './scalesSessionDebugTypes';

type BridgeValue = {
  sessionApi: ScalesSessionDebugApi | null;
  setSessionApi: (api: ScalesSessionDebugApi | null) => void;
};

const ScalesSessionDebugBridgeContext = createContext<BridgeValue | null>(null);

export function ScalesSessionDebugBridgeProvider({ children }: { children: ReactNode }) {
  const [sessionApi, setSessionApi] = useState<ScalesSessionDebugApi | null>(null);
  const value = useMemo(
    () => ({ sessionApi, setSessionApi }),
    [sessionApi],
  );
  return (
    <ScalesSessionDebugBridgeContext.Provider value={value}>
      {children}
    </ScalesSessionDebugBridgeContext.Provider>
  );
}

export function useScalesSessionDebugBridge(): BridgeValue {
  const ctx = useContext(ScalesSessionDebugBridgeContext);
  if (!ctx) {
    throw new Error('useScalesSessionDebugBridge requires ScalesSessionDebugBridgeProvider');
  }
  return ctx;
}
