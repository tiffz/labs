// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { useMaterialReactTable, type MRT_RowVirtualizer, type MRT_TableInstance } from 'material-react-table';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { LabsMaterialReactTable } from './LabsMaterialReactTable';

type Row = { title: string };
const DATA: Row[] = Array.from({ length: 50 }, (_, i) => ({ title: `Song ${i}` }));

let latest: {
  table: MRT_TableInstance<Row>;
  virtualizer: { current: MRT_RowVirtualizer<HTMLDivElement, HTMLTableRowElement> | null };
  setShown: (shown: boolean) => void;
} | null = null;

/*
 * Mirrors Encore's library: one table instance lives in the screen, and the table itself
 * unmounts while the card view shows. No StrictMode on purpose: StrictMode re-runs layout
 * effects after refs attach, which hides the bug. Production has no second run.
 */
function Screen(): ReactElement {
  const [shown, setShown] = useState(true);
  const virtualizer = useRef<MRT_RowVirtualizer<HTMLDivElement, HTMLTableRowElement> | null>(null);
  const table = useMaterialReactTable<Row>({
    columns: [{ accessorKey: 'title', header: 'Title' }],
    data: DATA,
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: virtualizer,
  });
  useEffect(() => {
    latest = { table, virtualizer, setShown };
  }, [table]);
  return shown ? <LabsMaterialReactTable table={table} /> : <p>Cards</p>;
}

describe('LabsMaterialReactTable', () => {
  it('binds the row virtualizer to the live container after an unmount and remount', () => {
    render(<Screen />);
    const firstContainer = latest!.table.refs.tableContainerRef.current;
    expect(firstContainer?.isConnected).toBe(true);

    act(() => latest!.setShown(false));
    act(() => latest!.setShown(true));

    const container = latest!.table.refs.tableContainerRef.current;
    expect(container).not.toBe(firstContainer);
    expect(container?.isConnected).toBe(true);
    // The bug: the virtualizer kept scrolling the detached first container, measured 0, drew nothing.
    expect(latest!.virtualizer.current?.scrollElement).toBe(container);
  });

  it('drops the container on unmount so a detached table is not kept alive', () => {
    render(<Screen />);
    act(() => latest!.setShown(false));
    expect(latest!.table.refs.tableContainerRef.current).toBeNull();
  });
});
