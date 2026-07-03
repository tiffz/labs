# Critical user journeys — Stanza

Durable workflows for manual checks, agent verification, and performance benchmarks.  
UX sketch skill: [`labs-ux-journey`](../../.cursor/skills/labs-ux-journey/SKILL.md). Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Land on library and open account menu

**Primary goal:** Confirm Stanza boots to the landing hero with library entry points and Drive account menu available.  
**Persona:** Returning user checking sync status before pasting a YouTube link.

### Steps

1. Open `/stanza/` → landing hero with Stanza title.
2. Confirm **Paste a YouTube link** field is visible.
3. Open **Account** menu (top right).

### Success criteria

- Hero and account menu render without a blank shell.
- Account menu opens (sign-in or backup row visible).

### Automation

| Type      | Artifact                                    |
| --------- | ------------------------------------------- |
| Smoke     | `e2e/smoke/stanza-library.spec.ts`          |
| App shell | `e2e/smoke/app-shells.spec.ts` (`/stanza/`) |

---

## CUJ-002: Drive backup and merge

**Primary goal:** Keep song library and section markers synced across devices.  
**Persona:** Multi-device user with `prompt_when_both_edited` merge policy.

### Steps

1. Sign in via account menu.
2. Manual backup or wait for auto-sync after library edit.
3. On conflict, choose merge/replace in dialog.

### Success criteria

- Local library survives refresh; merge dialog copy matches conflict assessment.
- Undo last sync available after a pull.

### Automation

| Type       | Artifact                                                             |
| ---------- | -------------------------------------------------------------------- |
| Unit       | `src/stanza/drive/stanzaDriveConflict.test.ts`                       |
| Guardrails | `labsPortfolioDriveHookGuardrails.test.ts` (allowlisted custom hook) |

### Known traps

- Custom `useStanzaDriveBackup` — do not copy into new apps without ADR; use factory when possible (`labs-drive-backup` skill).

---

## CUJ-003: Loop whole song without clipping the tail

**Primary goal:** Practice with **Loop whole song** enabled; playback reaches the natural end and wraps to the start.  
**Persona:** Singer looping a backing track for repetition.

### Steps

1. Open a local-audio song in the viewer.
2. Enable **Loop whole song** (repeat icon in transport).
3. Play through at least one full cycle.

### Success criteria

- Audio plays through the outro (no early cutoff from stale duration metadata).
- Transport wraps to the start and continues playing.

### Automation

| Type  | Artifact                                   |
| ----- | ------------------------------------------ |
| Smoke | `e2e/smoke/stanza-loop-whole-song.spec.ts` |
| Unit  | `stanzaTransportLoop.integration.test.ts`  |

See [`docs/STANZA_PLAYBACK.md`](../../docs/STANZA_PLAYBACK.md) for transport invariants.
