# URL state pattern (Labs)

Canonical pattern for syncing app state to the URL (shareable links, back/forward). App-specific param tables stay in each app README; shared mechanics live here.

**Encore / Gesture:** hash-only SPA routes (`#/library`, `#/collections`, …). Optional in-hash query on Encore song routes (`?scroll=`). No dedicated `useUrlState` hook — navigation via `navigateEncore` / `navigateGesture` and `hashchange`.

**Muscle:** path query `?module=` for atlas region; sync via `syncMuscleModuleUrl` (throttled `replaceState`).

**Zine Box:** hash routes + library/reader query params; full hook in `useZineboxUrlState`.

## Shared utilities

| Module                                                                | Role                                           |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| [`src/shared/utils/urlHistory.ts`](../src/shared/utils/urlHistory.ts) | Throttled `history.replaceState` / `pushState` |
| [`src/shared/utils/urlRouting.ts`](../src/shared/utils/urlRouting.ts) | Hash vs path helpers (see ADR 0001)            |

## Contract

1. **Parse on boot** — read URL once into initial state (or defaults).
2. **Sync on change** — debounce/throttle writes; omit default values from the URL when possible.
3. **Popstate** — re-parse when the user navigates history.
4. **No secrets** — never put tokens or PII in query/hash.
5. **Shareable href builders** — UI links use the same serialize logic as the sync hook ([ADR 0017](./adr/0017-spa-native-link-navigation.md)); do not duplicate param strings in components.

## App implementations

| App      | Hook / module                              | Href builder                            | App-specific doc                                                    |
| -------- | ------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------- |
| Drums    | `src/drums/hooks/useUrlState.ts`           | `src/drums/routes/drumsAppUrl.ts`       | [`src/drums/docs/URL_SHARING.md`](../src/drums/docs/URL_SHARING.md) |
| Chords   | `src/chords/hooks/useUrlState.ts`          | —                                       | [`src/chords/README.md`](../src/chords/README.md)                   |
| Words    | `src/words/hooks/useWordsUrlState.ts`      | —                                       | [`src/words/README.md`](../src/words/README.md)                     |
| Stanza   | `src/stanza/utils/stanzaDriveUrlParams.ts` | `stanzaSongHref`                        | [`src/stanza/README.md`](../src/stanza/README.md)                   |
| Encore   | Hash routing (`encoreAppHash.ts`)          | `encoreAppHref`                         | [`src/encore/README.md`](../src/encore/README.md)                   |
| Gesture  | Hash routing (`gestureAppHash.ts`)         | `gestureAppHref`                        | [`src/gesture/README.md`](../src/gesture/README.md)                 |
| Zine Box | `src/zinebox/hooks/useZineboxUrlState.ts`  | `zineboxLibraryHref`, `zineboxReadHref` | [`src/zinebox/README.md`](../src/zinebox/README.md)                 |
| Muscle   | `src/muscle/routes/muscleAppUrl.ts`        | `muscleModuleHref`                      | [`src/muscle/README.md`](../src/muscle/README.md)                   |

## Agent workflow

Skill: **`labs-url-state`**. When adding a new sharable field, update the app hook, README param table, and a Vitest parse/serialize test when non-trivial.
