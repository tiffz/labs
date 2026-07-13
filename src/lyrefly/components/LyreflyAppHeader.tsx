import type { ReactElement } from 'react';

import LyreflyAccountMenu from './LyreflyAccountMenu';
import { LyreflyLogomark } from './LyreflyLogomark';
import { lyreflyGalleryHref, lyreflySketchbookHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import type { LyreflyRoute } from '../routes/lyreflyHash';

export type LyreflyAppHeaderProps = {
  route: LyreflyRoute;
};

export function LyreflyAppHeader({ route }: LyreflyAppHeaderProps): ReactElement {
  const onGallery = route.kind === 'gallery';
  const onSketchbook = route.kind === 'sketchbook';

  return (
    <header className="lyrefly-header lyrefly-shell-bar">
      <div className="lyrefly-content-rail lyrefly-header__inner">
        <button
          type="button"
          className="lyrefly-header__brand"
          onClick={() => navigateLyreflyHash(lyreflyGalleryHref())}
          aria-label="Lyrefly, back to your comics"
        >
          <LyreflyLogomark size={28} />
          <span className="lyrefly-header__title">Lyrefly</span>
        </button>

        <nav className="lyrefly-header__nav" aria-label="Lyrefly">
          <button
            type="button"
            className={[
              'lyrefly-header__nav-item',
              'lyrefly-header__nav-button',
              onGallery ? 'lyrefly-header__nav-item--current' : '',
            ].join(' ')}
            aria-current={onGallery ? 'page' : undefined}
            onClick={() => navigateLyreflyHash(lyreflyGalleryHref())}
          >
            Your comics
          </button>
          <button
            type="button"
            className={[
              'lyrefly-header__nav-item',
              'lyrefly-header__nav-button',
              onSketchbook ? 'lyrefly-header__nav-item--current' : '',
            ].join(' ')}
            aria-current={onSketchbook ? 'page' : undefined}
            onClick={() => navigateLyreflyHash(lyreflySketchbookHref())}
            data-testid="lyrefly-sketchbook-tab"
          >
            Sketchbook
          </button>
        </nav>

        <div className="lyrefly-header__actions">
          <LyreflyAccountMenu />
        </div>
      </div>
    </header>
  );
}
