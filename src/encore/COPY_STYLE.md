# Encore copy style

**First:** follow [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) for Labs default voice (short, user-focused, warm, plain language, no em dashes in UI).

Encore-specific notes:

- **Landings and gates** (`AccessGateScreens.tsx`, shell chrome): one headline, one short supporting block, then the primary action. Put permission lists, scope tables, and env setup in [`README.md`](README.md), not stacked above the CTA.
- **Dev vs prod data:** local library data is per **browser origin**. In dev, Encore redirects `localhost` → `127.0.0.1` so loopback matches Spotify and you do not split IndexedDB across two hosts; production stays on your real site origin only.
- **Account and sync messages**: stay factual and calm; prefer “what you can do next” over abstract reassurance.
- **Form and settings density:** follow repo-wide [`STYLE_GUIDE.md`](../../STYLE_GUIDE.md) § _Information density (modern surfaces)_: short headings, explanatory copy in info-icon tooltips, icon buttons + tooltips for non-primary actions and external links, minimal inline paragraphs.

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
