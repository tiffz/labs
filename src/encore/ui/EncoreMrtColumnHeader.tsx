import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { MRT_Column, MRT_RowData } from 'material-react-table';
import { useCallback, type MouseEvent, type ReactElement, type RefObject } from 'react';
import type { EncoreFilterChipBarHandle } from './EncoreFilterChipBar';

/**
 * Column header: single-line label (ellipsis) grows across the header row; Filter / Hide icons are
 * absolutely positioned at the trailing edge (just left of the sort affordance when present) so they
 * stay right-aligned and overlap text as little as possible. No extra width is reserved while hidden.
 */
export type EncoreMrtColumnHeaderProps<TData extends MRT_RowData> = {
  label: string;
  /** Shown on hover when the header label is abbreviated in the column UI. */
  tooltipTitle?: string;
  /** Column instance from MRT's `Header` render prop; needed for hide + filter wiring. */
  column?: MRT_Column<TData, unknown>;
  /** Filter bar handle so "Filter" can open the matching chip bar field directly. */
  filterBarRef?: RefObject<EncoreFilterChipBarHandle | null>;
  /** Optional override for the encore filter field id (defaults to `column.columnDef.meta.encoreFilterFieldId`). */
  filterFieldId?: string;
};

export function EncoreMrtColumnHeader<TData extends MRT_RowData>(
  props: EncoreMrtColumnHeaderProps<TData>,
): ReactElement {
  const { label, tooltipTitle, column, filterBarRef, filterFieldId } = props;

  const meta = column?.columnDef.meta as { encoreFilterFieldId?: string } | undefined;
  const fieldId = filterFieldId ?? meta?.encoreFilterFieldId;
  const canFilter = Boolean(fieldId && filterBarRef);
  const canHide = Boolean(column?.getCanHide?.());

  const onFilterClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!fieldId || !filterBarRef) return;
      filterBarRef.current?.openFieldMenu(fieldId, e.currentTarget);
    },
    [fieldId, filterBarRef],
  );

  const onHideClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      column?.toggleVisibility?.(false);
    },
    [column],
  );

  const labelEl = (
    <Typography
      component="span"
      variant="inherit"
      sx={{
        display: 'block',
        minWidth: 0,
        width: '100%',
        color: 'inherit',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: 1.25,
      }}
    >
      {label}
    </Typography>
  );

  return (
    <Box
      className="encore-mrt-col-header"
      sx={{
        position: 'relative',
        flex: '1 1 0%',
        minWidth: 0,
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        '& .encore-col-header-actions': {
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 120ms ease, box-shadow 120ms ease',
        },
        '&:hover .encore-col-header-actions, &:focus-within .encore-col-header-actions': {
          opacity: 1,
          pointerEvents: 'auto',
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderRadius: 1,
        },
      }}
    >
      {tooltipTitle ? (
        <Tooltip title={tooltipTitle} enterDelay={350}>
          <Box
            component="span"
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'block',
              overflow: 'hidden',
              pr: canFilter || canHide ? 0.5 : 0,
            }}
          >
            {labelEl}
          </Box>
        </Tooltip>
      ) : (
        <Box
          component="span"
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'block',
            overflow: 'hidden',
            pr: canFilter || canHide ? 0.5 : 0,
          }}
        >
          {labelEl}
        </Box>
      )}
      {canFilter || canHide ? (
        <Box
          className="encore-col-header-actions"
          sx={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1,
            display: 'inline-flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.25,
          }}
        >
          {canFilter ? (
            <Tooltip title={`Filter ${label}`}>
              <IconButton
                size="small"
                aria-label={`Filter ${label}`}
                onClick={onFilterClick}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  p: 0.25,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                }}
              >
                <FilterListIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          {canHide ? (
            <Tooltip title={`Hide ${label}`}>
              <IconButton
                size="small"
                aria-label={`Hide ${label}`}
                onClick={onHideClick}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  p: 0.25,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                }}
              >
                <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
