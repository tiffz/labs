# Gemini's Guide to Cat Clicker

This document outlines the vision, architecture, and implementation details for the "Cat Clicker" micro-app. It serves as a reference for future development and ensures that Gemini can easily understand and contribute to the project.

## Recent Major Enhancements (2025)

### Modern Things System (Cookie Clicker-Inspired)

The Cat Clicker features a completely redesigned progression system that replaces the traditional feeding upgrades with an engaging "Things" mechanic:

**Key Features:**

- **Cookie Clicker-Style Interaction**: Simplified UI showing only name, cost, and quantity with detailed tooltips on hover
- **Dense Grid Layout**: 3-5 items per row in responsive grid for maximum information density
- **Two Categories**: "Feeding" (improves treat-to-love conversion) and "Environment" (provides passive benefits)
- **No Levels**: Each Thing is purchasable multiple times with escalating prices (compound growth)
- **Professional Tooltips**: Fixed-position tooltips with seamless border connections and smart positioning

**Technical Implementation:**

- **Intelligent Positioning**: Advanced tooltip system prevents overlap and container clipping
- **Dynamic Pricing**: Each Thing uses `basePrice * priceMultiplier^quantity` formula
- **Effect Types**: `love_per_treat`, `treat_consumption_rate`, and `auto_love_rate` mechanics
- **Smart UI**: Contextual fish icon colors (blue when affordable, gray when expensive)
- **Material Design Icons**: Professional iconography matching game's aesthetic

**Files Involved:**

- `src/cats/data/thingsData.ts` - Thing definitions and pricing calculations
- `src/cats/components/things/ThingCard.tsx` - Individual Thing display with tooltips
- `src/cats/components/things/ThingsPanel.tsx` - Grid layout and category organization
- `src/cats/components/panels/TabbedPanel.tsx` - Updated to include Things tab
- `src/cats/styles/cats.css` - Comprehensive tooltip and grid styling

### Unified Notification & Goal System

The Cat Clicker underwent a significant architectural overhaul to create a unified, robust notification and progression system:

**Key Improvements:**

- **Replaced complex EventSystem** with a simplified unified notification system
- **Eliminated duplicate toasts** by combining story events and goal completions into single notifications
- **Fixed persistent wand mode bugs** where toasts would disappear or become uninteractive
- **Improved notification stacking** with proper z-index hierarchy and visual polish
- **Enhanced goal progression** with clear visual indicators and rewards

**Technical Architecture:**

- **NotificationQueue Component**: Queue-based system replacing the old buggy single-toast approach
- **Goal System**: Clean goal tracking with automatic completion detection and reward distribution
- **Unified Data Structure**: `GameNotification` interface combining stories, goals, and rewards
- **Z-Index Management**: Comprehensive layering system ensuring proper element visibility across all game modes

**Files Involved:**

- `src/cats/data/notificationData.ts` - Unified notification definitions
- `src/cats/data/goalData.ts` - Goal system and reward structure
- `src/cats/components/ui/NotificationQueue.tsx` - New queue-based toast system
- `src/cats/App.tsx` - Simplified notification logic and goal completion tracking
- `src/cats/styles/cats.css` - Enhanced visual design and z-index hierarchy

### Early Game Job Progression

Restored the guided early game experience by limiting initial job availability:

- **Single Starting Job**: Only "Cardboard Box Factory" available initially
- **Clear Progression Path**: Players must complete goals to unlock additional career paths
- **Visual Feedback**: Locked jobs indicator shows "2 more career paths to discover"
- **Balanced Difficulty**: Prevents overwhelming new players with too many options

### Toast & UI Polish

Comprehensive visual improvements to the notification system:

- **Increased Toast Size**: Wider notifications (420-500px) for better readability
- **Enhanced Typography**: Larger fonts throughout (15-25% increases) for improved accessibility
- **Better Spacing**: More breathing room around icons and content elements
- **Simplified Design**: Removed unnecessary icons and quotes for cleaner appearance
- **Improved Rewards Display**: Clear visual indicators for treats and love gains

### Custom Cat Favicon

