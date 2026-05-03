# Encore copy style

**First:** follow [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) for Labs default voice (short, user-focused, warm, plain language, no em dashes in UI).

Encore-specific notes:

- **Landings and gates** (`AccessGateScreens.tsx`, shell chrome): one headline, one short supporting block, then the primary action. Put permission lists, scope tables, and env setup in [`README.md`](README.md), not stacked above the CTA.
- **Dev vs prod data:** local library data is per **browser origin**. In dev, Encore redirects `localhost` → `127.0.0.1` so loopback matches Spotify and you do not split IndexedDB across two hosts; production stays on your real site origin only.
- **Account and sync messages**: stay factual and calm; prefer “what you can do next” over abstract reassurance.
- **Form and settings density:** follow repo-wide [`STYLE_GUIDE.md`](../../STYLE_GUIDE.md) § _Information density (modern surfaces)_: short headings, explanatory copy in info-icon tooltips, icon buttons + tooltips for non-primary actions and external links, minimal inline paragraphs.

## Form and dialog layout (Material Design / minimal UI)

Use these patterns when a modal or dense form feels noisy or repetitive. They align with MD3’s emphasis on clear hierarchy, grouping, and fewer parallel explanations.

1. **Spatial grouping beats section labels.** Put related inputs in one outlined `Paper` or bordered stack with light tint instead of stacking a heading (`VIDEO`, `ACCOMPANIMENT`) above every block. The frame signals “these belong together”; reserve headings for the one place that truly needs a label (e.g. chip groups with no field label).
2. **One explanation per concern.** If the placeholder or field label already states what can go in a control, drop the `helperText`. Put edge cases and constraints in a tooltip or a single caption at the **bottom of the group**, not under every control.
3. **Avoid duplicate affordances.** If “open in Drive” is visible next to a resolved file name, do not repeat a second full-width “Open in Drive” text button. Prefer an icon button + tooltip for the secondary open action.
4. **Quiet primary, loud errors.** Use subtle success tint + border for resolved metadata; keep `Alert` for things that need correction (warning/error/info gates). Shorter alert copy reads faster than long sentences.
5. **Size and density.** Prefer `size="small"` on fields and secondary buttons inside dialogs; use `minHeight` on compact drop zones so the modal does not read as a stack of oversized targets.
6. **Terminology.** Match action names to the dialog title (`Log performance` ↔ logging flow) so users are not mapping “Add” vs “Log” mentally.
7. **Card grids (repertoire).** Prefer a **flat card** with `border: 1` + `encoreHairline` and **no shadow** at rest; lift slightly on hover. **Do not** lump unrelated concepts (tags vs milestones vs performance history) into one tinted `Paper`; that implies a single task. Use **generous vertical spacing** (or a hairline divider) between those regions so each reads as its own idea. Keep **title + artist** as the obvious header.

Reference implementation: `PerformanceEditorDialog.tsx` (intentional single `Paper` for one workflow: video source); `LibraryScreen.tsx` `RepertoireGridCard` (separate vertical sections, no shared group box).

## Canonical micro-copy

Use these exact strings unless you have a strong reason not to. Consistency here helps screen-reader users and keeps the surface predictable.

### Empty states

- **Inline empty list** (a section inside a populated screen, e.g. "Reference recordings", "Backing tracks", "Charts" on `SongPage`, or "Performances" inside a song's tab): `None yet.` Optionally extend with one short clause for the most common next step, e.g. `None yet at this venue.` Keep it under ~6 words; never duplicate the section heading.
- **Screen-level empty state** (the primary content area of a screen with nothing in it yet, e.g. empty Library or empty Performances screen): `Nothing here yet — add a song to start.` / `Nothing here yet — add one from the toolbar.` Pattern: `Nothing here yet — <verb> <noun>.` Include the action so the user knows what to do next.
- Don't use "There are no…" or "You haven't…" — both bury the lede. Don't use "No X yet." for screen-level empties; reserve "None yet." for inline lists.

### Primary-star affordance on media-link rows

Use the helper in [`ui/EncoreMediaLinkRow.tsx`](ui/EncoreMediaLinkRow.tsx) to keep the tooltip and aria-label in sync. Canonical strings:

- Reference recording row: `Make primary reference`
- Backing track row: `Make primary backing`
- Chart attachment row: `Make primary chart`

When the row is already the primary, the star button is replaced by a filled star with tooltip `Primary <slot>` (read-only). Don't drift to "Set as primary…", "Mark as default…", or other variants.

### Action labels on media-link rows

- Open link: `Open in Spotify`, `Open on YouTube`, `Open in Drive`, `Open file` (fallback). Tooltip + aria-label both use this string.
- Remove link: `Remove`, with confirmation only required for primary slots ("Remove primary <slot>?") — see `EncoreMediaLinkRow` for the canonical confirmation prompt.
