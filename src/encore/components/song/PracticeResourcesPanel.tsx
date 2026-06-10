import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { DragEvent, ReactElement } from 'react';
import AppTooltip from '../../../shared/components/AppTooltip';
import {
  encoreHairline,
  practiceResourceSectionGridSx,
  practiceResourceSectionLabelRailSx,
  practiceResourceSectionLabelSx,
  practiceResourceSectionMetaSx,
} from '../../theme/encoreUiTokens';
import type { SongPageMediaHubFileDropConfig } from './practiceResourceGroups';
import {
  PRACTICE_RESOURCE_GROUP_META,
  type PracticeResourceGroup,
} from './practiceResourceGroups';

export type PracticeResourcesPanelProps = {
  groups: PracticeResourceGroup[];
  fileDrop?: SongPageMediaHubFileDropConfig;
};

function PracticeResourceGroupSection(props: {
  group: PracticeResourceGroup;
  fileDrop?: SongPageMediaHubFileDropConfig;
}): ReactElement {
  const theme = useTheme();
  const { group, fileDrop } = props;
  const meta = PRACTICE_RESOURCE_GROUP_META[group.id];
  const isEmpty = group.itemCount === 0;

  const dropHighlight = (() => {
    if (!fileDrop?.globalFileDragActive) return {};
    const elig = fileDrop.eligibleSlots;
    if (elig && !elig.has(group.id)) {
      return { opacity: 0.4, pointerEvents: 'none' as const };
    }
    const active = fileDrop.hoveredSlot === group.id;
    return {
      outline: `1px dashed ${alpha(theme.palette.primary.main, active ? 0.45 : 0.18)}`,
      outlineOffset: 1,
      borderRadius: 0.75,
      bgcolor: active ? alpha(theme.palette.primary.main, 0.03) : 'transparent',
    };
  })();

  const onDragEnter = fileDrop
    ? (e: DragEvent<HTMLElement>) => fileDrop.onMediaSlotDragEnter(group.id, e)
    : undefined;
  const onDragLeave = fileDrop
    ? (e: DragEvent<HTMLElement>) => fileDrop.onMediaSlotDragLeave(group.id, e)
    : undefined;
  const onDragOver = fileDrop
    ? (e: DragEvent<HTMLElement>) => fileDrop.onMediaSlotDragOver(group.id, e)
    : undefined;
  const onDrop = fileDrop ? (e: DragEvent<HTMLElement>) => fileDrop.onMediaSlotDrop(group.id, e) : undefined;

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
      id={meta.anchorId}
      component="section"
      aria-labelledby={`${meta.anchorId}-heading`}
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
      <Box id={`${meta.anchorId}-heading`} sx={practiceResourceSectionLabelRailSx}>
        <Typography component="span" sx={practiceResourceSectionLabelSx}>
          {group.title}
        </Typography>
        {metaTooltip ? (
          <AppTooltip title={metaTooltip}>{metaTypography}</AppTooltip>
        ) : (
          metaTypography
        )}
      </Box>
      <Box id={`${meta.anchorId}-body`} sx={{ minWidth: 0 }}>
        {group.body}
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
export function PracticeResourcesPanel(props: PracticeResourcesPanelProps): ReactElement {
  const { groups, fileDrop } = props;

  return (
    <Box
      className="encore-practice-resources-panel"
      component="div"
      role="group"
      aria-label="Practice resources"
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
          <PracticeResourceGroupSection group={group} fileDrop={fileDrop} />
        </Box>
      ))}
    </Box>
  );
}
