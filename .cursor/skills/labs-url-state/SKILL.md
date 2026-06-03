---
name: labs-url-state
description: Implements or fixes Labs URL parameter sync for shareable app state using shared urlHistory utilities. Use when editing useUrlState hooks, URL sharing, query params, hash routing state, or throttled history.replaceState.
---

# Labs URL state

Read [references/url-state-pattern.md](references/url-state-pattern.md) first.

## Workflow

1. Use shared [`urlHistory.ts`](../../src/shared/utils/urlHistory.ts) / [`urlRouting.ts`](../../src/shared/utils/urlRouting.ts) — do not fork throttling
2. Parse once on boot; sync on state change; handle `popstate`
3. Omit default values from URL when possible
4. Add/update app README param table; link to [`docs/URL_STATE_PATTERN.md`](../../../docs/URL_STATE_PATTERN.md)
5. Vitest for non-trivial parse/serialize when adding params
6. **`npm run presubmit`**

## App hooks

- Drums: `src/drums/hooks/useUrlState.ts` + [`URL_SHARING.md`](../../../src/drums/docs/URL_SHARING.md)
- Chords: `src/chords/hooks/useUrlState.ts`
- Words: `src/words/hooks/useWordsUrlState.ts`
- Stanza: `src/stanza/utils/stanzaDriveUrlParams.ts`
