# Save the Cat! Story Generator

## Overview

The Save the Cat! Story Generator is a creative writing tool that generates random story plots based on the beat structure outlined in "Save the Cat! Writes a Novel" by Jessica Brody. It helps writers brainstorm story ideas by randomly combining genres, themes, character archetypes, and plot beats.

## Features

- **10 Story Genres**: Choose from Blake Snyder's 10 story types (Whydunit, Rites of Passage, Institutionalized, etc.)
- **10 Universal Themes**: Select themes like Forgiveness, Love, Acceptance, Faith, etc.
- **Dynamic Story DNA**: Generates hero, flaw, nemesis, and settings tailored to your selections
- **15-Beat Structure**: Complete beat-by-beat story outline following the Save the Cat! methodology
- **Genre-Specific Elements**: Each genre includes unique structural elements (e.g., "The Detective" for Whydunit)
- **Reroll System**: Click the dice icon on any element to generate a new random suggestion
- **Tooltips**: Hover over help icons (?) to learn about each story element

## Architecture

### Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling (via CDN in original, custom CSS in React version)
- **Vite** for build tooling
- **Vitest** for unit tests
- **Playwright** for E2E tests

### Project Structure

```
src/story/
├── components/          # React components
│   ├── BeatChart.tsx           # 15-beat story structure display
│   ├── CoreElements.tsx        # Hero, flaw, nemesis display
│   ├── GeneratedChip.tsx       # Rerollable suggestion chip
│   ├── GenreElements.tsx       # Genre-specific elements
│   ├── GenreThemeSelector.tsx  # Genre and theme selection UI
│   ├── RadioOption.tsx         # Radio button with tooltip
│   ├── StoryHeader.tsx         # Genre and theme header
│   └── Tooltip.tsx             # Help tooltip component
├── data/                # Data and logic
│   ├── beats.ts                # 15 Save the Cat! beats
│   ├── genres.ts               # Genre definitions and elements
│   ├── storyGenerator.ts       # Core generation logic
│   └── suggestionEngine.ts     # Suggestion pools for all elements
├── types/               # TypeScript type definitions
│   └── index.ts
├── styles/              # CSS styles
│   └── story.css
├── e2e/                 # End-to-end tests
│   ├── story-init.spec.ts
│   └── story-generation.spec.ts
├── App.tsx              # Main application component
├── App.test.tsx         # App unit tests
├── main.tsx             # React entry point
└── index.html           # HTML entry point
```

## The Save the Cat! Beat Structure

The generator implements all 15 beats from the Save the Cat! methodology:

### Act 1

1. **Opening Image**: A "before" snapshot showing the hero's flawed world
2. **Theme Stated**: A minor character hints at the lesson the hero needs to learn
3. **Setup**: Establish the hero's normal life and "stasis = death" situation
4. **Catalyst**: The inciting incident that disrupts the hero's world
5. **Debate**: The hero questions whether to embark on the journey

### Act 2A

6. **Break Into 2**: The hero makes a choice and enters a new world
7. **B Story**: Introduction of a character who embodies the theme
8. **Fun and Games**: The "promise of the premise" - exploring the new world
9. **Midpoint**: A false victory or false defeat that raises the stakes

### Act 2B

10. **Bad Guys Close In**: External and internal pressure mounts
11. **All Is Lost**: The hero hits rock bottom (includes "whiff of death")
12. **Dark Night of the Soul**: Moment of reflection leading to epiphany

### Act 3

13. **Break Into 3**: The hero learns the theme and formulates a plan
14. **Finale**: The climactic confrontation where the hero must dig deep
15. **Final Image**: A mirror of the opening showing transformation

## The 10 Story Genres

Each genre has unique structural elements:

