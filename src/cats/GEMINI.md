# Gemini's Guide to Cat Clicker

This document outlines the vision, architecture, and implementation details for the "Cat Clicker" micro-app. It serves as a reference for future development and ensures that Gemini can easily understand and contribute to the project.

## 1. Core Gameplay Loop

**Cat Clicker** is an incremental game with two primary currencies:

- **Love (❤️):** Earned by interacting directly with the cat (petting, playing with the wand). Love is spent on upgrades that improve these direct interactions.
- **Treats (🐟):** Earned passively by acquiring "Day Jobs." Treats are the foundation for the game's idle progression.

The core loop is satirical and wholesome: the player must work a series of humorous day jobs not for themselves, but to provide a better life for their cat.

## 2. UI/UX Vision & Design System

The application's design is heavily inspired by **Google's Material Design 3 (M3)** system. The goal is a clean, modern, and professional UI that feels intuitive and delightful to use.

- **Layout:** The game uses a responsive two-panel layout. The left panel is for direct cat interaction, while the right panel is dedicated to the "Day Job" progression system.
- **Component Styling:** All interactive elements, such as buttons and panels, are styled according to M3 specifications, using appropriate color palettes, corner radiuses, and elevation shadows.
- **Typography & Spacing:** The application follows M3's type scale and spacing guidelines to ensure visual harmony and readability.

## 3. Key Features & Mechanics

### Cat Animation & Interaction

- **SVG Cat:** The cat is a modular SVG, allowing for individual parts like the head, tail, and eyes to be animated independently.
- **Dynamic States:** The cat has multiple states, including `petting`, `drowsy`, `sleeping`, `startled`, and `pouncing`, each with unique animations and behaviors.
- **Happy Jumps:** Rapidly petting the cat has a chance to trigger a "happy jump," which rewards bonus Love and features a joyful `^^` eye expression.

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

The project uses **Vitest** for unit testing, integrated directly into the Vite development environment. This allows for fast, efficient, and reliable testing of our React components. The Cat Clicker has comprehensive test coverage with **48 tests** across all major components and functionality.

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

Our comprehensive test suite includes **48 tests** organized across three main test files:

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
