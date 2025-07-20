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