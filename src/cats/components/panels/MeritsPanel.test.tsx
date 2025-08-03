import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import MeritsPanel from './MeritsPanel';

// Mock MaterialIcon component
vi.mock('../../icons/MaterialIcon', () => ({
  default: ({ icon, className }: { icon: string; className?: string }) => 
    <span className={className} data-testid={`icon-${icon}`}>{icon}</span>
}));

// Mock child panels
vi.mock('./UpgradePanel', () => ({
  default: ({ availableMerits }: { availableMerits: number }) => 
    <div data-testid="upgrade-panel">Upgrades Panel - Available: {availableMerits}</div>
}));

vi.mock('./MilestonePanel', () => ({
  default: () => <div data-testid="milestone-panel">Milestones Panel</div>
}));

vi.mock('./AwardPanel', () => ({
  default: () => <div data-testid="award-panel">Awards Panel</div>
}));



const defaultProps = {
  earnedMerits: [],
  availableMerits: [],
  earnedAwards: [],
  availableAwards: [],
  spentMerits: {},
  onPurchaseUpgrade: vi.fn(),
  currentLove: 0,
  currentTreats: 0,
  currentJobLevels: {},
  currentThingQuantities: {},
  specialActions: {
    noseClicks: 0,
    happyJumps: 0,
    earClicks: 0,
    cheekPets: 0
  }
};

