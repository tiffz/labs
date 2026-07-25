import { useState } from 'react';
import Typography from '@mui/material/Typography';
import LabsDebugButton from './LabsDebugButton';

export interface LabsDebugDangerAction {
  label: string;
  /**
   * Shown in `window.confirm` before the action runs. Required: a danger action always
   * confirms, so there is no path to a silent destructive call.
   */
  confirmMessage: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  /**
   * `muted` de-emphasizes a secondary destructive action next to a louder one (e.g. a
   * "clear everything" nuke you don't want to be the eye's first target). Default `danger`.
   */
  emphasis?: 'danger' | 'muted';
}

export interface LabsDebugDangerZoneProps {
  actions: LabsDebugDangerAction[];
  /** Hide the buttons behind a disclosure toggle. Default true. */
  collapsible?: boolean;
  /** Warning line above the buttons. */
  warning?: string;
  /** Disclosure toggle label when collapsible. */
  toggleLabel?: string;
}

/**
 * Confirm-gated destructive actions for a `LabsDebugDock` (clear-localStorage, wipe-library).
 * Every action routes through `window.confirm` here, so the confirm-before-destroy invariant
 * lives in one place instead of being re-implemented per app. Full-tier only — never render
 * this on the `diagnostics` tier (gate with `isLabsDebugFull`).
 */
export default function LabsDebugDangerZone({
  actions,
  collapsible = true,
  warning = 'These actions delete browser-stored data. Lost progress may not be recoverable.',
  toggleLabel = 'Local storage',
}: LabsDebugDangerZoneProps): React.ReactElement {
  const [open, setOpen] = useState(!collapsible);

  const run = async (action: LabsDebugDangerAction): Promise<void> => {
    if (!window.confirm(action.confirmMessage)) return;
    await action.onConfirm();
  };

  const inner = (
    <>
      <Typography
        component="p"
        sx={{ m: 0, mb: 1, fontSize: 10, lineHeight: 1.45, color: '#fca5a5' }}
      >
        {warning}
      </Typography>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {actions.map((action) => (
          <LabsDebugButton
            key={action.label}
            variant={action.emphasis ?? 'danger'}
            stopPropagation={false}
            disabled={action.disabled}
            onClick={() => void run(action)}
          >
            {action.label}
          </LabsDebugButton>
        ))}
      </div>
    </>
  );

  return (
    <div style={{ borderTop: '1px solid #334155', padding: '8px 12px', background: '#0f172a' }}>
      {collapsible ? (
        <>
          <LabsDebugButton
            stopPropagation={false}
            style={{ color: '#94a3b8', border: 'none', padding: '2px 0' }}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? '▼' : '▶'} {toggleLabel}
          </LabsDebugButton>
          {open ? <div style={{ marginTop: 8 }}>{inner}</div> : null}
        </>
      ) : (
        inner
      )}
    </div>
  );
}
