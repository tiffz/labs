# URL state pattern (Labs)

Canonical pattern for syncing app state to the URL (shareable links, back/forward). App-specific param tables stay in each app README; shared mechanics live here.

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

## App implementations

| App    | Hook / module                              | App-specific doc                                                    |
| ------ | ------------------------------------------ | ------------------------------------------------------------------- |
| Drums  | `src/drums/hooks/useUrlState.ts`           | [`src/drums/docs/URL_SHARING.md`](../src/drums/docs/URL_SHARING.md) |
| Chords | `src/chords/hooks/useUrlState.ts`          | [`src/chords/README.md`](../src/chords/README.md)                   |
| Words  | `src/words/hooks/useWordsUrlState.ts`      | [`src/words/README.md`](../src/words/README.md)                     |
| Stanza | `src/stanza/utils/stanzaDriveUrlParams.ts` | [`src/stanza/README.md`](../src/stanza/README.md)                   |

## Agent workflow

Skill: **`labs-url-state`**. When adding a new sharable field, update the app hook, README param table, and a Vitest parse/serialize test when non-trivial.