describe('MeritsPanel', () => {
  test('renders all three tabs', () => {
    render(<MeritsPanel {...defaultProps} />);
    
    expect(screen.getByText('Upgrades')).toBeInTheDocument();
    expect(screen.getByText('Milestones')).toBeInTheDocument();
    expect(screen.getByText('Awards')).toBeInTheDocument();
  });

  test('starts with Upgrades tab active', () => {
    render(<MeritsPanel {...defaultProps} />);
    
    expect(document.querySelector('.merit-upgrades-section')).toBeInTheDocument();
    expect(screen.queryByTestId('milestone-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('award-panel')).not.toBeInTheDocument();
  });

  test('switches to Milestones tab when clicked', () => {
    render(<MeritsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Milestones'));
    
    expect(screen.getByTestId('milestone-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('upgrade-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('award-panel')).not.toBeInTheDocument();
  });

  test('switches to Awards tab when clicked', () => {
    render(<MeritsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Awards'));
    
    expect(screen.getByTestId('award-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('upgrade-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('milestone-panel')).not.toBeInTheDocument();
  });

  test('displays merit count for Upgrades tab', () => {
    const props = {
      ...defaultProps,
      earnedMerits: [
        { id: 'm1', title: 'M1', description: '', type: 'milestone' as const, target: { currencyType: 'love' as const, amount: 10 }, icon: 'favorite', color: 'red' },
        { id: 'm2', title: 'M2', description: '', type: 'milestone' as const, target: { currencyType: 'love' as const, amount: 100 }, icon: 'favorite', color: 'red' }
      ],
      spentMerits: { 'upgrade1': 1 } // 1 merit spent
    };

    render(<MeritsPanel {...props} />);
    
    // Should show available merits in the badge
    expect(document.querySelector('.available-badge')).toBeInTheDocument();
  });

  test('displays milestone count', () => {
    const props = {
      ...defaultProps,
      availableMerits: [
        { id: 'm1', title: 'M1', description: '', type: 'milestone' as const, target: { currencyType: 'love' as const, amount: 10 }, icon: 'favorite', color: 'red' },
        { id: 'm2', title: 'M2', description: '', type: 'milestone' as const, target: { currencyType: 'love' as const, amount: 100 }, icon: 'favorite', color: 'red' }
      ],
      earnedMerits: [
        { id: 'm1', title: 'M1', description: '', type: 'milestone' as const, target: { currencyType: 'love' as const, amount: 10 }, icon: 'favorite', color: 'red' }
      ]
    };

    render(<MeritsPanel {...props} />);
    
    fireEvent.click(screen.getByText('Milestones'));
    // Should show milestone count in format (earned/total)
    expect(screen.getByText('Milestones').closest('button')?.querySelector('.achievement-count')).toBeInTheDocument();
  });

  test('displays award count', () => {
    const props = {
      ...defaultProps,
      availableAwards: [
        { id: 'a1', title: 'A1', description: '', type: 'special_action' as const, target: { actionType: 'nose_click' as const, count: 1 }, icon: 'star', color: 'gold', isSecret: true },
        { id: 'a2', title: 'A2', description: '', type: 'special_action' as const, target: { actionType: 'happy_jump' as const, count: 1 }, icon: 'star', color: 'gold', isSecret: true }
      ],
      earnedAwards: [
        { id: 'a1', title: 'A1', description: '', type: 'special_action' as const, target: { actionType: 'nose_click' as const, count: 1 }, icon: 'star', color: 'gold', isSecret: true }
      ]
    };

    render(<MeritsPanel {...props} />);
    
    fireEvent.click(screen.getByText('Awards'));
    // Should show award count in format (earned/total)
    expect(screen.getByText('Awards').closest('button')?.querySelector('.achievement-count')).toBeInTheDocument();
  });

  test('handles zero counts gracefully', () => {
    render(<MeritsPanel {...defaultProps} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('displays upgrade interface', () => {
    const props = {
      ...defaultProps,
      earnedMerits: [
        { id: 'm1', title: 'M1', description: '', type: 'milestone' as const, target: { currencyType: 'love' as const, amount: 10 }, icon: 'favorite', color: 'red' }
      ]
    };

    render(<MeritsPanel {...props} />);
    
    // Should show upgrades section when on upgrades tab
    expect(document.querySelector('.merit-upgrades-section')).toBeInTheDocument();
  });

  test('applies correct CSS classes for active tab', () => {
    render(<MeritsPanel {...defaultProps} />);
    
    const upgradesTab = screen.getByText('Upgrades').closest('button');
    const milestonesTab = screen.getByText('Milestones').closest('button');
    
    expect(upgradesTab).toHaveClass('active');
    expect(milestonesTab).not.toHaveClass('active');
    
    fireEvent.click(screen.getByText('Milestones'));
    
    expect(upgradesTab).not.toHaveClass('active');
    expect(milestonesTab).toHaveClass('active');
  });

  test('displays icons for each tab', () => {
    render(<MeritsPanel {...defaultProps} />);
    
    expect(screen.getAllByTestId('icon-kid_star').length).toBeGreaterThan(0); // Upgrades (appears in multiple places)
    expect(screen.getByTestId('icon-timeline')).toBeInTheDocument(); // Milestones  
    expect(screen.getByTestId('icon-emoji_events')).toBeInTheDocument(); // Awards
  });

  test('handles large numbers in tab counters', () => {
    const props = {
      ...defaultProps,
      earnedMerits: new Array(1000).fill(0).map((_, i) => ({
        id: `m${i}`,
        title: `M${i}`,
        description: '',
        type: 'milestone' as const,
        target: { currencyType: 'love' as const, amount: 10 * (i + 1) },
        icon: 'favorite',
        color: 'red'
      })),
      spentMerits: Object.fromEntries(new Array(500).fill(0).map((_, i) => [`upgrade${i}`, 1])),
      availableMerits: new Array(50).fill(0).map((_, i) => ({
        id: `m${i}`,
        title: `M${i}`,
        description: '',
        type: 'milestone' as const,
        target: { currencyType: 'love' as const, amount: 10 * (i + 1) },
        icon: 'favorite',
        color: 'red'
      }))
    };

    render(<MeritsPanel {...props} />);
    
    expect(screen.getAllByText('500').length).toBeGreaterThan(0); // Available merits: 1000 - 500 = 500 (appears in badge and info)
    
    fireEvent.click(screen.getByText('Milestones'));
    // Should show milestone count
    expect(screen.getByText('Milestones').closest('button')?.querySelector('.achievement-count')).toBeInTheDocument();
  });
});