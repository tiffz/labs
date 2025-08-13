import React from 'react';
import { World } from '../engine';
import { WorldContext } from './WorldContextCore';

export const useWorld = (): World => {
  const ctx = React.useContext(WorldContext);
  if (ctx) return ctx;
  if (!(useWorld as unknown as { __fallback?: World }).__fallback) {
    (useWorld as unknown as { __fallback?: World }).__fallback = new World();
  }
  return (useWorld as unknown as { __fallback?: World }).__fallback!;
};


