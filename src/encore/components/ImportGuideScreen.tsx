import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { encoreAppHref } from '../routes/encoreAppHash';
import { encoreHairline } from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { ENCORE_ACCOMPANIMENT_TAGS } from '../types';

/** Alphabetical for the guide; the performance editor shows the same set in app-defined order. */
const ACCOMPANIMENT_TAGS_GUIDE_TEXT = [...ENCORE_ACCOMPANIMENT_TAGS]
  .sort((a, b) => a.localeCompare(b))
  .join(', ');

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

export function ImportGuideScreen(): ReactElement {
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
            component="a"
            href={encoreAppHref({ kind: 'library' })}
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
          How to name files and arrange Drive folders so imports line up with your library. Encore uses fuzzy matching
          and parsing, not magic. Skim the review step and spot-check songs afterward.
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
                Import at least one Spotify playlist first.
              </Typography>{' '}
              Spotify rows give stable titles, artists, and track ids. That baseline helps match YouTube rows, Drive
              videos, and charts later.
            </Box>
            <Box component="li">
              <Typography component="span" sx={{ fontWeight: 700 }}>
                Add more Spotify and YouTube playlists in one step if you want.
              </Typography>{' '}
              In the playlist import dialog, paste multiple playlist URLs or ids separated by{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                ,
              </Typography>{' '}
              or new lines. Encore detects Spotify vs YouTube per line. Rows are matched to existing library songs when
              titles and artists line up, or when the same Spotify or YouTube id is already on a song. Unmatched rows need
              a manual pick in the review table.
            </Box>
            <Box component="li">
              <Typography component="span" sx={{ fontWeight: 700 }}>
                Duplicate tracks in source playlists are OK.
              </Typography>{' '}
              Encore collapses duplicates by Spotify or YouTube id when merging into the library.
            </Box>
            <Box component="li">
              <Typography component="span" sx={{ fontWeight: 700 }}>
                Then bulk performance videos, then bulk scores (both optional).
              </Typography>{' '}
              These steps lean on file names and folder paths. You can pull from a Drive folder or add local files in the
              import dialog (Google sign-in required; videos upload into your Encore Performances folder). Afterward,
              open a few songs and fix anything that still looks wrong.
            </Box>
          </Box>

          <Divider sx={{ my: 4, borderColor: encoreHairline }} />

          <Typography component="h2" variant="h6" sx={sectionTitleSx}>
            Performance videos (bulk import)
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            Encore infers the song from the video file name, folder path, and Drive fields such as description and
            indexable text when present. For the performance date it prefers a date in the file name; otherwise it tries
            other text from the same clues, then Drive creation time, then modified time, then today as a last resort.
            When it files videos in your Performances folder it renames them to a short{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              YYYY-MM-DD - Title - Artist
            </Typography>{' '}
            pattern. Venue does not go in the file name; use folder metadata (below) or edit venue in the review table.
            Supported types include common video extensions (for example{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              .mp4
            </Typography>
            ,{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              .mov
            </Typography>
            ,{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              .m4v
            </Typography>
            ) and other video mime types Drive reports.
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            If a Drive file is already attached to an Encore performance, saving the bulk import updates that
            performance (date, venue, video file, notes) instead of creating a second copy. Duplicate-looking rows in the
            review table may be flagged and skipped by default; you can still include them explicitly.
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, fontWeight: 700, mb: 0.5 }}>
            Canonical file name (before import)
          </Typography>
          <Mono>{'YYYY-MM-DD - Song title - Artist.mp4'}</Mono>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            Use a real calendar date, then title, then artist. If artist is missing, Encore may use{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Unknown artist
            </Typography>{' '}
            when it renames the file. Underscores and extra hyphens still give the matcher fragments to work with.
          </Typography>

          <Typography component="h2" variant="h6" sx={sectionTitleSx}>
            Tagging a whole folder (optional)
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            Any Drive folder whose name looks like{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Key - Value
            </Typography>{' '}
            (space, hyphen, space after the key) applies to every file inside that folder and subfolders. Keys are
            case-insensitive. The deepest folder wins when the same key appears more than once. Segments that are{' '}
            <Typography component="span" sx={{ fontWeight: 700 }}>
              not
            </Typography>{' '}
            in this pattern are still kept as a path hint, which helps venue guessing for performances. Recognized keys:
          </Typography>
          <Box component="ul" sx={{ ...articleBodySx, pl: 2.5, mb: 2, color: 'text.secondary' }}>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Venue
              </Typography>
              : default venue for performances imported from that tree.
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Artist
              </Typography>
              : fills missing artist when pairing scores; on{' '}
              <Typography component="span" sx={{ fontWeight: 700 }}>
                new
              </Typography>{' '}
              songs created from a performance import row, combines with folder Key and Tags where applicable.
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Accompaniment
              </Typography>
              : comma-separated tags. Only values in Encore’s accompaniment list count ({ACCOMPANIMENT_TAGS_GUIDE_TEXT});
              unknown tokens are dropped.
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Date
              </Typography>
              : performance date. Prefer{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                YYYY-MM-DD
              </Typography>
              ; other date-shaped text may parse.
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Key
              </Typography>
              : performance key for new songs from performance import, and a fallback when a score file name has no key.
            </li>
            <li>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                Tags
              </Typography>
              : comma-separated song tags. For score import, merged into the library song when you save. For performance
              import, applied when the row creates a{' '}
              <Typography component="span" sx={{ fontWeight: 700 }}>
                new
              </Typography>{' '}
              song (not when attaching to an existing song only).
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
            Encore picks up PDF, MusicXML (including{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              .mxl
            </Typography>
            ), MIDI, and other score-like types Drive lists under common extensions. It parses title, artist, and key
            from typical publisher-style names (MusicNotes-style patterns are covered). The same name shape is used when
            Encore later organizes charts in Drive so round-tripping stays predictable. Choose a Drive folder in the
            dialog, or drop local files. If the Google Picker is unavailable, pasting a folder link or folder id in the
            same field still works when you are signed in.
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, fontWeight: 700, mb: 0.5 }}>
            Canonical chart name when Encore organizes files
          </Typography>
          <Mono>{'Title - Artist - Key.pdf'}</Mono>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 2 }}>
            When the song has a performance key, Encore adds it after the artist (for example{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Title - Artist - A major.pdf
            </Typography>
            ). Recordings and backing tracks stay{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Title - Artist.pdf
            </Typography>
            . Labels such as{' '}
            <Typography component="span" sx={{ fontStyle: 'italic' }}>
              Lead Sheet
            </Typography>{' '}
            or{' '}
            <Typography component="span" sx={{ fontStyle: 'italic' }}>
              Piano Vocal
            </Typography>{' '}
            at the end are stripped while parsing. Variants with an MN-style catalog segment are recognized.
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 0 }}>
            In the review table you pair each file to a song and, when a key was parsed, optionally copy it into the
            song’s performance key if that field is empty. Folder names{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Artist - …
            </Typography>
            ,{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Key - …
            </Typography>
            , or{' '}
            <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
              Tags - …
            </Typography>{' '}
            fill gaps when the file name does not carry that information (see Tagging a whole folder).
          </Typography>

          <Divider sx={{ my: 4, borderColor: encoreHairline }} />

          <Typography component="h2" variant="h6" sx={sectionTitleSx}>
            After every import
          </Typography>
          <Typography component="p" sx={{ ...articleBodySx, color: 'text.secondary', mb: 3 }}>
            Adjust outliers in the import dialog, then open a handful of songs and confirm titles, artists, linked media,
            and performances.
          </Typography>

          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            <Button variant="contained" component="a" href={encoreAppHref({ kind: 'library' })} sx={{ textTransform: 'none' }}>
              Go to repertoire
            </Button>
            <Button variant="outlined" component="a" href={encoreAppHref({ kind: 'repertoireSettings' })} sx={{ textTransform: 'none' }}>
              Settings
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 2.5, lineHeight: 1.6 }}>
            From the repertoire screen, open the toolbar{' '}
            <Typography component="span" sx={{ fontWeight: 600 }}>
              Add
            </Typography>{' '}
            menu, then{' '}
            <Typography component="span" sx={{ fontWeight: 600 }}>
              Import
            </Typography>{' '}
            for playlists, videos, or scores.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
