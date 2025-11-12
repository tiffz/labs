# The Kimberly System

A composable random content generation system for creative writing, using semantically-named functions that make templates intuitive and maintainable.

## Philosophy

The Kimberly System is named after its use of **specificity** to make random generator templates easier to reason about. The idea is that `Kimberly()` is a specific character name—a canonical example that makes the function's purpose immediately clear—but in actual output, it generates various names. This semantic naming convention makes templates readable and self-documenting.

## Core Concepts

### 1. Semantic Function Naming

Functions are named after canonical examples of their output:

```typescript
k.Kimberly(); // Generates female names: "Emma", "Olivia", "Sophia"...
k.evil(); // Generates evil adjectives: "sinister", "malevolent", "wicked"...
k.worker(); // Generates occupations: "teacher", "scientist", "CEO"...
```

### 2. Composability

Functions can be nested and combined like Lego pieces:

```typescript
const villain = `${k.evil()} ${k.worker()}`;
// Output: "sinister accountant", "malevolent scientist", "wicked teacher"
```

### 3. Weighted Distribution

Each generator handles its own weighting internally. For example, `k.worker()` uses equal weights across different occupation categories, resulting in balanced variety:

```typescript
// worker() picks equally from all job categories
export function worker(): string {
  return pickGenerator([
    scientist, // Picks from 15 scientist jobs
    teacher, // Picks from 15 teacher jobs
    officeWorker, // Picks from 15 office jobs
    // ... etc
  ]);
}
```

This gives a **fluid distribution** of job types while still providing **variation within each type**.

### 4. Stateful Generators

For entities that need consistent attributes (like character pronouns), use the `Character` class:

```typescript
const hero = k.createHero('female');

const text = `${hero.Kimberly()} looked at ${hero.her()} reflection. ${hero.She()} knew ${hero.she()} had to act.`;
// Output: "Emma looked at her reflection. She knew she had to act."
```

The Character class maintains state for:

- Name
- Gender
- Pronouns (subject, object, possessive, reflexive)
- Role (hero, villain, mentor, etc.)

## Quick Start

### Installation

The Kimberly System is located in `src/story/kimberly/`. Import the main namespace:

```typescript
import { k } from './kimberly';
```

### Basic Usage

```typescript
// Simple generation
const adjective = k.evil(); // "sinister"
const occupation = k.worker(); // "accountant"
const location = k.scenicLocation(); // "mountain peak"

// Composition
const villain = `${k.evil()} ${k.worker()}`;
// "malevolent scientist"

// With articles
const hero = `${k.article(k.worker())} ${k.worker()}`;
// "a teacher" or "an accountant"
```

### Character Generation

```typescript
const hero = k.createHero('female');
const villain = k.createVillain('male');

const scene = `
${hero.Kimberly()} had always been ${k.article(k.vulnerable())} ${k.vulnerable()} ${k.worker()}.
But when ${hero.she()} discovered that ${villain.Kimberly()}, ${k.article(k.evil())} ${k.evil()} ${k.worker()},
was responsible for ${hero.her()} ${k.currentStruggle()}, everything changed.
`;

// Output example:
// "Emma had always been a fragile teacher.
//  But when she discovered that Cassius, a sinister CEO,
//  was responsible for her mounting debt, everything changed."
```

### Beat Generation

```typescript
const hero = k.createHero();

const openingImage = `${hero.Kimberly()} stands in ${k.article(k.anyLocation())} ${k.anyLocation()}, thinking about ${hero.her()} ${k.currentStruggle()}.`;

const catalyst = `${hero.Kimberly()} discovers ${k.article(k.MacGuffin())} ${k.MacGuffin()} that reveals ${k.plotTwist()}.`;
```

## Available Generators

### Names

| Function       | Description          | Example Output                 |
| -------------- | -------------------- | ------------------------------ |
| `k.Kimberly()` | Modern female names  | "Emma", "Olivia", "Sophia"     |
| `k.Liam()`     | Modern male names    | "Noah", "Oliver", "James"      |
| `k.Margaret()` | Classic female names | "Dorothy", "Helen", "Ruth"     |
| `k.Arthur()`   | Classic male names   | "Henry", "Charles", "Edward"   |
| `k.Zara()`     | Unique female names  | "Luna", "Nova", "Sage"         |
| `k.Orion()`    | Unique male names    | "Atlas", "Phoenix", "Kai"      |
| `k.Aria()`     | Fantasy female names | "Seraphina", "Aurora", "Elara" |
| `k.Cassius()`  | Fantasy male names   | "Lysander", "Magnus", "Lucian" |
| `k.Alex()`     | Gender-neutral names | "Jordan", "Taylor", "Morgan"   |

### Adjectives

