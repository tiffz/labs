import TextField from '@mui/material/TextField';
import { useId, useRef, useState, type ReactElement } from 'react';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import type { ComicCastMember, PanelBackgroundImage } from '../../shared/comic';
import { LabsWikimediaImageField, type LabsWikimediaImageResult } from '../../shared/media';
import {
  LabsPaletteBuilder,
  createPaletteFromHexes,
  parsePalettePaste,
  type ComicPalette,
} from '../../shared/palette';
import { labsPrintSpecSummary, type LabsPrintSpec } from '../../shared/zine';
import { ScrapboardEmojiPicker } from './ScrapboardEmojiPicker';
import { ScrapboardPrintSpecPanel } from './ScrapboardPrintSpecPanel';
import { ScrapboardScopeActions } from './ScrapboardScopeActions';

export type ScrapboardPageFinishBarProps = {
  palette: ComicPalette | null;
  onPaletteApply: (palette: ComicPalette) => void;
  onRandomizePalette: () => void;
  cast: ComicCastMember[];
  onAddCastMember: () => void;
  onUpdateCastMember: (id: string, patch: Partial<ComicCastMember>) => void;
  onRemoveCastMember: (id: string) => void;
  onRandomizeCast: () => void;
  castLocked: boolean;
  paletteLocked: boolean;
  onToggleCastLock: () => void;
  onTogglePaletteLock: () => void;
  pageBackgroundImage: PanelBackgroundImage | null;
  onSelectPageBackgroundImage: (result: LabsWikimediaImageResult) => void;
  onClearPageBackgroundImage: () => void;
  printSpec: LabsPrintSpec;
  onPrintSpecChange: (next: LabsPrintSpec) => void;
  showBleedGuides: boolean;
  onShowBleedGuidesChange: (show: boolean) => void;
  onRandomizeTrim: () => void;
  trimLocked: boolean;
  onToggleTrimLock: () => void;
  onRandomizePhotos: () => void;
  photosLocked: boolean;
  onTogglePhotosLock: () => void;
};

type FinishMenu = 'cast' | 'palette' | 'page-photo' | 'page-settings' | null;

/**
 * Page-scoped finish controls as compact chips (cast, palette, page photo, print).
 * Keeps the left rail panel-only.
 */
