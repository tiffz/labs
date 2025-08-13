import React from 'react';
import { catCoordinateSystem as defaultInstance } from '../services/CatCoordinateSystem';

const CoordinateSystemContext = React.createContext(defaultInstance);

// Internal hook (removed to avoid unused symbol until needed)

export const CoordinateSystemProvider: React.FC<{ children: React.ReactNode }>= ({ children }) => {
  // For now we pass the singleton; later we can construct an instance
  return (
    <CoordinateSystemContext.Provider value={defaultInstance}>
      {children}
    </CoordinateSystemContext.Provider>
  );
};

// no named exports besides provider to keep API minimal


