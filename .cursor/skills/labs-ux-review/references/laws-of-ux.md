# Laws of UX — review reference

The Laws of UX (lawsofux.com), grouped, each with the one thing to check in a
Labs review. Source of the full essays: lawsofux.com. This file is the reviewer's
working checklist, not a textbook — cite the law by name in a finding.

## Heuristics (design maxims)

- **Aesthetic-Usability Effect** — a polished surface is _perceived_ as more usable. Use it, but never let polish hide a broken or unreachable journey.
- **Doherty Threshold** — keep feedback under ~400ms; anything slower shows progress. Repo interaction budgets live per-step in `src/<app>/CUJs.md`.
- **Fitts's Law** — time to hit a target scales with distance and shrinks with size. Primary/frequent targets large and near; destructive targets away from common ones; ≥44px on coarse pointers.
- **Hick's Law** — decision time grows with the number and complexity of choices. Reduce and stage options; one clear primary path.
- **Jakob's Law** — users expect your app to work like the others they know. Match platform and prior-Labs-app conventions; reuse the shared primitive rather than reinventing.
- **Miller's Law** — working memory holds ~7±2 items. Chunk; do not show a wall of controls.
- **Occam's Razor** — the simplest design that works wins. Remove elements that do not earn their place.
- **Postel's Law** — accept forgiving input (paste, whitespace, case), render strict, sensible output.
- **Tesler's Law (Conservation of Complexity)** — complexity is irreducible; the system should absorb it, not dump it on the user.
- **Peak-End Rule** — people judge an experience by its peak and its end. Design the hardest moment and the last moment: errors, empty states, completion.
- **Goal-Gradient Effect** — motivation rises near the goal. Show progress and proximity in multi-step flows (`3 of 5`).

## Principles

- **Chunking** — group content into meaningful units; reflects Miller's Law in layout.
- **Cognitive Load** — total mental effort to use the UI. Cut extraneous load (clutter, jargon, redundant status); spend it only on the task.
- **Flow** — protect focused, uninterrupted work; do not break it with needless modals or confirmations.
- **Mental Model** — users carry assumptions from the real world and other apps. Match them; a surprising model costs trust.
- **Pareto principle (80-20)** — most value comes from a few features; make those excellent and obvious.
- **Selective Attention** — users skip regions that look like ads/chrome/noise. Do not bury the primary action in a busy frame.
- **Working Memory** — do not force users to hold information across steps; carry it forward for them.

## Gestalt principles (grouping / perception)

- **Law of Proximity** — near things read as grouped. One task's controls in one region/section.
- **Law of Common Region** — a shared boundary groups elements. Max one elevated surface per section; use hairline dividers inside, not nested cards.
- **Law of Similarity** — alike elements read as related. Same meaning → same component and the same verb label.
- **Law of Uniform Connectedness** — connected/aligned elements feel most related. Use alignment and connectors to show relationships.
- **Law of Prägnanz** — people read the simplest available interpretation. Make the intended reading the simplest one.

## Cognitive biases to design around

- **Choice Overload** — too many options at once paralyzes. Curate and stage.
- **Cognitive Bias** — perception and decisions are systematically skewed; do not rely on users reading carefully.
- **Paradox of the Active User** — people start using software before reading anything. The UI must teach itself; do not depend on docs.
- **Parkinson's Law** — a task expands to the time allowed; users expect a task to take as long as it looks. Make fast things look fast.
- **Serial Position Effect** — first and last items are best remembered. Put the primary action first or last, not buried mid-list.
- **Von Restorff (Isolation) Effect** — the distinct item is remembered. Make the one primary CTA visually distinct; do not make five things equally loud.
- **Zeigarnik Effect** — unfinished tasks nag. Show clear completion, and let users resume interrupted work (ties to the repo's data-loss defenses).

## How to use in a Labs review

Name the law, then anchor it to a concrete surface and the repo's own rule. Most
laws map onto an existing Labs root-cause class: Hick's/Von Restorff/Serial
Position → `ux-journey-overload`; Proximity/Similarity/Common Region → `ux-gestalt`;
Cognitive Load/duplicate status → `ux-redundancy`; Common Region overuse / nested
cards → `ux-visual-weight`. Prefer citing the class so a repeated miss can be
codified into a gate.
