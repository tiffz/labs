import SvgIcon from '@mui/material/SvgIcon';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ReactElement } from 'react';

/** Spotify-style mark (decorative; follow Spotify brand guidelines for marketing assets). */
export function SpotifyBrandIcon(props: SvgIconProps): ReactElement {
  return (
    <SvgIcon viewBox="0 0 24 24" aria-hidden {...props}>
      <circle cx="12" cy="12" r="11" fill="#1DB954" />
      <path
        fill="#fff"
        d="M17.25 14.85c-.22 0-.33-.07-.51-.14-.88-.52-2.4-.9-4.24-.9-1.04 0-2.04.12-2.96.35-.24.07-.56.04-.65-.24-.09-.27.05-.45.28-.51 1.05-.24 2.17-.39 3.33-.39 2.1 0 3.8.45 4.84 1.04.17.09.27.31.17.49-.11.19-.29.26-.5.26zm.75-3.3c-.27 0-.41-.12-.62-.2-.99-.58-2.5-.94-4.4-.94-1.19 0-2.33.14-3.39.4-.3.08-.58-.06-.68-.35-.1-.29.06-.56.36-.65 1.15-.29 2.37-.44 3.71-.44 2.23 0 4.13.47 5.32 1.14.25.14.34.5.19.74-.14.25-.5.34-.76.2zM18 8.6c-1.2-.72-3.1-.82-4.2-.45-.36.12-.55.5-.42.86.13.35.51.54.86.42.87-.28 2.4-.18 3.35.39.32.2.74.09.94-.23.2-.32.09-.73-.23-.93z"
      />
    </SvgIcon>
  );
}

/** Google “G” colors (decorative). */
export function GoogleBrandIcon(props: SvgIconProps): ReactElement {
  return (
    <SvgIcon viewBox="0 0 24 24" aria-hidden {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </SvgIcon>
  );
}

export function YouTubeBrandIcon(props: SvgIconProps): ReactElement {
  return (
    <SvgIcon viewBox="0 0 24 24" aria-hidden {...props}>
      <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .1 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .1 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1 31.5 31.5 0 0 0 .1-5.8 31.5 31.5 0 0 0-.1-5.8z" />
      <path fill="#fff" d="M9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </SvgIcon>
  );
}
