import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import { handleMenuListKeyDown } from '../../shared/a11y/focusable';
import { useLabsDisclosureMenu } from '../../shared/a11y/useLabsDisclosureMenu';
import { maqamatByFamily, type MaqamPreset } from '../data/maqamPresets';

interface MaqamPickerProps {
  preset: MaqamPreset;
  presetId: string;
  onSelectPreset: (id: string) => void;
}

/**
 * The card's heading IS the maqam picker.
 *
 * A native `<select>` came first, transparent over a typographic face, and it
 * was the right *structure* — the heading is the control, so the card stops
 * saying the maqam's name twice. What it could not be was beautiful: the
 * options are drawn by the OS, so the menu is a system list in a page that is
 * not, and the trigger's focus ring was clipped by the card's scroll box.
 *
 * This is the same structure with a menu the app draws. What it costs is the
 * platform picker on a phone; what it buys is a menu that matches the app and
 * a control that can be styled at all. Everything the native element gave for
 * free is reimplemented here deliberately, because losing any of it would be a
 * real regression and not a cosmetic one:
 *
 *   - arrows, Home and End      `handleMenuListKeyDown`
 *   - type-ahead                 below; "s" cycles Saba, Sikah
 *   - Escape closes, focus back  below
 *   - the nine family groups     `role="group"` + a labelled header
 *   - the current value          `aria-checked` on a `menuitemradio`
 */
export default function MaqamPicker({ preset, presetId, onSelectPreset }: MaqamPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { getTriggerA11yProps, getMenuProps } = useLabsDisclosureMenu();
  const families = useMemo(() => maqamatByFamily(), []);
  const open = anchor !== null;

  const close = useCallback(
    (returnFocus = true) => {
      setAnchor(null);
      if (returnFocus) triggerRef.current?.focus();
    },
    [],
  );

  /**
   * Open with focus already on the CURRENT maqam, not on the first one.
   *
   * A menu of eleven that opens at the top makes the reader find their place
   * before they can move; opening on the current value is what the native
   * control did and what every list of this shape should do.
   */
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const current = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
      (current ?? menuRef.current?.querySelector<HTMLElement>('[role="menuitemradio"]'))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  /**
   * Type-ahead. The native `<select>` had it and nobody would notice it was
   * gone until they reached for it, which is the worst kind of regression.
   * Letters typed within a second accumulate, so "sa" finds Saba past Sikah.
   */
  const typed = useRef({ text: '', at: 0 });
  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    handleMenuListKeyDown(event, items, { onEscape: () => close() });
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    const now = Date.now();
    typed.current = {
      text: now - typed.current.at > 1000 ? event.key : typed.current.text + event.key,
      at: now,
    };
    const match = items.find((item) =>
      (item.dataset.search ?? '').startsWith(typed.current.text.toLowerCase()),
    );
    if (match) {
      event.preventDefault();
      match.focus();
    }
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="maqam-titlepick"
        onClick={(event) => setAnchor(open ? null : event.currentTarget)}
        onKeyDown={(event) => {
          /* ArrowDown opens, as it does on every listbox and select. */
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setAnchor(event.currentTarget);
          }
        }}
        {...getTriggerA11yProps(open)}
      >
        <span className="maqam-titlepick__face">
          <span className="maqam-titlepick__name">{preset.transliteration}</span>
          <svg className="maqam-titlepick__caret" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M5.5 8 10 12.5 14.5 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <AnchoredPopover
        open={open}
        anchorEl={anchor}
        onClose={() => close(false)}
        placement="bottom-start"
      >
        {/* `maqam-portal` carries the app's tokens into the portal, which
            renders at the end of <body>, outside `.maqam`. */}
        <div
          className="maqam-portal maqam-menu"
          ref={menuRef}
          role="menu"
          aria-label="Maqam"
          /* The container carries the key handling for the whole list, so it
             has to be in the tab order itself — focus moves to an item on
             open, and the handler catches the keys as they bubble. */
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          {...getMenuProps()}
        >
          {families.map(({ family, maqamat }) => (
            <div className="maqam-menu__group" role="group" aria-label={`${family} family`} key={family}>
              {/*
                The family header, which is the reason this menu is grouped at
                all: "Maqamat are classified into families based on sharing the
                same first (root) jins" (maqamworld.com). Derived from each
                maqam's root jins, so a family can never disagree with the cell
                it is named for.
              */}
              <p className="maqam-menu__family" aria-hidden="true">
                {family}
              </p>
              {maqamat.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  role="menuitemradio"
                  aria-checked={option.id === presetId}
                  data-search={option.transliteration.toLowerCase().replace(/^maqam\s+/, '')}
                  className="maqam-menu__item"
                  onClick={() => {
                    onSelectPreset(option.id);
                    close();
                  }}
                >
                  <span className="maqam-menu__name">{option.transliteration}</span>
                  <span className="maqam-menu__tonic">{option.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </AnchoredPopover>
    </>
  );
}
