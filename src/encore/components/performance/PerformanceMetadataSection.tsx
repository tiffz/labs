import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { ENCORE_ACCOMPANIMENT_TAGS, ENCORE_PERFORMANCE_ROLES } from '../../types';
import { performanceRole } from '../../performances/performanceRole';
import type { EncorePerformance } from '../../types';

const FIELD_GROUP_LABEL_SX = {
  mb: 0.75,
  fontWeight: 600,
  fontSize: '0.875rem',
  lineHeight: 1.35,
  color: 'text.secondary',
  display: 'block',
} as const;

export type PerformanceMetadataSectionProps = {
  draft: EncorePerformance;
  venueList: string[];
  onChange: (next: EncorePerformance) => void;
};

export function PerformanceMetadataSection(props: PerformanceMetadataSectionProps): ReactElement {
  const { draft, venueList, onChange } = props;
  return (
    <>
      <TextField
        label="Date"
        type="date"
        value={draft.date}
        size="small"
        onChange={(e) => onChange({ ...draft, date: e.target.value })}
        fullWidth
        slotProps={{
          inputLabel: { shrink: true }
        }}
      />
      <Autocomplete
        freeSolo
        size="small"
        options={venueList}
        inputValue={draft.venueTag}
        onInputChange={(_, v) => onChange({ ...draft, venueTag: v })}
        renderInput={(params) => <TextField {...params} label="Venue" placeholder="Type or choose" fullWidth />}
      />
      {/*
        Her own part, directly above "Accompanied by" — the two answer opposite questions and are
        easy to conflate, so they sit together with labels that disambiguate rather than being
        separated and left to inference.

        Single-select: a performance has exactly one role, and because absent means 'Lead vocal'
        exactly one chip is always filled. Accompaniment below can be zero or many. That difference
        in behaviour is the cue that these are different kinds of question, without adding a second
        control type.
      */}
      <Box>
        <Typography component="label" sx={FIELD_GROUP_LABEL_SX}>
          Your role
        </Typography>
        <Stack
          direction="row"
          useFlexGap
          sx={{
            gap: 0.75,
            flexWrap: 'wrap',
          }}
        >
          {ENCORE_PERFORMANCE_ROLES.map((role) => {
            const active = performanceRole(draft) === role;
            return (
              <Chip
                key={role}
                size="small"
                label={role}
                clickable
                color={active ? 'primary' : 'default'}
                variant={active ? 'filled' : 'outlined'}
                sx={{ height: 28, fontWeight: 600 }}
                aria-pressed={active}
                onClick={() => {
                  // Store the default as absent so rows logged before roles existed and rows
                  // explicitly set back to lead stay byte-identical on the wire.
                  onChange({ ...draft, role: role === 'Lead vocal' ? undefined : role });
                }}
              />
            );
          })}
        </Stack>
      </Box>
      <Box>
        <Typography component="label" sx={FIELD_GROUP_LABEL_SX}>
          Accompanied by
        </Typography>
        <Stack
          direction="row"
          useFlexGap
          sx={{
            gap: 0.75,
            flexWrap: "wrap"
          }}>
          {ENCORE_ACCOMPANIMENT_TAGS.map((tag) => {
            const active = (draft.accompanimentTags ?? []).includes(tag);
            return (
              <Chip
                key={tag}
                size="small"
                label={tag}
                clickable
                color={active ? 'primary' : 'default'}
                variant={active ? 'filled' : 'outlined'}
                sx={{ height: 28, fontWeight: 600 }}
                onClick={() => {
                  const cur = new Set(draft.accompanimentTags ?? []);
                  if (cur.has(tag)) cur.delete(tag);
                  else cur.add(tag);
                  const next = ENCORE_ACCOMPANIMENT_TAGS.filter((t) => cur.has(t));
                  onChange({ ...draft, accompanimentTags: next.length ? next : undefined });
                }}
              />
            );
          })}
        </Stack>
      </Box>
      <TextField
        label="Notes"
        value={draft.notes ?? ''}
        size="small"
        onChange={(e) => onChange({ ...draft, notes: e.target.value || undefined })}
        fullWidth
        multiline
        minRows={2}
        placeholder="Optional"
      />
    </>
  );
}
