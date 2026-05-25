import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

export type AppShellLayoutProps = {
  /** Outermost shell (flex column, min-height 0). Default: `app-shell-root`. */
  rootClassName?: string;
  /** Page column with max width + gutter. Default: `app-shell-column`. */
  columnClassName?: string;
  /** Fixed-width content block (grid + footer). Default: `app-shell-workbench`. */
  workbenchClassName?: string;
  /** Scroll region above footer. Default: `app-shell-scroll`. */
  scrollClassName?: string;
  /** Primary content wrapper inside scroll. Default: `app-shell-content`. */
  contentClassName?: string;
  /** Optional banner row above header (alerts, deep-link notices). */
  alerts?: ReactNode;
  /** Header row (title, nav, account). */
  header?: ReactNode;
  /** Scrollable main content (grid, editor, etc.). */
  children: ReactNode;
  /** Footer panel below scroll (library, status). */
  footer?: ReactNode;
};

/**
 * Shared column → workbench → scroll → content + footer shell.
 *
 * Pair with `app-shell-layout.css` and app-specific token overrides.
 * Stanza uses {@link StanzaViewerLayout} which maps Stanza class names onto this structure.
 */
export function AppShellLayout({
  rootClassName = 'app-shell-root',
  columnClassName = 'app-shell-column',
  workbenchClassName = 'app-shell-workbench',
  scrollClassName = 'app-shell-scroll',
  contentClassName = 'app-shell-content',
  alerts,
  header,
  children,
  footer,
}: AppShellLayoutProps) {
  return (
    <Box className={rootClassName}>
      <Box className={columnClassName}>
        {alerts != null ? (
          <Box sx={{ pt: 1, flexShrink: 0 }}>{alerts}</Box>
        ) : null}
        {header}
        <Box className={workbenchClassName}>
          <Box className={scrollClassName}>
            <Box className={contentClassName}>{children}</Box>
          </Box>
          {footer}
        </Box>
      </Box>
    </Box>
  );
}
