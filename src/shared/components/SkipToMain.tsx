import React from 'react';

/**
 * A visually-hidden-until-focused skip link. Render as the first focusable
 * element in an app so keyboard/screen-reader users can bypass repeated
 * navigation and jump straight to the app's primary `<main id="main">`
 * landmark.
 *
 * Styling lives in `public/styles/shared.css` (`.skip-to-main`) so every app
 * that links the shared baseline picks it up without additional CSS wiring.
 */
export default function SkipToMain({
  target = '#main',
  label = 'Skip to main content',
}: {
  target?: string;
  label?: string;
}): React.ReactElement {
  return (
    <a className="skip-to-main" href={target}>
      {label}
    </a>
  );
}
