# Critical user journeys — Chords

Durable workflows for manual checks and performance budgets.  
Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Generate and play a progression

**Primary goal:** Change progression settings and hear playback.  
**Persona:** Songwriter exploring harmonic color.

### Steps

1. Open `/chords/`.
2. Wait for staff and controls to render.
3. Click **Play** — playback starts.

### Performance budgets

| Step       | Metric                  | Budget    | Verification                                |
| ---------- | ----------------------- | --------- | ------------------------------------------- |
| Shell load | route → `#root` visible | ≤ 1200 ms | `e2e/smoke/chords-play-interaction.spec.ts` |

### Automation

| Type        | Artifact                                    |
| ----------- | ------------------------------------------- |
| Interaction | `e2e/smoke/chords-play-interaction.spec.ts` |
| Shell boot  | `e2e/smoke/app-shells.spec.ts`              |
