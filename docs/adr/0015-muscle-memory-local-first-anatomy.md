# ADR 0015: Muscle Memory local-first anatomy training

## Status

Accepted

## Context

Muscle Memory is a new Labs micro-app for Proko-aligned anatomy study: 3D exploration, active-recall quizzes, and spaced repetition. It must stay client-only and local-first like Sight and Scales, while optionally shipping large per-region GLB assets derived from Z-Anatomy (CC BY-SA 4.0).

## Decision

1. Add micro-app at `/muscle/` with import-boundary isolation (`src/muscle/**`).
2. Store SRS progress in Dexie (`muscle-memory` database, `workoutProgress` table).
3. Keep SM-2 grading, deck planning, and module gatekeeper logic in pure functions under `src/muscle/srs/`.
4. Use Zustand for session UI state (mode, quiz, viewport toggles); hydrate from Dexie on boot.
5. Ship region GLBs under `public/muscle/models/` with offline Blender export tooling; procedural primitives remain the runtime fallback when GLBs are absent.
6. No Google Drive or cloud sync in v1.

## Consequences

- Agents add nodes in TypeScript curriculum files and validate with `nodeIntegrity.test.ts`.
- Asset pipeline updates `manifest.json`; CI runs `npm run muscle:validate-assets`.
- Z-Anatomy derivatives require attribution (`src/muscle/ATTRIBUTION.md`).
- Full-body performance depends on lazy region loads, not a monolithic GLB.

## Links

- `src/muscle/`
- `tools/muscle-anatomy/`
- Plan: Muscle Memory implementation
