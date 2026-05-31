# Encore UI primitives

App-local shared components for Project Encore. **Global shared UI policy:** [`src/shared/SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md). **Copy strings:** [`COPY_STYLE.md`](COPY_STYLE.md). **Parallel-surface rationale:** [`STYLE_GUIDE.md`](../../STYLE_GUIDE.md) § _Parallel surfaces for parallel concepts_.

## When to use these

Prefer these primitives over hand-rolling rows, cards, or sync panels. If you need the same shape in a new Encore screen, extend an existing primitive rather than copying layout markup.

## Primitives

- **`src/encore/ui/EncoreMediaLinkRow.tsx`** — single row for an `EncoreMediaLink` (Spotify, YouTube, Drive chart): icon + caption + optional primary star + open + remove. Use for any list of media links (`SongPage`, Practice, guest views). Primary-star tooltip/aria copy: [`COPY_STYLE.md`](COPY_STYLE.md) § _Primary-star affordance_.

- **`src/encore/ui/EncoreStreamingHoverCard.tsx`** — hover popover resolving Spotify/YouTube into title + artist. Wrap `EncoreMediaLinkRow` or any brand link when metadata preview helps.

- **`src/encore/ui/EncoreSpotifyTrackListRow.tsx`** — album art + title + artist for Spotify search results. Use in any new Spotify picker/search list.

- **`IntegrationCard`** (inside `src/encore/components/EncoreAccountMenu.tsx`) — parallel layout for third-party connections (Google, Spotify, …): status pill, identity, description, utility icons, `Sign in again`, optional retry, `Disconnect`, optional `Alert`. **Required** for new account-menu integrations. Strings: [`COPY_STYLE.md`](COPY_STYLE.md) § _Account integrations_.

- **`src/encore/ui/EncoreFilterChipBar.tsx`** — chip bar for library/saved-search filters. Opt in to exclude (`supportsExclude: true`) for NOT IN semantics. See [`STYLE_GUIDE.md`](../../STYLE_GUIDE.md) § _Filter / search operators_.

- **`src/encore/ui/EncoreSynchronizableSpotifyPlaylistPanel.tsx`** — bind a Spotify playlist + Sync. Reference for Practice learning playlist and saved-search playlist binding. Reuse or mirror rhythm; do not hand-roll another sync row.

- **`src/encore/ui/EncoreBrandTextField.tsx`** — brand-mark `TextField` for URLs/ids. Avoid double brand icons on one row (see synchronizable panel).

## Agent context

Full Encore agent workflow: [`AGENTS.md`](AGENTS.md).
