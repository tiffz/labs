import type { ButtonHTMLAttributes, CSSProperties } from 'react';

/**
 * The one button style for `LabsDebugDock` toolbars and bodies. Apps kept copy-pasting a
 * `DEBUG_BTN` / `DEBUG_BTN_DANGER` CSSProperties pair; this is the shared source of truth.
 *
 * Debug controls live inside the dock header, whose click toggles collapse — so clicks stop
 * propagating by default. Pass `stopPropagation={false}` for a body button outside the header.
 */
const BASE: CSSProperties = {
  background: 'transparent',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 3,
  padding: '2px 8px',
  fontSize: 10,
  cursor: 'pointer',
};

const DANGER: CSSProperties = {
  ...BASE,
  color: '#fecaca',
  borderColor: '#991b1b',
  background: 'rgba(127, 29, 29, 0.35)',
};

export interface LabsDebugButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger';
  /** Stop the click from bubbling to the dock header (which toggles collapse). Default true. */
  stopPropagation?: boolean;
}

export default function LabsDebugButton({
  variant = 'default',
  stopPropagation = true,
  style,
  onClick,
  children,
  ...rest
}: LabsDebugButtonProps) {
  return (
    <button
      type="button"
      style={{ ...(variant === 'danger' ? DANGER : BASE), ...style }}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
