import type { ReactElement } from 'react';

import LyreflyAccountMenu from './LyreflyAccountMenu';
import { LyreflyLogomark } from './LyreflyLogomark';
import { lyreflyGalleryHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import type { LyreflyRoute } from '../routes/lyreflyHash';

export type LyreflyAppHeaderProps = {
  route: LyreflyRoute;
};

export function LyreflyAppHeader({ route }: LyreflyAppHeaderProps): ReactElement {
  const onGallery = route.kind === 'gallery';

  return (
    <header className="lyrefly-header">
      <button
        type="button"
        className="lyrefly-header__brand"
        onClick={() => navigateLyreflyHash(lyreflyGalleryHref())}
        aria-label="Lyrefly, back to studio showcase"
      >
        <LyreflyLogomark size={32} />
        <span className="lyrefly-header__brand-text">
          <span className="lyrefly-header__title">Lyrefly</span>
          <span className="lyrefly-header__tagline">Indie comic studio</span>
        </span>
      </button>

      <nav className="lyrefly-header__nav" aria-label="Studio">
        <button
          type="button"
          className={['lyrefly-header__nav-item', 'lyrefly-header__nav-button', onGallery ? 'lyrefly-header__nav-item--current' : ''].join(' ')}
          aria-current={onGallery ? 'page' : undefined}
          onClick={() => navigateLyreflyHash(lyreflyGalleryHref())}
        >
          Showcase
        </button>
      </nav>

      <div className="lyrefly-header__actions">
        <LyreflyAccountMenu />
      </div>
    </header>
  );
}
