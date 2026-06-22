# Critical user journeys — Piano

Durable workflows for manual checks and performance budgets.  
Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Play notes on the keyboard

**Primary goal:** Click piano keys and hear audio without lag.  
**Persona:** Musician exploring pitch and voicing.

### Steps

1. Open `/piano/`.
2. Wait for keyboard to render.
3. Click a white key — note highlights and audio plays.

### Performance budgets

| Step       | Metric                  | Budget    | Verification                              |
| ---------- | ----------------------- | --------- | ----------------------------------------- |
| Shell load | route → `#root` visible | ≤ 1200 ms | `e2e/smoke/piano-key-interaction.spec.ts` |

### Automation

| Type        | Artifact                                  |
| ----------- | ----------------------------------------- |
| Interaction | `e2e/smoke/piano-key-interaction.spec.ts` |
| Shell boot  | `e2e/smoke/app-shells.spec.ts`            |