| Function           | Description         | Example Output                           |
| ------------------ | ------------------- | ---------------------------------------- |
| `k.evil()`         | Villainous traits   | "sinister", "malevolent", "ruthless"     |
| `k.heroic()`       | Heroic traits       | "brave", "noble", "courageous"           |
| `k.mysterious()`   | Enigmatic qualities | "cryptic", "shadowy", "elusive"          |
| `k.passionate()`   | Emotional intensity | "intense", "fervent", "fiery"            |
| `k.smart()`        | Intelligence        | "brilliant", "clever", "astute"          |
| `k.strong()`       | Physical power      | "mighty", "formidable", "robust"         |
| `k.vulnerable()`   | Weakness            | "fragile", "timid", "insecure"           |
| `k.charismatic()`  | Charm               | "magnetic", "captivating", "alluring"    |
| `k.rebellious()`   | Defiance            | "defiant", "wild", "audacious"           |
| `k.professional()` | Competence          | "disciplined", "methodical", "efficient" |

### Occupations

| Function           | Description                                | Example Output                                       |
| ------------------ | ------------------------------------------ | ---------------------------------------------------- |
| `k.scientist()`    | Scientists                                 | "biologist", "physicist", "neuroscientist"           |
| `k.teacher()`      | Educators                                  | "professor", "instructor", "mentor"                  |
| `k.officeWorker()` | Office jobs                                | "accountant", "manager", "analyst"                   |
| `k.doctor()`       | Medical                                    | "surgeon", "nurse", "therapist"                      |
| `k.artist()`       | Creatives                                  | "painter", "musician", "writer"                      |
| `k.developer()`    | Tech                                       | "software engineer", "data scientist", "UX designer" |
| `k.waiter()`       | Service                                    | "chef", "bartender", "barista"                       |
| `k.electrician()`  | Trades                                     | "plumber", "carpenter", "mechanic"                   |
| `k.lawyer()`       | Legal/Law enforcement                      | "detective", "judge", "FBI agent"                    |
| `k.soldier()`      | Military/Emergency                         | "firefighter", "marine", "EMT"                       |
| `k.CEO()`          | Business/Finance                           | "entrepreneur", "banker", "investor"                 |
| `k.farmer()`       | Agriculture                                | "rancher", "park ranger", "conservationist"          |
| `k.journalist()`   | Media                                      | "reporter", "editor", "podcaster"                    |
| `k.pilot()`        | Transportation                             | "truck driver", "ship captain", "train conductor"    |
| `k.worker()`       | **Any occupation** (balanced distribution) | Any of the above                                     |

### Locations

| Function             | Description                              | Example Output                                           |
| -------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `k.scenicLocation()` | Outdoor beauty                           | "mountain peak", "crystal lake", "ancient forest"        |
| `k.urbanSpot()`      | City locations                           | "neon-lit alley", "rooftop terrace", "subway station"    |
| `k.home()`           | Domestic spaces                          | "cozy kitchen", "dusty attic", "sunlit living room"      |
| `k.mysticalPlace()`  | Fantasy locations                        | "hidden temple", "crystal cave", "forgotten tomb"        |
| `k.workplace()`      | Work environments                        | "research laboratory", "corporate boardroom", "hospital" |
| `k.transitHub()`     | Travel locations                         | "airport terminal", "train platform", "ship deck"        |
| `k.gatheringPlace()` | Social venues                            | "elegant ballroom", "concert hall", "museum"             |
| `k.dangerousPlace()` | Threatening locations                    | "dark alley", "burning building", "war zone"             |
| `k.anyLocation()`    | **Any location** (balanced distribution) | Any of the above                                         |

### Story Elements

| Function              | Description         | Example Output                                                   |
| --------------------- | ------------------- | ---------------------------------------------------------------- |
| `k.currentStruggle()` | Internal conflicts  | "mounting debt", "a recent betrayal", "their fading dreams"      |
| `k.goal()`            | Character goals     | "finding redemption", "seeking revenge", "discovering the truth" |
| `k.flaw()`            | Character flaws     | "pride", "jealousy", "cowardice"                                 |
| `k.obstacle()`        | External challenges | "powerful enemy", "ticking clock", "corrupt authorities"         |
| `k.emotion()`         | Emotional states    | "anxious", "desperate", "determined"                             |
| `k.relationship()`    | Relationship types  | "estranged sibling", "former mentor", "bitter rival"             |
| `k.plotTwist()`       | Story twists        | "they were manipulated", "the mentor is the villain"             |
| `k.MacGuffin()`       | Important objects   | "ancient artifact", "mysterious key", "secret document"          |
| `k.turningPoint()`    | Story pivots        | "shocking revelation", "unexpected death", "critical choice"     |

## Character Class API

### Creation

```typescript
// Explicit gender
const hero = new k.Character('hero', 'female');
const villain = new k.Character('villain', 'male');

// Random gender (weighted: 45% female, 45% male, 10% neutral)
const mentor = new k.Character('mentor');

// Factory functions
const hero = k.createHero('female');
const villain = k.createVillain('male');
const sidekick = k.createSidekick();
```

### Methods

