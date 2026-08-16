---
name: labs-rhythm-preset
description: Edits Labs rhythm presets in RHYTHM_DATABASE with presetIntegrity regression coverage. Use when changing rhythm presets, darbuka notation strings, preset copy, or src/shared/rhythm/RHYTHM_DATABASE.
---

<!-- AUTO-GENERATED from .agents/skills/labs-rhythm-preset/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs rhythm preset edits

## Before editing

Read [`src/shared/rhythm/presetIntegrity.ts`](../../../src/shared/rhythm/presetIntegrity.ts) and existing preset tests.

## Where the data lives

`RHYTHM_DATABASE` (`presetDatabase.ts`) spreads in `MIDDLE_EASTERN_RHYTHMS`
(`middleEasternRhythms.ts`). The split is not cosmetic: those entries carry scripts, citations,
and comments recording how each pattern was decoded from a printed source. Editing one means
checking a source, not eyeballing a pattern.

## Names and copy

Each rhythm has **one canonical `name`** — the spelling in the owner's teachers' books. Every
description and variation note uses that name and no other; `presetIntegrity.test.ts` fails the
build if prose drifts into a synonym.

Other spellings go in **`alternateNames`**, each with a short `context` saying which tradition it
belongs to and a `script` when the name is not natively Latin. Ship a name only when a source you
actually retrieved attests it. Names found in one hobbyist list, or where sources disagree about
whether it is even the same rhythm, stay out — the field's value is that the reader can trust it.

**`usedIn`** names a musical context (genre, dance, ceremony), not a region: one to three
comma-separated phrases, no terminal period. Omit it when no source names one.

Descriptions read like a dictionary entry: one or two short sentences, no opinion, and never a
restatement of what a variation note already says.

## Workflow

1. Edit `RHYTHM_DATABASE` (or related preset modules) in **`src/shared/rhythm/`**
2. Run **`npm test -- presetIntegrity`** (or full `npm run test:fast`)
3. If notation or cross-preset invariants change, update test fixtures in `presetIntegrity.test.ts`
4. Run **`npm run presubmit`** before done

## Never

- Duplicate preset definitions in app-local files — apps consume shared DB only
- Skip integrity test when changing preset strings or metadata
