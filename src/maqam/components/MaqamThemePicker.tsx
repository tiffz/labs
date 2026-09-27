import { useState } from 'react';
import Button from '@mui/material/Button';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import { MAQAM_DESIGN_THEMES } from '../design/maqamDesignThemes';
import { useMaqamDesignTheme } from '../context/useMaqamDesignTheme';

/**
 * Ten looks, switchable without a reload.
 *
 * Each row shows the theme's own three colours, because the names are the
 * least useful thing about them — "Zellige" means nothing until you see that
 * it is teal. The swatches are drawn from the same derived tokens the app
 * paints with, so the preview cannot disagree with what a click produces.
 */
export default function MaqamThemePicker() {
  const { theme, setThemeId } = useMaqamDesignTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button
        variant="text"
        size="small"
        className="maqam-themepicker__trigger"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
      >
        <span className="maqam-themepicker__chip" aria-hidden="true" />
        {theme.label}
      </Button>

      <AnchoredPopover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        placement="bottom-end"
      >
        {/* `maqam-portal` carries the app's tokens into the portal, which
            renders at the end of <body>, outside `.maqam`. */}
        <div className="maqam-portal maqam-themepicker">
          <p className="maqam-themepicker__note">
            Ten looks for the same app. Pick one and tell me what works.
          </p>
          <ul className="maqam-themepicker__list">
            {MAQAM_DESIGN_THEMES.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="maqam-themepicker__option"
                  aria-pressed={option.id === theme.id}
                  onClick={() => setThemeId(option.id)}
                >
                  {/* Inline styles, deliberately: these ARE the theme's colours,
                      read from the token set it paints with. A stylesheet
                      cannot know ten palettes. */}
                  <span className="maqam-themepicker__swatch" aria-hidden="true">
                    <span style={{ background: option.tokens['--m3-surface'] }} />
                    <span style={{ background: option.tokens['--m3-primary'] }} />
                    <span style={{ background: option.tokens['--m3-tertiary'] }} />
                  </span>
                  <span className="maqam-themepicker__text">
                    <span className="maqam-themepicker__label">
                      {option.label}
                      {option.mode === 'dark' && (
                        <span className="maqam-themepicker__mode">Dark</span>
                      )}
                    </span>
                    <span className="maqam-themepicker__tagline">{option.tagline}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </AnchoredPopover>
    </>
  );
}
