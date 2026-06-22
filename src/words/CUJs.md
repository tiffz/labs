# Critical user journeys — Words

Durable workflows for manual checks and performance budgets.  
Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Build a song with sections

**Primary goal:** Add verse/chorus sections and hear playback.  
**Persona:** Songwriter sketching lyric + chord ideas.

### Steps

1. Open `/words/`.
2. Click **verse** to add a section.
3. Enter lyrics in the section card.
4. Click **Play** on the playback rail.

### Performance budgets

| Step              | Metric                 | Budget   | Verification                                   |
| ----------------- | ---------------------- | -------- | ---------------------------------------------- |
| Add verse section | click → card visible   | ≤ 400 ms | `e2e/smoke/words-practice-interaction.spec.ts` |
| Layout            | no horizontal overflow | —        | `e2e/smoke/layout-heuristics-words.spec.ts`    |

### Automation

| Type        | Artifact                                       |
| ----------- | ---------------------------------------------- |
| Interaction | `e2e/smoke/words-practice-interaction.spec.ts` |
| Layout      | `e2e/smoke/layout-heuristics-words.spec.ts`    |
| Playback UI | `e2e/playback-ui-regressions.spec.ts`          |
