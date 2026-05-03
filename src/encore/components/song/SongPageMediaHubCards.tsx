import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { alpha, useTheme } from '@mui/material/styles';
import type { DragEvent, ReactElement, ReactNode } from 'react';

import { encoreRadius } from '../../theme/encoreUiTokens';
import type { SongMediaUploadSlot } from './songMediaUploadSlot';

export type SongPageMediaSlots = {
  referenceRecordings: ReactNode;
  backingTracks: ReactNode;
  charts: ReactNode;
  chartsFooter: ReactNode;
  takes: ReactNode;
};

export type SongPageMediaHubFileDropConfig = {
  /** File drag active anywhere on the song page (from outside the page). */
  globalFileDragActive: boolean;
  /** Hub card currently receiving pointer during a file drag. */
  hoveredSlot: SongMediaUploadSlot | null;
  onMediaSlotDragEnter: (slot: SongMediaUploadSlot, e: DragEvent<HTMLElement>) => void;
  onMediaSlotDragLeave: (slot: SongMediaUploadSlot, e: DragEvent<HTMLElement>) => void;
  onMediaSlotDragOver: (slot: SongMediaUploadSlot, e: DragEvent<HTMLElement>) => void;
  onMediaSlotDrop: (slot: SongMediaUploadSlot, e: DragEvent<HTMLElement>) => void;
};

/**
 * Hub cards for reference, backing, charts, and takes — wider cells than a five-up grid.
 */
export function SongPageMediaHubCards(props: {
  slots: SongPageMediaSlots;
  /** Optional: drag-and-drop upload targets for Listen / Play / Charts / Takes. */
  fileDrop?: SongPageMediaHubFileDropConfig | undefined;
}): ReactElement {
  const theme = useTheme();
  const { slots, fileDrop } = props;
  const { referenceRecordings, backingTracks, charts, chartsFooter, takes } = slots;
  const cardBorder = alpha(theme.palette.text.primary, 0.09);
  const cardBg = alpha(theme.palette.background.paper, 1);
  const hoverShadow = `0 18px 44px -20px ${alpha(theme.palette.common.black, 0.14)}`;

  const cardSx = {
    border: 1,
    borderColor: cardBorder,
    borderRadius: encoreRadius,
    bgcolor: cardBg,
    boxShadow: 'none',
    overflow: 'hidden',
    minHeight: 0,
    transition: theme.transitions.create(['box-shadow', 'border-color'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover': {
      borderColor: alpha(theme.palette.text.primary, 0.14),
      boxShadow: hoverShadow,
    },
  } as const;

  const headerSx = {
    pb: 0,
    pt: 1.35,
    px: 1.75,
    '& .MuiCardHeader-content': { minWidth: 0 },
  } as const;

  const contentSx = {
    pt: 0,
    px: 1.75,
    pb: 1.75,
    '& [data-encore-section-heading]': { display: 'none' },
  } as const;

  const titleProps = {
    variant: 'subtitle2' as const,
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  };
  const subProps = {
    variant: 'caption' as const,
    sx: { lineHeight: 1.35, display: 'block', color: 'text.secondary', letterSpacing: '0.01em' },
  };

  const dropHighlight = (slot: SongMediaUploadSlot) => {
    if (!fileDrop?.globalFileDragActive) return {};
    const active = fileDrop.hoveredSlot === slot;
    return {
      outline: `2px dashed ${alpha(theme.palette.primary.main, active ? 0.55 : 0.28)}`,
      outlineOffset: 3,
      bgcolor: active ? alpha(theme.palette.primary.main, 0.04) : alpha(theme.palette.primary.main, 0.015),
    };
  };

  const wrapDropCard = (slot: SongMediaUploadSlot, card: ReactElement): ReactElement => {
    if (!fileDrop) return card;
    return (
      <Box
        onDragEnter={(e) => fileDrop.onMediaSlotDragEnter(slot, e)}
        onDragLeave={(e) => fileDrop.onMediaSlotDragLeave(slot, e)}
        onDragOver={(e) => fileDrop.onMediaSlotDragOver(slot, e)}
        onDrop={(e) => fileDrop.onMediaSlotDrop(slot, e)}
        sx={{
          borderRadius: encoreRadius,
          minHeight: 0,
          minWidth: 0,
          transition: theme.transitions.create(['outline-color', 'background-color'], {
            duration: theme.transitions.duration.shorter,
          }),
          ...dropHighlight(slot),
        }}
      >
        {card}
      </Box>
    );
  };

  const listenCard = (
    <Card id="encore-media-hub-listen" sx={cardSx} variant="outlined">
        <CardHeader
          title="Listen"
          subheader="References"
          titleTypographyProps={titleProps}
          subheaderTypographyProps={subProps}
          sx={headerSx}
        />
        <CardContent sx={contentSx}>{referenceRecordings}</CardContent>
      </Card>
  );
  const playCard = (
    <Card id="encore-media-hub-play" sx={cardSx} variant="outlined">
        <CardHeader
          title="Play"
          subheader="Backing tracks"
          titleTypographyProps={titleProps}
          subheaderTypographyProps={subProps}
          sx={headerSx}
        />
        <CardContent sx={contentSx}>{backingTracks}</CardContent>
      </Card>
  );
  const chartsCard = (
    <Card id="encore-media-hub-charts" sx={cardSx} variant="outlined">
        <CardHeader
          title="Charts"
          subheader="Sheets & exports"
          titleTypographyProps={titleProps}
          subheaderTypographyProps={subProps}
          sx={headerSx}
        />
        <CardContent sx={contentSx}>
          {charts}
          {chartsFooter}
        </CardContent>
      </Card>
  );
  const takesCard = (
    <Card id="encore-media-hub-takes" sx={cardSx} variant="outlined">
        <CardHeader
          title="Takes"
          subheader="Practice uploads"
          titleTypographyProps={titleProps}
          subheaderTypographyProps={subProps}
          sx={headerSx}
        />
        <CardContent sx={contentSx}>{takes}</CardContent>
      </Card>
  );

  return (
    <Box
      sx={{
        display: 'grid',
        width: 1,
        minWidth: 0,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
        gap: { xs: 1.75, sm: 2, lg: 2 },
      }}
    >
      {wrapDropCard('listen', listenCard)}
      {wrapDropCard('play', playCard)}
      {wrapDropCard('charts', chartsCard)}
      {wrapDropCard('takes', takesCard)}
    </Box>
  );
}
