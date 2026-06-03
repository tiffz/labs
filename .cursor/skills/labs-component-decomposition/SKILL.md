---
name: labs-component-decomposition
description: Decomposes oversized Labs React containers using the validated decomposition pattern without changing observable behavior. Use when refactoring App.tsx or components over ~600 lines, extracting stanzaWorkspace-style leaf components, or when the user mentions component decomposition or shrinking a god component.
---

# Labs component decomposition

## When to use

Target files: **>600 lines**, or three-plus visually independent subtrees in one file.

Pilot reference: `StanzaWorkspace.tsx` → `components/stanzaWorkspace/`.

Read [references/decomposition-pattern.md](references/decomposition-pattern.md) for the full pattern and hotspot notes.

## Pattern (ordered steps)

1. **Inventory** — pure helpers, state-holding subtrees, hook candidates
2. **Extract pure helpers** → `<name>Helpers.ts` (no React imports)
3. **Extract leaf components** — fully controlled; one file per component in lowerCamelCase subdirectory
4. **Replace inline JSX** in container; explicit prop drilling is fine
5. **`useMemo` in container** only for shared or costly derived values
6. **Defer hook extraction** until reused or self-contained lifecycle
7. **Name subdirectory after container**
8. **No observable behavior change** in the decomposition PR — byte-identical output; no snapshot updates
9. **Verify** — container tests + relevant e2e/visual smokes

## Container checklist (done when)

- [ ] Container <600 lines; each leaf <200 lines
- [ ] Helpers file has no React import
- [ ] No new props on container public surface
- [ ] Existing unit tests pass unchanged
- [ ] Visual-regression snapshots **unchanged**
- [ ] `npm run presubmit` clean

## Visual baselines

Decomposition PRs should **not** update snapshots. If snapshots change, behavior changed — fix before merge. For intentional visual updates, use skill `labs-visual-regression` (ask first).
