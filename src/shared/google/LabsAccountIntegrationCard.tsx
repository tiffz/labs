import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { LabsStatusPill, type LabsStatusPillTone } from '../components/LabsStatusPill';

/**
 * Parallel card layout for account-menu integrations (Google, Spotify, …).
 *
 * Every connection shares the same conceptual primitives (status, identity,
 * description, sub-actions, primary "sign in again", secondary "disconnect").
 * Rendering them through one component keeps the visual rhythm consistent so
 * users can scan from one integration to the next without remapping.
 *
 * Render cards through {@link LabsAccountMenu}'s `integrationsSlot`. Copy
 * contract: `src/encore/COPY_STYLE.md` § Account integrations (first consumer).
 */
export type LabsAccountIntegrationAction =
  | {
      label: string;
      onClick: () => void;
      disabled?: boolean;
      loading?: boolean;
      icon?: ReactNode;
    }
  | undefined;

export type LabsAccountIntegrationUtilityAction = {
  /** Tooltip text + accessible name. */
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
};

export function LabsAccountIntegrationCard(props: {
  brandIcon: ReactNode;
  title: string;
  status: { tone: LabsStatusPillTone; label: string; icon?: ReactNode };
  /**
   * "Signed in as" label + value (and an optional identity-linked open link, e.g. the user's
   * Spotify profile). The link sits adjacent to the value because it's bound to *that* identity;
   * non-identity workspace utilities (open Drive folder, reorganize) belong in `utilityActions`.
   */
  identity?: {
    label: string;
    value: ReactNode;
    link?: { href: string; label: string };
  };
  /** One short sentence describing what this connection does (or how to enable it). */
  description: ReactNode;
  /** Optional caption under the description (e.g. "Last sync today, 9:10 AM"). */
  meta?: ReactNode;
  /** Small icon-only buttons for workspace utilities (open Drive folder, reorganize, etc.). */
  utilityActions?: LabsAccountIntegrationUtilityAction[];
  /** Primary button (Sign in / Sign in again / Reconnect). */
  primary: LabsAccountIntegrationAction;
  /** Optional inline secondary action for error states (e.g. Retry sync). */
  inlineSecondary?: LabsAccountIntegrationAction;
  /** Tertiary text button (Disconnect). Omit when not connected. */
  disconnect?: LabsAccountIntegrationAction;
  /** Inline alert (error / warning) for connection failures. */
  alert?: ReactNode;
  /** Optional caption under the action row (e.g. reorganize result). */
  footnote?: ReactNode;
}): ReactElement {
  const {
    brandIcon,
    title,
    status,
    identity,
    description,
    meta,
    utilityActions,
    primary,
    inlineSecondary,
    disconnect,
    alert,
    footnote,
  } = props;
  return (
    <Box sx={{ px: 3, py: 2.5 }}>
      <Stack spacing={1.5}>
        {/* Section header: brand mark + title + status */}
        <Stack direction="row" spacing={1.25} sx={{
          alignItems: "center"
        }}>
          <Box sx={{ color: 'text.secondary', display: 'inline-flex' }}>{brandIcon}</Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              fontSize: '0.6875rem',
              lineHeight: 1.35,
            }}
          >
            {title}
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <LabsStatusPill tone={status.tone} label={status.label} icon={status.icon} />
          </Box>
        </Stack>

        {/* Identity (only when connected). Identity-linked open is rendered inline with the
            value so the user reads "I'm signed in as X. open X's profile" as one unit. */}
        {identity ? (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block',
                lineHeight: 1.35,
                fontWeight: 700,
                letterSpacing: '0.06em',
                mb: 0.35
              }}>
              {identity.label}
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: "center",
                flexWrap: 'wrap',
                rowGap: 0.25
              }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, lineHeight: 1.45, wordBreak: 'break-word', minWidth: 0 }}
              >
                {identity.value}
              </Typography>
              {identity.link ? (
                <Tooltip title={identity.link.label}>
                  <IconButton
                    size="small"
                    aria-label={identity.link.label}
                    component="a"
                    href={identity.link.href}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          </Box>
        ) : null}

        {/* Description + optional meta caption */}
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              lineHeight: 1.65,
              letterSpacing: '-0.01em'
            }}>
            {description}
          </Typography>
          {meta ? (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: 'block',
                mt: 0.5,
                lineHeight: 1.5
              }}>
              {meta}
            </Typography>
          ) : null}
        </Box>

        {/* Utility icon row (open external, reorganize, etc.) */}
        {utilityActions && utilityActions.length > 0 ? (
          <Stack direction="row" spacing={0.25} sx={{
            alignItems: "center"
          }}>
            {utilityActions.map((u) => (
              <Tooltip key={u.label} title={u.label}>
                <span>
                  <IconButton
                    size="small"
                    aria-label={u.label}
                    component={u.href ? 'a' : 'button'}
                    href={u.href}
                    target={u.href ? '_blank' : undefined}
                    rel={u.href ? 'noreferrer' : undefined}
                    onClick={u.onClick}
                    disabled={!u.href && !u.onClick}
                  >
                    {u.icon}
                  </IconButton>
                </span>
              </Tooltip>
            ))}
          </Stack>
        ) : null}

        {/* Inline alert (error / warning) */}
        {alert ? <Box>{alert}</Box> : null}

        {/*
         * Action row.
         *
         * Recovery actions ("Sign in again", "Disconnect") are *low-key* when the connection is
         * healthy — these are paths the user only walks down if something is wrong, so they
         * shouldn't visually compete with the rest of the menu. When status is `warning` /
         * `error` / `idle`, the primary button promotes back to outlined so the user can find
         * the call-to-action while skimming.
         *
         * Disconnect is always low-key — it's a destructive action, never a happy-path CTA.
         */}
        {primary || disconnect || inlineSecondary ? (
          (() => {
            const primaryNeedsCta = status.tone !== 'ok';
            return (
              <Stack
                direction="row"
                sx={{
                  gap: 1,
                  flexWrap: "wrap",
                  alignItems: "center",
                  pt: 0.25
                }}>
                {primary ? (
                  <Button
                    size="small"
                    variant={primaryNeedsCta ? 'outlined' : 'text'}
                    color="inherit"
                    startIcon={primary.icon}
                    onClick={primary.onClick}
                    disabled={primary.disabled || primary.loading}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      ...(primaryNeedsCta
                        ? {}
                        : {
                            color: 'text.secondary',
                            px: 1,
                            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                          }),
                    }}
                  >
                    {primary.label}
                  </Button>
                ) : null}
                {inlineSecondary ? (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    startIcon={inlineSecondary.icon}
                    onClick={inlineSecondary.onClick}
                    disabled={inlineSecondary.disabled || inlineSecondary.loading}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'text.secondary',
                      px: 1,
                      '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                    }}
                  >
                    {inlineSecondary.label}
                  </Button>
                ) : null}
                <Box sx={{ flex: 1 }} />
                {disconnect ? (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    startIcon={disconnect.icon ?? <LogoutIcon fontSize="small" />}
                    onClick={disconnect.onClick}
                    disabled={disconnect.disabled}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'text.secondary',
                      px: 1,
                      '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                    }}
                  >
                    {disconnect.label}
                  </Button>
                ) : null}
              </Stack>
            );
          })()
        ) : null}

        {footnote ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              lineHeight: 1.55,
              display: 'block'
            }}>
            {footnote}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
