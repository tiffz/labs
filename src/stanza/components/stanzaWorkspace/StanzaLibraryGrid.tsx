import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { StanzaSong } from '../../db/stanzaDb';
import { youtubeMqThumbnailUrl } from '../../utils/stanzaYoutubeMeta';
import StanzaLibrarySourceBadge from '../StanzaLibrarySourceBadge';
import { stanzaLibrarySourceKind } from '../stanzaLibrarySourceKind';
import StanzaLibraryThumb from '../StanzaLibraryThumb';
import { songHasPractice } from './stanzaWorkspaceHelpers';

export interface StanzaLibraryGridProps {
  songs: StanzaSong[];
  selectedId: string | null;
  variant: 'landing' | 'footer';
  onNavigateToSong: (song: StanzaSong) => void;
  onOpenLibraryMenu: (anchor: HTMLElement, songId: string) => void;
}

export default function StanzaLibraryGrid({
  songs,
  selectedId,
  variant,
  onNavigateToSong,
  onOpenLibraryMenu,
}: StanzaLibraryGridProps) {
  return (
    <Box
      className="stanza-library-grid"
      sx={variant === 'landing' ? { maxHeight: { xs: 360, sm: 400 } } : { maxHeight: { xs: 280, sm: 360 } }}
    >
      {songs.length === 0 ? (
        <Box sx={{ gridColumn: '1 / -1', py: 3, px: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '28rem', mx: 'auto', lineHeight: 1.55 }}>
            No items yet. Paste a YouTube link or upload an audio or video file above to add your first piece.
          </Typography>
        </Box>
      ) : (
        songs.map((s) => (
          <Box key={s.id} sx={{ position: 'relative' }}>
            <button
              type="button"
              className={`stanza-library-card${s.id === selectedId ? ' stanza-library-card--selected' : ''}`}
              onClick={() => onNavigateToSong(s)}
              aria-current={s.id === selectedId ? 'true' : undefined}
            >
              <div className="stanza-library-card-thumb-wrap">
                {s.ytId ? (
                  <img className="stanza-library-card-thumb" src={youtubeMqThumbnailUrl(s.ytId)} alt="" loading="lazy" />
                ) : (
                  <StanzaLibraryThumb song={s} />
                )}
                <StanzaLibrarySourceBadge kind={stanzaLibrarySourceKind(s)} />
              </div>
              <div className="stanza-library-card-body">
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.25,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {s.title}
                </Typography>
                {!songHasPractice(s) ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className="stanza-library-card-caption-slot"
                    sx={{ display: 'block' }}
                  >
                    Not started
                  </Typography>
                ) : null}
              </div>
            </button>
            <IconButton
              type="button"
              size="small"
              aria-label={`More actions for ${s.title}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOpenLibraryMenu(e.currentTarget, s.id);
              }}
              sx={{
                position: 'absolute',
                right: 6,
                top: 6,
                bgcolor: 'rgba(255,253,250,0.92)',
                '&:hover': { bgcolor: 'rgba(255,253,250,1)' },
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        ))
      )}
    </Box>
  );
}
