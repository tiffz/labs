# Writing rules + usability heuristics — review reference

The canon a Labs UX reviewer applies to copy and to overall usability. Repo copy
rules live in `docs/USER_COPY_STYLE.md` (authoritative) and are enforced by
`check-ui-copy.mjs`; this file is the reviewer's condensed working set.

## Material Design writing rules

Adopted by the repo from Material Design's writing guidance.

- **Voice — second person.** Address the user as "you"; label their content as "Yours" (`Your library`). Never "my/me/I" for the user's things.
- **Concise.** Short, scannable segments; front-load the important word (the first two words carry it). Cut filler and "there is / there are" openers.
- **Conversational, not robotic.** Friendly, plain, direct; contractions are fine (`can't`, `don't`).
- **Simple words.** Everyday language over jargon or invented feature names; readable by a beginner and an expert alike. `Turn on`, not `Enable`.
- **Sentence case everywhere.** Capitalize the first word and proper nouns only — buttons, titles, menus, labels.
- **Present tense, active voice.** Describe what is, not what will be. Begin with the objective: "To remove a photo, drag it out," not "Drag a photo out to remove it."
- **Numerals, not words.** `3 songs`, not `three songs`.
- **Punctuation.** No terminal period on labels, single-line hints, or one-sentence dialog body; use periods for multi-sentence text. No colon after a label. **Avoid exclamation points.** Use `…` not `...`.
- **Refer to the label, not the widget.** "Select **Continue**," not "Click the button."
- **Buttons/CTAs** — a clear action verb, the next step: `Save`, `Remove photo`, `Not now`. ≤3 words.
- **Errors** — say what happened and how to fix it, in plain words. Supportive, specific, no blame, no "Please", no stack-trace jargon.
- **Global** — avoid directional words (left/right — RTL mirrors); gender-neutral "they".

## Orwell's rules (all agent-authored prose, `writing-style.mdc`)

1. Never use a metaphor/simile/figure of speech you are used to seeing in print.
2. Never use a long word where a short one will do.
3. If it is possible to cut a word out, cut it out.
4. Never use the passive where you can use the active.
5. Never use jargon or a foreign phrase if an everyday English word works.
6. Break any of these rather than say something outright barbarous.

## Labs copy tells to flag (from `docs/USER_COPY_STYLE.md`)

- **No em dashes** in UI copy — they read as essay voice (enforced by `check-ui-copy`).
- No stacked hedging, catalog/marketing voice, or over-claiming.
- No LLM tells: "It's important to note", "Remember to…", "Simply", "just".
- **No affordance narration** ("click here to…", "use this button to…") — the single most common bloat in Labs help text.
- Length caps: button/menu ≤3 words; tooltip/aria ≤1 sentence; chip/tab ≤2 words; empty state ≤1 headline + ≤2 sentences; error ≤2 sentences; dialog title ≤6 words; snackbar ≤1 sentence.
- Product names are exact: the practice app is always **Stanza**, never a legacy name.

## Nielsen's 10 usability heuristics

The canonical usability checklist. In a review, name the heuristic a design breaks.

1. **Visibility of system status** — timely, honest feedback (loading ≠ empty; show progress with current/total).
2. **Match between system and the real world** — the user's words and concepts, not the system's.
3. **User control and freedom** — clear exits, cancel, and undo/redo (repo: keyboard-first `LabsUndoProvider`).
4. **Consistency and standards** — platform conventions and internal consistency across the app family (shared primitives + tokens).
5. **Error prevention** — remove error-prone conditions; confirm destructive actions.
6. **Recognition rather than recall** — show options; do not make users remember across steps.
7. **Flexibility and efficiency of use** — accelerators and shortcuts for the frequent (repo: `Ctrl/Cmd + ?` shortcuts).
8. **Aesthetic and minimalist design** — no competing or irrelevant content; one primary action per viewport.
9. **Help users recognize, diagnose, and recover from errors** — plain-language, constructive error recovery.
10. **Help and documentation** — task-focused, findable when needed; but the UI should teach itself first (Paradox of the Active User).

## WCAG 2.2 AA quick gates

Perceivable, Operable, Understandable, Robust. Contrast 4.5:1 body / 3:1 large text
and UI components; full keyboard operation with visible focus and logical order, no
traps; target size ≥24px (44px comfort); name/role/value on every control; reflow
at 390px with no horizontal scroll; honor reduced-motion.
