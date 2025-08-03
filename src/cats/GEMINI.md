# Gemini's Guide to Cat Clicker

This document outlines the vision, architecture, and implementation details for the "Cat Clicker" micro-app. It serves as a reference for future development and ensures that Gemini can easily understand and contribute to the project.

## Core Game Systems

### Love-Per-Interaction System

The game uses a dynamic love calculation system that scales with player progression:

- **1% Scaling**: Base love earned is always 1% of current love held (minimum 1, maximum 100)
- **Proportional Growth**: Encourages maintaining love reserves for higher interaction rewards
- **Multiplier Compatible**: Works with cat energy, happiness, and merit upgrade multipliers
- **Real-Time Feedback**: Current base love visible in currency tooltip

### Achievement System

The game features two distinct achievement types that work together:

#### Milestones

Progressive achievements that build on each other:

- **Love Milestones**: 10 → 100 → 1K → 10K → 100K → 1M → 10M
- **Treat Milestones**: 10 → 100 → 1K → 10K → 100K → 1M
- **Job/Thing Milestones**: Unlock specific items and reach job levels
- **Merit Rewards**: Each milestone grants 1 Merit point for upgrades

#### Awards

Secret achievements for special interactions:

- **"Boop"**: First nose click discovery
- **"Joy Bringer"**: First happy jump trigger
- **Special Action Tracking**: Nose clicks, happy jumps, ear clicks, cheek pets
- **Hidden Until Unlocked**: Mysterious descriptions encourage exploration

### Merit Upgrade System

Permanent upgrades purchased with Merit points earned from achievements:

- **Gentle Touch**: +20% love from petting (per level)
- **Play Master**: +25% love from pouncing (per level)
- **Home Designer**: +15% love from furniture (per level)
- **Nutrition Expert**: +12% feeding effectiveness (per level)
- **Work Ethic**: +10% treats from jobs (per level)
- **Linear Cost Progression**: Level 1 = 1 merit, Level 2 = 2 merits, etc.

## Design Principles

### User Experience

- **High Information Density**: Compact layouts that maximize content while maintaining readability
- **Material Design 3**: Consistent iconography and modern styling throughout
- **Progressive Disclosure**: Secret achievements and hidden mechanics encourage exploration
- **Immediate Feedback**: Real-time visual responses to all player actions

### Game Balance

- **Proportional Scaling**: Love-per-interaction scales with player progression to maintain engagement
- **Merit Economy**: Achievement rewards create meaningful upgrade progression
- **Training Investment**: Experience-based job progression requires strategic love spending
- **Discovery Rewards**: Special interactions provide unique achievement unlocks

### Technical Architecture

- **Centralized State**: GameState manages all progression and achievement tracking
- **Modular Systems**: Separate systems for achievements, jobs, interactions, and UI
- **Comprehensive Testing**: 290+ tests covering all game mechanics and edge cases
- **Performance First**: Optimized rendering and minimal state updates

## Job System

### Career Progression

Experience-driven advancement system:

- **Training**: Spend love to gain randomized experience (1-3 points, 20% luck bonus)
- **Interview**: 35% success rate for initial employment (Box Factory)
- **Promotion**: Purely experience-based thresholds (3-100+ points required)
- **Rewards**: Increasing treats per second with each promotion

### UI Design

- **Compact Ladder**: One-line job visualization with progress dots
- **Contextual Actions**: Interview → Accept Offer → Work → Promote flow
- **Material Icons**: Consistent visual language with currency indicators

## Interactive Systems

### Cat Interactions

- **Petting**: Primary love-earning interaction with energy/happiness multipliers
- **Wand Toy**: Alternate interaction mode (Escape key to exit)
- **Special Areas**: Nose, ears, cheeks provide unique award opportunities

### Notification System

- **Achievement Alerts**: Milestone and award notifications
- **Merit Rewards**: Clear feedback for progression unlocks
- **Job Updates**: Interview results and promotion celebrations

## Technical Implementation

### Core Architecture

#### State Management (`src/cats/game/types.ts`)

```typescript
interface GameState {
  // Currency & Progress
  love: number;
  treats: number;
  totalClicks: number;

  // Achievement System
  earnedMerits: string[];
  spentMerits: { [upgradeId: string]: number };
  earnedAwards: string[];
  specialActions: {
    noseClicks: number;
    happyJumps: number;
    earClicks: number;
    cheekPets: number;
  };

  // Job System
  jobLevels: { [jobId: string]: number };
  jobExperience: { [jobId: string]: number };

  // Items & Mood
  thingQuantities: { [itemId: string]: number };
  currentMood: CatMood;
  lovePerTreat: number;
}
```

#### Achievement System (`src/cats/hooks/useAchievementSystem.ts`)

- **Centralized Logic**: Single hook manages both milestone and award checking
- **Real-time Tracking**: Automatically detects achievement completion
- **Notification Integration**: Seamless alert system for new unlocks
- **Merit Distribution**: Awards merit points for upgrade purchases

#### Component Structure

- **MeritsPanel**: Three-tab interface (Upgrades, Milestones, Awards)
- **MilestonePanel**: Linear progress visualization with connecting lines
- **AwardPanel**: Secret badge system with discovery mechanics
- **JobPanel**: Compact career ladder with experience tracking

### Key Data Files

#### Achievement Data (`src/cats/data/`)

- **milestoneData.ts**: Progressive achievement definitions with targets and rewards
- **awardData.ts**: Secret achievement criteria and unlock conditions
- **achievementData.ts**: Unified types and data aggregation

#### Game Systems (`src/cats/data/`)

- **jobData.ts**: Career progression definitions and experience requirements
- **jobTrainingSystem.ts**: Training mechanics and cost calculations
- **interviewSystem.ts**: Job interview probability and rejection messages
- **lovePerInteractionSystem.ts**: Dynamic love scaling calculations
- **meritUpgradeData.ts**: Permanent upgrade definitions and effects
- **thingsData.ts**: Purchasable items and their passive bonuses

#### Components (`src/cats/components/`)

- **panels/MeritsPanel.tsx**: Three-tab achievement interface
- **panels/MilestonePanel.tsx**: Linear progress visualization
- **panels/AwardPanel.tsx**: Secret badge discovery system
- **panels/JobPanel.tsx**: Career ladder with training actions
- **panels/ThingsPanel.tsx**: Item shop and inventory management
- **cat/Cat.tsx**: Interactive cat with special click areas

## Development Guidelines

### Adding New Features

1. **Follow Modular Design**: Keep data, components, and logic separated
2. **Test-Driven Development**: Write tests for new functionality
3. **Material Design Consistency**: Use established iconography and styling patterns
4. **Performance First**: Consider impact on game loop and animation smoothness
5. **User Experience**: Maintain high information density while ensuring usability

### Code Quality Standards

- **290+ Tests**: Comprehensive coverage across all game systems
- **TypeScript Strict Mode**: Full type safety and error prevention
- **ESLint Compliance**: Clean, consistent code style
- **Component Co-location**: Tests live alongside the code they test

### Architecture Principles

- **Centralized State**: GameState manages all progression and achievement data
- **Event-Driven Updates**: React components respond to game state changes
- **Separation of Concerns**: Business logic separate from UI presentation
- **Optimized Rendering**: Minimal state updates for smooth performance

This documentation focuses on the current state of the Cat Clicker game and its architecture. For implementation details, refer to the codebase structure and comprehensive test suite.
