import Button from '@mui/material/Button';
import { useRef, useState, type MouseEvent, type ReactElement } from 'react';
import AnchoredPopover from '../../../../shared/components/AnchoredPopover';
import type { SongSection } from '../../../../shared/music/chordPro/chordChartLayout';
import {
  countSectionProgressionLines,
  type ApplySectionProgressionResult,
} from '../../../../shared/music/chordPro/applySectionProgression';

export type OriginalsPaintSectionHeadingProps = {
  section: SongSection;
  onApply: (sectionId: string, progression: string) => ApplySectionProgressionResult;
};

/**
 * Section header on the Add Chords stage — opens a compact menu to paste a progression
 * for this section only (one chord per line, looping).
 */
export function OriginalsPaintSectionHeading({
  section,
  onApply,
}: OriginalsPaintSectionHeadingProps): ReactElement {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [progression, setProgression] = useState('');
  const [error, setError] = useState<string | null>(null);

  const label = section.header?.trim() || section.type;
  const progressionLineCount = countSectionProgressionLines(section);
  const lineWord = progressionLineCount === 1 ? 'line' : 'lines';

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const apply = () => {
    const result = onApply(section.sectionId, progression);
    if (!result.ok) {
      if (result.reason === 'empty') setError('Paste a chord progression first.');
      else if (result.reason === 'invalid') setError('Could not read those chord symbols.');
      else setError('Section not found.');
      return;
    }
    setProgression('');
    close();
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={[
          'encore-originals-paint-section-heading-trigger',
          open ? 'is-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} section options`}
        onClick={() => {
          setOpen((previous) => !previous);
          if (!open) {
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }
        }}
      >
        <span className="encore-originals-paint-section-heading-label">{label}</span>
        <span className="material-symbols-outlined encore-originals-paint-section-heading-chevron" aria-hidden>
          expand_more
        </span>
      </button>
      <AnchoredPopover
        open={Boolean(open && anchorRef.current)}
        anchorEl={anchorRef.current}
        onClose={close}
        placement="bottom-start"
        paperClassName="encore-originals-section-progression-menu"
        slotProps={{
          paper: {
            onMouseDown: (event: MouseEvent<HTMLDivElement>) => event.stopPropagation(),
          },
        }}
      >
        <div className="encore-originals-section-progression-menu-inner">
          <header className="encore-originals-section-progression-menu-header">
            <h4 className="encore-originals-section-progression-menu-title">Chord progression</h4>
            <p className="encore-originals-section-progression-menu-lede">
              Paste chords for {label}. One chord per line, looping across {progressionLineCount} {lineWord}.
            </p>
          </header>
          <label className="encore-originals-section-progression-menu-field">
            <span className="encore-originals-section-progression-menu-field-label">Progression</span>
            <input
              ref={inputRef}
              type="text"
              value={progression}
              placeholder="C → Am → F → G"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setProgression(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  apply();
                }
              }}
            />
          </label>
          {error ? (
            <p className="encore-originals-section-progression-menu-error" role="status">
              {error}
            </p>
          ) : null}
          <div className="encore-originals-section-progression-menu-actions">
            <Button size="small" variant="text" onClick={close} className="encore-originals-section-progression-cancel">
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!progression.trim()}
              onClick={apply}
              className="encore-originals-section-progression-apply"
            >
              Apply to section
            </Button>
          </div>
        </div>
      </AnchoredPopover>
    </>
  );
}
