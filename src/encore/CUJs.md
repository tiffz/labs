# Critical user journeys — Project Encore

Durable workflows for manual checks, agent verification, and performance benchmarks.  
UX sketch skill: [`labs-ux-journey`](../../.cursor/skills/labs-ux-journey/SKILL.md). Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Browse repertoire library

**Primary goal:** Open library, find a song, view song page.  
**Persona:** Musician managing repertoire (local or signed in).

### Steps

1. Open `/encore/` → pass access gate if shown (**Continue without Google**).
2. Land on **Your repertoire** (`#/library`).
3. Search or scroll; open a song.

### Success criteria

- Library heading and song list render without Dexie empty flash.
- Tab switch Library ↔ Practice does not remount entire shell incorrectly.

### Performance budgets

Dev server, hard refresh.

| Step                               | Metric                   | Budget (p95)    | Verification                                                                                |
| ---------------------------------- | ------------------------ | --------------- | ------------------------------------------------------------------------------------------- |
| App entry                          | gate → library heading   | ≤ 3 s           | `e2e/smoke/encore-performance-routes.spec.ts`                                               |
| Library → Practice tab             | click → practice heading | ≤ 1200 ms (p95) | `e2e/smoke/encore-library-interaction.spec.ts`, `encore-tab-navigation-interaction.spec.ts` |
| Library → Originals / Performances | click → section heading  | ≤ 1200 ms (p95) | `e2e/smoke/encore-tab-navigation-interaction.spec.ts`                                       |

### Known traps

- Treating Dexie `undefined` as empty library (`empty-state logic`).
- Spinner forever when `live.status !== 'missing'` conflated with loading.

### Automation

| Type        | Artifact                                        |
| ----------- | ----------------------------------------------- |
| Smoke       | `e2e/smoke/encore-performance-routes.spec.ts`   |
| Interaction | `e2e/smoke/encore-library-interaction.spec.ts`  |
| Dexie       | `resolveDexieLiveQuery`, Encore library context |

---

## CUJ-002: Practice tab / performance log

**Primary goal:** Review and log practice performances.  
**Persona:** Musician tracking practice sessions.

### Steps

1. `#/library` → **Practice** tab or `#/practice` directly.
2. View performance list / compact panel.
3. Open performance detail or editor when applicable.

### Success criteria

- Practice route mounts providers (no blank panel).
- Hash navigation `#/practice` stable on hard refresh.

### Performance budgets

| Step                | Metric               | Budget (p95) | Verification                        |
| ------------------- | -------------------- | ------------ | ----------------------------------- |
| Direct `#/practice` | navigation → heading | ≤ 3 s        | `encore-performance-routes.spec.ts` |

### Automation

| Type   | Artifact                                      |
| ------ | --------------------------------------------- |
| Smoke  | `e2e/smoke/encore-performance-routes.spec.ts` |
| UX doc | [`PERFORMANCE_UX.md`](PERFORMANCE_UX.md)      |

---

## CUJ-003: Originals chord editing

**Primary goal:** Edit chord markers on an Originals chart.  
**Persona:** Chart author in `#/originals/:id`.

### Steps

1. Navigate to Originals entry from library/shell.
2. Select chord by marker id (not char index).
3. Paint / edit chord; verify playback picker if used.

### Success criteria

- Selection by `ChordMarker.id`.
- Playback settings popover does not block Play without documented E2E workaround.

### Performance budgets

| Step         | Metric            | Budget             | Verification |
| ------------ | ----------------- | ------------------ | ------------ |
| Chord select | click → highlight | ≤ 300 ms perceived | manual       |

### Automation

| Type | Artifact                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| E2e  | `e2e/encore-originals-chord-paint.spec.ts`, `e2e/encore-originals-navigation.spec.ts`, `e2e/smoke/encore-originals-brainstorm-chip.spec.ts` |
| Rule | `encore-originals-chord-paint.mdc`, `encore-list-tab-performance.mdc`                                                                       |

---

## CUJ-004: Performance video UX

**Primary goal:** Attach or preview performance video without layout breakage.  
**Persona:** User on performance detail / editor.

### Steps

1. Open performance from practice log.
2. Add link or upload; preview thumb.
3. Play inline or external per design.

### Success criteria

- Gestalt grouping per [`PERFORMANCE_UX.md`](PERFORMANCE_UX.md).
- Video stops when navigating away (`useStopVideoWhenInactive`).

### Automation

| Type         | Artifact                                     |
| ------------ | -------------------------------------------- |
| Unit         | `components/performance/*.test.tsx`          |
| Layout smoke | `e2e/smoke/layout-heuristics-encore.spec.ts` |

---

## CUJ-005: Browse Originals library (grid)

**Primary goal:** Scan demos and open an original quickly.  
**Persona:** Songwriter reviewing drafts in `#/originals`.

### Steps

1. Open **Originals** from the shell.
2. Switch **grid view** (optional).
3. Play preferred demo from a card; download or open the song.

### Success criteria

- Grid cards expose play + download without opening the song detail page.
- Multi-select **Play selected** queues preferred takes sequentially.

### Performance budgets

| Step           | Metric              | Budget (p95) | Verification   |
| -------------- | ------------------- | ------------ | -------------- |
| Originals list | route → first paint | ≤ 3 s        | manual / smoke |
| Grid play tap  | click → audio start | ≤ 1 s        | manual         |

### Write-mode chord reconcile

Lyric edits defer chord realignment until **800 ms idle** or leaving Write (`ORIGINALS_WRITE_RECONCILE_DEBOUNCE_MS` in `useOriginalsChartLayout.ts`).
