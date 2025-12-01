# Corporate Ladder

A lightweight roguelite about climbing the corporate dungeon with emoji-first design.

## What It Does

- **Roguelite Gameplay**: Turn-based movement through procedurally generated office floors
- **Resource Management**: Productivity, happiness, and reputation stats
- **Field of View**: Fog-of-war system revealing map as player explores
- **Entity System**: Enemies, items, and interactive objects on each floor

## Tech Stack

- React 18 + TypeScript
- Procedural map generation
- Field-of-view calculation
- E2E tests with Playwright

## Key Files

- `App.tsx` - Main application component
- `components/MapView.tsx` - Map/tiles/entities rendering
- `components/UIPanel.tsx` - Stats, inventory, overlay
- `game/generation.ts` - Map generation and entity seeding
- `game/fov.ts` - Field-of-view calculation

## Development

```bash
npm run dev          # Start dev server
npm test src/corp   # Run tests
```

For detailed architecture, see `DEVELOPMENT.md`.
