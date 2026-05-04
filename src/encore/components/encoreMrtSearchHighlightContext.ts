import { createContext } from 'react';

/**
 * Debounced search string for Encore MRT tables (Repertoire, Performances). Use with
 * `useContext` inside column `Cell` renderers so `columns` `useMemo` does not depend on the
 * debounced query (stable column defs; avoids MRT column-order churn).
 */
export const EncoreMrtSearchHighlightContext = createContext('');