1. **Whydunit**: The Detective, The Secret, The Dark Turn
2. **Rites of Passage**: The Life Problem, The Wrong Way, The Acceptance
3. **Institutionalized**: The Group, The Choice, The Sacrifice
4. **Superhero**: The Power, The Nemesis, The Curse
5. **Dude with a Problem**: The Innocent Hero, The Sudden Event, The Life or Death Battle
6. **Fool Triumphant**: The Fool, The Establishment, The Transmutation
7. **Buddy Love**: The Incomplete Hero, The Counterpart, The Complication
8. **Out of the Bottle**: The Wish, The Spell, The Lesson
9. **Golden Fleece**: The Road, The Team, The Prize
10. **Monster in the House**: The Monster, The House, The Sin

## Suggestion Engine

The suggestion engine contains extensive pools of randomized elements:

- **Hero Generation**: 14 adjectives × 15 professions = 210 possible heroes
- **Theme-Specific Flaws**: 12 unique flaws per theme (120 total)
- **Nemesis Generation**: 14 adjectives × 12 archetypes = 168 possible nemeses
- **Genre Elements**: 10-12 suggestions per genre-specific element
- **Beat Sub-Elements**: 7-10 suggestions per beat sub-element
- **Settings**: 11 Act 1 settings, 11 Act 2 settings (always different)

## User Interaction Flow

1. User selects a genre (or Random)
2. User selects a theme (or Random)
3. User clicks "Generate Story Plot"
4. App generates Story DNA (hero, flaw, nemesis, settings, etc.)
5. App displays:
   - Genre description and theme
   - Core story elements (hero, flaw, nemesis)
   - Genre-specific elements
   - Complete 15-beat structure with sub-elements
6. User can click dice icons to reroll individual elements
7. User can generate an entirely new story at any time

## Design Principles

### Visual Design

- **Light, clean card-based layout** with subtle borders
- **Indigo color scheme** for primary actions and highlights
- **Dense grid layout** for efficient information display
- **Inline tooltips** for contextual help without cluttering the UI
- **Reroll buttons** with playful rotation animation on hover

### UX Principles

- **Progressive disclosure**: Story elements only appear after generation
- **Granular control**: Reroll individual elements without regenerating everything
- **Contextual help**: Tooltips explain every element without requiring external documentation
- **Responsive design**: Works on mobile and desktop
- **Instant feedback**: No loading states needed (all client-side)

## Testing Strategy

### Unit Tests

- Story generation logic (random selection, DNA creation)
- Component rendering
- User interactions (genre/theme selection, generation, rerolling)

### E2E Tests

- Page initialization
- Genre and theme selection
- Story generation flow
- Reroll functionality
- Tooltip display

## Future Enhancements

Potential features for future development:

1. **Export/Save**: Save generated stories to local storage or export as PDF/Markdown
2. **Story History**: Browse previously generated stories
3. **Custom Elements**: Allow users to add their own suggestions to the pools
4. **Guided Mode**: Step-by-step story building with prompts
5. **Character Sheets**: Expand hero and nemesis into full character profiles
6. **World Building**: Add setting details, supporting characters, etc.
7. **Integration**: Connect with writing apps like Scrivener or Google Docs

## Credits

Based on the story structures from "Save the Cat! Writes a Novel" by Jessica Brody, which builds on Blake Snyder's original "Save the Cat!" screenwriting methodology.

## Development Notes

### Converting from Vanilla JS to React

The original implementation was a single HTML file with vanilla JavaScript. Key changes in the React version:

1. **State Management**: Moved from global `currentStoryDNA` variable to React `useState`
2. **Component Architecture**: Split monolithic UI into reusable components
3. **Data Separation**: Extracted all data into separate TypeScript files
4. **Type Safety**: Added TypeScript interfaces for all data structures
5. **Event Handling**: Converted DOM event listeners to React event handlers
6. **Styling**: Preserved original CSS but organized into a separate file

### Performance Considerations

- All generation is client-side (no API calls)
- Suggestion pools are loaded once at startup
- Rerolling is instant (no re-rendering of entire story)
- Component memoization not needed (generation is already fast)

### Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support for radio buttons
- Sufficient color contrast for text
- Tooltips accessible via hover and focus
