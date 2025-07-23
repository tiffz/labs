# Gemini's Guide to Cat Clicker

This document outlines the vision, architecture, and implementation details for the "Cat Clicker" micro-app. It serves as a reference for future development and ensures that Gemini can easily understand and contribute to the project.

## 1. Core Gameplay Loop

**Cat Clicker** is an incremental game with two primary currencies:
-   **Love (❤️):** Earned by interacting directly with the cat (petting, playing with the wand). Love is spent on upgrades that improve these direct interactions.
-   **Treats (🐟):** Earned passively by acquiring "Day Jobs." Treats are the foundation for the game's idle progression.

The core loop is satirical and wholesome: the player must work a series of humorous day jobs not for themselves, but to provide a better life for their cat.

## 2. UI/UX Vision & Design System

The application's design is heavily inspired by **Google's Material Design 3 (M3)** system. The goal is a clean, modern, and professional UI that feels intuitive and delightful to use.

-   **Layout:** The game uses a responsive two-panel layout. The left panel is for direct cat interaction, while the right panel is dedicated to the "Day Job" progression system.
-   **Component Styling:** All interactive elements, such as buttons and panels, are styled according to M3 specifications, using appropriate color palettes, corner radiuses, and elevation shadows.
-   **Typography & Spacing:** The application follows M3's type scale and spacing guidelines to ensure visual harmony and readability.

## 3. Key Features & Mechanics

### Cat Animation & Interaction
-   **SVG Cat:** The cat is a modular SVG, allowing for individual parts like the head, tail, and eyes to be animated independently.
-   **Dynamic States:** The cat has multiple states, including `petting`, `drowsy`, `sleeping`, `startled`, and `pouncing`, each with unique animations and behaviors.
-   **Happy Jumps:** Rapidly petting the cat has a chance to trigger a "happy jump," which rewards bonus Love and features a joyful `^^` eye expression.

### Advanced Pounce Logic
The logic for the wand toy interaction is designed to feel organic and skillful, rewarding players who play like they would with a real cat.
-   **Pounce Confidence:** The cat has an internal "pounce confidence" meter that is influenced by player actions.
-   **Proximity Multiplier:** The cat becomes hyper-focused when the toy is close, dramatically amplifying the excitement from small, twitchy movements.
-   **Movement Novelty:** The cat gets "bored" of repetitive, high-speed movements (like circling the mouse). To keep the cat engaged, the player must use varied, jerky motions that mimic prey.
-   **Sudden Start/Stop Bonuses:** The cat is most excited by sudden changes in velocity, rewarding the player for skillful, unpredictable play.

### Dual-Currency System
-   **Love (❤️):** The primary "active" currency. The main upgrades, like "More Love Per Pet," are purchased with Love.
-   **Treats (🐟):** The primary "idle" currency. The `treats` counter is a passive resource that will be used for future upgrades.

### "Day Job" Progression
-   **Satirical Theme:** The idle mechanic is framed as the player getting a series of absurd day jobs to earn money for their cat.
-   **Progression Ladder:** Each job has multiple promotion levels (e.g., from "Unpaid Intern" to "VP of Corrugation" at the Box Factory).
-   **Idle Income:** Each promotion level increases the player's passive `Treats per second`.

### Developer Mode
-   **Activation:** Appending `?dev=true` to the URL activates a debug panel.
-   **Live Data:** The panel provides a real-time view of the game's hidden mechanics, including the cat's `Energy`, `Pounce Confidence`, `Cursor Velocity`, `Proximity Multiplier`, and `Movement Novelty`. This was instrumental in tuning the game's feel.

### Technical Architecture
-   **Multi-Page App Setup:** The project is configured as a multi-page application within Vite, with separate HTML entry points for different "labs."
-   **Service Worker:** A PWA service worker is configured for offline caching. Crucially, it is set up to handle a multi-page app structure correctly, using `directoryIndex` and `ignoreURLParametersMatching` to serve the right pages and avoid caching bugs. This was a significant technical hurdle that required careful debugging.
-   **Reusable Components:** Key UI elements, like the `HeartIcon` and `FishIcon`, are built as reusable React components to ensure visual consistency. 