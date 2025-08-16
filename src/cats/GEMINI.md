# Gemini's Guide to Cat Clicker

This document outlines the vision, architecture, and implementation details for the "Cat Clicker" micro-app. It serves as a reference for future development and ensures that Gemini can easily understand and contribute to the project.

## 🎮 **Recent Major Update: 2D World Environment**

The game has undergone a **massive architectural transformation** from a simple click interface to a fully immersive 2D side-view world environment inspired by "Night in the Woods."

### **New World Features**

- **📐 Fixed-size 2D world** with horizontal camera panning
- **🏠 Detailed house interior** with furniture, windows, door, and multiple rooms
- **🐱 3D-positioned cat** with perspective scaling and realistic shadow system
- **🎥 Camera controls** with arrow buttons and auto-follow during interactions
- **🪄 Integrated wand toy** that moves within the world space
- **🎯 World-aware interactions** with proper coordinate mapping

### **Visual Style**

- **🎨 Pastel color palette** with soft pinks, blues, and earth tones
- **📐 Vector-style graphics** with clean lines and geometric shapes
- **🌟 Material Design icons** for UI controls
- **💫 Responsive design** that adapts to different viewport sizes

## Core Game Systems

### Love-Per-Interaction System

The game uses a dynamic love calculation system that scales with player progression:

- **1% Scaling**: Base love earned is always 1% of current love held (minimum 1)
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

## 🏗️ **2D World Architecture**

### **Core Systems**

#### **World Coordinate System**

- **`WorldCoordinateSystem.ts`**: Central service managing 3D world coordinates and screen position mapping
- **`WorldCoordinates`**: Logical units (x, y, z) where Y=20 is cat's resting height on the ground
- **`ScreenPosition`**: Pixel coordinates with perspective scaling for rendering
- **Perspective Scaling**: Min 0.3x (far) to Max 1.4x (near) with smooth transitions
- **Responsive Floor**: Dynamically calculates floor dimensions based on viewport size

#### Single-source world-to-screen projection

- All projection goes through `worldToScreen()` and `getShadowPosition()` in `WorldCoordinateSystem.ts`.
- The cat’s shadow derives strictly from the cat’s world coordinates. No separate shadow state is kept.
- UI inputs (mouse, debug moves) use `screenPositionToWorldCoordinates()`/`screenToWorld()` to convert screen to world space.
- Grounding rule: when the cat is at resting height (Y=20), the shadow’s X and Y match the cat’s ground projection across Z.
- WORLD_DEPTH is logical; Z travel remaps to the full pixel height of the visible floor for responsive correctness.

#### **Cat Positioning Service**

- **`CatPositionServiceNew.ts`**: Manages cat movement, animations, and physics
- **`useCatPositionNew.ts`**: React hook exposing cat position data and movement functions
- **Physics-based Movement**: Smooth animations with pouncing arcs and gravity
- **Boundary Enforcement**: Prevents cat from clipping into walls (Z: 100-320 range)
- **Return-to-Rest**: Cat automatically returns to default position when idle

#### **Integrated Shadow System**

- **Dynamic Shadows**: Real-time shadow calculation based on cat's 3D position
- **Perspective-aware**: Shadow size and position adapt to cat's depth in the world
- **Height Response**: Shadows shrink when cat jumps, positioned at floor level
- **Visual Grounding**: Ensures cat always appears connected to the ground

#### Shadow Baseline and Mass-Box Alignment (current)

- **Baseline definition**: The visual baseline is the ground projection of the cat at `y=0`. The shadow's vertical center is anchored to this baseline at all times.
- **Mass-box anchoring**: The bottom of the cat's visual mass box (combined body/head envelope) is aligned to the shadow's vertical center. This is achieved by anchoring the cat container bottom to the baseline and translating the inner SVG by the computed mass-bottom offset.
- **Pixel stability**: Baseline and shadow dimensions are rounded to whole pixels to avoid half-pixel gaps in screenshots.
- **Debug overlay**: Enable with `?overlay=1` to view:
  - `massBottomLinePx` (mass-box bottom), `visualShadowCenterPx` (shadow center)
  - `massDeltaPx` (mass bottom − shadow center), `feetDeltaPx` (feet − shadow center)
  - Expect `massDeltaPx = 0` at rest; during jumps, `massBottom` rises by the jump delta while shadow remains at baseline.
