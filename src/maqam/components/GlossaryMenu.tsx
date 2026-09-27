import { useState } from 'react';
import Button from '@mui/material/Button';

import AnchoredPopover from '../../shared/components/AnchoredPopover';

/**
 * The words this app cannot avoid using.
 *
 * Definitions are one line each and deliberately thin. Every one of them is a
 * summary of a page on maqamworld that says it better, and the app's standing
 * rule is that we do not teach a tradition we are not expert in — we name the
 * term well enough to keep reading, then link out.
 */
const TERMS = [
  {
    term: 'Maqam',
    plural: 'Maqamat',
    gloss:
      'A melodic mode: a scale plus the conventions for moving through it. Maqamat that share the same root jins form a family.',
    href: 'https://www.maqamworld.com/en/maqam.php',
  },
  {
    term: 'Jins',
    plural: 'Ajnas',
    gloss:
      'The 3-to-5-note cell a maqam is built from. Its top note is the ghammaz, and most maqamat join a second jins to the first at a shared note.',
    href: 'https://www.maqamworld.com/en/jins.php',
  },
];

/**
 * A glossary in the header, where someone who does not yet have the vocabulary
 * will look for it.
 *
 * Labelled with the plain noun. It read "What do these words mean?", which
 * assumes the reader does not know them — condescending to anyone who came to
 * this app already knowing what a jins is, which is a good share of the people
 * who would open it. A glossary is a reference; naming it one lets the reader
 * decide whether they need it.
 *
 * It replaced a flat "Learn maqamat at maqamworld" link sitting at the same
 * visual weight as the maqam picker, which answered a question nobody arrives
 * with.
 */
export default function GlossaryMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button
        variant="text"
        size="small"
        className="maqam-glossary__trigger"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
      >
        Glossary
      </Button>

      <AnchoredPopover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        placement="bottom-end"
      >
        {/* `maqam-portal` carries the app's tokens into the portal, which
            renders at the end of <body>, outside `.maqam`. */}
        <div className="maqam-portal maqam-glossary">
          <dl className="maqam-glossary__list">
            {TERMS.map(({ term, plural, gloss, href }) => (
              <div className="maqam-glossary__row" key={term}>
                {/* The term is the link, for the same reason the maqam heading
                    is: a separate "learn more" per row would be four more
                    words saying what the underline already says. */}
                <dt>
                  <a href={href} target="_blank" rel="noreferrer noopener">
                    {term}
                  </a>
                  {/* The plural beside the singular, not as its own entry.
                      Four rows where two of them existed only to say "the
                      plural of the row above" is a glossary padding itself. */}
                  <span className="maqam-glossary__plural"> · {plural}</span>
                </dt>
                <dd>{gloss}</dd>
              </div>
            ))}
          </dl>
        </div>
      </AnchoredPopover>
    </>
  );
}
