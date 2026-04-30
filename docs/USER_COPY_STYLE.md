# Labs user-facing copy (default style)

Use this for **user-visible strings** in Labs micro-apps: landings, empty states, dialogs, errors, labels that read as sentences, and onboarding. It does **not** cover code comments unless they ship to the UI.

App teams may add **`src/<app>/COPY_STYLE.md`** for domain-only rules (curriculum accuracy, instrument jargon, file tables). Those files should **defer here first**, not duplicate the full voice guide.

## Principles (Labs default)

- **Short and non-repetitive**: one idea per sentence. If you run out of breath reading it aloud, cut it.
- **User- and moment-focused**: answer what matters for the **next** action or screen. Skip abstract roadmap or “everything this app might become” framing.
- **Warm and direct**: encouraging, human, never stiff or salesy. Avoid phrasing that sounds judgmental, condescending, or like a scold.
- **Simple language**: everyday words, plain sentence structure. Prefer a second short sentence over a long chain of clauses.
- **Clarity over pitching**: explain the use case and what happens next so the user can decide if the product fits. Avoid hype, stacked superlatives, and “marketing essay” tone.
- **No em dashes in UI copy** (the long “em” dash character): they read as essay voice. Use a period, comma, or a second sentence instead.

## Alignment with common UX writing practice

These are consistent with widely used guidance (clarity, concision, usefulness; plain language; scanning; trust-building tone):

- **Front-load**: headline or first sentence states the point or outcome; supporting text comes after.
- **Usefulness**: microcopy should help someone complete a task, recover from an error, or decide whether to continue. If it only showcases brand voice, cut or rewrite it.
- **Progressive disclosure**: permissions, env setup, and edge cases belong in README or secondary UI, not stacked above the primary call to action.
- **Do not cut so hard that trust breaks**: one plain sentence on _why_ a sensitive step exists (e.g. why sign-in) is fine. Push the rest to docs.

## Voice

- **Second person** where it fits (“you”, “your”). Prefer “Save your work” over “The user should save.”
- **Confident brevity**: say what matters for the next step, then stop.

## Do

- Use **short sentences** and **concrete** language (what to tap, what will happen, what file or account is involved).
- Use **straight apostrophes** for contractions (`it's`, `you're`) and normal hyphens where needed.
- **Action-oriented controls**: button labels should say what happens next (`Sign in with Google`, not `Submit`).

## Avoid

- **Em dashes** in user-visible copy (see Principles above).
- **Stacked hedging** (“it’s normal to feel X; most people do; remember that Y”). Pick one supportive line, max.
- **Catalog voice** (“everything after this unlocks…”). Name the next step, not the whole curriculum or product arc.
- **LLM tells** (“Remember to…”, “It’s important to note…”, “In today’s session…”).
- **Over-claiming** unless it is literally true and necessary for the decision at hand.

## Patterns by surface

- **Landings and empty states**: prefer **one headline + one short supporting block + primary CTA** before “read more” or a doc link.
- **Errors**: state what went wrong in plain language, what the user can do next, without blame.
- **Permissions**: short honest line on the screen; full scope list and caveats in app `README.md`.

## When you edit copy

1. Read it aloud. If you run out of breath, cut it.
2. Check for em dashes and long clause chains; rewrite.
3. Ask: “Would I say this out loud to this user in context?” If not, rewrite.
