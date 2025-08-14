# Corporate Ladder (Corp) – Architecture & Principles

## Overview

Corporate Ladder is a lightweight, emoji-first roguelite about climbing the corporate dungeon. This app follows the labs monorepo standards for React + Vite + TypeScript micro-apps.

## Tech

- React 18 functional components
- TypeScript types for game entities and state
- Vite multi-page build; route at `/corp/`
- Unit tests (Vitest) for generation and FOV
- E2E tests (Playwright) co-located in `src/corp/e2e/`

## Structure

- `src/corp/index.html`: HTML entry and assets
- `src/corp/main.tsx`: App entry; hooks for state and input
- `src/corp/components/MapView.tsx`: Map/tiles/entities/fog rendering
- `src/corp/components/UIPanel.tsx`: Stats, skills, inventory, memos, overlay
- `src/corp/game/`:
  - `constants.ts`: Map sizes and tuning parameters
  - `types.ts`: `GameState`, `Tile`, entity types
  - `generation.ts`: Map generation + entity seeding
  - `fov.ts`: Field-of-view calculation
- `src/corp/styles/corp.css`: Styling
- `src/corp/e2e/`: Playwright tests for stability and movement

## Design Principles

- Decouple rendering from logic: React renders; game logic lives in hooks/utilities
- Predictable updates: state lives in a single `GameState` ref; React re-renders via a version tick
- Performance: render only visible window; fog uses simple CSS overlays; avoid expensive effects
- Stability: guard against null/undefined; cap messages; small per-turn work
- Testability: unit tests verify generation/FOV; E2E covers load/movement/regressions

## Game Over

Triggered when any of: productivity ≤ 0, happiness ≤ 0, reputation ≤ 0, or promotion beyond CEO floor. Overlay shows status and restart control.

## E2E Location

Per repo standards, E2E tests are co-located: `src/corp/e2e/*.spec.ts`. See root `GEMINI.md` for the policy.
