import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { DragEvent, ReactElement } from 'react';
import AppTooltip from '../../../shared/components/AppTooltip';
import {
  parsePracticeResourceDragId,
  sectionAcceptsPracticeResourceDrag,
} from '../../repertoire/practiceResourceDragIds';
import {
  encoreHairline,
  practiceResourceSectionGridSx,
  practiceResourceSectionLabelRailSx,
  practiceResourceSectionLabelSx,
  practiceResourceSectionMetaSx,
} from '../../theme/encoreUiTokens';
import {
  PRACTICE_RESOURCE_GROUP_META,
  type PracticeResourceGroup,
  type PracticeResourceGroupId,
  type ResourceGroupsFileDropConfig,
} from './practiceResourceGroups';
import { PracticeResourceSectionDropZone } from './PracticeResourceDnD';
import { usePracticeResourceDragState } from './practiceResourceDragContext';
import type { SongMediaUploadSlot } from './songMediaUploadSlot';

export type PracticeResourcesPanelProps<T extends string = string> = {
  groups: PracticeResourceGroup[];
  fileDrop?: ResourceGroupsFileDropConfig<T>;
  /** Accessible name when not repertoire practice resources. */
  ariaLabel?: string;
  /** When true, section bodies accept chip drag targets for reorder / cross-section moves. */
  chipDragEnabled?: boolean;
};

function PracticeResourceGroupSection<T extends string>(props: {
  group: PracticeResourceGroup;
  fileDrop?: ResourceGroupsFileDropConfig<T>;
  chipDragEnabled?: boolean;
}): ReactElement {
  const theme = useTheme();
  const { group, fileDrop, chipDragEnabled } = props;
  const { activeDragId, song } = usePracticeResourceDragState();
  const activeParsed = activeDragId ? parsePracticeResourceDragId(activeDragId) : null;
  const chipDropEligible =
    !activeParsed || sectionAcceptsPracticeResourceDrag(group.id as SongMediaUploadSlot, activeParsed, song);
  const slotId = group.id as T;
  const repertoireMeta =
    group.id in PRACTICE_RESOURCE_GROUP_META
      ? PRACTICE_RESOURCE_GROUP_META[group.id as PracticeResourceGroupId]
      : null;
  const anchorId = group.anchorId ?? repertoireMeta?.anchorId ?? group.id;
  const isEmpty = group.itemCount === 0;

  const dropHighlight = (() => {
    if (activeParsed && !chipDropEligible) {
      return { opacity: 0.4, pointerEvents: 'none' as const };
    }
    if (!fileDrop?.globalFileDragActive) return {};
    const elig = fileDrop.eligibleSlots;
    if (elig && !elig.has(slotId)) {
      return { opacity: 0.4, pointerEvents: 'none' as const };
    }
    const active = fileDrop.hoveredSlot === slotId;
    return {
      outline: `1px dashed ${alpha(theme.palette.primary.main, active ? 0.45 : 0.18)}`,
      outlineOffset: 1,
      borderRadius: 0.75,
      bgcolor: active ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
    };
  })();

  const onDragEnter = fileDrop
    ? (e: DragEvent<HTMLElement>) => fileDrop.onMediaSlotDragEnter(slotId, e)
    : undefined;
  const onDragLeave = fileDrop
    ? (e: DragEvent<HTMLElement>) => fileDrop.onMediaSlotDragLeave(slotId, e)
    : undefined;
  const onDragOver = fileDrop
    ? (e: DragEvent<HTMLElement>) => fileDrop.onMediaSlotDragOver(slotId, e)
    : undefined;
  const onDrop = fileDrop ? (e: DragEvent<HTMLElement>) => fileDrop.onMediaSlotDrop(slotId, e) : undefined;

  const metaLine = isEmpty ? group.subheader : String(group.itemCount);
  const metaTooltip =
    !isEmpty && group.primarySummary
      ? `Primary: ${group.primarySummary}`
      : isEmpty
        ? group.subheader
        : undefined;

  const metaTypography = (
    <Typography
      component="span"
      sx={{
        ...practiceResourceSectionMetaSx,
        fontStyle: isEmpty ? 'italic' : undefined,
        ...(isEmpty
          ? {
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
            }
          : undefined),
      }}
    >
      {metaLine}
    </Typography>
  );

  return (
    <Box
      id={anchorId}
      component="section"
      aria-labelledby={`${anchorId}-heading`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      sx={{
        ...practiceResourceSectionGridSx,
        transition: theme.transitions.create(['outline-color', 'background-color'], {
          duration: theme.transitions.duration.shorter,
        }),
        ...dropHighlight,
      }}
    >
      <Box id={`${anchorId}-heading`} sx={practiceResourceSectionLabelRailSx}>
        <Typography component="span" sx={practiceResourceSectionLabelSx}>
          {group.title}
        </Typography>
        {metaTooltip ? (
          <AppTooltip title={metaTooltip}>{metaTypography}</AppTooltip>
        ) : (
          metaTypography
        )}
      </Box>
      <Box id={`${anchorId}-body`} sx={{ minWidth: 0 }}>
        {chipDragEnabled ? (
          <PracticeResourceSectionDropZone section={group.id as SongMediaUploadSlot}>
            {group.body}
          </PracticeResourceSectionDropZone>
        ) : (
          group.body
        )}
        {group.footer ? (
          <Box sx={{ pt: 0.375, color: 'text.secondary', '& .MuiTypography-root': { lineHeight: 1.45 } }}>
            {group.footer}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

/**
 * Unified practice resources inspector: always-visible dense sections with chip fields.
 */
export function PracticeResourcesPanel<T extends string = string>(
  props: PracticeResourcesPanelProps<T>,
): ReactElement {
  const { groups, fileDrop, ariaLabel = 'Practice resources', chipDragEnabled = false } = props;

  return (
    <Box
      className="encore-practice-resources-panel"
      component="div"
      role="group"
      aria-label={ariaLabel}
      sx={{
        width: 1,
        minWidth: 0,
        pt: 0.125,
        pb: 0.25,
      }}
    >
      {groups.map((group, index) => (
        <Box
          key={group.id}
          sx={
            index > 0
              ? {
                  borderTop: 1,
                  borderStyle: 'solid',
                  borderColor: encoreHairline,
                }
              : undefined
          }
        >
          <PracticeResourceGroupSection<T> group={group} fileDrop={fileDrop} chipDragEnabled={chipDragEnabled} />
        </Box>
      ))}
    </Box>
  );
}
