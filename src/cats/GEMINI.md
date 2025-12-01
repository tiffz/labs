# Cat Clicker Game

A 2D side-view world game where players interact with a cat to earn love and treats, unlock achievements, and progress through jobs.

## What It Does

- **Cat Interactions**: Petting, pouncing, wand toy, special areas (nose, ears, cheeks)
- **Currency System**: Love (primary) and treats (from jobs) with dynamic scaling
- **Achievements**: Milestones (progressive) and awards (secret discoveries)
- **Job System**: Career progression with training, interviews, and promotions
- **2D World**: Fixed-size world with camera panning, furniture placement, and perspective scaling

## Tech Stack

- React 18 + TypeScript
- Entity-Component-System (ECS) architecture for world state
- Custom coordinate system for 2D world rendering
- Material Design icons

## Key Files

- `App.tsx` - Main application component
- `components/game/Cat.tsx` - Cat rendering and animations
- `components/game/World2D.tsx` - 2D world container
- `hooks/useGameStateManager.ts` - Centralized state mutations
- `systems/` - ECS systems (movement, shadows, cat behavior)
- `data/` - Pure game data (jobs, achievements, upgrades)

## Development

```bash
npm run dev          # Start dev server
npm test src/cats   # Run tests
```

For detailed architecture, see `DEVELOPMENT.md`.
