# Scrapboard — critical user journeys

## CUJ-001 — Generate layout gallery from panel count

Load `/scrapboard/`, set panel count (stepper in header), browse layout thumbnails ranked
conventional → experimental, and pick anytime from the right rail (strip stays open).
Layouts respect trim quiet zone; full-bleed variants appear only when enabled under **More**
(or via Randomize all).

## CUJ-002 — Add panel copy (dialogue + captions)

Select a panel (click on the page or P1…Pn tab). Add dialogue blocks for cast members,
captions, and optional SFX. Speech bubbles auto-arrange toward each speaker’s arrangement slot.

## CUJ-003 — Print-aware export

**Export PNG** opens a confirmation sheet with trim / bleed / file size. Edit page settings
inline if needed, then confirm. Page settings are also available from the **Page** chip bar
without exporting.

## CUJ-004 — Randomize

Header **Randomize** menu: **Randomize copy** shuffles dialogue/captions only (keeps cast and
speakers). **Randomize all** also picks panel count, layout, arrangements, and trim preset.

## CUJ-005 — Palette tint

Open the **Palette** chip in the Page finish bar and apply a proposal (moods, surprise, seed,
upload, or paste). Applied via `applyPaletteToMockup` with comic-convention roles; emoji
markers get a soft wash.

## CUJ-006 — Wikimedia background photo

In the panel inspector, open **Background photo** to search Commons or hit **Random** for a
scenic pick. Whole-page background lives under the **Page photo** chip (secondary). Photos
use a soft palette wash. Panels without a photo keep a simple horizon under the cast.

## CUJ-007 — Page cast + panel arrangement

Open **Cast** in the Page finish bar to add or re-emoji characters. In the panel inspector,
pick **Who’s here** (1–3) and an **Arrangement** filtered by count. The stage updates with
emoji markers; dialogue chips use the same cast.
