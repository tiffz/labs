# Critical user journeys — Story

Durable workflows for manual checks and performance budgets.  
Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Start a new story session

**Primary goal:** Load the story UI and begin interacting with prompts.  
**Persona:** Writer using guided story generation.

### Steps

1. Open `/story/`.
2. Wait for primary story surface to render.
3. Interact with first visible control (generate or continue).

### Performance budgets

| Step       | Metric                  | Budget    | Verification                               |
| ---------- | ----------------------- | --------- | ------------------------------------------ |
| Shell load | route → `#root` visible | ≤ 1200 ms | `e2e/smoke/story-load-interaction.spec.ts` |

### Automation

| Type        | Artifact                                   |
| ----------- | ------------------------------------------ |
| Interaction | `e2e/smoke/story-load-interaction.spec.ts` |
| Unit        | `src/story/App.test.tsx`                   |
