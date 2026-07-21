---
paths:
  - 'src/encore/components/song/PracticeResourceDnD.tsx'
  - 'src/encore/components/song/practiceResourceDragContext.ts'
  - 'src/encore/components/song/PracticeResourcesPanel*.tsx'
  - 'src/encore/components/song/usePracticeResourceDnD.ts'
  - 'src/encore/ui/EncoreMediaLinkRow.tsx'
  - 'src/encore/repertoire/practiceResourceOrder.ts'
  - 'src/encore/repertoire/practiceResourceDragIds.ts'
  - 'e2e/smoke/encore-practice-resource-dnd.spec.ts'
---

<!-- AUTO-GENERATED from .agents/rules/encore-practice-resource-dnd.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> Encore practice resource chip DnD — stable DOM during drag, post-drop click suppress

# Encore practice resource DnD

Read [`src/encore/AGENTS.md`](../../src/encore/AGENTS.md) § Practice resource DnD before editing chip drag.

## Invariants (dnd-kit)

1. **No DOM mutation mid-drag** — do not swap `<a href>` → `<span>` while `dragging` is true. Use `shouldSuppressPracticeResourceChipNavigation(block, dragging)` (post-drop only).
2. **No `pointerup` capture on chips** — dnd-kit must receive pointer release to finalize drops. Click/auxclick suppress **after** drop only.
3. **Inner `pointer-events: none` during drag only** — blocks accidental link activation without restructuring the chip tree.

## Logic vs UI

- Drop rules + song mutations: `practiceResourceOrder.ts`, `practiceResourceDragIds.ts` (Vitest).
- Click-suppress timing + pointer guard: `practiceResourceDragContext.test.ts`.
- End-to-end drop path: `e2e/smoke/encore-practice-resource-dnd.spec.ts`.

## Before finishing

1. Run targeted tests: `npx vitest run src/encore/components/song/practiceResourceDragContext.test.ts src/encore/repertoire/practiceResourceOrder.test.ts`
2. Run smoke: `npx playwright test e2e/smoke/encore-practice-resource-dnd.spec.ts`
3. If changing drop eligibility, update `practiceResourceDragIds.test.ts` and the smoke when user-visible sections change.
