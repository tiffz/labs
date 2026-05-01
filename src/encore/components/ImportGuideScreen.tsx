import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { navigateEncore } from '../routes/encoreAppHash';
import { encoreHairline } from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';

/** Readable article column (outside narrow settings width). */
const ARTICLE_MAX = 'min(42rem, 100%)';

const articleBodySx = {
  fontSize: '1.0625rem',
  lineHeight: 1.75,
  color: 'text.primary',
  letterSpacing: '-0.01em',
} as const;

const articleLeadSx = {
  ...articleBodySx,
  fontSize: '1.125rem',
  lineHeight: 1.65,
  color: 'text.secondary',
  maxWidth: '38rem',
} as const;

const sectionTitleSx = {
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: '1.25rem',
  lineHeight: 1.35,
  letterSpacing: '-0.02em',
  mt: 0,
  mb: 1.5,
} as const;

function Mono(props: { children: string }): ReactElement {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        my: 1.5,
        p: 1.5,
        borderRadius: 1,
        borderLeft: 4,
        borderColor: 'primary.main',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.selected' : 'rgba(192, 38, 211, 0.06)'),
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {props.children}
    </Box>
  );
}

export function ImportGuideScreen(): React.ReactElement {
  return (
    <Box
      sx={{
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 6 },
      }}
    >
      <Box sx={{ maxWidth: ARTICLE_MAX, mx: 'auto' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} sx={{ mb: 1 }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.14em' }}>
            Help
          </Typography>
          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigateEncore({ kind: 'library' })}
            sx={{ textTransform: 'none', flexShrink: 0, mt: -0.5 }}
          >
            Repertoire
          </Button>
        </Stack>

        <Typography
          component="h1"
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            mb: 2,
            maxWidth: '20ch',
          }}
        >
          Import guide
        </Typography>

        <Typography component="p" sx={{ ...articleLeadSx, mb: 4 }}>
          Recommended order and file naming so Encore can match playlists, videos, and charts to your library. Encore
          uses best-effort parsing and fuzzy matching. Plan a quick review pass after each import.
        </Typography>

        <Box component="article">
          <Typography component="h2" variant="h6" sx={sectionTitleSx}>
            Suggested order
          </Typography>
          <Box
            component="ol"
            sx={{
              m: 0,
              pl: 2.5,
              mb: 0,
              '& > li': { mb: 2.25, pl: 0.5 },
              '& > li:last-of-type': { mb: 0 },
              ...articleBodySx,
            }}
          >
            <Box component="li">
              <Typography component="span" sx={{ fontWeight: 700 }}>
                Start with at least one Spotify playlist.
              </Typography>{' '}
              Spotify gives the cleanest title, artist, and track ids. Importing that first gives Encore a strong base
              when it later matches YouTube rows, Drive videos, and sheet files to songs.
            </Box>
            <Box component="li">
              <Typography component="span" sx={{ fontWeight: 700 }}>
                Add more Spotify and YouTube playlists in one go if you like.
              </Typography>{' '}
              You can paste several playlist links in the same import. Encore tries to smart-match rows to existing
              songs (including across Spotify and YouTube). Matches are not guaranteed: skim the review table,
              especially where titles differ between services.
            </Box>
            <Box component="li">
              <Typography component="span" sx={{ fontWeight: 700 }}>
                Duplicates in source playlists are fine.
              </Typography>{' '}
              The same track or video can appear more than once. Encore deduplicates by Spotify or YouTube id when
              merging into your library.
            </Box>
            <Box component="li">
              <Typography component="span" sx={{ fontWeight: 700 }}>
                Bulk performance videos, then bulk scores (optional).
              </Typography>{' '}
              After songs exist, import performance videos and sheet files. Naming matters more here: see the sections
              below. Then open a few songs and fix anything that still looks off.
            </Box>
          </Box>

          <Divider sx={{ my: 4, borderColor: encoreHairline }} />

          <Typography component="h2" variant="h6" sx={sectionTitleSx}>
            Performance videos (Drive bulk import)
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            Encore guesses the song from the file name, folder path, and Drive text fields, then picks a date from a
            date in the name if present, otherwise Drive timestamps. When Encore organizes videos in your Performances
            folder, it renames them to a simple hyphen pattern (venue is not part of the file name — use folder names
            below to tag venue and other metadata for a whole tree of files).
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, fontWeight: 700, mb: 0.5 }}>
            Canonical name (recommended before import)
          </Typography>
          <Mono>{'YYYY-MM-DD - Song title - Artist.mp4'}</Mono>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            Use a real calendar date (YYYY-MM-DD), then the title, then the artist. If the song has no artist in your
            library, Encore uses{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Unknown artist
            </Typography>{' '}
            in the saved file name. Underscores and extra hyphens still split into clues for fuzzy matching during
            import.
          </Typography>

          <Typography component="h2" variant="h6" sx={sectionTitleSx}>
            Tagging a whole folder (optional)
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            Any Drive folder whose name looks like{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Key - Value
            </Typography>{' '}
            (space, hyphen, space after the key) is treated as metadata for every file inside that folder or deeper.
            The key is case-insensitive. If the same key appears in nested folders, the{' '}
            <Typography component="span" sx={{ fontWeight: 700 }}>
              deepest
            </Typography>{' '}
            folder wins. Recognized keys:
          </Typography>
          <Box component="ul" sx={{ ...articleBodySx, pl: 2.5, mb: 2, color: 'text.secondary' }}>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Venue
              </Typography>{' '}
              — performance venue (bulk performance import).
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Artist
              </Typography>{' '}
              — song artist when creating a new song from the import row (performances); also fills filename gaps for
              score pairing when the PDF name has no artist (scores).
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Accompaniment
              </Typography>{' '}
              — comma-separated accompaniment tags (must match Encore’s list: Guitar, Violin, Piano, Backing Track,
              Backing Vocals, Duet partner, Self-accompany).
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Date
              </Typography>{' '}
              — performance date as{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                YYYY-MM-DD
              </Typography>{' '}
              (performances).
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Key
              </Typography>{' '}
              — performance key on the song (e.g.{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                A major
              </Typography>
              ) when creating a new song from import (performances); also used for score pairing when the filename has
              no key (scores).
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Tags
              </Typography>{' '}
              — comma-separated song tags merged onto the library song when you import a score from that folder tree.
            </li>
          </Box>
          <Typography component="p" sx={{ ...articleBodySx, fontWeight: 700, mb: 0.5 }}>
            Example layout
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              borderLeft: 4,
              borderColor: 'primary.main',
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.selected' : 'rgba(192, 38, 211, 0.06)'),
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {`Shows /\n  Venue - Martuni's /\n    Accompaniment - Piano /\n      2025-08-15 - Hey Jude - The Beatles.mp4`}
          </Box>

          <Divider sx={{ my: 4, borderColor: encoreHairline }} />

          <Typography component="h2" variant="h6" sx={sectionTitleSx}>
            Sheet music and scores (bulk import)
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            Bulk import reads PDF, MusicXML, MIDI, and similar exports. Encore parses title, optional artist, and key
            from common patterns (especially MusicNotes-style names). When Encore saves or tidies charts in Drive, it
            uses the same shape so a file you export from Encore is easy to re-import later.
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, fontWeight: 700, mb: 0.5 }}>
            Canonical name when Encore organizes charts
          </Typography>
          <Mono>{'Title - Artist - Key.pdf'}</Mono>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            When the song has a performance key, Encore appends it after the artist (for example{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Title - Artist - A major.pdf
            </Typography>
            ). Recordings and backing tracks stay{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Title - Artist.pdf
            </Typography>
            . Examples Encore already understands include MusicNotes lines such as{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Title - A major - MN…
            </Typography>{' '}
            Variants that include an artist segment before the key work too. Generic tails like{' '}
            <Typography component="span" sx={{ fontStyle: 'italic' }}>
              Lead Sheet
            </Typography>{' '}
            or{' '}
            <Typography component="span" sx={{ fontStyle: 'italic' }}>
              Piano Vocal
            </Typography>{' '}
            are stripped when parsing.
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 0 }}>
            {`In the review step you can pair each file to a song and, when Encore parsed a key, apply it to the song's performance key if that field is still empty. Folder names using `}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Artist - …
            </Typography>
            {`, `}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Key - …
            </Typography>
            {`, or `}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Tags - …
            </Typography>
            {` (see Tagging a whole folder above) fill gaps when the filename alone does not carry that metadata; Tags are merged onto the song when you import.`}
          </Typography>

          <Divider sx={{ my: 4, borderColor: encoreHairline }} />

          <Typography component="h2" variant="h6" sx={sectionTitleSx}>
            After every import
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 3 }}>
            Encore does fuzzy matching and best-effort parsing. Treat the review step as part of the workflow: fix a
            few rows in the import dialog, then spot-check songs in the library (titles, artists, linked media, and
            performances).
          </Typography>

          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            <Button variant="contained" onClick={() => navigateEncore({ kind: 'library' })} sx={{ textTransform: 'none' }}>
              Go to repertoire
            </Button>
            <Button variant="outlined" onClick={() => navigateEncore({ kind: 'repertoireSettings' })} sx={{ textTransform: 'none' }}>
              Library settings
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 2.5, lineHeight: 1.6 }}>
            From the repertoire screen, use the toolbar{' '}
            <Link component="button" type="button" onClick={() => navigateEncore({ kind: 'library' })} sx={{ fontSize: 'inherit' }}>
              Add
            </Link>
            , then the Import menu.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
