import { useCallback, useEffect, useState } from 'react';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AppTooltip from '../../shared/components/AppTooltip';
import {
  clampStanzaPlaybackRate,
  formatStanzaPlaybackRateLabel,
  STANZA_RATE_MAX,
  STANZA_RATE_MIN,
  STANZA_RATE_STEP,
  STANZA_SPEED_MENU_PRESETS,
} from '../utils/stanzaPlaybackRateLimits';

export default function StanzaPlaybackSpeedControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (rate: number) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [draft, setDraft] = useState(value);
  const [textDraft, setTextDraft] = useState(() => formatStanzaPlaybackRateLabel(value).replace('×', ''));

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setTextDraft(formatStanzaPlaybackRateLabel(value).replace('×', ''));
    }
  }, [open, value]);

  const commit = useCallback(
    (r: number) => {
      const c = clampStanzaPlaybackRate(r);
      onChange(c);
      setDraft(c);
      setTextDraft(formatStanzaPlaybackRateLabel(c).replace('×', ''));
    },
    [onChange],
  );

  /** Flush slider / typed value when the menu dismisses (e.g. click-away mid-drag). */
  const handleMenuClose = useCallback(() => {
    const trimmed = textDraft.replace(/×/g, '').trim();
    const parsed = parseFloat(trimmed);
    if (Number.isFinite(parsed)) {
      commit(parsed);
    } else if (Math.abs(draft - value) > 1e-5) {
      commit(draft);
    }
    setAnchorEl(null);
  }, [commit, draft, textDraft, value]);

  return (
    <>
      <Button
        type="button"
        variant="text"
        size="small"
        className="stanza-playback-speed-btn"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={`Playback speed ${formatStanzaPlaybackRateLabel(value)}. Open menu to change speed.`}
        aria-haspopup="true"
        aria-expanded={open}
        sx={{
          minWidth: 0,
          px: 0.65,
          py: 0.2,
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: 'text.secondary',
          lineHeight: 1.2,
        }}
      >
        {formatStanzaPlaybackRateLabel(value)}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            className: 'stanza-playback-speed-menu',
            sx: { minWidth: { xs: 'min(100vw - 24px, 320px)', sm: 320 }, maxWidth: 380, p: 0 },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.75 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 600 }}>
            Playback speed
          </Typography>
          <AppTooltip
            title={`Drag or tap track. Range ${STANZA_RATE_MIN}–${STANZA_RATE_MAX}×, step ${STANZA_RATE_STEP}.`}
          >
            <Slider
              value={draft}
              min={STANZA_RATE_MIN}
              max={STANZA_RATE_MAX}
              step={STANZA_RATE_STEP}
              onChange={(_, v) => {
                const next = v as number;
                setDraft(next);
                setTextDraft(formatStanzaPlaybackRateLabel(next).replace('×', ''));
              }}
              onChangeCommitted={(_, v) => commit(v as number)}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}×`}
              aria-label="Playback speed slider"
              sx={{ mt: 0.5, mb: 0.5 }}
            />
          </AppTooltip>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.5} sx={{ mt: 1.5, mb: 1.5 }}>
            {STANZA_SPEED_MENU_PRESETS.map((p) => {
              const active = Math.abs(draft - p) < 0.0001;
              return (
                <Button
                  key={p}
                  size="small"
                  variant={active ? 'contained' : 'outlined'}
                  color={active ? 'primary' : 'inherit'}
                  onClick={() => commit(p)}
                  aria-pressed={active}
                  sx={{ minWidth: 44, px: 0.75, py: 0.25, fontSize: '0.75rem' }}
                >
                  {p}×
                </Button>
              );
            })}
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
            <AppTooltip title={`Exact value (${STANZA_RATE_MIN}–${STANZA_RATE_MAX}). Press Enter to apply.`}>
              <TextField
                className="stanza-speed-number"
                size="small"
                label="Custom"
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                onBlur={() => {
                  const v = parseFloat(textDraft.replace(/×\s*$/u, '').trim());
                  if (Number.isFinite(v)) commit(v);
                  else setTextDraft(formatStanzaPlaybackRateLabel(value).replace('×', ''));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                type="text"
                inputMode="decimal"
                aria-label="Custom playback speed"
                sx={{ flex: '1 1 auto', minWidth: 0 }}
              />
            </AppTooltip>
            <Stack spacing={0} alignItems="center" sx={{ flexShrink: 0 }}>
              <IconButton
                size="small"
                aria-label="Increase playback speed"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(draft + STANZA_RATE_STEP)}
                sx={{ p: 0.2 }}
              >
                <KeyboardArrowUp sx={{ fontSize: 20 }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Decrease playback speed"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(draft - STANZA_RATE_STEP)}
                sx={{ p: 0.2 }}
              >
                <KeyboardArrowDown sx={{ fontSize: 20 }} />
              </IconButton>
            </Stack>
          </Stack>
        </Box>
      </Menu>
    </>
  );
}
