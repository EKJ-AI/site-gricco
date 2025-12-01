// src/shared/contexts/LayoutContext.js
import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';

const LayoutContext = createContext();

const DEFAULT_LAYOUT_STATE = {
  transparentNavbar: true,
  showTopBar: true,
  showLeftSidebar: true,
  showRightPanel: false,
  pageTitle: '',
};

export function LayoutProvider({ children }) {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT_STATE);

  const setLayoutState = useCallback((partial) => {
    setLayout((prev) => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT_STATE);
  }, []);

  const value = useMemo(
    () => ({
      layout,
      setLayout: setLayoutState,
      resetLayout,
    }),
    [layout, setLayoutState, resetLayout]
  );

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayout deve ser usado dentro de <LayoutProvider>');
  }
  return ctx;
}
