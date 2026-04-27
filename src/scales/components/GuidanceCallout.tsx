import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import type { GuidancePayload } from '../guidance/computeGuidance';

// Typography and shape tokens align with the input gateway (`InputGateway.tsx`)
// and Material 3 dialog spacing (8dp rhythm: spacing n -> 4n px).

function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1, display: 'inline-flex' }}
    >
      {name}
    </span>
  );
}

export interface GuidanceCalloutProps {
  payload: GuidancePayload;
  /**
   * Called when the user clicks "Got it" or dismisses the dialog
   * (backdrop, Escape). The session screen uses this to dispatch
   * `markGuidanceIntroduced` so the same guidance does not reappear.
   */
  onDismiss: () => void;
}

/**
 * One-shot **concept** intros (modal). Fingering and video links render
 * beside the score in SessionScreen, not here.
 *
 * Visual language matches `InputGateway.tsx` (M3 extra-large shape, hero icon
 * in primary-container tint, headlineSmall + body copy scale).
 */
export default function GuidanceCallout({ payload, onDismiss }: GuidanceCalloutProps) {
  const { concepts } = payload;
  if (concepts.length === 0) return null;

  const handleDialogClose = () => {
    onDismiss();
  };

  return (
    <Dialog
      open
      onClose={handleDialogClose}
      aria-labelledby="guidance-callout-title"
      maxWidth={false}
      fullWidth
      scroll="paper"
      sx={{ zIndex: 2000 }}
      slotProps={{
        backdrop: {
          sx: {
            // M3 scrim (match InputGateway)
            bgcolor: 'rgba(0, 0, 0, 0.32)',
          },
        },
        paper: {
          elevation: 3,
          sx: (theme: Theme) => ({
            maxWidth: 480,
            width: '100%',
            borderRadius: '28px',
            overflow: 'hidden',
            mx: 2,
            // Slightly more lift than the gateway (dialog over practice UI)
            boxShadow: theme.shadows[8],
          }),
        },
      }}
    >
      <DialogContent
        sx={{
          p: { xs: 6, sm: 8 },
        }}
      >
        {/* Centered hero — same pattern as "Connect your piano" */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box
            aria-hidden="true"
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: theme => `${theme.palette.primary.main}1F`,
              color: 'primary.main',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Icon name="school" size={28} />
          </Box>
          <Typography
            id="guidance-callout-title"
            component="h2"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 500,
              lineHeight: '2rem',
              letterSpacing: 0,
              color: 'text.primary',
            }}
          >
            New for you
          </Typography>
        </Box>

        {/* Section bodies — left-aligned for readable paragraphs */}
        <Stack spacing={0}>
          {concepts.map((concept, i) => (
            <Box key={concept.key}>
              {i > 0 && (
                <Divider
                  sx={{
                    my: 5,
                    borderColor: 'divider',
                  }}
                />
              )}
              <Box>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 500,
                    lineHeight: '1.5rem',
                    letterSpacing: '0.009375rem',
                    color: 'text.primary',
                    mb: 2,
                  }}
                >
                  {concept.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    lineHeight: '1.25rem',
                    letterSpacing: '0.015625rem',
                    color: 'text.secondary',
                  }}
                >
                  {concept.body}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleDialogClose}
          disableElevation
          sx={{
            mt: 6,
            height: 40,
            borderRadius: '999px',
            fontSize: '0.875rem',
            fontWeight: 500,
            letterSpacing: '0.00625rem',
          }}
        >
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
