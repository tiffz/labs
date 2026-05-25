import type { ReactNode } from 'react';
import { AppShellLayout } from '../../shared/layout/AppShellLayout';

export type StanzaViewerLayoutProps = {
  alerts?: ReactNode;
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

/** Stanza song viewer shell — maps shared AppShellLayout to stanza-viewer-* CSS. */
export function StanzaViewerLayout({ alerts, header, children, footer }: StanzaViewerLayoutProps) {
  return (
    <AppShellLayout
      rootClassName="stanza-viewer-shell"
      columnClassName="stanza-viewer-column"
      workbenchClassName="stanza-viewer-workbench"
      scrollClassName="stanza-viewer-scroll"
      contentClassName="stanza-viewer-body-grid"
      alerts={alerts}
      header={header}
      footer={footer}
    >
      {children}
    </AppShellLayout>
  );
}
