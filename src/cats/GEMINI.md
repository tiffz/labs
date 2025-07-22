# Gemini's Guide to Cat Clicker

This document outlines the vision, architecture, and implementation details for the "Cat Clicker" micro-app. It serves as a reference for future development and ensures that Gemini can easily understand and contribute to the project.

## 1. Project Overview

**Cat Clicker** is an incremental game where players click on a cat to earn "treats." These treats can be spent on upgrades to increase the number of treats earned per click or to generate treats automatically over time. The game is built as a micro-app within a larger monorepo, using React, TypeScript, and Vite.

**Core Mechanics:**
- **Click to Earn:** Clicking the cat generates treats.
- **Upgrades:** Players can purchase upgrades to improve their treat-earning potential.
- **Incremental Progress:** The game is designed to be a "clicker" or "idle" game, where progress is made through both active clicking and passive generation.

## 2. Vision

The long-term vision for Cat Clicker is to create a game that feels like a blend of **Neopets, Pokémon, and Cookie Clicker**, with a focus on collecting and caring for virtual cats.

**Future Features:**
- **Cat Collection:** Players will be able to collect different types of cats, each with unique appearances and abilities.
- **Customization:** Cats will be customizable with different markings, colors, and accessories.
- **Animations:** The SVG cats will feature more advanced animations, such as blinking, smiling, and other expressions.
- **Mini-Games:** Players will be able to interact with their cats through mini-games and other activities.

## 3. SVG Graphics Implementation

The cat is rendered as a modular SVG in the `Cat.tsx` component, allowing for easy customization and animation.

**Key Features:**
- **Modular Design:** The SVG is composed of separate groups for the `head`, `body`, `tail`, and `face`. This makes it easy to animate individual parts of the cat.
- **Component-Based:** The entire cat is a self-contained React component, making it easy to manage and reuse.
- **Dynamic Properties:** The component accepts props like `isPetting` to trigger different animations and states.

## 4. Animations and Interactivity

The cat's animations and interactivity are handled through a combination of CSS and React.

- **CSS Animations:** The `cats.css` file contains keyframe animations for the `head-bob` and `tail-wag`. These are applied to the corresponding SVG groups to bring the cat to life.
- **Petting Animation:** When the cat is clicked, the `is-petting` class is added to the SVG container, triggering a more enthusiastic head-bob animation.
- **Eye Following:** The `Cat.tsx` component uses a `mousemove` event listener to track the user's cursor. It then calculates the appropriate position for the pupils and updates the SVG in real-time, creating the illusion that the cat is following the mouse. 

## 5. Advanced Animations and Lessons Learned

The interactivity of the cat has been enhanced with several advanced animations. Here's a breakdown of how they work and the key lessons learned during their implementation:

### Heart Animation

- **Functionality:** When the user clicks the cat, a heart emoji flies from the cursor's position. Each heart has a randomized trajectory, rotation, and scale to feel more dynamic.
- **Implementation:** The hearts are rendered into a separate `div` at the root of the document using a React Portal (`ReactDOM.createPortal`).
- **Caveat:** Originally, the hearts were rendered inside the main game container. This caused a "jerking" layout shift whenever a heart was added or removed. **Lesson Learned:** For animations that shouldn't affect the layout, always render them in a separate, isolated container using a portal.

### Eye Tracking and Smoothing

- **Functionality:** The cat's eyes follow the user's cursor. When a heart appears, the eyes will smoothly transition to follow the heart as it floats up. Once the heart is gone, the eyes will smoothly transition back to tracking the cursor.
- **Implementation:** The eye movement is handled by a `requestAnimationFrame` loop in `Cat.tsx`. This loop uses linear interpolation (lerp) to smoothly move the pupils towards their target.
- **Dynamic Smoothing:** The "lerp factor," which controls the smoothing, is dynamic. It's high for fast, responsive tracking of the cursor and temporarily becomes low when the target changes (from cursor to heart, or back). This creates a graceful, eased transition without making the normal tracking feel sluggish.
- **Caveat:** A constant lerp factor felt either too slow for the cursor or too jerky for transitions. **Lesson Learned:** For animations that need to be both responsive and smooth, a dynamic smoothing factor is essential.
- **State Management Caveat:** A persistent bug caused the eye-tracking to "freeze" after a pounce. The root cause was a state management issue where the game would get stuck trying to track a heart that no longer existed. The `lastHeart` state was not being properly cleared. **Lesson Learned:** When multiple systems (like heart-tracking and cursor-tracking) compete for control, they must be managed with an explicit and robust state system. The final solution involved creating a `trackableHeartId` to ensure only one heart could ever be the target, and explicitly clearing this ID to return control to the cursor.

### Startled Face Animation

- **Functionality:** If the user clicks on the cat's eyes, the cat will make a "startled" face (`>.<`) for a brief moment. This animation is rate-limited to prevent a jarring "flashing" effect on rapid clicks.
- **Implementation:** The eye graphics are separated into groups for "open" and "startled." The `onEyeClick` handler is attached to the parent group to ensure the entire eye is clickable.
- **Smooth Transition:** The transition between the open and startled eyes is handled with a fast CSS opacity fade. A previous attempt to use a `scaleY` transform felt unnatural. **Lesson Learned:** For simple state swaps, a quick fade can often feel better than a more complex transform.
- **Caveat:** Clicks were not registering on the pupils, only on the whites of the eyes. **Lesson Learned:** Ensure that click handlers are attached to the parent group of a compound SVG element to make the entire shape clickable. 

### Wand Toy Interaction

- **Functionality:** The user can enter "Wand Toy Mode," which makes a feather toy appear and follow the cursor. Clicking near the cat will cause the toy to shake and the cat to pounce towards it, rewarding the player with a burst of hearts and a higher treat count.
- **Organic Interaction:** To make the interaction feel more natural, the cat's animations are stateful:
    - The cat commits to its pounce and won't re-pounce if the toy is clicked again.
    - Subsequent clicks while the cat is pouncing will cause it to enter a "playing" state (a gentle wiggle) instead of a frantic, repeated jump.
- **Implementation:** The feature is managed by several states in `App.tsx` (`wandMode`, `isPouncing`, `isPlaying`). The pounce is a CSS animation that uses custom properties (`--pounce-x`, `--pounce-y`) to dynamically direct the jump towards the toy.
- **Click Area:** The clickable area for the wand toy is a larger, invisible `div` that surrounds the cat. This ensures that clicks *near* the cat trigger the pounce, not just clicks *on* the cat.
- **Caveat:** Early implementations of this feature caused several regressions, including incorrect click areas and broken eye-tracking. **Lesson Learned:** When adding new, complex features, it's crucial to be mindful of how they interact with existing systems. Passing component references (`ref`s) as standard props instead of using `React.forwardRef` can sometimes be a simpler and more robust solution. 