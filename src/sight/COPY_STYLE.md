# Color Sight Trainer — copy

Defers to [docs/USER_COPY_STYLE.md](../../docs/USER_COPY_STYLE.md).

## Voice

- Professional practice tool: direct, calm, no hype.
- Focus on the skill being trained (value, bridge, gamut), not app mechanics.

## Labels

- **Practice** — primary CTA on home at your current level.
- **Practice level** — pick any unlocked level from **Exercises**; passes count toward that level’s 7-pass gate. Footer shows skip-ahead when your peak is above the working level.
- Level navigation — low-key chevrons beside the level label (`aria-label` only: “Previous level (N)”, “Next level (N)”).
- After feedback, the next question loads automatically. **Continue** or tap the exercise to continue. **Enter** or **Space** also continues after feedback, and submits slider/match drills when focus is not on a slider.
- Compare drills use a single canvas (no side panel); do not add “tap below” or “next challenge” coaching copy.
- Level 5 (adjacent match): **Match the swatches** — target and yours side by side on the same gray; adjust lightness until they match.
- Albers flashcard choices (**Same** / **Different**, **Left** / **Right**): equal outlined buttons, not primary vs secondary.
- Flashcard prompts: **swatch** (isolated/compare on gray) or **inner square** (Albers fields); **lighter**, **darker**, **warmer**, **cooler**, **more vivid** / **less vivid** — not “target” or “saturated”.
- **Glossary terms** in prompts use a dotted underline. Hover or tap for a short definition (`SightTerm` + `AppTooltip`). Do not repeat the full definition in the prompt line.
- **Question help** (help icon beside the prompt) appears when a drill needs extra context (Albers induction, vivid-on-gray). Keep help in the tooltip, not a second paragraph above the canvas.
- Level 6 (flat match): **Match the swatch** — target on gray; adjust lightness in the slider preview, then submit.
- Level 15: **Match the saturation in context** — chroma slider only.
- Level 16: **Match value and saturation in context** — lightness + chroma; hue locked.
- Level 17: **Match the hue in context** — hue slider only.
- Level 18+: **Match the swatch on neutral gray** / full match when all sliders are open.
- **Exit** — leave practice without implying an incomplete run.
- Reveal labels: **Target**, **Your match**, **Reference**, **Yours**.
- Verdict: **Pass** / **Not yet** / **Correct** / **Not quite** (compare).
- Albers perceived reveal: **Left chip** / **Right chip** (physical match on gray), then **Left read** / **Right read** (induced appearance). One-line note explains that the field shifted how each side read.
- Metrics: **ΔE**, **Lightness (L)**, **Chroma (C)**, **Hue (H)** on sliders; **accuracy %** only on reveal for matches.
- Home **skills**: link `{n}/6 skills mastered` opens a modal — four stars each (New → Building → Solid → Strong), one-line description per skill. **Strong** (4★) counts as mastered. Raw 0–100 scores stay internal.