- **Regression test**: See `src/cats/integration/MassBottomAlignment.test.ts`.

### **World Layout**

#### **House Interior Design**

- **Back Wall**: Window with cross-frame design showing outside sky view
- **Side Furniture**: Bookshelf with multiple shelves and decorative items
- **Floor Elements**: Wooden flooring with decorative rug patterns
- **Lighting**: Soft ambient lighting creating depth and atmosphere
- **Scale**: Everything designed to work with cat's perspective scaling system

#### **Camera System**

- **Horizontal Panning**: Left/right arrow buttons for manual camera control
- **Auto-follow**: Camera smoothly tracks cat during wand toy interactions
- **Recenter Button**: Quick button to snap camera back to cat's position
- **Boundary Limits**: Camera movement constrained to world boundaries

### **User Interface Integration**

#### **Fixed UI Elements**

- **Side Panel**: Game controls remain fixed outside the world viewport
- **Currency Display**: Love and treats counters positioned above world
- **Control Buttons**: Wand toggle and camera controls at bottom of world view
- **Dev Panel**: Debug controls positioned in bottom-left corner (dev mode only)

#### **World-Embedded Elements**

- **Cat**: Fully integrated with world coordinate system and perspective
- **Wand Toy**: Moves within world space and responds to camera position
- **Hearts**: Spawn from cat and animate within the world coordinate system
- **Interactive Areas**: All click detection accounts for world coordinate mapping

### **Technical Implementation**

#### **Component Architecture**

- **`World2D.tsx`**: Main world container with camera controls and scene layout
- **`CatInteractionManager.tsx`**: Handles cat interactions within world coordinate space
- **`WandToy.tsx`**: Wand positioning and animation within world boundaries
- **CSS-based World**: All world elements positioned using absolute CSS with transforms

#### **Coordinate Mapping**

- **Screen to World**: Mouse clicks converted to world coordinates for accurate interaction
- **World to Screen**: Cat position mapped to screen pixels with perspective scaling
- **Camera Offset**: All world elements adjusted for current camera position
- **Responsive Scaling**: World size adapts to viewport dimensions while maintaining proportions

## Recent Technical Improvements

### Infinite Loop Resolution (January 2025)

Successfully identified and resolved critical infinite rendering issues:

**Root Causes Identified:**

- `useGameStateManager` was returning new object references on every render
- Achievement system dependencies on `jobLevels`/`thingQuantities` caused re-render loops
- Flawed render tracking logic was counting cumulative renders instead of render frequency

**Solutions Implemented:**

- **Memoized useGameStateManager**: Used `useMemo` to stabilize returned object references
- **Stabilized Achievement Dependencies**: Used JSON.stringify for deep comparison of state objects
- **Proper Render Loop Detection**: Replaced cumulative counter with time-based frequency monitoring
- **DOMMatrix Test Mock**: Added proper browser API mocks for test environment compatibility

**Testing Improvements:**

- Fixed 11 failing tests from 294 total tests (96% pass rate)
- Added proper test infrastructure with DOMMatrix mock
- Resolved JSX syntax errors in test files
- Implemented dynamic cat facts system for better user experience

**Code Quality:**

- ✅ Zero linting errors and warnings
- ✅ Removed all dead code and unused variables
- ✅ Added 'w' key handler for wand mode activation
- ✅ Comprehensive error logging and debugging tools

### Unified Mouse Tracking System (August 2025)

Eliminated mouse movement-induced render loops and unified all mouse tracking into a single, performant system:

**Architecture Overview:**

- **Single Event Listener**: One `document.addEventListener('mousemove')` serves entire application
- **Ref-Based State**: Mouse position stored in refs, never triggers React re-renders
- **Callback System**: Components register callbacks via `onMouseMove()` for position updates
- **Smooth Tracking**: Optional 60fps throttled position updates for animations
- **Centralized API**: All mouse-dependent features use unified `useMouseTracking` hook

**Components Integrated:**

- **Inactivity Detection**: Optimized to only update state when cats are actually sleeping/drowsy
- **Cat Eye Tracking**: Uses `smoothPositionRef` for fluid eye movement animations
- **Wand Toy Interaction**: Registers callbacks for wiggle effects and direct DOM manipulation
- **Performance Monitoring**: No longer triggers on mouse movement

