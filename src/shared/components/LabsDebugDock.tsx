import React, { useCallback, useEffect, useRef, useState } from 'react';
import { copyLabsDebugBundleToClipboard } from '../debug/copyLabsDebugBundle';

export type LabsDebugDockLayout = 'toolbar-top' | 'log-first';

export type LabsDebugDockProps = {
  appId: string;
  /** Shown next to “Labs debug”; defaults to “Labs debug”. */
  title?: string;
  accentColor?: string;
  /** Controls next to Copy bundle (app-specific stats/actions). */
  toolbar?: React.ReactNode;
  /** Main scrollable body (timeline, help text, etc.). */
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  /**
   * `log-first`: expanded content above the toolbar (toolbar stays at bottom edge).
   * `toolbar-top`: toolbar first, then content (piano-style).
   */
  layout?: LabsDebugDockLayout;
  /** When set, dock outer height is written to this CSS variable (e.g. scales layout). */
  reportOuterHeightCssVar?: string;
};

const HEADER_H = 32;

/**
 * Shared chrome for URL-gated debug UIs: collapse, copy JSON bundle for LLM/IDE paste, app label.
 */
export default function LabsDebugDock({
  appId,
  title = 'Labs debug',
  accentColor = '#6366f1',
  toolbar,
  children,
  defaultCollapsed = false,
  layout = 'toolbar-top',
  reportOuterHeightCssVar,
}: LabsDebugDockProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  useEffect(() => {
    const name = reportOuterHeightCssVar;
    const el = rootRef.current;
    if (!name || !el) return;
    const sync = () => {
      document.documentElement.style.setProperty(name, `${el.offsetHeight}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(name);
    };
  }, [reportOuterHeightCssVar, collapsed, layout]);

  const onCopy = useCallback(async () => {
    try {
      await copyLabsDebugBundleToClipboard();
      setCopyHint('Copied');
      window.setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint('Copy failed');
      window.setTimeout(() => setCopyHint(null), 2000);
    }
  }, []);

  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        minHeight: HEADER_H,
        boxSizing: 'border-box',
        background: '#1e293b',
        cursor: 'pointer',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
      onClick={() => setCollapsed((c) => !c)}
      role="button"
      tabIndex={0}
      aria-expanded={!collapsed}
      aria-label="Toggle labs debug dock"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setCollapsed((c) => !c);
        }
      }}
    >
      <span style={{ color: accentColor, fontWeight: 700 }}>{title}</span>
      <span style={{ color: '#94a3b8', fontSize: 11 }}>{appId}</span>
      <div style={{ flex: 1 }} />
      {toolbar}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void onCopy();
        }}
        style={{
          background: accentColor,
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '2px 10px',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        Copy bundle
      </button>
      {copyHint ? <span style={{ color: '#94a3b8', fontSize: 11 }}>{copyHint}</span> : null}
      <span style={{ color: '#94a3b8' }} aria-hidden>
        {collapsed ? '▲' : '▼'}
      </span>
    </div>
  );

  const body = !collapsed ? (
    <div
      style={{
        flex: layout === 'log-first' ? 1 : undefined,
        minHeight: layout === 'log-first' ? 180 : undefined,
        maxHeight: layout === 'log-first' ? undefined : 220,
        overflow: 'auto',
        background: '#0f172a',
      }}
    >
      {children}
    </div>
  ) : null;

  const maxHeight = collapsed
    ? HEADER_H
    : layout === 'log-first'
      ? 'min(55vh, 420px)'
      : undefined;

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        maxHeight,
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        fontSize: 12,
        borderTop: `2px solid ${accentColor}`,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
      }}
    >
      {layout === 'log-first' ? (
        <>
          {body}
          {header}
        </>
      ) : (
        <>
          {header}
          {body}
        </>
      )}
    </div>
  );
}