The Cat Clicker features a custom SVG favicon that perfectly captures the kawaii aesthetic:

- **Blobby egg shape** - Wider bottom, narrower top matching the game cat's proportions
- **Frame-breaking effect** - Cat extends beyond the squarecle background for visual impact
- **Optimized positioning** - Cat positioned lower with eyes in bottom half for "peeking up" cuteness
- **Perfect proportions** - Bigger ears, larger eyes, and chunky body that feels adorable at small sizes

### Optimized Testing Workflow

The project uses intelligent path detection to optimize development speed:

- **Code changes** trigger full test suite (139 comprehensive tests)
- **Documentation/asset changes** skip tests for faster deployment
- **Smart pre-commit hooks** only run tests when TypeScript/JavaScript files are staged
- **Dual CI/CD workflows** provide fast asset deployment while maintaining code quality

## 1. Core Gameplay Loop

**Cat Clicker** is an incremental game with two primary currencies and a unified progression system:

- **Love (❤️):** Earned by interacting directly with the cat (petting, playing with the wand). Love is spent on upgrades that improve these direct interactions.
- **Treats (🐟):** Earned passively by acquiring "Day Jobs." Treats are the foundation for the game's idle progression.

**Progression System:**

- **Story Events**: Triggered by reaching currency thresholds, providing narrative context and new goals
- **Goal Completion**: Clear objectives guide players through the game progression
- **Unified Notifications**: Single toast system provides both story flavor and mechanical rewards
- **Job Unlocking**: Career paths unlock as players complete specific milestones

The core loop is satirical and wholesome: the player must work a series of humorous day jobs not for themselves, but to provide a better life for their cat.

## 2. UI/UX Vision & Design System

The application's design is heavily inspired by **Google's Material Design 3 (M3)** system. The goal is a clean, modern, and professional UI that feels intuitive and delightful to use.

- **Layout:** The game uses a responsive two-panel layout. The left panel is for direct cat interaction, while the right panel is dedicated to the "Day Job" progression system.
- **Component Styling:** All interactive elements, such as buttons and panels, are styled according to M3 specifications, using appropriate color palettes, corner radiuses, and elevation shadows.
- **Z-Index Hierarchy:** Comprehensive layering system ensures proper element visibility:
  - **Base Elements**: 10-100 (wand click areas, basic UI)
  - **Currency Indicators**: 1001
  - **Wand Toy**: 15000 (top priority for interaction)
  - **Notifications**: 11000-15000 (adaptive based on context)
  - **Currency Tooltips**: 10000-10002
- **Notification Design:** Modern toast system with proper stacking, readable typography, and clear reward indicators
- **Typography & Spacing:** The application follows M3's type scale and spacing guidelines to ensure visual harmony and readability.

## 3. Key Features & Mechanics

### Cat Animation & Interaction

- **SVG Cat:** The cat is a modular SVG, allowing for individual parts like the head, tail, and eyes to be animated independently.
- **Dynamic States:** The cat has multiple states, including `petting`, `drowsy`, `sleeping`, `startled`, and `pouncing`, each with unique animations and behaviors.
- **Happy Jumps:** Rapidly petting the cat has a chance to trigger a "happy jump," which rewards bonus Love and features a joyful `^^` eye expression.

## Recent Major Architectural Changes (Session 2024-12-19)

### Treat-to-Love Economic System

#### **Core Innovation**

Added a passive economic engine where treats automatically convert to love, creating the foundation for the game's progression system.

- **Conversion Rate**: Configurable treats per second that can be processed
- **Love Multiplier**: Amount of love gained per treat converted
- **Centralized Logic**: `calculatePassiveIncome()` function for consistent economic calculations
- **Real-time Updates**: Synchronized with all UI displays and debug tools

#### **Dual Progression Paths**

- **Things System**: Cookie Clicker-style purchasable items that improve efficiency (ceramic bowls, feeders, cat trees, beds)
- **Playing Upgrades**: Enhance direct interactions (petting technique, play engagement)
- **Scalable Progression**: Things use compound pricing, Playing upgrades have infinite scaling with predefined levels

### UI/UX Transformation

