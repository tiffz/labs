# Performance detail page (exploration)

**Status:** exploration — not implemented. Canonical UX rules live in [`src/encore/PERFORMANCE_UX.md`](../../src/encore/PERFORMANCE_UX.md).

## Problem

The performance editor dialog works for quick log and single-field fixes, but multi-video stacks, long notes, and “which link belongs to which clip?” need more space and clearer hierarchy than a `sm`/`md` modal.

## Proposal

Add route `#/performance/<id>` (and `#/song/<songId>/performance/<id>` for deep links from song page).

### Layout (desktop)

```text
← Back to [Song title]                    [Edit] [Play primary]

Performance · Jun 11, 2026 · Google
Accompaniment: Piano · Band
Notes (markdown)

┌─ Videos ─────────────────────────────────────────┐
│ [Primary thumb + player inline]                  │
│ + 2 more ▾                                       │
│   · Wide angle · Play · Open · Set primary       │
│   · Close-up   · Play · Open · Set primary       │
│ [Add video]                                      │
└──────────────────────────────────────────────────┘
```

### Modal vs page

| Action                       | Modal (keep)        | Page (new)                    |
| ---------------------------- | ------------------- | ----------------------------- |
| Log new performance          | ✓                   | Optional deep link after save |
| Edit date / venue / tags     | ✓ quick             | ✓ full width                  |
| Replace primary video source | ✓                   | ✓ with inline preview         |
| Manage 3+ videos             | Add-video flow only | ✓ primary surface             |
| Play / Open                  | From lists          | ✓ hero + stack                |

### Implementation notes (when built)

- Reuse `PerformanceContextSummary` patterns for the header band.
- Reuse `PerformanceAddVideoSourceStrip` for inline source edit on the page (not a modal).
- `EncoreMainShell` tab can stay Repertoire-centric; detail page is a hash route like Song page.
- Guest/public snapshot: link from snapshot performance row if public performances ship.

No ADR until routing and Dexie read path are decided.
