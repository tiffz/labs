import IosShareIcon from '@mui/icons-material/IosShare';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactElement } from 'react';
import { encoreHairline, encoreShadowLift } from '../theme/encoreUiTokens';
import { SharePanel } from './SharePanel';

export function EncoreShareMenu(props: {
  /** Bump to open the menu from code (e.g. #/share deep link). */
  openKick?: number;
}): ReactElement {
  const { openKick = 0 } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const prevKick = useRef(openKick);

  const open = Boolean(anchorEl);

  const handleOpen = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => setAnchorEl(null), []);

  useEffect(() => {
    if (openKick === prevKick.current) return;
    prevKick.current = openKick;
    const el = buttonRef.current;
    if (el) setAnchorEl(el);
  }, [openKick]);

  return (
    <>
      <IconButton
        ref={buttonRef}
        id="encore-share-menu-button"
        aria-controls={open ? 'encore-share-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        aria-label="Share repertoire"
        color="inherit"
        size="medium"
        onClick={handleOpen}
        sx={{ borderRadius: 2 }}
      >
        <IosShareIcon sx={{ fontSize: 22 }} />
      </IconButton>
      <Menu
        id="encore-share-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxWidth: 'calc(100vw - 24px)',
              mt: 1.25,
              borderRadius: 3,
              overflow: 'hidden',
              border: `1px solid ${encoreHairline}`,
              boxShadow: encoreShadowLift,
            },
          },
        }}
        MenuListProps={{
          'aria-labelledby': 'encore-share-menu-button',
          sx: { p: 0 },
        }}
        disableScrollLock
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 2.5 }} onClick={(e) => e.stopPropagation()}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2 }}>
            Guest link
          </Typography>
          <SharePanel />
        </Box>
      </Menu>
    </>
  );
}