#### **Tabbed Interface Revolution**

Consolidated the growing number of game systems into a clean, scalable interface:

- **Jobs**: Career progression system for passive treat income
- **Things**: Cookie Clicker-inspired purchasable items with compound pricing
- **Playing**: Direct interaction enhancement upgrades
- **Goals**: Achievement tracking and progression guidance
- **Responsive Design**: Adapts to mobile with proper dev panel integration

#### **Currency Tooltip System**

Replaced simple conversion badges with detailed economic breakdowns:

- **Treat Flow Tooltip**: Shows earnings, conversion, and savings with cat personality
- **Love Generation Tooltip**: Displays complete conversion process with hunger warnings
- **Exclusive Visibility**: `TooltipManager` ensures only one tooltip at a time
- **Information Hierarchy**: Primary totals first, breakdown details second

#### **Material Design Icon Integration**

Systematic replacement of emojis with SVG icons for visual consistency:

- **Fish → Heart**: Visual representation of treat-to-love conversion
- **Consistent Sizing**: Standardized icon dimensions across all components
- **Component Reuse**: `HeartIcon` and `FishIcon` used throughout interface

#### **Advanced Tooltip System**

Professional-grade tooltip system that prevents clipping and provides seamless visual connections:

- **Fixed Positioning**: Uses `position: fixed` with viewport calculations to prevent container clipping
- **Intelligent Side Detection**: Automatically switches between left and right positioning based on available space
- **Seamless Border Connection**: Triangle arrows connect directly to tooltip edges with perfect alignment
- **Smart Overlap Prevention**: Advanced positioning logic ensures tooltips never cover the items they describe
- **Performance Optimized**: Uses `getBoundingClientRect()` with scroll offsets for precise positioning
- **Responsive Triangle**: Dynamic triangle sizing and positioning based on gap distance

### Event System & Guided Onboarding (2025)

#### **Core Innovation**

Added a sophisticated event and goal system that creates a guided onboarding experience, naturally introducing players to game mechanics through narrative-driven progression.

- **Event System**: Context-aware events that trigger based on game state (love/treats thresholds, job acquisitions, upgrades)
- **Goal Tracking**: Active goals with clear objectives and rewards that guide player progression
- **Narrative Flow**: Gentle, humorous events that maintain the game's cute and understated tone

#### **Onboarding Progression**

**Phase 1: Discovery (20 Love)**

- Event: "A Gentle Meow" - Cat expresses hunger with gentle, hopeful eyes
- Goal: Find a way to earn treats → Guides player to jobs system

**Phase 2: Reality Check (First Job)**

- Event: "A Learning Experience" - Humorous realization that unpaid intern gives no treats
- Goal: Earn a promotion → Motivates progression within job system
- Reward: 25 treat signing bonus when first paying job is achieved

**Phase 3: Things Introduction (50 Treats)**

- Event: "Mealtime Anticipation" - Cat notices treats and hopes for feeding setup
- Goal: Buy first ceramic bowl → Introduces the Things system for treat-to-love conversion

#### **Technical Architecture**

- **Clean Separation**: EventSystem service manages pure business logic separate from React
- **State-Driven**: Events trigger based on game state changes, not direct player actions
- **Reward System**: Goals can provide love/treats rewards with custom messages
- **Deep Cloning**: Proper event isolation prevents cross-instance contamination

#### **UI/UX Integration**

- **Event Notifications**: Modal-style notifications with tone-based styling (cute, humorous, encouraging)
- **Goal Tracker**: Persistent sidebar showing active goals and their rewards
- **Job Unlocking**: Progressive revelation with hints about locked career paths

### Technical Architecture Improvements

#### **Progressive Game Mechanics**

- **Starting State**: Conversion rate begins at 0 (no automatic feeding until first food bowl)
- **Job Gating**: Only Box Factory available initially, with UI hints about future unlocks
- **Unpaid Labor**: First job position gives 0 treats/second, creating meaningful progression moment

#### **Shared Component System**

- **`CostDisplay.tsx`**: Unified cost presentation with inline/block modes
- **Consistent Styling**: Red backgrounds for unaffordable costs, clean styling for affordable
- **Type Safety**: Full TypeScript integration with proper prop interfaces

