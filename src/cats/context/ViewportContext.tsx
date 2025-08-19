import React, { createContext } from 'react';

interface ViewportContextType {
  floorRatio: number;
  isResizing: boolean;
}

const ViewportContext = createContext<ViewportContextType>({
  floorRatio: 0.4,
  isResizing: false,
});

export const ViewportProvider: React.FC<{
  children: React.ReactNode;
  floorRatio: number;
  isResizing: boolean;
}> = ({ children, floorRatio, isResizing }) => {
  return (
    <ViewportContext.Provider value={{ floorRatio, isResizing }}>
      {children}
    </ViewportContext.Provider>
  );
};

// Note: useViewportState was removed as components now use useCoordinateSystem() hook directly
