# Kimberly System - Quick Reference

## What is it?

A composable random content generation system using **semantically-named functions** that make templates intuitive and easy to reason about.

## Why "Kimberly"?

Functions are named after **specific canonical examples** rather than abstract terms:

- `Kimberly()` → generates names like "Emma", "Olivia", "Sophia"
- `evil()` → generates adjectives like "sinister", "malevolent"
- `worker()` → generates jobs like "scientist", "teacher", "CEO"

This makes templates **self-documenting** and **readable**.

## Quick Start

```typescript
import { k } from './kimberly';

// Simple composition
const villain = `${k.evil()} ${k.worker()}`;
// → "sinister accountant"

// With characters (stateful)
const hero = k.createHero('female');
const scene = `${hero.Kimberly()} looked at ${hero.her()} reflection.`;
// → "Emma looked at her reflection."
```

## Core Concepts

### 1. Composability

```typescript
`${k.evil()} ${k.worker()}` // "malevolent scientist"
`${k.vulnerable()} ${k.artist()}` // "fragile painter"
`${k.charismatic()} ${k.CEO()}`; // "magnetic entrepreneur"
```

### 2. Stateful Characters

```typescript
const hero = k.createHero('female');
`${hero.Kimberly()} ${hero.her()} ${hero.she()}`; // "Emma her she"
// Pronouns automatically match the character!
```

### 3. Weighted Distribution

```typescript
k.worker(); // Picks equally from all job categories
// Result: balanced variety of occupations
```

### 4. Nested Generation

```typescript
k.worker() internally calls → k.scientist() → "neuroscientist"
                           → k.teacher() → "professor"
                           → k.artist() → "painter"
// Gives balanced distribution AND variation within each category
```

## File Structure

```
src/story/kimberly/
├── README.md              # Full documentation
├── MIGRATION.md           # Migration guide from old system
├── SUMMARY.md            # This file (quick reference)
│
├── core.ts               # Core utilities (pick, pickGenerator, etc.)
├── index.ts              # Main namespace export
│
├── names.ts              # Name generators (Kimberly, Liam, etc.)
├── adjectives.ts         # Adjective generators (evil, heroic, etc.)
├── occupations.ts        # Job generators (worker, scientist, etc.)
├── locations.ts          # Location generators (scenicLocation, etc.)
├── story-elements.ts     # Story generators (goal, flaw, etc.)
├── Character.ts          # Stateful character class
│
├── examples.ts           # Usage examples
├── integration-demo.ts   # Integration with story generator
├── playground.ts         # Interactive demo
│
└── *.test.ts            # Test files
```

## Most Common Functions

### Names

- `k.Kimberly()` - Modern female names
- `k.Liam()` - Modern male names
- `k.Alex()` - Gender-neutral names
- `k.anyName()` - Any name

### Adjectives

- `k.evil()` - Villainous traits
- `k.heroic()` - Heroic traits
- `k.vulnerable()` - Weaknesses
- `k.smart()` - Intelligence
- `k.charismatic()` - Charm

### Occupations

- `k.worker()` - **Any occupation** (balanced)
- `k.scientist()` - Scientists
- `k.teacher()` - Educators
- `k.doctor()` - Medical professionals
- `k.artist()` - Creative professions

### Locations

- `k.anyLocation()` - **Any location** (balanced)
- `k.scenicLocation()` - Beautiful outdoor places
- `k.urbanSpot()` - City locations
- `k.mysticalPlace()` - Fantasy locations
- `k.dangerousPlace()` - Threatening locations

### Story Elements

- `k.goal()` - Character goals
- `k.flaw()` - Character flaws
- `k.currentStruggle()` - Internal conflicts
- `k.obstacle()` - External challenges
- `k.MacGuffin()` - Important objects
- `k.plotTwist()` - Story twists

### Characters (Stateful)

```typescript
const char = k.createHero('female');

char.Kimberly(); // "Emma"
char.she(); // "she"
char.her(); // "her"
char.hers(); // "her" (possessive)
char.herself(); // "herself"
```

## Quick Examples

### 1. Villain Archetype

```typescript
`${k.evil()} ${k.worker()}`;
// "sinister CEO", "malevolent scientist", "ruthless detective"
```

### 2. Scene Description

```typescript
const hero = k.createHero();
`${hero.Kimberly()} stood in ${k.article(k.scenicLocation())} ${k.scenicLocation()}, 
thinking about ${hero.her()} ${k.currentStruggle()}.`;
```

### 3. Story Beat

```typescript
const hero = k.createHero();
`${hero.Kimberly()} discovers ${k.article(k.MacGuffin())} ${k.MacGuffin()} 
that reveals ${k.plotTwist()}.`;
```

### 4. Character Introduction

```typescript
`${k.Kimberly()}, ${k.article(k.vulnerable())} ${k.vulnerable()} ${k.worker()} 
from ${k.article(k.anyLocation())} ${k.anyLocation()}`;
// "Emma, a fragile teacher from a misty valley"
```

## Benefits Over Old System

| Feature         | Old System             | Kimberly System          |
| --------------- | ---------------------- | ------------------------ |
| Organization    | One giant object       | Modular files            |
| Composability   | Manual string building | Function composition     |
| Type Safety     | None                   | Full TypeScript          |
| Maintainability | Hard to modify         | Easy to extend           |
| Readability     | Array names            | Semantic functions       |
| Pronouns        | Manual tracking        | Automatic with Character |
| Weighting       | Manual                 | Built-in                 |

## Common Patterns

### Pattern 1: Character with Background

```typescript
const char = k.createHero();
`${char.Kimberly()}, ${k.article(k.anyAdjective())} ${k.anyAdjective()} ${k.worker()}`;
```

### Pattern 2: Location with Atmosphere

```typescript
`the ${k.emotion()} atmosphere of ${k.article(k.anyLocation())} ${k.anyLocation()}`;
```

### Pattern 3: Goal with Obstacle

```typescript
const hero = k.createHero();
`${hero.Kimberly()} wants to ${k.goal()}, but ${k.article(k.obstacle())} ${k.obstacle()} stands in ${hero.her()} way`;
```

### Pattern 4: Complex Scene

```typescript
const hero = k.createHero();
const villain = k.createVillain();

`When ${hero.Kimberly()} discovers that ${villain.Kimberly()} is behind ${hero.her()} ${k.currentStruggle()}, 
${hero.she()} must overcome ${hero.her()} ${k.flaw()} to ${k.goal()}.`;
```

## Utilities

```typescript
k.pick(['a', 'b', 'c']); // Random selection
k.pick(['a', 'b', 'c'], [1, 2, 3]); // Weighted selection
k.capitalize('hello'); // "Hello"
k.article('apple'); // "an"
k.article('banana'); // "a"
```

## Next Steps

1. **Read**: `README.md` for full documentation
2. **Explore**: `examples.ts` for usage patterns
3. **Try**: Run `playground.ts` to see it in action
4. **Migrate**: Check `MIGRATION.md` for integration guide
5. **Extend**: Add your own generators in new files

## Testing

```bash
npm test -- kimberly        # Run all tests
npm test -- core.test       # Test core utilities
npm test -- Character.test  # Test character class
```

## Philosophy

> "Specificity makes templates intuitive. 'Kimberly' is clearer than 'characterName()'.
> The function name is a canonical example that makes the template self-documenting."

## Support

- Full docs: `README.md`
- Examples: `examples.ts`
- Tests: `*.test.ts`
- Migration: `MIGRATION.md`
