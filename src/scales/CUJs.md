# Critical user journeys — Learn Your Scales

Durable workflows for manual checks, agent verification, and performance benchmarks.  
Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Connect input and start practice

**Primary goal:** Connect MIDI or microphone and start a practice session from the home screen.  
**Persona:** Pianist with a USB keyboard plugged in.

### Steps

1. Open `/scales/` → home screen loads without flashing "Connect your piano" when MIDI is already available.
2. Start a session from the curriculum grid.
3. Complete or exit session; progress persists locally.

### Success criteria

- Input gateway only appears when no enabled MIDI device and mic is inactive.
- Session screen responds to note input without multi-second freeze.

### Automation

| Type      | Artifact                                    |
| --------- | ------------------------------------------- |
| App shell | `e2e/smoke/app-shells.spec.ts` (`/scales/`) |

---

## CUJ-002: Drive progress sync

**Primary goal:** Backup and restore practice progress JSON to Google Drive (`silent_union` merge).  
**Persona:** User practicing on laptop and desktop.

### Steps

1. Sign in via account menu.
2. Edit progress (complete an exercise stage).
3. Confirm auto-push or manual **Back up** succeeds.
4. Optional: restore from Drive or undo last sync.

### Success criteria

- Progress merges silently on auto-pull (no dialog for `silent_union`).
- Blocking job snackbar shows during long sync operations.

### Automation

| Type       | Artifact                                               |
| ---------- | ------------------------------------------------------ |
| Unit       | `src/scales/drive/scalesDriveMerge.test.ts`            |
| Factory    | `src/scales/drive/scalesPortfolioDriveBackupConfig.ts` |
| Guardrails | `labsPortfolioDriveHookGuardrails.test.ts`             |
