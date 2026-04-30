# Scales app copy style

**First:** follow the Labs default in [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md) for voice, length, and Do/Avoid patterns.

Use this file for **every learner-facing string** in `src/scales/` (tier blurbs, stage labels/descriptions, concept intros, practice tips, dialogs, empty states). It adds **Learn Your Scales-specific** rules and file tables below. Code comments are not covered unless they ship to the UI.

## Voice

- **Second person** where it fits (“you”, “your”). Prefer “try…” over “the learner should…”.
- **Warm and direct**, like a good private teacher: encouraging, never stiff, never salesy.
- **Confident brevity**: say what matters for the _next_ minute of practice, then stop.

## Do

- Use **short sentences**. One idea per sentence beats one long sentence with many clauses.
- Prefer **concrete** language (what to do with hands, ears, or the click) over abstract reassurance.
- Use **straight apostrophes** for contractions (`it's`, `you're`) and normal hyphens where needed (`thumb-under`).

## Avoid

- **Em dashes (—)** in user copy. They read as “essay voice.” Use a period, comma, or a second sentence instead.
- **Stacked hedging** (“it’s normal to feel X; most people do; remember that Y”). Pick one supportive line, max.
- **Catalog voice** (“everything after this is on the road to…”). Name the next step, not the curriculum arc.
- **LLM tells** (“Remember to…”, “It’s important to note…”, “In today’s session…”).
- **Over-claiming** (“every standard fingering pattern in piano technique”) unless literally true and necessary.

## Education notes

- **One new job per screen**: the headline states what changed; the body says how to practice it once.
- **Fingering and video** stay next to the score when possible; intros explain _why_ or _feel_, not a repeat of the key map.

### Tier 0 pentascale (copy must match code)

Spiral order in [`curriculum/tiers.ts`](curriculum/tiers.ts) is **C, G, F, D, A**. Stage shape comes from [`buildPentascaleStages`](curriculum/stages.ts) (`tier0PentascaleIndex`):

- **C, G, F:** metronome stages use **quarter** subdivisions only (`subdivision: none` on tempo stages).
- **D and A:** metronome stages use **eighth** subdivisions from the fourth index onward.
- **A only:** after the fluent gate, **triplet** then **sixteenth** both-hands stages are appended.

Tier blurbs and UI hints should **not** imply “all subdivisions only on A” or “eighths only on A.” That would misstate when eighths begin (D). A fuller “spiral every subdivision across every key” layout is a **curriculum product decision**, not what the app does today; if you change `buildPentascaleStages`, update this section and the tier text together.

## When you edit copy

1. Read it aloud. If you run out of breath, cut it.
2. Check for em dashes and long em-dash-like chains; rewrite.
3. Ask: “Would I say this to a student at the bench?” If not, rewrite.

## Where strings live (common sources)

| Area                          | Files                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Tier blurbs, per-key guidance | `curriculum/tiers.ts` (tier `description`: about **two short sentences**, ~2–3 lines in the UI) |
| Stage labels & descriptions   | `curriculum/stages.ts`                                                                          |
| First-time concept modals     | `curriculum/concepts.ts`                                                                        |
| Rotating pre-start tips       | `curriculum/practiceTips.ts`                                                                    |
| Session / stuck / results     | `components/SessionScreen.tsx` (and related dialogs)                                            |

If you add a new surface, add a row here.
