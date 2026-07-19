# Encore copy style

**First:** follow [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) for Labs default voice and the Material writing rules (sentence case, present tense, numerals, "you" not "my").

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

Reference implementation: [`PERFORMANCE_UX.md`](PERFORMANCE_UX.md) (grouping rules + component map); [`PerformanceEditorDialog.tsx`](components/PerformanceEditorDialog.tsx) + [`PerformanceAddVideosPanel.tsx`](components/performance/PerformanceAddVideosPanel.tsx).

## Canonical micro-copy

Use these exact strings unless you have a strong reason not to. Consistency here helps screen-reader users and keeps the surface predictable.

### Empty states

- **Inline empty list** (a section inside a populated screen, e.g. "Reference recordings", "Backing tracks", "Charts", "Misc" on `SongPage`, or "Performances" inside a song's tab): `None yet.` Optionally extend with one short clause for the most common next step, e.g. `None yet at this venue.` Keep it under ~6 words; never duplicate the section heading.
- **Screen-level empty state** (the primary content area of a screen with nothing in it yet, e.g. empty Library or empty Performances screen): `Nothing here yet. Add a song to start.` / `Nothing here yet. Add one from the toolbar.` Pattern: `Nothing here yet.` then a short second sentence with the next action. Include the action so the user knows what to do next.
- **Originals library empty:** `Nothing here yet. Add an original from the toolbar.`
- Don't use "There are no…" or "You haven't…"; both bury the lede. Don't use "No X yet." for screen-level empties; reserve "None yet." for inline lists.

### Loading states (not empty)

While Dexie or Drive data is still resolving, **never** show empty-state copy (`Nothing here yet`, `None yet`, `No saved venues yet`, etc.). Gate on `*Hydrated` flags from library contexts (`songsHydrated`, `originalsHydrated`, `extrasHydrated`, …) or `{ status: 'loading' }` for single-row reads.

- Use shared [`LabsListLoadingState`](../shared/components/LabsListLoadingState.tsx): skeleton rows for list/table screens, spinner + `Loading …` caption for simpler panels.
- Visible copy pattern: `Loading library…`, `Loading originals…`, `Loading performances…` — name **what** is loading, not that the library is empty.
- Heavy Repertoire / Performances first visits also use shell [`EncoreHeavyListTabPlaceholder`](components/EncoreHeavyListTabPlaceholder.tsx) until the tab body paints.

### Primary-star affordance on media-link rows

Use the helper in [`ui/EncoreMediaLinkRow.tsx`](ui/EncoreMediaLinkRow.tsx) to keep the tooltip and aria-label in sync. Canonical strings:

- Reference recording row: `Make primary reference`
- Backing track row: `Make primary backing`
- Chart attachment row: `Make primary chart`
- Performance video row: `Make primary video`

When the row is already the primary, the star button is replaced by a filled star with tooltip `Primary <slot>` (read-only). Don't drift to "Set as primary…", "Mark as default…", or other variants. Performance videos use [`PerformanceVideoPrimaryStar`](components/performance/PerformanceVideoPrimaryStar.tsx) (`Primary video` / `Make primary video`) for icon-only rows and [`PerformanceVideoPrimaryRowAction`](components/performance/PerformanceVideoPrimaryStar.tsx) for editor cards (filled star + `Primary video` vs outline star + `Make primary` in the same action slot).

### Action labels on media-link rows

- Open link: `Open in Spotify`, `Open on YouTube`, `Open in Drive`, `Open file` (fallback). Tooltip + aria-label both use this string.
- Remove link: `Remove`, with confirmation only required for primary slots ("Remove primary <slot>?"). See `EncoreMediaLinkRow` for the canonical confirmation prompt.

### Account integrations (Google, Spotify, …)

Every third-party connection in the Encore account menu (and any future site-wide settings page) is rendered through the shared [`LabsAccountIntegrationCard`](../shared/google/LabsAccountIntegrationCard.tsx) (composed in [`components/EncoreAccountMenu.tsx`](components/EncoreAccountMenu.tsx)). New connections (e.g. YouTube, Apple Music) **must** plug into the same shell — see [STYLE_GUIDE.md](../../STYLE_GUIDE.md) § _Parallel surfaces for parallel concepts_ for the rationale.

Card slots, in order:

1. Brand mark + section title + `EncoreStatusPill` (right-aligned).
2. Optional `Signed in as` row (only when connected).
3. One short description sentence.
4. Optional caption under the description for sync metadata (e.g. `Last sync today, 9:10 AM.`).
5. Utility icon row: `Open in Drive`, `Open Spotify profile`, `Reorganize Drive uploads` — keep these icon-only with tooltips.
6. Action row: **primary** `Sign in again` (outlined button) and **tertiary** `Disconnect` (text button). When relevant, an `inlineSecondary` such as `Retry sync` sits between them.
7. Optional inline `Alert` for connection errors (uses MUI `Alert`, dismissible).

Canonical strings:

- **Status pills (connected):** `Backed up`, `Connected`. Same pill component on both cards; never one card's pill is a button and the other's is static.
- **Status pills (disconnected):** `Not connected`, `Unavailable` (when env / client id is missing).
- **Primary action when connected:** `Sign in again` for **every** integration. Do not drift to `Refresh Spotify login`, `Refresh Google session`, etc. The verb describes what happens to the account, not the integration.
- **Primary action when disconnected:** `Sign in with <Brand>` (`Sign in with Google`, `Sign in with Spotify`).
- **Disconnect:** `Disconnect`. Always a tertiary text button with `LogoutIcon`. Never bury this inside a chip dropdown when other connections expose it inline.
- **Description (connected):** one short sentence stating what the connection does **on this app**, not what the brand is. `Used for playlist import, sync, and Spotify search.` / `Backed up to <root folder> in your Drive.` Drop "Skip if you don't use Spotify" once already connected; that copy belongs on the disconnected state, not after sign-in.
- **Description (disconnected):** lead with the user benefit. `Connect Spotify to import playlists and search Spotify tracks.`

### Filter chips and saved searches

- **Filter chip label format** is `<Field>: <summary>`. When the field is in exclude mode, prefix the summary with `not ` (e.g. `Venue: not Martuni's`, `Tags: not 3 selected`). The chip also flips to an error-tinted color and shows a `BlockIcon` so screen-reader users hear the negation and sighted users see it.
- **Match / Exclude toggle** copy is the literal pair `Match` / `Exclude` (segmented control). Avoid `Includes` / `Excludes` and `Is` / `Is not`; the chosen pair stays parallel and reads naturally next to the chip preview.
- **Saved-search card** sections use lightweight ALL-CAPS labels for grouping (`FILTERS`, `SPOTIFY PLAYLIST`); the brand-tinted sub-paper signals "this is one optional integration, not a required step". Use the canonical empty-state copy from § _Empty states_ (`Nothing here yet. <next step>`).
