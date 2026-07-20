---
paths:
  - 'src/encore/components/EncoreMainShell.tsx'
  - 'src/encore/components/LibraryScreen.tsx'
  - 'src/encore/components/PerformancesScreen.tsx'
  - 'src/encore/components/PracticeScreen.tsx'
  - 'src/encore/originals/components/OriginalsLibraryScreen.tsx'
  - 'src/encore/context/**'
---

<!-- AUTO-GENERATED from .cursor/rules/encore-list-tab-performance.mdc — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

> Encore keep-alive list tabs — gate heavy memos, MRT columns, and document listeners when inactive.

# Encore list tab performance

Canonical: [`src/encore/README.md`](../../src/encore/README.md) § List screen performance, [`CUJs.md`](../../src/encore/CUJs.md) CUJ-001. Skill: [`labs-performance`](../skills/labs-performance/SKILL.md).

`EncoreMainShell` keeps Library, Practice, Originals, and Performances mounted after first visit (`display: none` when inactive). **Inactive tabs must not rebuild heavy derived state.**

## Checklist — new or changed keep-alive tab

1. **Tab-active flag** — pass `*TabActive` / `heavyListTabActive` / `listActive` / `practiceTabActive` from shell into the screen (or read from a narrow context slice).
2. **Gate memos** — filter rows, dashboard stats, MRT `data`, venue options, etc.: `if (!tabActive) return cacheRef.current;` then assign cache before return.
3. **Gate MRT `columns`** — same cache-ref pattern as Library / Performances; do not rebuild column defs with `Cell` renderers when tab is hidden.
4. **Gate JSX trees** — Practice song media hub: `hubActive` on `useSongPageMediaHub`; skip large subtrees when tab inactive.
5. **Document listeners** — drag/drop and `document` listeners must no-op or not register when tab inactive (see performance-modal / media-hub guards).
6. **Context subscriptions** — prefer slice hooks (`useEncoreLibraryTables`, `useEncoreAuth`, …) over legacy `useEncore()` in chrome that stays mounted across tabs.
7. **Frozen inactive bodies** — thin wrapper subscribes to Dexie; memoized body uses `useEncoreTabFrozenSnapshot` so hidden tabs skip re-render on library churn.
8. **Tab navigation** — primary tab clicks use `startTransition` + `navigateEncore` (keep `href` for open-in-new-tab).
9. **Verify** — hard-refresh after visiting every tab once; run `e2e/smoke/encore-tab-navigation-interaction.spec.ts`.

## Red flags

- `useMemo` for MRT columns without `heavyListTabActive` guard
- `useEncore()` in Account menu / shell chrome causing list re-renders on Dexie writes
- Per-card context or live queries on hidden tabs
- Missing `heavyListTabActive` in column memo dependency array after adding the gate

## Automation

- Interaction budget: `e2e/smoke/encore-tab-navigation-interaction.spec.ts`
- Comment in `EncoreMainShell` when adding a fifth keep-alive section — link this rule