**Performance Benefits:**

- ✅ **Zero render loops** during mouse movement (was 60+ renders/second)
- ✅ **Conditional state updates** only when UI actually needs to change
- ✅ **Direct DOM manipulation** for animations (bypasses React render cycle)
- ✅ **Unified event handling** eliminates redundant mouse listeners
- ✅ **Separation of concerns** between mouse tracking and render logic

**Design Principles:**

1. **Mouse tracking should never trigger React re-renders** - Use refs and callbacks
2. **State updates should be conditional** - Only update when state actually changes
3. **Direct DOM manipulation for performance-critical animations** - Bypass React for high-frequency updates
4. **Single source of truth for mouse position** - All components use unified system
5. **Callback-based subscription model** - Clean registration/cleanup of mouse listeners

**Implementation Details:**

```typescript
// Unified mouse tracking interface (ref-based, no React state)
interface MouseState {
  positionRef: React.RefObject<MousePosition>; // Current position
  lastMovementTimeRef: React.RefObject<number>; // Last movement time
  smoothPositionRef: React.RefObject<MousePosition>; // Throttled for animations
  hasRecentMovement: (thresholdMs?: number) => boolean; // Inactivity detection
  onMouseMove: (callback: Function) => () => void; // Register/cleanup callbacks
}

// Example: Optimized inactivity detection
const resetInactivityTimer = () => {
  // Only update state if it actually needs to change
  if (isSleeping) setIsSleeping(false);
  if (isDrowsy) setIsDrowsy(false);
  if (zzzs.length > 0) setZzzs([]);
  startInactivityTimers();
};
```

**Testing Coverage:**

- ✅ **12 comprehensive tests** for `useMouseTracking` hook
- ✅ **Render loop prevention verification** - confirms no state updates on mouse movement
- ✅ **Component integration tests** - `WandToy` updated for unified system
- ✅ **Callback system testing** - registration, cleanup, and multiple subscribers
- ✅ **Performance regression tests** - ensures no render loops reintroduced

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

### Visual Effects System

The game uses a **unified coordinate system approach** for all cat-related visual effects, ensuring consistent positioning across all scenarios including camera panning, cat movement, and initialization states.

#### **Hearts (Love Effects)**

Hearts spawn from user interactions using **direct screen coordinates**:

```typescript
// Hearts use mouse click coordinates - always accurate
heartSpawningService.spawnHearts({
  position: { x: event.clientX, y: event.clientY }, // Direct screen coordinates
  loveAmount: calculatedLove,
  interactionType: 'petting' | 'pouncing',
});
```

**Key Features:**

- **Mouse-based positioning**: Uses `event.clientX/clientY` for perfect accuracy
- **Automatic camera handling**: Screen coordinates work in all camera positions
- **Interaction-aware**: Different visual styles for petting vs pouncing
- **Love-scaled**: Heart count and size scale with love amount

#### **Sleep Z's (Sleep Effects)**

Z's spawn from the cat's head using the **same coordinate system as hearts**:

```typescript
// Z's use direct DOM queries - same approach as hearts
const catElement = document.querySelector('[data-testid="cat"]') as HTMLElement;
if (catElement) {
  const catRect = catElement.getBoundingClientRect();
  spawnX = catRect.left + catRect.width / 2; // Cat center
  spawnY = catRect.top + catRect.height * 0.3; // Cat head (30% from top)
}
```

**Key Features:**

- **Real-time positioning**: Fresh DOM query at each spawn for accuracy
- **Camera-aware**: `getBoundingClientRect()` automatically handles CSS transforms
- **Head-targeted**: Spawns from anatomically correct cat head position
- **Fallback robust**: Uses screen center if cat element not found

#### **Unified Positioning Principles**

Both hearts and Z's follow the same core principles:

1. **Screen Coordinate System**: All effects use viewport-relative coordinates
2. **No Manual Camera Compensation**: `getBoundingClientRect()` handles transforms automatically
3. **DOM-based Positioning**: Direct queries ensure real-time accuracy
4. **Fallback Strategies**: Graceful degradation when elements aren't available
5. **Test-friendly**: Mockable `getBoundingClientRect()` for comprehensive testing

#### **Edge Cases Handled**