| Method               | Returns                            | Example                              |
| -------------------- | ---------------------------------- | ------------------------------------ |
| `char.Kimberly()`    | Character's name                   | "Emma"                               |
| `char.name_()`       | Character's name (alias)           | "Emma"                               |
| `char.she()`         | Subject pronoun                    | "she" / "he" / "they"                |
| `char.She()`         | Subject pronoun (capitalized)      | "She" / "He" / "They"                |
| `char.her()`         | Object pronoun                     | "her" / "him" / "them"               |
| `char.Her()`         | Object pronoun (capitalized)       | "Her" / "Him" / "Them"               |
| `char.hers()`        | Possessive adjective               | "her" / "his" / "their"              |
| `char.Hers()`        | Possessive adjective (capitalized) | "Her" / "His" / "Their"              |
| `char.hersAlone()`   | Possessive pronoun                 | "hers" / "his" / "theirs"            |
| `char.herself()`     | Reflexive pronoun                  | "herself" / "himself" / "themselves" |
| `char.getGender()`   | Gender                             | "female" / "male" / "neutral"        |
| `char.getRole()`     | Character role                     | "hero" / "villain" / etc.            |
| `char.setName(name)` | Sets custom name                   | -                                    |

## Utility Functions

```typescript
// Random selection
k.pick(['a', 'b', 'c']); // Random item
k.pick(['a', 'b', 'c'], [1, 2, 3]); // Weighted selection

// Generator selection
k.pickGenerator([gen1, gen2]); // Picks and executes a generator

// String utilities
k.capitalize('hello'); // "Hello"
k.article('apple'); // "an"
k.article('banana'); // "a"
```

## Advanced Patterns

### Multi-level Nesting

```typescript
// The worker() function internally nests:
function worker() {
  return pickGenerator([
    scientist, // Which might return "neuroscientist"
    teacher, // Which might return "professor"
    officeWorker, // Which might return "manager"
    // etc...
  ]);
}

// This gives balanced distribution across categories
// while maintaining variation within each category
```

### Custom Weighted Generators

```typescript
import { pickWeightedGenerator } from './kimberly';

const customGenerator = () =>
  pickWeightedGenerator([
    { fn: k.scientist, weight: 50 }, // 50% chance
    { fn: k.artist, weight: 30 }, // 30% chance
    { fn: k.soldier, weight: 20 }, // 20% chance
  ]);
```

### Complex Scenes

```typescript
function generateComplexScene() {
  const hero = k.createHero();
  const villain = k.createVillain();
  const mentor = k.createMentor();

  return `
Act 1: ${hero.Kimberly()}, ${k.article(k.vulnerable())} ${k.vulnerable()} ${k.worker()}, 
lives in ${k.article(k.anyLocation())} ${k.anyLocation()}, struggling with ${hero.her()} ${k.currentStruggle()}.

Act 2: When ${hero.she()} discovers that ${villain.Kimberly()}, ${k.article(k.evil())} ${k.evil()} ${k.worker()},
is behind ${k.article(k.plotTwist())} ${k.plotTwist()}, ${hero.she()} seeks help from ${mentor.Kimberly()}, 
${k.article(k.smart())} ${k.smart()} ${k.worker()}.

Act 3: At ${k.article(k.dangerousPlace())} ${k.dangerousPlace()}, ${hero.Kimberly()} must overcome 
${hero.her()} ${k.flaw()} to ${k.goal()} and defeat ${villain.Kimberly()}.
  `.trim();
}
```

## Testing

Run tests for the Kimberly System:

```bash
npm test -- kimberly
```

## Examples

See `examples.ts` for comprehensive usage examples, including:

- Simple composition
- Multi-level nesting
- Stateful character generation
- Complex multi-character scenes
- Beat generation
- Full story premises

## Design Benefits

1. **Readable Templates**: `${k.evil()} ${k.worker()}` is immediately understandable
2. **Type Safety**: Full TypeScript support with type inference
3. **Composable**: Mix and match generators freely
4. **Maintainable**: Add new generators without changing existing code
5. **Balanced Distribution**: Built-in weighting ensures variety
6. **Stateful When Needed**: Character class maintains consistency
7. **Self-Documenting**: Function names describe their output

## Extending the System

To add new generators:

1. Create a new file in `src/story/kimberly/` (e.g., `emotions.ts`)
2. Define arrays of content
3. Create generator functions using `pick()` or `pickGenerator()`
4. Export functions with semantic names
5. Add exports to `index.ts`

Example:

```typescript
// emotions.ts
import { pick } from './core';

const joyfulEmotions = ['ecstatic', 'delighted', 'elated'];
const sadEmotions = ['melancholy', 'grief-stricken', 'despondent'];

export function joyful(): string {
  return pick(joyfulEmotions);
}

export function sad(): string {
  return pick(sadEmotions);
}
```

Then add to `index.ts`:

```typescript
export * from './emotions';
```

## License

Part of the Labs project.