#### **Infinite Scaling Engine**

- **Data Structure**: `infiniteScaling` parameters for all upgrade types
- **Utility Functions**: `getInfiniteUpgradeCost()`, `getInfiniteUpgradeEffect()`, `getInfiniteUpgradeName()`
- **Balance Formula**: Exponential cost scaling with logarithmic effect scaling

#### **Design System Standards**

- **Whole Numbers Only**: All currency displays use `Math.floor()` for casual gaming feel [[memory:4474452]]
- **Z-Index Hierarchy**: Proper layering system preventing UI conflicts
- **Component Consistency**: Shared styling patterns across all panels

### Advanced Pounce Logic

The logic for the wand toy interaction is designed to feel organic and skillful, rewarding players who play like they would with a real cat.

- **Pounce Confidence:** The cat has an internal "pounce confidence" meter that is influenced by player actions.
- **Proximity Multiplier:** The cat becomes hyper-focused when the toy is close, dramatically amplifying the excitement from small, twitchy movements.
- **Movement Novelty:** The cat gets "bored" of repetitive, high-speed movements (like circling the mouse). To keep the cat engaged, the player must use varied, jerky motions that mimic prey.
- **Sudden Start/Stop Bonuses:** The cat is most excited by sudden changes in velocity, rewarding the player for skillful, unpredictable play.

### Dual-Currency System

- **Love (❤️):** The primary "active" currency. The main upgrades, like "More Love Per Pet," are purchased with Love.
- **Treats (🐟):** The primary "idle" currency. The `treats` counter is a passive resource that will be used for future upgrades.

### "Day Job" Progression

- **Satirical Theme:** The idle mechanic is framed as the player getting a series of absurd day jobs to earn money for their cat.
- **Progression Ladder:** Each job has multiple promotion levels (e.g., from "Unpaid Intern" to "VP of Corrugation" at the Box Factory).
- **Idle Income:** Each promotion level increases the player's passive `Treats per second`.

### Developer Mode

- **Activation:** Appending `?dev=true` to the URL activates a debug panel.
- **Live Data:** The panel provides a real-time view of the game's hidden mechanics, including the cat's `Energy`, `Pounce Confidence`, `Cursor Velocity`, `Proximity Multiplier`, and `Movement Novelty`. This was instrumental in tuning the game's feel.

### Technical Architecture

- **Multi-Page App Setup:** The project is configured as a multi-page application within Vite, with separate HTML entry points for different "labs."
- **Service Worker:** A PWA service worker is configured for offline caching. Crucially, it is set up to handle a multi-page app structure correctly, using `directoryIndex` and `ignoreURLParametersMatching` to serve the right pages and avoid caching bugs. This was a significant technical hurdle that required careful debugging.
- **Reusable Components:** Key UI elements, like the `HeartIcon` and `FishIcon`, are built as reusable React components to ensure visual consistency.

## 4. Project Structure

The `cats` micro-app follows a feature-based folder structure to keep the code organized and maintainable:

- `/components`: Contains all React components, further divided by feature.
  - `/components/cat`: Components directly related to the cat SVG and its animations (`Cat.tsx`, `Heart.tsx`, etc.).
  - `/components/jobs`: Components for the "Day Job" feature (`JobPanel.tsx`, `Job.tsx`).
  - `/components/ui`: General-purpose UI components (`DevPanel.tsx`, `CatFact.tsx`).
- `/data`: Holds static data and type definitions (`jobData.ts`, `catFacts.ts`).
- `/icons`: Contains reusable SVG icon components (`HeartIcon.tsx`, `FishIcon.tsx`).
- `/styles`: Global and component-specific stylesheets (`cats.css`).
- `/test`: Contains shared testing setup and utilities (`setupTests.ts`).

## 5. Testing

The project uses **Vitest** for unit testing, integrated directly into the Vite development environment. This allows for fast, efficient, and reliable testing of our React components. The Cat Clicker has comprehensive test coverage with **155 tests** across all major components and functionality.

