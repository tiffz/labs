import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { RefObject } from 'react';
import AppLinearVolumeSlider from '../../../shared/components/AppLinearVolumeSlider';
import AppTooltip from '../../../shared/components/AppTooltip';
import type { StanzaSong, StanzaStemTrack } from '../../db/stanzaDb';
import { primaryPlaybackMuted, stanzaSanitizeLinearBusGain, stemPlaybackMuted } from '../../utils/stanzaPlaybackMute';
import {
  STANZA_MIX_LABEL_MAX_WIDTH,
  STANZA_MIX_TRAIL_BALANCE_PX,
  STANZA_STEM_REORDER_MIME,
  stanzaMixTrackLabelSurfaceSx,
} from './stanzaWorkspaceHelpers';

export interface StanzaPracticeMixSectionProps {
  selected: StanzaSong;
  /** Active primary track for mix labels (video vs uploaded file). */
  primaryTrackKind: 'video' | 'file';
  metronomeUserMuted: boolean;
  metronomeUserGain: number;
  mixMetronomeGainDraft: number | null;
  onMetronomeMutedChange: (muted: boolean) => void;
  onMetronomeGainDraftChange: (gain: number) => void;
  onMetronomeGainCommit: (gain: number) => void | Promise<void>;
  drumsEnabled: boolean;
  drumsUserMuted: boolean;
  drumsUserGain: number;
  mixDrumsGainDraft: number | null;
  onDrumsMutedChange: (muted: boolean) => void;
  onDrumsGainDraftChange: (gain: number) => void;
  onDrumsGainCommit: (gain: number) => void | Promise<void>;
  mixPrimaryGainDraft: number | null;
  onPrimaryGainDraftChange: (gain: number) => void;
  onPrimaryGainCommit: (gain: number) => void | Promise<void>;
  onPrimaryMutedChange: (muted: boolean) => void;
  stems: StanzaStemTrack[];
  mixStemGainDraftById: Record<string, number>;
  onStemGainDraftChange: (stemId: string, gain: number) => void;
  onStemGainCommit: (stemId: string, gain: number) => void | Promise<void>;
  onStemMutedChange: (stemId: string, muted: boolean) => void;
  onRemoveStem: (stemId: string) => void;
  stemInlineEdit: { stemId: string; value: string } | null;
  onStemInlineEditChange: (edit: { stemId: string; value: string } | null) => void;
  onFinishStemInlineEdit: (stemId: string, raw: string, fallbackLabel: string) => void | Promise<void>;
  stemReorderDragId: string | null;
  stemReorderOverId: string | null;
  onStemReorderDragIdChange: (stemId: string | null) => void;
  onStemReorderOverIdChange: (stemId: string | null) => void;
  onStemDragLeave: (stemId: string) => void;
  onReorderStems: (fromId: string, toId: string) => void | Promise<void>;
  stemFileInputRef: RefObject<HTMLInputElement | null>;
  onAddStemFromFile: (file: File) => void | Promise<void>;
}

