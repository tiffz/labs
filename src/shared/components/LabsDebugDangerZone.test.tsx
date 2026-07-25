import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LabsDebugDangerZone from './LabsDebugDangerZone';

afterEach(() => vi.restoreAllMocks());

describe('LabsDebugDangerZone', () => {
  it('runs a destructive action only after window.confirm returns true', () => {
    const onConfirm = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <LabsDebugDangerZone
        collapsible={false}
        actions={[{ label: 'Wipe it', confirmMessage: 'Sure?', onConfirm }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Wipe it' }));
    expect(window.confirm).toHaveBeenCalledWith('Sure?');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does NOT run the action when confirm is dismissed (no silent destroy)', () => {
    const onConfirm = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <LabsDebugDangerZone
        collapsible={false}
        actions={[{ label: 'Wipe it', confirmMessage: 'Sure?', onConfirm }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Wipe it' }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('hides the destructive actions behind a disclosure toggle by default', () => {
    render(
      <LabsDebugDangerZone actions={[{ label: 'Wipe it', confirmMessage: 'Sure?', onConfirm: vi.fn() }]} />,
    );
    expect(screen.queryByRole('button', { name: 'Wipe it' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Local storage/ }));
    expect(screen.getByRole('button', { name: 'Wipe it' })).toBeInTheDocument();
  });
});
