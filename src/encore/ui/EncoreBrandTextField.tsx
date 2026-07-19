import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import type { ReactElement, ReactNode } from 'react';
import {
  GoogleDriveBrandIcon,
  SpotifyBrandIcon,
  YouTubeBrandIcon,
} from '../components/EncoreBrandIcon';

export type EncoreBrandTextFieldBrand = 'spotify' | 'youtube' | 'googleDrive';

const DEFAULT_ICON_PX = 20;

function BrandMark({
  brand,
  iconPx,
}: {
  brand: EncoreBrandTextFieldBrand;
  iconPx: number;
}): ReactElement {
  switch (brand) {
    case 'spotify':
      return <SpotifyBrandIcon sx={{ fontSize: iconPx }} aria-hidden />;
    case 'youtube':
      return <YouTubeBrandIcon sx={{ fontSize: iconPx, opacity: 0.92 }} aria-hidden />;
    case 'googleDrive':
      return (
        <GoogleDriveBrandIcon sx={{ fontSize: iconPx, color: 'text.secondary' }} aria-hidden />
      );
  }
}

function brandLogoStartAdornment(
  brand: EncoreBrandTextFieldBrand,
  opts: { divider: boolean; iconPx: number },
): ReactNode {
  const { divider, iconPx } = opts;
  return (
    <InputAdornment
      position="start"
      sx={{
        ml: { xs: -0.5, sm: -0.75 },
        mr: 0,
        maxHeight: 'none',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 0.125,
          ...(divider
            ? {
                pr: 1.125,
                mr: 0.75,
                borderRight: 1,
                borderColor: 'divider',
              }
            : { pr: 0.25 }),
        }}
      >
        <BrandMark brand={brand} iconPx={iconPx} />
      </Box>
    </InputAdornment>
  );
}

type InputSlotProps = NonNullable<NonNullable<TextFieldProps['slotProps']>['input']>;

export type EncoreBrandTextFieldProps = Omit<TextFieldProps, 'slotProps'> & {
  brand: EncoreBrandTextFieldBrand;
  /** Light vertical rule between the logo and typed text (default: true). */
  brandDivider?: boolean;
  /** Logo size in px (default: 20). */
  brandIconPx?: number;
  /** Legacy alias for slotProps.input (MUI 9 removed TextField InputProps). */
  InputProps?: InputSlotProps;
  slotProps?: TextFieldProps['slotProps'];
};

/**
 * Outlined text field with the brand mark inside the field chrome—use for Spotify, YouTube,
 * Drive, and other paste/search rows so logos never float in the margin.
 */
export function EncoreBrandTextField(props: EncoreBrandTextFieldProps): ReactElement {
  const {
    brand,
    brandDivider = true,
    brandIconPx = DEFAULT_ICON_PX,
    InputProps,
    slotProps,
    ...rest
  } = props;

  const logoStrip = brandLogoStartAdornment(brand, { divider: brandDivider, iconPx: brandIconPx });
  const inputSlot = (slotProps?.input ?? InputProps ?? {}) as InputSlotProps;

  return (
    <TextField
      {...rest}
      slotProps={{
        ...slotProps,
        input: {
          ...inputSlot,
          startAdornment: (
            <>
              {logoStrip}
              {'startAdornment' in inputSlot ? inputSlot.startAdornment : null}
            </>
          ),
        },
      }}
    />
  );
}

/**
 * Same logo strip as {@link EncoreBrandTextField} for Autocomplete `renderInput` or other
 * composed inputs.
 */
// eslint-disable-next-line react-refresh/only-export-components -- non-component helper for Autocomplete
export function encoreBrandInputStartAdornment(
  brand: EncoreBrandTextFieldBrand,
  opts?: { divider?: boolean; iconPx?: number },
): ReactNode {
  return brandLogoStartAdornment(brand, {
    divider: opts?.divider ?? true,
    iconPx: opts?.iconPx ?? DEFAULT_ICON_PX,
  });
}