export default function StanzaPracticeMixSection({
  selected,
  primaryTrackKind,
  metronomeUserMuted,
  metronomeUserGain,
  mixMetronomeGainDraft,
  onMetronomeMutedChange,
  onMetronomeGainDraftChange,
  onMetronomeGainCommit,
  drumsEnabled,
  drumsUserMuted,
  drumsUserGain,
  mixDrumsGainDraft,
  onDrumsMutedChange,
  onDrumsGainDraftChange,
  onDrumsGainCommit,
  mixPrimaryGainDraft,
  onPrimaryGainDraftChange,
  onPrimaryGainCommit,
  onPrimaryMutedChange,
  stems,
  mixStemGainDraftById,
  onStemGainDraftChange,
  onStemGainCommit,
  onStemMutedChange,
  onRemoveStem,
  stemInlineEdit,
  onStemInlineEditChange,
  onFinishStemInlineEdit,
  stemReorderDragId,
  stemReorderOverId,
  onStemReorderDragIdChange,
  onStemReorderOverIdChange,
  onStemDragLeave,
  onReorderStems,
  stemFileInputRef,
  onAddStemFromFile,
}: StanzaPracticeMixSectionProps) {
  const primaryIsVideo = primaryTrackKind === 'video';
  return (
    <Box className="stanza-rail-section stanza-rail-section--mix">
      <Box className="stanza-rail-section-head">
        <Typography component="h3" className="stanza-rail-section-title">
          Mix
        </Typography>
        <AppTooltip
          title={
            primaryIsVideo
              ? 'Add an audio layer to mix over the video (e.g. an instrumental)'
              : 'Add another audio layer (e.g. an instrumental or vocal stem)'
          }
        >
          <IconButton
            size="small"
            aria-label="Add audio layer"
            className="stanza-mix-add-icon"
            onClick={() => stemFileInputRef.current?.click()}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </AppTooltip>
      </Box>
      <Stack spacing={0.4} className="stanza-mix-rows">
        <Box className="stanza-mix-row stanza-mix-row--system">
          <Box className="stanza-mix-row__drag-col stanza-mix-row__drag-col--spacer" aria-hidden />
          <AppTooltip
            title={
              metronomeUserMuted ? 'Unmute the metronome click' : 'Mute the metronome click (calibration is preserved)'
            }
          >
            <IconButton
              size="small"
              aria-label={metronomeUserMuted ? 'Unmute metronome' : 'Mute metronome'}
              className="stanza-rail-icon-btn"
              onClick={() => onMetronomeMutedChange(!metronomeUserMuted)}
            >
              {metronomeUserMuted ? (
                <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
              ) : (
                <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </AppTooltip>
          <Typography component="span" noWrap title="Metronome click" className="stanza-mix-row__label">
            Metronome
          </Typography>
          <AppLinearVolumeSlider
            value={mixMetronomeGainDraft ?? metronomeUserGain}
            onChange={(_, v) => onMetronomeGainDraftChange(stanzaSanitizeLinearBusGain(v as number))}
            onChangeCommitted={async (_, v) => {
              await onMetronomeGainCommit(stanzaSanitizeLinearBusGain(v as number));
            }}
            aria-label="Metronome click level"
            className={[
              'stanza-mix-row__slider',
              metronomeUserMuted || !selected.metronomeEnabled ? 'stanza-mix-row__slider--muted' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
          <Box className="stanza-mix-row__trail-spacer" aria-hidden />
        </Box>
        {drumsEnabled ? (
          <Box className="stanza-mix-row stanza-mix-row--system">
            <Box className="stanza-mix-row__drag-col stanza-mix-row__drag-col--spacer" aria-hidden />
            <AppTooltip
              title={
                drumsUserMuted ? 'Unmute the drum groove' : 'Mute the drum groove (pattern and level are preserved)'
              }
            >
              <IconButton
                size="small"
                aria-label={drumsUserMuted ? 'Unmute drums' : 'Mute drums'}
                className="stanza-rail-icon-btn"
                onClick={() => onDrumsMutedChange(!drumsUserMuted)}
              >
                {drumsUserMuted ? (
                  <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </AppTooltip>
            <Typography component="span" noWrap title="Drum groove" className="stanza-mix-row__label">
              Drums
            </Typography>
            <AppLinearVolumeSlider
              value={mixDrumsGainDraft ?? drumsUserGain}
              onChange={(_, v) => onDrumsGainDraftChange(stanzaSanitizeLinearBusGain(v as number))}
              onChangeCommitted={async (_, v) => {
                await onDrumsGainCommit(stanzaSanitizeLinearBusGain(v as number));
              }}
              aria-label="Drums level"
              className={[
                'stanza-mix-row__slider',
                drumsUserMuted ? 'stanza-mix-row__slider--muted' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
            <Box className="stanza-mix-row__trail-spacer" aria-hidden />
          </Box>
        ) : null}
        <Box className="stanza-mix-row">
          <Box className="stanza-mix-row__drag-col stanza-mix-row__drag-col--spacer" aria-hidden />
          <AppTooltip
            title={
              primaryPlaybackMuted(selected)
                ? primaryIsVideo
                  ? 'Unmute video'
                  : 'Unmute main track'
                : primaryIsVideo
                  ? 'Mute video'
                  : 'Mute main track'
            }
          >
            <IconButton
              size="small"
              aria-label={
                primaryPlaybackMuted(selected)
                  ? primaryIsVideo
                    ? 'Unmute video'
                    : 'Unmute main track'
                  : primaryIsVideo
                    ? 'Mute video'
                    : 'Mute main track'
              }
              className="stanza-rail-icon-btn"
              onClick={() => onPrimaryMutedChange(!primaryPlaybackMuted(selected))}
            >
              {primaryPlaybackMuted(selected) ? (
                <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
              ) : (
                <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </AppTooltip>
          <Typography
            component="span"
            noWrap
            title={primaryIsVideo ? 'Video' : 'Main file'}
            className="stanza-mix-row__label"
          >
            {primaryIsVideo ? 'Video' : 'Main'}
          </Typography>
          <AppLinearVolumeSlider
            value={mixPrimaryGainDraft ?? stanzaSanitizeLinearBusGain(selected.primaryGain)}
            onChange={(_, v) => onPrimaryGainDraftChange(stanzaSanitizeLinearBusGain(v as number))}
            onChangeCommitted={async (_, v) => {
              await onPrimaryGainCommit(stanzaSanitizeLinearBusGain(v as number));
            }}
            aria-label={primaryIsVideo ? 'Video level' : 'Main track level'}
            className={[
              'stanza-mix-row__slider',
              primaryPlaybackMuted(selected) ? 'stanza-mix-row__slider--muted' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
          <Box className="stanza-mix-row__trail-spacer" aria-hidden />
        </Box>
        {stems.map((stem) => (
          <Box
            key={stem.id}
            onDragOver={(e) => {
              if (!Array.from(e.dataTransfer.types).includes(STANZA_STEM_REORDER_MIME)) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              onStemReorderOverIdChange(stem.id);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              onStemDragLeave(stem.id);
            }}
            onDrop={(e) => {
              if (!Array.from(e.dataTransfer.types).includes(STANZA_STEM_REORDER_MIME)) return;
              e.preventDefault();
              e.stopPropagation();
              const fromId = e.dataTransfer.getData(STANZA_STEM_REORDER_MIME);
              onStemReorderDragIdChange(null);
              onStemReorderOverIdChange(null);
              if (!fromId || fromId === stem.id) return;
              void onReorderStems(fromId, stem.id);
            }}
            className={[
              'stanza-mix-row',
              stemReorderOverId === stem.id && stemReorderDragId && stemReorderDragId !== stem.id
                ? 'stanza-mix-row--drop-target'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Box className="stanza-mix-row__drag-col">
              <AppTooltip title="Drag to reorder">
                <Box
                  component="span"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(STANZA_STEM_REORDER_MIME, stem.id);
                    e.dataTransfer.effectAllowed = 'move';
                    onStemReorderDragIdChange(stem.id);
                  }}
                  onDragEnd={() => {
                    onStemReorderDragIdChange(null);
                    onStemReorderOverIdChange(null);
                  }}
                  sx={{
                    cursor: 'grab',
                    display: 'inline-flex',
                    alignItems: 'center',
                    touchAction: 'manipulation',
                    color: 'text.secondary',
                    '&:active': { cursor: 'grabbing' },
                  }}
                >
                  <DragIndicatorIcon sx={{ fontSize: 18 }} aria-hidden />
                </Box>
              </AppTooltip>
            </Box>
            <AppTooltip title={stemPlaybackMuted(stem) ? 'Unmute layer' : 'Mute layer'}>
              <IconButton
                size="small"
                aria-label={stemPlaybackMuted(stem) ? `Unmute ${stem.label}` : `Mute ${stem.label}`}
                onClick={() => onStemMutedChange(stem.id, !stemPlaybackMuted(stem))}
                sx={{ p: 0.35, alignSelf: 'center' }}
              >
                {stemPlaybackMuted(stem) ? (
                  <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </AppTooltip>
            <Box
              sx={{
                flex: '0 1 auto',
                minWidth: 0,
                maxWidth: STANZA_MIX_LABEL_MAX_WIDTH,
                display: 'flex',
                alignItems: 'center',
                minHeight: 30,
              }}
            >
              {stemInlineEdit?.stemId === stem.id ? (
                <TextField
                  hiddenLabel
                  size="small"
                  fullWidth={false}
                  value={stemInlineEdit.value}
                  onChange={(e) => onStemInlineEditChange({ stemId: stem.id, value: e.target.value })}
                  onBlur={(e) => void onFinishStemInlineEdit(stem.id, (e.target as HTMLInputElement).value, stem.label)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      onStemInlineEditChange(null);
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void onFinishStemInlineEdit(stem.id, (e.target as HTMLInputElement).value, stem.label);
                    }
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- inline rename: move focus from label into field
                  autoFocus
                  variant="outlined"
                  margin="none"
                  sx={(theme) => ({
                    flex: '0 1 auto',
                    maxWidth: '100%',
                    alignSelf: 'center',
                    '& .MuiOutlinedInput-root': {
                      ...stanzaMixTrackLabelSurfaceSx(theme),
                      paddingLeft: 8,
                      paddingRight: 8,
                      minHeight: 30,
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(theme.palette.text.primary, 0.16),
                    },
                    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(theme.palette.text.primary, 0.28),
                    },
                    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: 1,
                      borderColor: alpha(theme.palette.primary.main, 0.55),
                    },
                    '& .MuiOutlinedInput-input': {
                      padding: '5px 0 !important',
                      width: `${Math.max(5, Math.min(18, stemInlineEdit.value.length + 2))}ch`,
                      maxWidth: '14rem',
                    },
                  })}
                  slotProps={{
                    htmlInput: { 'aria-label': 'Layer name' }
                  }}
                />
              ) : (
                <Typography
                  component="button"
                  type="button"
                  noWrap
                  title={`${stem.label} (click to rename)`}
                  onClick={() => onStemInlineEditChange({ stemId: stem.id, value: stem.label })}
                  sx={(theme) => ({
                    ...stanzaMixTrackLabelSurfaceSx(theme),
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    padding: '4px 0',
                    cursor: 'text',
                    alignSelf: 'center',
                  })}
                >
                  {stem.label}
                </Typography>
              )}
            </Box>
            <AppLinearVolumeSlider
              value={mixStemGainDraftById[stem.id] ?? stanzaSanitizeLinearBusGain(stem.gain)}
              onChange={(_, v) => onStemGainDraftChange(stem.id, stanzaSanitizeLinearBusGain(v as number))}
              onChangeCommitted={async (_, v) => {
                await onStemGainCommit(stem.id, stanzaSanitizeLinearBusGain(v as number));
              }}
              aria-label={`${stem.label} level`}
              sx={{
                alignSelf: 'center',
                opacity: stemPlaybackMuted(stem) ? 0.42 : 1,
                transition: 'opacity 0.15s ease',
              }}
            />
            <Box
              sx={{
                width: STANZA_MIX_TRAIL_BALANCE_PX,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <IconButton
                size="small"
                aria-label={`Remove layer ${stem.label}`}
                onClick={() => onRemoveStem(stem.id)}
                sx={{ p: 0.2, color: 'text.secondary', alignSelf: 'center' }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Stack>
      <input
        ref={stemFileInputRef}
        type="file"
        accept="audio/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void onAddStemFromFile(f);
        }}
      />
    </Box>
  );
}
