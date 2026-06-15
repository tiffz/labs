# Critical user journeys — Color Sight Trainer

Durable workflows for manual checks, agent verification, and performance benchmarks.  
UX sketch skill: [`labs-ux-journey`](../../.cursor/skills/labs-ux-journey/SKILL.md). Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Daily practice session

**Primary goal:** Complete curriculum practice reps with immediate feedback and a pinned footer.  
**Persona:** Learner on `/sight/` without debug mode.

### Steps

1. Open `/sight/` → home hero **Practice**.
2. Answer the level challenge (tap swatch, sliders, or **Submit** depending on module).
3. Read compact feedback → auto-advance or tap workspace to continue.
4. Repeat until pass threshold or exit via **Exit**.

### Success criteria

- Workspace fills viewport between header and footer (no floating footer mid-screen).
- Tap/swatch response feels instant; feedback appears without multi-second freeze.
- Footer shows progress hint (e.g. `2/7 passes to level 11`); Submit/Continue does not shift layout.

### Performance budgets

Dev server, hard refresh, **no** `?debug`.

| Step               | Metric                                   | Budget (p95) | Verification                                   |
| ------------------ | ---------------------------------------- | ------------ | ---------------------------------------------- |
| Home → Practice    | click → challenge visible                | ≤ 800 ms     | `e2e/smoke/sight-practice-interaction.spec.ts` |
| Compare swatch tap | click → feedback/status                  | ≤ 400 ms     | same                                           |
| Footer pinned      | footer bottom within 8px of shell bottom | layout       | same                                           |

### Known traps

- Removing `100dvh` from `.sight-app` and only sizing under `html:has(.labs-debug-dock)` — breaks normal mode (`render-cascade` / layout).
- Nested `.sight-app` in sandbox doubles height rules.
- Debug dock must shrink shell via `--labs-debug-dock-height`, not permanently change practice layout.

### Automation

| Type              | Artifact                                                  |
| ----------------- | --------------------------------------------------------- |
| Interaction smoke | `e2e/smoke/sight-practice-interaction.spec.ts`            |
| Layout            | `.sight-app` height calc in `sight.css`                   |
| Manual            | Hard refresh `/sight/` → Practice → full-height workspace |

---

## CUJ-002: Curriculum map review

**Primary goal:** Open map, practice a prior level without advancing ladder.  
**Persona:** Learner reviewing an unlocked level.

### Steps

1. Home → **Curriculum map** (or map entry from home).
2. Select an unlocked level → **Practice**.
3. Complete reps; confirm review does not change `profile.level`.

### Success criteria

- Map navigates without blank flash.
- Review session labeled “Review” in header.

### Performance budgets

| Step     | Metric              | Budget (p95) | Verification |
| -------- | ------------------- | ------------ | ------------ |
| Map open | click → map visible | ≤ 600 ms     | manual       |

---

## CUJ-003: Developer debug workflow (`?debug`)

**Primary goal:** Use debug dock without altering non-debug layout.  
**Persona:** Developer tuning curriculum or sandbox.

### Steps

1. Open `/sight/?debug`.
2. Collapsed dock by default; expand for local storage / level tools.
3. Optional: `#sandbox`, **S** key in practice for forced pass/fail.

### Success criteria

- Regular `/sight/` (no query) matches pre-debug full-viewport layout.
- With dock expanded, footer and workspace remain above dock (shell shrinks, dock overlays bottom).

### Performance budgets

| Step        | Metric               | Budget             | Verification                        |
| ----------- | -------------------- | ------------------ | ----------------------------------- |
| Dock expand | shell height adjusts | no footer obscured | manual + `--labs-debug-dock-height` |

### Automation

| Type   | Artifact                                                    |
| ------ | ----------------------------------------------------------- |
| Docs   | [`ARCHITECTURE.md`](ARCHITECTURE.md) § Layout + debug       |
| Shared | `LabsDebugDock`, `SHARED_UI_CONVENTIONS.md` § LabsDebugDock |

---

## CUJ-004: Sandbox level inspection

**Primary goal:** Inspect generators and live metrics at a chosen level.  
**Persona:** Developer with `?debug#sandbox`.

### Steps

1. `/sight/?debug#sandbox&level=N` or open from debug dock.
2. Regen / change seed; read telemetry.

### Success criteria

- Sandbox toolbar + workspace; no double `.sight-app` height stacking.

### Automation

| Type   | Artifact                 |
| ------ | ------------------------ |
| Manual | `#sandbox` routes        |
| CSS    | `.sight-sandbox` wrapper |
