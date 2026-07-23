# QA methodology — reference

The established testing methods a professional tester applies. This is the
`labs-review-qa` subagent's working toolkit; pick the lenses that fit the feature.

## Exploratory testing + charters (SBTM)

**Exploratory testing** (Kaner; Bach/Bolton) = simultaneous learning, test design,
and execution. You are an investigator, not a script-runner. **Session-Based Test
Management**: work in time-boxed charters, each a one-line mission —
"Explore [area] with [resources/tools] to discover [what kind of info/bug]." Record
what you did, what you found, and what you could not get to. One charter per feature
area beats one giant unfocused pass.

## Coverage heuristic — SFDIPOT ("San Francisco Depot", Bach)

Walk each product element to find the under-tested surface:

- **Structure** — the parts it is built from (components, files, modules).
- **Function** — what it does; every action and mode.
- **Data** — inputs, outputs, stored state, defaults, boundaries, large/empty/malformed.
- **Interfaces** — UI, URL params, keyboard, APIs, Drive, clipboard, files.
- **Platform** — browser, OS, viewport, touch/mouse/keyboard, offline, WebGL.
- **Operations** — how it is really used; the primary CUJs and misuse.
- **Time** — sequence, concurrency, races, timeouts, clock/timezone, interruption.

## Exploratory tours (Whittaker, _Exploring Software_)

Themed routes through the app:

- **Money** — the headline feature that justifies the product; it must shine.
- **Landmark** — hop between key features in varying orders.
- **FedEx** — follow one piece of data end to end (create → sync → reload → delete → other device).
- **Saboteur** — actively break it: drop network, refresh mid-op, kill/relaunch, corrupt/interrupt an upload, revoke a permission, edit the same row in a second tab.
- **Antisocial** — the most unexpected/invalid inputs.
- **Couch Potato** — accept every default, click straight through, do the minimum.
- **Obsessive-Compulsive** — repeat actions, undo/redo repeatedly, re-enter data, double-submit.
- **Supermodel** — ignore function; judge only rendering, layout, theming, focus.

## Consistency oracles — FEW HICCUPPS (Bach/Bolton)

A result is a **problem** if it is inconsistent with any of these:
**F**amiliarity (a known bug pattern), **E**xplainability, **W**orld,
**H**istory (past behavior), **I**mage (brand/design intent), **C**omparable
products, **C**laims (docs/copy), **U**sers' expectations, **P**roduct (internal
consistency), **P**urpose, **S**tandards/statute. When you can name which oracle a
behavior violates, you have a defensible bug.

## Regression focus — RCRCRC (Karen Johnson)

After a change, prioritize retesting: **R**ecent, **C**ore, **R**isky,
**C**onfiguration-sensitive, **R**epaired (recently fixed), **C**hronic
(historically buggy). Map each suspicion to a repo root-cause class
(`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`).

## Test-design techniques

- **Boundary value analysis** — bugs cluster at edges: 0, empty, 1, N, N+1; min−1/min/min+1; first/last item; off-by-one; huge input; long strings; Unicode/emoji; leading/trailing whitespace; paste.
- **Equivalence partitioning** — one representative per input class, valid and invalid.
- **Negative testing** — invalid input must fail gracefully: validation, plain-language error, no crash, no data loss.
- **Error guessing** — nulls, empty state, duplicate submit, rapid repeat, back/forward, refresh mid-op, special characters, concurrent edits.
- **CRUD** — for each data entity: Create, Read, Update, Delete, plus list/search.
- **State-transition / decision-table / pairwise** — for feature-flag × config × state matrices.

## Nielsen's 10 usability heuristics

Name the one a design breaks: 1 visibility of system status; 2 match to the real
world; 3 user control and freedom (undo/cancel/exit); 4 consistency and standards;
5 error prevention; 6 recognition over recall; 7 flexibility and efficiency;
8 aesthetic and minimalist design; 9 recognize/diagnose/recover from errors;
10 help and documentation.

## Accessibility pass (WCAG 2.2 AA)

Keyboard-only completion (Tab/Shift-Tab/Enter/Space/Esc/arrows), logical focus
order, no traps, focus returns to trigger on close; contrast 4.5:1 body / 3:1 large
and UI; target size ≥24px (44px comfort); name/role/value on controls; live regions
for async status; reduced-motion honored; zoom to 200%.

## State / interruption + resource conditions

Offline mid-op; reload/refresh mid-action; back/forward nav; tab close and restore;
concurrent edits from two tabs/devices; session timeout; clock/timezone change;
IndexedDB quota exceeded / "clear site data"; low-memory soak on a large catalog;
throttled CPU; slow/flaky network. Assert **no data loss** and clean resume — this
is where the repo's highest-severity bugs live (`docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`,
`docs/LOCAL_FIRST_SYNC.md`).

## Cross-browser / responsive / theming / i18n edges

Chromium/Firefox/WebKit × desktop 1440×900 / tablet 768×1024 / mobile 390×844;
touch vs mouse vs keyboard; light and dark parity; forced-colors/high-contrast; CSS
`@layer` cascade pitfalls (`cascade-layer-token-override`); icon-font FOUC/clip;
one-off hex vs token families (`docs/VISUAL_JUDGE_RUBRIC.md` T1.7); text expansion
(~30-40%) and RTL mirroring if localized.
