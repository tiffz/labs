# Critical user journeys — The Gesture Room

Durable workflows for manual checks, agent verification, and performance benchmarks.  
UX sketch skill: [`labs-ux-journey`](../../.cursor/skills/labs-ux-journey/SKILL.md). Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Configure practice session

**Primary goal:** Choose timer, session length, collections, and tags — then enter the room.  
**Persona:** Artist with existing photo collections; wants a quick session without UI friction.

### Steps

1. Open `/gesture/` → **Practice** tab (default).
2. Toggle **Timer** preset (30s … 10 min or Custom).
3. Select **Session length** — Endless or Limited (+ photo count).
4. Toggle **Prioritize least drawn** / **Shuffle** (optional).
5. Filter by **Tags**; use Select all / Deselect all when needed.
6. Select/deselect **Collections** in the grid.
7. Click **Enter the room** → zen session shows first reference photo.

### Success criteria

- Timer and session-length controls update immediately (no multi-second freeze).
- Collection grid does not blank/flicker when changing timer/radio/checkbox only.
- Enter loads first photo or shows a clear error (never a silent blank).

### Performance budgets

Dev server, hard refresh, `?e2eSeed=1` or normal library.

| Step                     | Metric                             | Budget (p95)    | Verification                                       |
| ------------------------ | ---------------------------------- | --------------- | -------------------------------------------------- |
| Session length → Limited | click → photo limit field enabled  | ≤ 400 ms        | `e2e/smoke/gesture-practice-interaction.spec.ts`   |
| Session length → Endless | click → photo limit field disabled | ≤ 400 ms        | same                                               |
| Timer preset change      | click → toggle reflects selection  | ≤ 400 ms        | same                                               |
| Tag filter chip          | click → chip active state          | ≤ 500 ms        | manual / extend smoke                              |
| Enter the room           | click → zen image or error         | ≤ 5 s (network) | `e2e/smoke/gesture-preview-strip.spec.ts` + manual |

### Known traps

- Parent state holding session options → re-renders entire preview grid (`render-cascade`).
- Rebuilding shuffled queue on every option change → prefetch storm (`warmup-storm`).
- `blob:` URLs in preview strips → crashes / blank thumbs (`revoked-blob-display`).

### Automation

| Type              | Artifact                                                     |
| ----------------- | ------------------------------------------------------------ |
| Interaction smoke | `e2e/smoke/gesture-practice-interaction.spec.ts`             |
| Preview smoke     | `e2e/smoke/gesture-preview-strip.spec.ts`                    |
| Media invariants  | `gesturePreviewDisplayInvariants.test.ts`                    |
| Architecture      | `PracticeSessionControls.tsx`, `PracticeCollectionGrid` memo |

---

## CUJ-002: Manage collection metadata

**Primary goal:** Rename, link source, add/remove tags on a collection card.  
**Persona:** Artist organizing reference packs on the **Collections** tab.

### Steps

1. Open **Collections** tab.
2. Inline edit **name**; add **source link**.
3. Add tag via **+ Tag** (autocomplete or new label); remove tag with ×.
4. Confirm tag appears on other cards’ autocomplete without full page refresh.

### Success criteria

- Inline edits feel lightweight (no heavy outlined form chrome).
- Tag chip updates immediately; Drive save in background.
- New tags suggest on other cards via session registry.

### Performance budgets

| Step             | Metric                    | Budget (p95)       | Verification |
| ---------------- | ------------------------- | ------------------ | ------------ |
| Remove tag ×     | click → chip gone         | ≤ 200 ms perceived | manual       |
| + Tag → commit   | enter/blur → chip visible | ≤ 400 ms perceived | manual       |
| Tag autocomplete | type → dropdown           | ≤ 300 ms           | manual       |

### Known traps

- Disabling entire tag row during Drive save (`main-thread-jank` + UX).
- Autocomplete sourced only from Dexie (missing optimistic tags).

### Automation

| Type   | Artifact                                                |
| ------ | ------------------------------------------------------- |
| Unit   | `gestureTagRegistry.test.ts`, `gesturePackTags.test.ts` |
| Manual | Collections tab with 2+ packs                           |

---

## CUJ-003: Browse collections with previews

**Primary goal:** Scan collection cards with thumbnail strips; no broken images.  
**Persona:** Any user on Collections or Practice grid.

### Steps

1. Open tab with collection grid.
2. Wait for preview strips (4-up manage, 2-up practice select).
3. Scroll grid if many collections.

### Success criteria

- Visible thumbs use **https** `src` (no revoked `blob:`).
- No console flood of `ERR_FILE_NOT_FOUND`.
- Tab switch does not OOM/crash Chrome.

### Performance budgets

| Step                     | Metric                    | Budget     | Verification                    |
| ------------------------ | ------------------------- | ---------- | ------------------------------- |
| First card strip visible | 4 thumbs loaded           | ≤ 10 s dev | `gesture-preview-strip.spec.ts` |
| Sustained scroll         | no crash / no blob errors | session    | media stability doc + smoke     |

### Automation

| Type     | Artifact                                                                   |
| -------- | -------------------------------------------------------------------------- |
| Smoke    | `e2e/smoke/gesture-preview-strip.spec.ts`                                  |
| Playbook | [`docs/GESTURE_MEDIA_STABILITY.md`](../../docs/GESTURE_MEDIA_STABILITY.md) |

---

## CUJ-004: Complete zen drawing session

**Primary goal:** Draw against timed reference; advance or complete session.  
**Persona:** Artist in zen mode.

### Steps

1. From CUJ-001, enter room.
2. Draw until timer ends or skip/mark done.
3. Land on debrief; optionally restart or return home.

### Success criteria

- Photo visible before timer feels “started” (see zen session polish ADR/history).
- Navigation prev/next does not show broken image flash.

### Performance budgets

| Step              | Metric                | Budget           | Verification                    |
| ----------------- | --------------------- | ---------------- | ------------------------------- |
| First photo paint | enter → image visible | ≤ 3 s warm cache | manual + session pipeline tests |
| Next photo        | advance → next image  | ≤ 2 s            | manual                          |

### Automation

| Type  | Artifact                                              |
| ----- | ----------------------------------------------------- |
| Smoke | zen session route smokes (see `e2e/routeRegistry.ts`) |
| Unit  | `gestureSessionPhotoPipeline` tests                   |