The visual effects system robustly handles:

- **Camera Panning**: Effects follow cat seamlessly during camera movement
- **Initialization**: No positioning bugs during app startup
- **Extreme Positions**: Works correctly when cat is at screen edges
- **DOM Readiness**: Fallback positioning when elements aren't fully rendered
- **Multiple Effects**: Consistent positioning across simultaneous spawns

This unified approach eliminates the complex position tracking systems previously used and ensures visual effects work perfectly in all game scenarios.

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

#### Data Layer (`src/cats/data/`)

Pure game data definitions without business logic:

- **jobData.ts**: Career progression definitions and experience requirements
- **meritUpgradeData.ts**: Permanent upgrade definitions and effects
- **thingsData.ts**: Purchasable items and their passive bonuses
- **achievementData.ts**: Milestone and award definitions
  // catFacts removed from current design

#### Systems Layer (`src/cats/systems/`)

Business logic and game mechanics:

- **jobTrainingSystem.ts**: Training mechanics and cost calculations
- **interviewSystem.ts**: Job interview probability and rejection messages
- **lovePerInteractionSystem.ts**: Dynamic love scaling calculations

#### Services Layer (`src/cats/services/`)

External utilities and centralized calculations:

- **GameEconomyService.ts**: Centralized economic calculations
- **HeartSpawningService.ts**: Animation and visual effects management

#### Component Architecture (`src/cats/components/`)

Organized by responsibility:

- **game/**: Core interactive components (Cat.tsx, CatInteractionManager.tsx, Heart.tsx, WandToy.tsx, Zzz.tsx)
- **panels/**: UI panels (MeritsPanel.tsx, JobPanel.tsx, ThingsPanel.tsx, TabbedPanel.tsx)
- **ui/**: Utility components (CurrencyDisplay.tsx, NotificationQueue.tsx, ErrorReporter.tsx)

## Development Guidelines

### Adding New Features

1. **Follow Modular Design**: Keep data, components, and logic separated
2. **Test-Driven Development**: Write tests for new functionality
3. **Material Design Consistency**: Use established iconography and styling patterns
4. **Performance First**: Consider impact on game loop and animation smoothness
5. **User Experience**: Maintain high information density while ensuring usability

### Code Quality Standards

- **274+ Tests**: Comprehensive coverage across all game systems including regression tests
- **TypeScript Strict Mode**: Full type safety and error prevention
- **ESLint Compliance**: Clean, consistent code style
- **Component Co-location**: Tests live alongside the code they test

### Architecture Principles

- **Centralized State**: GameState managed through useGameStateManager hook
- **Event-Driven Updates**: React components respond to game state changes
- **Separation of Concerns**: Business logic (systems) separate from UI (components) and data
- **Optimized Rendering**: Stable callbacks and minimal state updates for smooth performance
- **Clean Architecture**: Clear boundaries between data, systems, services, and components

## Refactoring Tools & Patterns

### State Management Hooks

#### useGameStateManager (`src/cats/hooks/useGameStateManager.ts`)

Centralized state mutations replacing scattered setGameState calls:

- **currency**: Methods for love/treats operations and passive income
- **jobs**: Training, promotion, and interview management
- **purchases**: Merit upgrades and thing purchases
- **debug**: Development utilities for testing

#### useStableCallback (`src/cats/hooks/useStableCallback.ts`)

Prevents infinite re-render loops by ensuring callback stability:

- **useStableCallback**: Maintains stable function references across re-renders
- **useStableHandlers**: Stable object of multiple handlers
- **Critical for**: useEffect dependencies and prop passing

### Development & Debugging Tools

#### Debug Utilities (`src/cats/utils/debugUtils.ts`)

Development-only tools for component debugging:

- **useRenderTracker**: Detects excessive re-renders and infinite loops
- **useEffectDebugger**: Tracks useEffect dependency changes
- **debugLog**: Structured console logging with categories (render, effect, callback, state)

#### Error Reporting (`src/cats/utils/errorLogger.ts` + `src/cats/components/ui/ErrorReporter.tsx`)

Automatic error capture and reporting system:

- **Console Intercepts**: Captures console.error, console.warn, and error-like logs
- **Window Error Handling**: Catches unhandled errors and promise rejections
- **Development UI**: In-app error display with copy/download functionality
- **Systematic Debugging**: Replace manual console inspection with automated logging

#### Server-Side Logging (`serverLogger`)

For debugging issues that require terminal-visible logs during development:

- **`serverLogger.log()`**: Sends log messages to the Vite development server terminal
- **Use Case**: Debugging coordinate systems, animations, and state synchronization issues
- **Best Practice**: Use sparingly for critical debugging, comment out when not needed
- **Example**: `serverLogger.log('🔴 [DEBUG] Shadow position:', shadowPosition)`
- **Terminal Output**: Messages appear in the `npm run dev` console for real-time debugging

### Refactoring Patterns Learned

#### Component Decomposition

- **Extract large components** into focused, single-responsibility components
- **Pass economy calculations** as props rather than recalculating in each component
- **Centralize interaction logic** in manager components (e.g., CatInteractionManager)

#### State Synchronization

- **Single source of truth** for each piece of state (avoid dual state systems)
- **Use refs for values** that don't need to trigger re-renders (positions, animation state)
- **Stable callback references** to prevent infinite useEffect loops

#### Performance Optimization

- **Throttle frequent updates** (love/treats changes) in achievement/notification systems
- **Memoize expensive calculations** with targeted dependencies (not entire gameState)
- **useStableCallback** for any callback passed as useEffect dependency

### Regression Testing

Comprehensive test coverage for refactoring safety:

- **App.regression.test.tsx**: Integration tests for infinite loops, dynamic content, state sync
- **useStableCallback.regression.test.ts**: Callback stability and performance tests
- **StateSynchronization.regression.test.ts**: Cross-system state consistency tests

These tools and patterns ensure the codebase remains maintainable and stable during future development.

## Achievement System Stability (August 2025)

### Duplicate Achievement Prevention

Fixed critical race condition bug where achievements could be awarded multiple times:

#### Root Cause

- **Asynchronous State Updates**: React state updates are asynchronous, so `earnedMerits` didn't update immediately
- **Rapid Succession Calls**: `checkAllAchievements` called multiple times before state propagated
- **Insufficient Guards**: Only checking `earnedMerits.includes(id)` was not sufficient for race conditions

#### Solution Implemented

```typescript
// processingAchievementsRef prevents race conditions
const processingAchievementsRef = useRef<Set<string>>(new Set());

const awardAchievement = useCallback(
  (achievement: Achievement) => {
    // FIRST: Check if currently being processed (most important check)
    if (processingAchievementsRef.current.has(achievement.id)) {
      return; // Race condition protection
    }

    // SECOND: Check if already earned
    const alreadyEarned = earnedMerits.includes(achievement.id);
    if (alreadyEarned) return;

    // Mark as processing IMMEDIATELY
    processingAchievementsRef.current.add(achievement.id);

    // Update state...

    // Remove from processing after React state propagates
    setTimeout(() => {
      processingAchievementsRef.current.delete(achievement.id);
    }, 50);
  },
  [earnedMerits, earnedAwards]
); // Include current state in dependencies
```

#### Key Principles

1. **Priority-based Protection**: Process status check comes FIRST, before state checks
2. **Immediate Tracking**: Add to processing set before any async operations
3. **Delayed Cleanup**: Allow 50ms for React state to propagate before cleanup
4. **Current State Dependencies**: Include `earnedMerits/earnedAwards` in callback dependencies

### Error Reporter Stability

Fixed infinite recursion loop in development error logger:

#### Root Cause

- **Self-logging**: Error reporter logged `"📝 Error log updated"` messages
- **Pattern Matching**: Console interceptor caught messages containing "error" keyword
- **Infinite Loop**: Each error log triggered new error logs, exponentially growing

#### Solution

```typescript
console.log = (...args) => {
  if (
    args.some((arg) => String(arg).toLowerCase().includes('error')) &&
    !args.some((arg) => String(arg).includes('🎯 [CALLBACK]')) &&
    !args.some((arg) => String(arg).includes('📝 Error log updated'))
  ) {
    // Fixed
    this.logError('log', args);
  }
  originalLog.apply(console, args);
};
```

#### Lessons Learned

- **Exclude Self-References**: Error loggers must never log their own status messages
- **Pattern Specificity**: Generic pattern matching ("error" keyword) too broad for production
- **Recursive Detection**: Always consider if logging systems can trigger themselves

### Regression Testing for Stability

Added comprehensive tests to prevent future regressions:

```typescript
// Race condition protection tests
test('prevents duplicate achievement awards - race condition protection', async () => {
  // Simulates rapid successive calls before React state updates
});

test('prevents duplicate awards when already earned', async () => {
  // Tests that already earned achievements are never re-awarded
});

test('handles rapid state changes without duplicate awards', async () => {
  // Tests rapid state changes don't bypass protection
});
```

### Dead Code Elimination

Removed unused development utilities:

- **debugUtils.ts**: `useRenderTracker` function (commented out, never used)
- **Phantom References**: Fixed linter pointing to non-existent file paths
- **Unused Variables**: Cleaned up test files with unused destructured values

These fixes ensure robust achievement awarding, stable error reporting, and cleaner codebase maintenance.

## ECS Migration (2025)

### Overview

- The cat game now uses an Entity-Component-System architecture.
- React renders views; ECS owns world state, physics-ish timers, and animation flags.

### Entities and Components

- `World`: central store with typed component maps
- Components:
  - `Transform3` (x, y, z), `Velocity3`
  - `Renderable` (kind: `cat`, `furniture`, `couch`, ...)
  - `ShadowProps` (centerY, layout)
  - `CatBehavior` (state: `idle | alert | pouncePrep | pouncing | recover | sleeping`)
  - `CatIntent` (inputs): `sleeping`, `alert`, `pouncePrep`, `noseBoop`, `earLeft/earRight`, `tailFlick`, `cheekPet`, `startled`, `subtleWiggle`
  - `CatAnim` (outputs): `smiling`, `earWiggle`, `tailFlicking`, `startled`, `subtleWiggle`

### Systems

- `MovementSystem`: integrates velocity → transform with gravity (-640 px/s²) and world-bounds clamping
- `JumpImpulseSystem`: applies upward jump impulses (happy jump, pounce hop) with blending
- `ShadowSystem`: projects ground baseline and sizes shadow from world coords
- `CatInputBridgeSystem`: placeholder to ensure `CatIntent` exists (kept minimal)
- `CatStateSystem`: explicit transitions and timers
  - Flow: idle → alert → pouncePrep → pouncing → recover → idle
  - `alert` decays back to `idle` if no follow-up input
  - Animation outputs set from intents with expiries
    - Smile: 750ms, Ear wiggle: 500ms, Tail flick: 600ms
    - `startled` holds ~450ms, refreshes on retrigger; `subtleWiggle` is one-frame latch

### React Integration

- `WorldRenderer`: sorts by `z` and renders cats/furniture
- `CatView`: owns layout math and shadow alignment; `CatInteractionManager` handles inputs
- A `world-tick` CustomEvent is dispatched from the game loop each frame; React subscribes to reflect ECS updates without polling timers

### Shadow Alignment Invariant

- Visual bottom of the cat mass-box aligns with the shadow vertical center at the ground baseline
- Baseline and layout are rounded to whole pixels to prevent drift/gaps

### Tests

- Unit tests cover `CatStateSystem` transitions and animation expiry
- E2E tests ensure boot without errors and interactions work (fonts/analytics stubbed)

### Status

- Smile/ear/tail/startled/subtle wiggle now ECS-driven; React passes ECS-derived flags to `Cat`
- Happy jump and pounce hop are ECS-driven via `JumpImpulseSystem`
- World loop uses fixed sub-steps (10ms) and clamps long frames to 25ms for smooth physics
- Cat X clamps to world width, preventing edge teleports; render uses translate3d and pixel rounding where needed
- DevPanel ECS tab mirrors DOM/ECS metrics (walking, bob ampl, speed, dt)

### React ↔ ECS contract

- React views subscribe to `world-tick` and pull from component maps; no timers in views
- `Actor` listens to `ui.isPouncing` rising edge and emits a one-shot ECS `happyJump` for pounce hop
- Spacebar in run mode sets `happyJump` intent directly (no DOM events required)

### Removed bridge

- The App-level transform bridge that copied `useCatPositionNew` into ECS has been removed. ECS `Transform3` is the single source of truth for position. `useCatPositionNew` remains for camera/UI helpers but no longer overwrites ECS transforms.