### Technology Stack

- **Test Runner:** [Vitest](https://vitest.dev/)
- **Testing Framework:** [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
- **DOM Assertions:** [@testing-library/jest-dom](https://github.com/testing-library/jest-dom)
- **DOM Environment:** `jsdom`

### Running Tests

To run the entire test suite once, use the following command:

```bash
npm test
```

This command will execute all `*.test.tsx` files and provide a summary of the results in the console. The tests are configured to run in a simulated DOM environment, so they do not require a browser.

### Test Coverage Overview

Our comprehensive test suite includes **155 tests** organized across multiple test files covering all game systems:

#### **Cat Component Tests (13 tests)**

- **Eye States (7 tests):** Complete coverage of all eye expressions and states (open, sleepy, happy, startled, drowsy, blinking)
- **Eye Tracking (6 tests):** Comprehensive testing of the sophisticated eye-tracking system, including mouse following, heart tracking, animation setup, and constraints

#### **WandToy Component Tests (19 tests)**

- **Initial Rendering (3 tests):** Component setup, SVG feather rendering, and initial transforms
- **Shaking State (3 tests):** Animation state management and prop updates
- **Mouse Movement Tracking (6 tests):** Position updates, wiggle calculations, velocity factors, and directional components
- **Animation System (4 tests):** Animation frame loops, cleanup, and lifecycle management
- **Component Lifecycle (3 tests):** State persistence and initialization

#### **App Component Tests (16 tests)**

- **Wand Mode Toggle (3 tests):** Mode switching, button functionality, and state transitions
- **Wand Mode Functionality (3 tests):** Error-free operation under complex movement patterns and time progression
- **Wand Click Interaction (3 tests):** Click handling, animation triggering, and interaction feedback
- **Cleanup & State Management (2 tests):** Proper cleanup when disabling wand mode and state transition handling
- **Component Integration (3 tests):** WandToy rendering, state passing, and component lifecycle
- **System Robustness (2 tests):** Rapid mode switching and complex interaction sequences

### Test Philosophy

- **Co-location:** Test files (`*.test.tsx`) are located directly alongside the component file they are testing (e.g., `Cat.test.tsx` lives next to `Cat.tsx`). This makes tests easy to find and encourages testing as part of the development workflow. Shared testing setup resides in the `/test` directory.
- **Behavior-Driven:** Our tests are written to verify the component's behavior from a user's perspective, rather than its internal implementation details. For example, we test that the correct eyes _appear_ on screen based on the component's props, not that a specific internal state variable is set.
- **Functional Focus:** Tests focus on **what the system does** rather than **how it does it internally**. This makes tests resistant to refactoring and ensures they catch real functional regressions.
- **Error Prevention:** Tests use `expect().not.toThrow()` patterns to catch runtime errors and ensure robust operation under complex conditions.

### Advanced Testing Techniques

Our test suite employs sophisticated mocking and testing strategies:

- **Portal Mocking:** `ReactDOM.createPortal` is mocked to handle heart rendering in tests
- **Animation Mocking:** `requestAnimationFrame`, `DOMMatrix`, and `getComputedStyle` are mocked for testing animated components
- **Timer Control:** Fake timers with `vi.useFakeTimers()` for precise control over time-based interactions
- **DOM Environment Setup:** Proper cleanup and setup of DOM elements (like `heart-container`) required by the application

### Regression Prevention

The primary goal of our test suite is to prevent regressions:

- **Eye Tracking Bug Prevention:** The detailed eye-tracking tests were specifically created after a regression where the cat's eyes stopped following hearts, ensuring this sophisticated feature never breaks again
- **Wand Toy System Protection:** Comprehensive coverage of the complex pouncing mechanics, including proximity calculations, movement novelty, and velocity detection
- **State Management Validation:** Tests ensure proper cleanup, state transitions, and component lifecycle management under all conditions

### CI/CD Integration

Tests are integrated into the development workflow:

- **Pre-commit Hooks:** All tests must pass before commits are allowed
- **Continuous Integration:** GitHub Actions runs the full test suite on every push and pull request
- **Deployment Blocking:** Failed tests prevent deployment to production

## 6. Modern Architecture (2024 Updates)

This section documents major architectural improvements and lessons learned from recent refactoring sessions, ensuring future development follows established patterns and avoids known pitfalls.

### Clean Architecture Principles

The Cat Clicker now follows a **Clean Architecture** pattern with clear separation of concerns:

#### **Game State Layer (Pure Business Logic)**

- **File:** `src/cats/game/GameState.ts`
- **Purpose:** Contains pure business logic for cat behavior, pounce calculations, and wand interactions
- **Key Features:**
  - No React dependencies
  - Pure functions and state management
  - Event-driven communication with other layers
  - Testable in isolation

#### **Animation Controller Layer (Pure Presentation)**

- **File:** `src/cats/animation/AnimationController.ts`
- **Purpose:** Manages visual effects, timing, and animation orchestration
- **Key Features:**
  - Handles visual timing without knowing game rules
  - Manages cat-specific animations (pouncing, ear wiggling, etc.)
  - Timer and animation frame management
  - Clean separation from business logic

#### **React Integration Layer**

- **File:** `src/cats/hooks/useCatSystem.ts`
- **Purpose:** Bridges pure game logic with React component state
- **Key Features:**
  - Event-driven state synchronization
  - Stable callback management
  - Performance-optimized updates
  - Prevents infinite re-render loops

### Unified Heart Spawning System

#### **Architecture Decision**

We implemented a centralized `HeartSpawningService` to eliminate code duplication and create consistent heart behavior across different interaction types.

- **File:** `src/cats/services/HeartSpawningService.ts`
- **Problem Solved:** Previously, petting hearts and pouncing hearts had separate, inconsistent spawning logic
- **Benefits:**
  - Single source of truth for heart calculations
  - Consistent scaling based on love amount
  - Configurable visual behaviors per interaction type
  - Performance optimization with heart count limits

#### **Interaction-Specific Configurations**

**Petting Hearts (Gentle & Calm):**

- 100ms delays between hearts
- Tighter grouping (1.0x spread)
- Slower animation (1.2s duration)
- Standard float velocity

**Pouncing Hearts (Fast & Energetic):**

- 50ms delays between hearts
- More scattered (1.5x spread)
- Faster animation (0.8s duration)
- Increased float velocity (1.3x)

#### **Smart Heart Scaling**

- Heart count: 1 heart per 2.5 love (minimum 1, maximum 5)
- Heart size: Logarithmic scaling based on love amount
- Performance: Capped at 5 hearts to prevent lag

### Click Excitement System

#### **Problem Statement**

The original wand system felt too "clicky" rather than skill-based. Users wanted a more formula-driven interaction that rewards timing and proximity.

#### **Solution: Dual Confidence System**

We implemented separate tracking for movement-based and click-based excitement:

**Click Excitement (`clickExcitement`):**

- Builds from wand clicks scaled by proximity
- Time-based decay (starts after 500ms delay)
- Contributes 30% to overall pounce confidence
- Caps at 100 points for balance

**Movement Confidence (`pounceConfidence`):**

- Builds from wand movement patterns
- Influenced by velocity changes and novelty
- Combined with click excitement for total confidence
- Triggers pounces when threshold is reached

#### **Benefits**

- More reactive feel (clicks work anywhere on screen)
- Formula-based rather than direct "click to pounce"
- Proximity matters (distant clicks less effective)
- Transparent via debug panel for tuning

### React State Management Lessons

#### **Critical Learning: Infinite Re-render Prevention**

During this refactoring, we encountered and solved several infinite re-render scenarios. These patterns should be avoided:

**❌ Anti-Patterns to Avoid:**

```typescript
// DON'T: Frequent state updates in useEffect
useEffect(() => {
  setStateEveryFrame(newValue); // Causes infinite loops
}, [frequentlyChangingValue]);

// DON'T: Unstable callback dependencies
const callback = () => {
  /* logic */
}; // Recreated every render
useEffect(() => {
  setupSystem(callback);
}, [callback]); // Infinite loop

// DON'T: Direct DOM manipulation triggering state
useEffect(() => {
  element.addEventListener('event', () => {
    setState(newValue); // Can cause loops
  });
}, []);
```

**✅ Preferred Patterns:**

```typescript
// DO: Event-driven state updates
const forceUpdate = useCallback(() => {
  setReactState(gameState.getReactState());
}, []);

// DO: Stable callbacks with useCallback
const stableCallback = useCallback((data) => {
  // Handle data
}, []); // Empty deps when truly stable

// DO: Ref-based access in animations
const valueRef = useRef(value);
useEffect(() => {
  const animate = () => {
    // Use valueRef.current to avoid dependencies
    doAnimation(valueRef.current);
    requestAnimationFrame(animate);
  };
  animate();
}, []); // Minimal dependencies
```

#### **State Synchronization Strategy**

- **Game Logic:** Pure state management outside React
- **React State:** Only for triggering re-renders
- **Event Callbacks:** Bridge between layers
- **Performance:** Update React state only when UI needs to change

### Testing Architecture Improvements

#### **New Test Categories Added**

1. **HeartSpawningService Tests (15 tests):** Comprehensive coverage of unified heart system
2. **Click Excitement System Tests (19 tests):** Complete coverage of new click mechanics
3. **Petting/Wand Integration Tests (17 tests):** Prevention of mode-switching bugs

#### **Testing Philosophy Reinforced**

- **Co-location:** Tests live next to the code they test
- **Behavior-driven:** Test what users experience, not internal implementation
- **Async-aware:** Proper handling of timeouts and delayed effects
- **Regression prevention:** Tests specifically designed to catch known failure modes

### Performance Optimizations

#### **DOM Manipulation Strategy**

- **High-frequency updates:** Direct DOM manipulation (pupil tracking)
- **Infrequent updates:** React state updates (mode changes, pouncing)
- **Animation loops:** `requestAnimationFrame` with ref-based access
- **Memory management:** Proper cleanup of timers and event listeners

#### **Heart Rendering Optimization**

- **Performance caps:** Maximum 5 hearts per spawn
- **Staggered timing:** Delayed spawning prevents frame drops
- **Portal rendering:** Hearts rendered outside main component tree
- **Automatic cleanup:** Hearts remove themselves after animation

### Development Workflow Improvements

#### **Build & Quality Assurance**

- **Linting:** ESLint with TypeScript rules enforced
- **Build verification:** All builds must complete successfully
- **Test coverage:** 155+ tests across all major systems
- **Type safety:** Strict TypeScript configuration

#### **Debugging Tools**

- **Dev panel:** Real-time visibility into click excitement and pounce confidence
- **Debug logging:** Structured logging for state transitions (removable)
- **Component inspection:** React DevTools integration
- **Performance monitoring:** Animation frame rate tracking

### Future Architecture Guidelines

#### **When Adding New Features:**

1. **Separate concerns:** Keep game logic, animation, and React separate
2. **Event-driven:** Use callbacks for cross-layer communication
3. **Test first:** Write tests that prevent regressions
4. **Performance conscious:** Consider high-frequency vs low-frequency updates
5. **User-focused:** Design APIs around user interactions, not internal convenience

#### **When Refactoring:**

1. **Preserve interfaces:** Keep public APIs stable during internal changes
2. **Incremental approach:** Change one layer at a time
3. **Test coverage:** Ensure tests pass at each step
4. **Monitor performance:** Watch for regressions in animation smoothness
5. **Document decisions:** Update this file with learnings

### Technical Debt Management

#### **Resolved in This Session:**

- ✅ Unified heart spawning (eliminated code duplication)
- ✅ Click excitement system (improved user experience)
- ✅ Infinite re-render loops (architectural fixes)
- ✅ Test coverage gaps (comprehensive new tests)
- ✅ Linting issues (code quality improvements)

#### **Ongoing Considerations:**

- Monitor animation performance as features are added
- Consider caching strategies for heart spawning
- Evaluate state management scaling as game grows
- Regular performance auditing of animation loops

This architecture has proven stable and performant through multiple refactoring sessions and should serve as the foundation for future development.