export function ScrapboardPageFinishBar({
  palette,
  onPaletteApply,
  onRandomizePalette,
  cast,
  onAddCastMember,
  onUpdateCastMember,
  onRemoveCastMember,
  onRandomizeCast,
  castLocked,
  paletteLocked,
  onToggleCastLock,
  onTogglePaletteLock,
  pageBackgroundImage,
  onSelectPageBackgroundImage,
  onClearPageBackgroundImage,
  printSpec,
  onPrintSpecChange,
  showBleedGuides,
  onShowBleedGuidesChange,
  onRandomizeTrim,
  trimLocked,
  onToggleTrimLock,
  onRandomizePhotos,
  photosLocked,
  onTogglePhotosLock,
}: ScrapboardPageFinishBarProps): ReactElement {
  const [menu, setMenu] = useState<FinishMenu>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const [editingCastId, setEditingCastId] = useState<string | null>(null);
  const castRef = useRef<HTMLButtonElement | null>(null);
  const paletteRef = useRef<HTMLButtonElement | null>(null);
  const photoRef = useRef<HTMLButtonElement | null>(null);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();
  const printSummary = labsPrintSpecSummary(printSpec);

  const close = (): void => {
    setMenu(null);
    setPasteOpen(false);
    setEditingCastId(null);
  };

  const onApplyPaste = (): void => {
    const hexes = parsePalettePaste(paste);
    if (!hexes) return;
    onPaletteApply(createPaletteFromHexes(hexes, 'Board palette', 'import'));
    setPaste('');
    close();
  };

  const paletteChipLabel = palette ? palette.name : 'Palette';
  const photoChipLabel = pageBackgroundImage
    ? pageBackgroundImage.title ?? 'Page photo'
    : 'Page photo';
  const settingsChipLabel = printSummary.presetLabel;
  const castChipLabel = `Cast (${cast.length})`;
  const editingMember = cast.find((row) => row.id === editingCastId) ?? null;

  return (
    <div className="scrapboard-page-finish" data-testid="scrapboard-page-finish">
      <span className="scrapboard-page-finish__label">Page</span>
      <div className="scrapboard-page-finish__chips" role="toolbar" aria-label="Page finish">
        <div
          className={[
            'scrapboard-page-finish__chip-wrap',
            menu === 'cast' ? 'scrapboard-page-finish__chip-wrap--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            ref={castRef}
            type="button"
            className={[
              'scrapboard-page-finish__chip',
              menu === 'cast' ? 'scrapboard-page-finish__chip--open' : '',
              'scrapboard-page-finish__chip--set',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-expanded={menu === 'cast'}
            aria-haspopup="dialog"
            data-testid="scrapboard-page-finish-cast"
            onClick={() => setMenu((current) => (current === 'cast' ? null : 'cast'))}
          >
            <span className="scrapboard-page-finish__cast-preview" aria-hidden>
              {cast.slice(0, 4).map((member) => (
                <span key={member.id} className="scrapboard-emoji scrapboard-emoji--sm">
                  {member.emoji}
                </span>
              ))}
            </span>
            <span className="scrapboard-page-finish__chip-text">{castChipLabel}</span>
          </button>
          <ScrapboardScopeActions
            scopeLabel="cast"
            locked={castLocked}
            onToggleLock={onToggleCastLock}
            onRandomize={onRandomizeCast}
            testIdPrefix="scrapboard-cast"
          />
        </div>

        <div
          className={[
            'scrapboard-page-finish__chip-wrap',
            menu === 'palette' ? 'scrapboard-page-finish__chip-wrap--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            ref={paletteRef}
            type="button"
            className={[
              'scrapboard-page-finish__chip',
              menu === 'palette' ? 'scrapboard-page-finish__chip--open' : '',
              palette ? 'scrapboard-page-finish__chip--set' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-expanded={menu === 'palette'}
            aria-haspopup="dialog"
            data-testid="scrapboard-page-finish-palette"
            onClick={() => setMenu((current) => (current === 'palette' ? null : 'palette'))}
          >
            {palette ? (
              <span className="scrapboard-page-finish__swatches" aria-hidden>
                {palette.swatches.slice(0, 5).map((swatch) => (
                  <span
                    key={swatch.id}
                    className="scrapboard-page-finish__swatch"
                    style={{ background: swatch.hex }}
                  />
                ))}
              </span>
            ) : null}
            <span className="scrapboard-page-finish__chip-text">{paletteChipLabel}</span>
          </button>
          <ScrapboardScopeActions
            scopeLabel="palette"
            locked={paletteLocked}
            onToggleLock={onTogglePaletteLock}
            onRandomize={onRandomizePalette}
            testIdPrefix="scrapboard-palette"
          />
        </div>

        <div
          className={[
            'scrapboard-page-finish__chip-wrap',
            menu === 'page-photo' ? 'scrapboard-page-finish__chip-wrap--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            ref={photoRef}
            type="button"
            className={[
              'scrapboard-page-finish__chip',
              menu === 'page-photo' ? 'scrapboard-page-finish__chip--open' : '',
              pageBackgroundImage ? 'scrapboard-page-finish__chip--set' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-expanded={menu === 'page-photo'}
            aria-haspopup="dialog"
            data-testid="scrapboard-page-finish-photo"
            onClick={() => setMenu((current) => (current === 'page-photo' ? null : 'page-photo'))}
          >
            {pageBackgroundImage?.thumbUrl || pageBackgroundImage?.url ? (
              <img
                src={pageBackgroundImage.thumbUrl || pageBackgroundImage.url}
                alt=""
                className="scrapboard-page-finish__thumb"
              />
            ) : null}
            <span className="scrapboard-page-finish__chip-text">{photoChipLabel}</span>
          </button>
          <ScrapboardScopeActions
            scopeLabel="photos"
            locked={photosLocked}
            onToggleLock={onTogglePhotosLock}
            onRandomize={onRandomizePhotos}
            testIdPrefix="scrapboard-photos"
          />
        </div>

        <div
          className={[
            'scrapboard-page-finish__chip-wrap',
            menu === 'page-settings' ? 'scrapboard-page-finish__chip-wrap--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            ref={settingsRef}
            type="button"
            className={[
              'scrapboard-page-finish__chip',
              menu === 'page-settings' ? 'scrapboard-page-finish__chip--open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-expanded={menu === 'page-settings'}
            aria-haspopup="dialog"
            data-testid="scrapboard-page-finish-settings"
            onClick={() =>
              setMenu((current) => (current === 'page-settings' ? null : 'page-settings'))
            }
          >
            <span className="scrapboard-page-finish__chip-text">{settingsChipLabel}</span>
          </button>
          <ScrapboardScopeActions
            scopeLabel="trim"
            locked={trimLocked}
            onToggleLock={onToggleTrimLock}
            onRandomize={onRandomizeTrim}
            testIdPrefix="scrapboard-trim"
          />
        </div>
      </div>

      <AnchoredPopover
        open={menu === 'cast'}
        anchorEl={castRef.current}
        onClose={close}
        placement="bottom-start"
        paperClassName="scrapboard-popover scrapboard-page-finish__menu"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        transitionDuration={0}
      >
        <div
          id={`${panelId}-cast`}
          role="dialog"
          aria-label="Page cast"
          className="scrapboard-page-finish__menu-body"
          data-testid="scrapboard-page-finish-cast-menu"
        >
          <p className="scrapboard-section-hint">Characters shared across every panel.</p>
          <ul className="scrapboard-cast-list">
            {cast.map((member) => (
              <li key={member.id} className="scrapboard-cast-list__row">
                <button
                  type="button"
                  className="scrapboard-cast-list__emoji"
                  onClick={() =>
                    setEditingCastId((current) => (current === member.id ? null : member.id))
                  }
                  aria-label={`Change emoji for ${member.label ?? 'character'}`}
                >
                  <span className="scrapboard-emoji scrapboard-emoji--md" aria-hidden>
                    {member.emoji}
                  </span>
                </button>
                <input
                  type="text"
                  className="scrapboard-inline-input"
                  value={member.label ?? ''}
                  placeholder="Label"
                  onChange={(event) =>
                    onUpdateCastMember(member.id, { label: event.target.value })
                  }
                />
                <button
                  type="button"
                  className="scrapboard-btn scrapboard-btn--ghost scrapboard-cast-list__remove"
                  disabled={cast.length <= 1}
                  onClick={() => onRemoveCastMember(member.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {editingMember ? (
            <ScrapboardEmojiPicker
              value={editingMember.emoji}
              onChange={(emoji) => {
                onUpdateCastMember(editingMember.id, { emoji });
                setEditingCastId(null);
              }}
            />
          ) : null}
          <button
            type="button"
            className="scrapboard-btn scrapboard-btn--ghost scrapboard-cast-list__add"
            data-testid="scrapboard-cast-add"
            onClick={() => onAddCastMember()}
          >
            Add character
          </button>
        </div>
      </AnchoredPopover>

      <AnchoredPopover
        open={menu === 'palette'}
        anchorEl={paletteRef.current}
        onClose={close}
        placement="bottom-start"
        paperClassName="scrapboard-popover scrapboard-page-finish__menu"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        transitionDuration={0}
      >
        <div
          id={`${panelId}-palette`}
          role="dialog"
          aria-label="Palette"
          className="scrapboard-page-finish__menu-body"
          data-testid="scrapboard-page-finish-palette-menu"
        >
          <p className="scrapboard-section-hint">
            Dice next to Palette applies a random palette immediately. Presets below let you pick a
            named set.
          </p>
          <LabsPaletteBuilder
            variant="sketchy"
            value={palette}
            onApply={(next) => {
              onPaletteApply(next);
              close();
            }}
            showHeading={false}
            showActiveStrip={false}
          />
          <div className="scrapboard-page-finish__paste">
            <button
              type="button"
              className="scrapboard-page-finish__paste-toggle"
              aria-expanded={pasteOpen}
              onClick={() => setPasteOpen((wasOpen) => !wasOpen)}
            >
              Paste hex or Coolors link
            </button>
            {pasteOpen ? (
              <div className="scrapboard-page-finish__paste-body">
                <TextField
                  size="small"
                  fullWidth
                  label="Palette source"
                  placeholder="Hex row, Coolors, or /palette/ link"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                />
                <button
                  type="button"
                  className="scrapboard-btn scrapboard-btn--ghost"
                  onClick={onApplyPaste}
                >
                  Apply paste
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </AnchoredPopover>

      <AnchoredPopover
        open={menu === 'page-photo'}
        anchorEl={photoRef.current}
        onClose={close}
        placement="bottom-start"
        paperClassName="scrapboard-popover scrapboard-page-finish__menu scrapboard-page-finish__menu--photo"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        transitionDuration={0}
      >
        <div
          id={`${panelId}-photo`}
          role="dialog"
          aria-label="Page photo"
          className="scrapboard-page-finish__menu-body"
          data-testid="scrapboard-page-finish-photo-menu"
        >
          <LabsWikimediaImageField
            variant="sketchy"
            presentation="inline"
            label="Page photo"
            hint="Shows through gutters; softly tinted. Prefer panel photos for scene detail."
            value={
              pageBackgroundImage
                ? {
                    url: pageBackgroundImage.url,
                    thumbUrl: pageBackgroundImage.thumbUrl,
                    title: pageBackgroundImage.title ?? 'Photo',
                    license: pageBackgroundImage.license,
                  }
                : null
            }
            onSelectImage={(result) => {
              onSelectPageBackgroundImage(result);
              close();
            }}
            onClear={onClearPageBackgroundImage}
          />
        </div>
      </AnchoredPopover>

      <AnchoredPopover
        open={menu === 'page-settings'}
        anchorEl={settingsRef.current}
        onClose={close}
        placement="bottom-end"
        paperClassName="scrapboard-popover scrapboard-page-finish__menu scrapboard-page-finish__menu--settings"
        disableRestoreFocus
        disableScrollLock
        marginThreshold={12}
        transitionDuration={0}
      >
        <div
          id={`${panelId}-settings`}
          role="dialog"
          aria-label="Page and export settings"
          className="scrapboard-page-finish__menu-body"
          data-testid="scrapboard-page-finish-settings-menu"
        >
          <ScrapboardPrintSpecPanel
            printSpec={printSpec}
            onChange={onPrintSpecChange}
            showBleedGuides={showBleedGuides}
            onShowBleedGuidesChange={onShowBleedGuidesChange}
          />
        </div>
      </AnchoredPopover>
    </div>
  );
}
