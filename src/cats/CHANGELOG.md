# Cat Clicker Game - Changelog

## [Latest Session] - 2025-01-14

### 🎮 Major Job System Overhaul

- **Experience-Based Progression**: Completely redesigned job system requiring players to train/interview for experience points before promotions
- **Love-to-Experience Training**: New training mechanic where players spend love currency to gain randomized experience with luck bonuses
- **Extended Career Paths**: Box Factory expanded from 6 to 13 levels (Unpaid Intern → Supreme Box Overlord)
- **Escape Key Controls**: Added keyboard shortcut to exit wand mode instantly with Escape key

### 🎨 UI/UX Polish

- **Compact Job Ladder**: One-line visual progression with dot indicators showing current position and next steps
- **Contextual Actions**: "Interview" button for unemployed, "Train" for employed, with dynamic love cost display
- **Pure Experience Promotions**: "Accept Offer"/"Ask for Promotion" buttons based solely on experience thresholds
- **Material Design Integration**: Fish icons for treats/sec, heart icons for love costs, proper centering and sizing
- **Progressive Difficulty**: Starting position requires 3 experience points, encouraging 2-3 training sessions before first job

### 🛠️ Technical Implementation

- **Modular Training System**: New `jobTrainingSystem.ts` with configurable parameters and promotion logic
- **Experience State Management**: Added `jobExperience` tracking to GameState with proper React integration
- **Performance Optimizations**: Minimal re-renders with memoization and efficient state updates
- **Enhanced Test Coverage**: Updated to 157 comprehensive tests with full job system coverage
- **Clean Architecture**: Separated business logic from UI components for maintainable code

### 🎯 Game Balance Improvements

- **Training Economics**: Base cost of 2 love per session with slight increases based on current experience
- **Randomized Rewards**: 1-3 experience per training with 20% luck chance for 1.5x bonus multiplier
- **Meaningful Progression**: Early jobs require 3-5 experience, later positions need 100+ for balanced pacing
- **Significant Income Growth**: Final job levels earn 140+ treats/second for satisfying long-term progression

## [Previous Session] - 2025-07-27

### 🎮 Major Features Added

- **Treat-to-Love Conversion System**: Added passive economic engine where treats automatically convert to love
- **Feeding Upgrades**: New upgrade system for improving conversion rates and love multipliers
- **Playing Upgrades**: Dedicated upgrades for enhancing petting and pouncing interactions
- **Infinite Progression**: All upgrade paths now continue indefinitely with scaling costs beyond predefined levels

### 🎨 UI/UX Improvements

- **Tabbed Interface**: Consolidated Day Jobs, Feeding, and Playing into unified side panel
- **Currency Tooltips**: Replaced conversion badge with detailed hover tooltips showing economic breakdowns
- **Material Design Icons**: Replaced emojis with consistent SVG icons (HeartIcon, FishIcon)
- **Responsive Layout**: Improved mobile experience with proper dev panel integration
- **Whole Number Display**: All currency values now display as whole numbers for cleaner UX

### 🛠️ Technical Enhancements

- **Shared Components**: Created `CostDisplay` component for consistent cost presentation
- **Tooltip Management**: Implemented `TooltipManager` for exclusive tooltip visibility
- **Economic Calculations**: Centralized passive income logic in `calculatePassiveIncome` function
- **Z-Index Hierarchy**: Proper layering system for tooltips and UI elements
- **Dev Panel Integration**: Debug panel now takes layout space instead of overlapping

### 📏 Design Principles Established

- **Currency Standards**: Only whole numbers for treats and love displays (`Math.floor()`)
- **Component Consistency**: Shared styling and behavior across all panels
- **Tooltip Best Practices**: Stable hover, exclusive visibility, information hierarchy
- **Icon Usage**: SVG icons over emojis for visual consistency
- **Infinite Scaling**: All progression systems designed for long-term play

### 🐛 Bug Fixes

- Fixed tooltip z-index issues causing elements to appear behind UI
- Resolved tooltip flickering when hovering over same element
- Eliminated unexpected tooltip triggers from invisible hover areas
- Fixed horizontal scrollbar issues in side panel
- Corrected conversion rate discrepancies between tooltips

### 📚 Documentation

- Updated `DESIGN_PRINCIPLES.md` with new standards and implementation guidelines
- Enhanced `GEMINI.md` with latest architectural changes and component descriptions
- Added comprehensive examples for currency display and component usage

### 🎯 Breaking Changes

- Currency displays now show whole numbers instead of decimals
- Tooltip structure completely redesigned with new props and behavior
- Upgrade system extended with infinite scaling parameters
- Side panel layout restructured with tabbed interface

---

## Previous Versions

_See git history for earlier changes and architectural improvements_
