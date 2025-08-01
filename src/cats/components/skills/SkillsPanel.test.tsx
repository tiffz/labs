import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import SkillsPanel from './SkillsPanel';

const mockSkillLevels = {
  petting_technique: 2,
  wand_technique: 1,
  interior_design: 0,
};

const mockSkillIncrements = {
  petting_technique: { 0: 4, 1: 5 }, // Level 2 completed (effect = 2 * 2 = +4)
  wand_technique: { 0: 4 }, // Level 1 completed (effect = 1 * 3 = +3)
  interior_design: {}, // Level 0
};

const mockSkillAttempts = {
  petting_technique: { message: 'Great progress!', success: true },
  wand_technique: { message: 'Almost there!', success: false },
  interior_design: undefined,
};

const defaultProps = {
  skillLevels: mockSkillLevels,
  skillIncrements: mockSkillIncrements,
  skillAttempts: mockSkillAttempts,
  onSkillTrain: vi.fn(),
  currentLove: 100,
};

describe('SkillsPanel', () => {
  test('renders skills panel with intro text', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    expect(screen.getByText(/Work hard so you can play hard/)).toBeInTheDocument();
  });

  test('renders all 6 skills', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    expect(screen.getByText('Petting Technique')).toBeInTheDocument();
    expect(screen.getByText('Wand Play Technique')).toBeInTheDocument();
    expect(screen.getByText('Interior Design')).toBeInTheDocument();
    expect(screen.getByText('Food Preparation')).toBeInTheDocument();
    expect(screen.getByText('Work Ethic')).toBeInTheDocument();
    expect(screen.getByText('Work Intelligence')).toBeInTheDocument();
  });

  test('displays current skill levels correctly', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    // Petting technique at level 2 should show "Lv. 2"
    expect(screen.getByText('Lv. 2')).toBeInTheDocument();
    
    // Wand technique at level 1 should show "Lv. 1"  
    expect(screen.getByText('Lv. 1')).toBeInTheDocument();
    
    // Interior design at level 0 should show "Untrained" (use getAllByText since multiple skills might be untrained)
    const untrainedElements = screen.getAllByText('Untrained');
    expect(untrainedElements.length).toBeGreaterThan(0);
  });

  test('displays skill effects correctly', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    // Petting technique level 2 should show +4 and /pet (use more flexible matching)
    expect(screen.getByText('+4', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('/pet', { exact: false })).toBeInTheDocument();
    
    // Wand technique level 1 should show +3 and /pounce (use more flexible matching)
    expect(screen.getByText('+3', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('/pounce', { exact: false })).toBeInTheDocument();
  });

  test('shows progress dots for non-max level skills', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    // Should show progress dots for skills that aren't maxed
    const progressDots = document.querySelectorAll('.progress-dot');
    expect(progressDots.length).toBeGreaterThan(0);
  });

  test('shows train buttons for non-max level skills', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    // Should have multiple Train buttons (one for each non-maxed skill)
    const trainButtons = screen.getAllByText(/Train \(/);
    expect(trainButtons.length).toBeGreaterThan(0);
  });

  test('train button shows correct cost', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    // Should show training cost (base cost is 3 for some skills)
    // Use getAllByText since multiple skills might have the same cost
    const trainButtons = screen.getAllByText(/Train \(/);
    expect(trainButtons.length).toBeGreaterThan(0);
    
    // Check that at least one button shows cost 3
    const trainButton3 = screen.getAllByText(/Train \(3/);
    expect(trainButton3.length).toBeGreaterThan(0);
  });

  test('calls onSkillTrain when train button is clicked', () => {
    const mockOnSkillTrain = vi.fn();
    render(<SkillsPanel {...defaultProps} onSkillTrain={mockOnSkillTrain} />);
    
    const trainButton = screen.getAllByText(/Train \(/)[0];
    fireEvent.click(trainButton);
    
    expect(mockOnSkillTrain).toHaveBeenCalledTimes(1);
    expect(mockOnSkillTrain).toHaveBeenCalledWith(expect.any(String));
  });

  test('disables train button when player cannot afford it', () => {
    render(<SkillsPanel {...defaultProps} currentLove={1} />);
    
    const trainButtons = screen.getAllByText(/Train \(/);
    trainButtons.forEach(button => {
      expect(button.closest('button')).toBeDisabled();
    });
  });

  test('enables train button when player can afford it', () => {
    render(<SkillsPanel {...defaultProps} currentLove={1000} />);
    
    const trainButtons = screen.getAllByText(/Train \(/);
    trainButtons.forEach(button => {
      expect(button.closest('button')).not.toBeDisabled();
    });
  });

  test('shows level indicators for skills', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    // Should show level indicators for skills
    const levelElements = document.querySelectorAll('.skill-level-indicator');
    expect(levelElements.length).toBeGreaterThan(0);
  });

  test('shows max level indicator for mastered skills', () => {
    const maxedSkillProps = {
      ...defaultProps,
      skillLevels: { petting_technique: 5 }, // Max level for petting (5 levels)
      skillIncrements: { petting_technique: { 0: 4, 1: 5, 2: 5, 3: 4, 4: 4 } }, // All increments completed
      skillAttempts: { petting_technique: undefined },
    };
    
    render(<SkillsPanel {...maxedSkillProps} />);
    
    expect(screen.getByText('Mastered')).toBeInTheDocument();
  });

  test('does not show train button for mastered skills', () => {
    const maxedSkillProps = {
      ...defaultProps,
      skillLevels: { petting_technique: 5 }, // Max level
      skillIncrements: { petting_technique: { 0: 4, 1: 5, 2: 5, 3: 4, 4: 4 } },
      skillAttempts: { petting_technique: undefined },
    };
    
    render(<SkillsPanel {...maxedSkillProps} />);
    
    // Petting technique should not have a train button
    const pettingCard = screen.getByText('Petting Technique').closest('.skill-card-compact');
    expect(pettingCard?.querySelector('button[class*="train-btn"]')).toBeNull();
  });

  test('handles missing skill data gracefully', () => {
    const emptyProps = {
      skillLevels: {},
      skillIncrements: {},
      skillAttempts: {},
      onSkillTrain: vi.fn(),
      currentLove: 100,
    };
    
    render(<SkillsPanel {...emptyProps} />);
    
    // Should still render all skills, but with default values
    expect(screen.getByText('Petting Technique')).toBeInTheDocument();
    expect(screen.getAllByText('Untrained')).toHaveLength(6);
  });

  test('shows correct skill effect types for different skills', () => {
    const highLevelProps = {
      ...defaultProps,
      skillLevels: {
        petting_technique: 1,    // Level 1: +2 ❤️/pet (1 * 2)
        wand_technique: 2,       // Level 2: +6 ❤️/pounce (2 * 3)  
        interior_design: 2,      // Level 2: +20% furniture ❤️ (2 * 0.1 = 0.2 = 20%)
        food_prep: 2,           // Level 2: +30% feeding effect (2 * 0.15 = 0.3 = 30%)
        work_ethic: 2,          // Level 2: +40% training XP (2 * 0.2 = 0.4 = 40%)
        work_smarts: 1,         // Level 1: +10% job treats (1 * 0.1 = 0.1 = 10%)
      },
      skillIncrements: {
        petting_technique: { 0: 4 }, // Level 1 completed
        wand_technique: { 0: 4, 1: 4 }, // Level 2 completed
        interior_design: { 0: 4, 1: 4 }, // Level 2 completed
        food_prep: { 0: 4, 1: 4 }, // Level 2 completed
        work_ethic: { 0: 4, 1: 4 }, // Level 2 completed
        work_smarts: { 0: 4 }, // Level 1 completed
      },
      skillAttempts: {},
    };
    
    render(<SkillsPanel {...highLevelProps} />);
    
    // Check for the effect values and units separately due to SVG icons (use getAllByText for repeated values)
    const twoEffects = screen.getAllByText('+2', { exact: false });
    expect(twoEffects.length).toBeGreaterThan(0); // Should find "+2" in effects
    expect(screen.getByText('/pet', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('+6', { exact: false })).toBeInTheDocument(); 
    expect(screen.getByText('/pounce', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('+20%', { exact: false })).toBeInTheDocument(); // furniture_love_multiplier 
    expect(screen.getByText('+30%', { exact: false })).toBeInTheDocument(); // feeding_effect_multiplier
    expect(screen.getByText('+40%', { exact: false })).toBeInTheDocument(); // training_experience_multiplier
    expect(screen.getByText('+10%', { exact: false })).toBeInTheDocument(); // job_treats_multiplier
  });

  test('train button has correct title attribute', () => {
    render(<SkillsPanel {...defaultProps} />);
    
    const trainButton = screen.getAllByText(/Train \(/)[0].closest('button');
    expect(trainButton).toHaveAttribute('title', expect.stringContaining('Train'));
    expect(trainButton).toHaveAttribute('title', expect.stringContaining('love'));
  });
});