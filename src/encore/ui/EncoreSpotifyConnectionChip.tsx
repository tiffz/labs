import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { useId, useState, type ReactElement, type ReactNode } from 'react';
import { useEncore } from '../context/EncoreContext';
import { SpotifyBrandIcon } from '../components/EncoreBrandIcon';
import { encoreHairline, encoreShadowLift } from '../theme/encoreUiTokens';
import { EncoreStatusPill } from './EncoreStatusPill';

const SPOTIFY_GREEN = '#1DB954';

export type EncoreSpotifyConnectionChipProps = {
  /** Larger tap target + description spacing for dialogs; compact for account menu status slot. */
  size?: 'compact' | 'comfortable';
  /** Optional helper under the chip (e.g. what Spotify unlocks on this screen). */
  description?: ReactNode;
  /** Runs before connect/reconnect (e.g. clear local error state). */
  onBeforeOAuth?: () => void;
  /** Runs after Connect / Reconnect / Disconnect from the chip menu (e.g. close parent surface). */
  onMenuAction?: () => void;
  sx?: SxProps<Theme>;
};

/**
 * Spotify connection control: brand mark + status (same pill language as the account menu) and a menu
 * for Connect / Reconnect / Disconnect.
 */
export function EncoreSpotifyConnectionChip(props: EncoreSpotifyConnectionChipProps): ReactElement {
  const { size = 'comfortable', description, onBeforeOAuth, onMenuAction, sx } = props;
  const theme = useTheme();
  const chipId = useId();
  const menuId = `${chipId}-menu`;
  const {
    spotifyLinked,
    connectSpotify,
    disconnectSpotify,
    clearSpotifyConnectError,
  } = useEncore();

  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
  const configured = Boolean(clientId);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const closeMenu = () => setAnchorEl(null);

  const status = !configured ? (
    <EncoreStatusPill tone="idle" label="Unavailable" />
  ) : spotifyLinked ? (
    <EncoreStatusPill
      tone="ok"
      label="Connected"
      icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
    />
  ) : (
    <EncoreStatusPill tone="idle" label="Not connected" />
  );

  const surfaceBorder = spotifyLinked
    ? alpha(SPOTIFY_GREEN, 0.35)
    : alpha(theme.palette.divider, 0.9);

  const compact = size === 'compact';
  /** Account menu: section row already shows the Spotify mark — one status pill + menu chevron only. */
  const control = compact ? (
    <ButtonBase
      id={`${chipId}-btn`}
      aria-haspopup={configured ? 'true' : undefined}
      aria-expanded={configured && open ? 'true' : undefined}
      aria-controls={configured && open ? menuId : undefined}
      disabled={!configured}
      disableRipple={!configured}
      onClick={(e) => configured && setAnchorEl(e.currentTarget)}
      sx={{
        borderRadius: 999,
        border: 'none',
        bgcolor: 'transparent',
        px: 0.25,
        py: 0.25,
        textAlign: 'left',
        alignItems: 'center',
        width: 'max-content',
        maxWidth: '100%',
        gap: 0.25,
        '&.Mui-disabled': {
          opacity: 1,
        },
        '&:not(.Mui-disabled):hover': {
          bgcolor: alpha(theme.palette.action.hover, 0.35),
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
          outlineOffset: 2,
        },
      }}
    >
      {status}
      {configured ? (
        <ExpandMoreIcon
          sx={{
            fontSize: 18,
            color: 'text.secondary',
            flexShrink: 0,
            opacity: 0.85,
            transform: open ? 'rotate(180deg)' : undefined,
            transition: theme.transitions.create('transform', { duration: 150 }),
          }}
        />
      ) : null}
    </ButtonBase>
  ) : (
    <ButtonBase
      id={`${chipId}-btn`}
      aria-haspopup={configured ? 'true' : undefined}
      aria-expanded={configured && open ? 'true' : undefined}
      aria-controls={configured && open ? menuId : undefined}
      disabled={!configured}
      disableRipple={!configured}
      onClick={(e) => configured && setAnchorEl(e.currentTarget)}
      sx={{
        borderRadius: 999,
        border: `1px solid ${surfaceBorder}`,
        bgcolor: spotifyLinked ? alpha(SPOTIFY_GREEN, 0.06) : alpha(theme.palette.action.hover, 0.35),
        px: 1.25,
        py: 0.625,
        textAlign: 'left',
        width: 'max-content',
        maxWidth: '100%',
        '&.Mui-disabled': {
          opacity: 1,
          borderColor: encoreHairline,
          bgcolor: alpha(theme.palette.action.hover, 0.2),
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
          outlineOffset: 2,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ width: 'auto', minWidth: 0 }}>
        <SpotifyBrandIcon
          sx={{
            fontSize: 18,
            flexShrink: 0,
            filter: configured ? undefined : 'grayscale(1)',
            opacity: configured ? 1 : 0.55,
          }}
        />
        <Box sx={{ minWidth: 0 }}>{status}</Box>
        {configured ? (
          <ExpandMoreIcon
            sx={{
              fontSize: 20,
              color: 'text.secondary',
              flexShrink: 0,
              opacity: 0.85,
              transform: open ? 'rotate(180deg)' : undefined,
              transition: theme.transitions.create('transform', { duration: 150 }),
            }}
          />
        ) : null}
      </Stack>
    </ButtonBase>
  );

  return (
    <Stack spacing={description ? (size === 'compact' ? 0.75 : 1) : 0} sx={sx}>
      <Box sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}>{control}</Box>
      {description ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            lineHeight: 1.55,
            letterSpacing: size === 'compact' ? '-0.01em' : undefined,
            width: description ? '100%' : undefined,
          }}
        >
          {description}
        </Typography>
      ) : null}

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 220,
              mt: 0.75,
              borderRadius: 2,
              border: `1px solid ${encoreHairline}`,
              boxShadow: encoreShadowLift,
            },
          },
        }}
      >
        {spotifyLinked ? (
          <MenuItem
            dense={size === 'compact'}
            onClick={() => {
              onBeforeOAuth?.();
              clearSpotifyConnectError();
              closeMenu();
              void connectSpotify();
              onMenuAction?.();
            }}
          >
            <ListItemIcon>
              <RefreshIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Reconnect Spotify"
              secondary={size === 'comfortable' ? 'Sign in again if playlists or search fail.' : undefined}
              primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 600 } }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ) : (
          <MenuItem
            dense={size === 'compact'}
            onClick={() => {
              onBeforeOAuth?.();
              clearSpotifyConnectError();
              closeMenu();
              void connectSpotify();
              onMenuAction?.();
            }}
          >
            <ListItemIcon>
              <SpotifyBrandIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="Connect Spotify"
              secondary={size === 'comfortable' ? 'Needed for playlist import and track search.' : undefined}
              primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 600 } }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        )}
        {spotifyLinked ? (
          <MenuItem
            dense={size === 'compact'}
            onClick={() => {
              disconnectSpotify();
              closeMenu();
              onMenuAction?.();
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Disconnect Spotify"
              secondary={size === 'comfortable' ? 'Clears this browser’s Spotify session.' : undefined}
              primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 600 } }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ) : null}
      </Menu>
    </Stack>
  );
}
