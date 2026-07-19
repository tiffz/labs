---
name: labs-rhythm-preset
description: Edits Labs rhythm presets in RHYTHM_DATABASE with presetIntegrity regression coverage. Use when changing rhythm presets, darbuka notation strings, preset copy, or src/shared/rhythm/RHYTHM_DATABASE.
---

# Labs rhythm preset edits

## Before editing

Read [`src/shared/rhythm/presetIntegrity.ts`](../../../src/shared/rhythm/presetIntegrity.ts) and existing preset tests.

## Workflow

1. Edit `RHYTHM_DATABASE` (or related preset modules) in **`src/shared/rhythm/`**
2. Run **`npm test -- presetIntegrity`** (or full `npm run test:fast`)
3. If notation or cross-preset invariants change, update test fixtures in `presetIntegrity.test.ts`
4. Run **`npm run presubmit`** before done

## Never

- Duplicate preset definitions in app-local files — apps consume shared DB only
- Skip integrity test when changing preset strings or metadata
