# Save the Cat! Story Generator

A creative writing tool that generates random story plots based on the Save the Cat! beat structure methodology.

## What It Does

- **Story Generation**: Random plots combining genres, themes, characters, and 15-beat structure
- **10 Genres**: Blake Snyder's story types (Whydunit, Rites of Passage, etc.)
- **10 Themes**: Universal themes (Forgiveness, Love, Acceptance, etc.)
- **Reroll System**: Regenerate individual story elements without full regeneration
- **Kimberly System**: Composable random content generation with semantic naming

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS for styling
- Client-side generation (no API calls)

## Key Files

- `App.tsx` - Main application component
- `data/storyGenerator.ts` - Core generation logic
- `data/suggestionEngine.ts` - Suggestion pools for all elements
- `components/BeatChart.tsx` - 15-beat structure display
- `components/GeneratedChip.tsx` - Rerollable suggestion chips

## Development

```bash
npm run dev          # Start dev server
npm test src/story   # Run tests
```

For detailed architecture, see `DEVELOPMENT.md`.
