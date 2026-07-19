import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';

export type ComicScrollReaderPage = {
  id: string;
  label: string;
  imageUrl: string;
  isSpread?: boolean;
};

export type ComicScrollReaderVariant = 'default' | 'platform';

export type ComicScrollReaderProps = {
  pages: readonly ComicScrollReaderPage[];
  title?: string;
  variant?: ComicScrollReaderVariant;
};

/** Vertical scroll comic reader — shared between Lyrefly preview and future Zine handoff. */
export function ComicScrollReader({
  pages,
  title,
  variant = 'default',
}: ComicScrollReaderProps): ReactElement {
  const platformScroll = variant === 'platform';

  if (pages.length === 0) {
    return (
      <Box
        className={[
          'comic-scroll-reader',
          'comic-scroll-reader--empty',
          platformScroll ? 'comic-scroll-reader--platform' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="comic-scroll-reader"
      >
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          No pages to preview yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className={['comic-scroll-reader', platformScroll ? 'comic-scroll-reader--platform' : '']
        .filter(Boolean)
        .join(' ')}
      data-testid="comic-scroll-reader"
      role="region"
      aria-label={title ? `${title} scroll preview` : 'Comic scroll preview'}
    >
      <ul className="comic-scroll-reader__list">
        {pages.map((page) => (
          <li key={page.id} className="comic-scroll-reader__item">
            <figure
              className={[
                'comic-scroll-reader__figure',
                page.isSpread ? 'comic-scroll-reader__figure--spread' : '',
                platformScroll ? 'comic-scroll-reader__figure--platform' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <img
                className="comic-scroll-reader__image"
                src={page.imageUrl}
                alt={platformScroll ? '' : page.label}
                loading="lazy"
              />
              {platformScroll ? null : (
                <figcaption className="comic-scroll-reader__caption">{page.label}</figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
    </Box>
  );
}
