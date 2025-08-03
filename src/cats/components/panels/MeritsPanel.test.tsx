import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import MeritsPanel from './MeritsPanel';
import type { Merit } from '../../data/meritData';

// Mock MaterialIcon component
vi.mock('../../icons/MaterialIcon', () => ({
  default: ({ icon, className }: { icon: string; className?: string }) => 
    <span className={className} data-testid={`icon-${icon}`}>{icon}</span>
}));

// Mock HeartIcon and FishIcon components
vi.mock('../../icons/HeartIcon', () => ({
  default: ({ className }: { className?: string }) => 
    <span className={className} data-testid="heart-icon">♥</span>
}));

vi.mock('../../icons/FishIcon', () => ({
  default: ({ className }: { className?: string }) => 
    <span className={className} data-testid="fish-icon">🐟</span>
}));

const createMockMerit = (overrides: Partial<Merit> = {}): Merit => ({
  id: 'test_merit',
  title: 'Test Merit',
  description: 'A test merit for testing purposes',
  type: 'love_milestone',
  target: { currencyType: 'love', amount: 100 },
  reward: { love: 10, message: 'Test reward message' },
  icon: 'favorite',
  color: '#e8a1c4',
  ...overrides
});

describe('MeritsPanel', () => {
  test('renders with correct tabs and defaults to Upgrades', () => {
    const earnedMerits = [createMockMerit({ id: 'earned_1' })];
    const availableMerits = [createMockMerit({ id: 'available_1' })];

    render(
      <MeritsPanel 
        earnedMerits={earnedMerits} 
        availableMerits={availableMerits}
        spentMerits={{}}
        onPurchaseUpgrade={() => {}}
      />
    );

    // Check tabs are present
    expect(screen.getByText('Upgrades')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
    
    // Check achievement count is displayed
    expect(screen.getByText('(1/2)')).toBeInTheDocument();
    
    // Check it defaults to Upgrades tab (should show upgrade content)
    expect(screen.getByText('Gentle Touch')).toBeInTheDocument();
  });

  test('switches to Achievements tab when clicked', () => {
    const earnedMerits = [
      createMockMerit({ id: 'earned_1', title: 'Earned Merit' })
    ];
    const availableMerits = [
      createMockMerit({ id: 'available_1', title: 'Available Merit' })
    ];

    render(
      <MeritsPanel 
        earnedMerits={earnedMerits} 
        availableMerits={availableMerits}
        spentMerits={{}}
        onPurchaseUpgrade={() => {}}
      />
    );

    // Click on Achievements tab
    fireEvent.click(screen.getByText('Achievements'));

    // Check that achievement badges are displayed
    expect(screen.getByText('Earned Merit')).toBeInTheDocument();
    expect(screen.getByText('Available Merit')).toBeInTheDocument();
  });

  test('shows merit upgrade counter chip', () => {
    const earnedMerits = [createMockMerit({ id: 'earned_1' })];
    const availableMerits = [];

    const { container } = render(
      <MeritsPanel 
        earnedMerits={earnedMerits} 
        availableMerits={availableMerits}
        spentMerits={{}}
        onPurchaseUpgrade={() => {}}
      />
    );

    // Check the merit counter chip shows correct count (1 earned - 0 spent = 1)
    const counterChip = container.querySelector('.upgrades-available-info');
    expect(counterChip).toHaveTextContent('1');
    expect(counterChip?.querySelector('[data-testid="icon-kid_star"]')).toBeInTheDocument();
  });

  test('displays upgrade cards with correct information', () => {
    const earnedMerits = [createMockMerit({ id: 'earned_1' })];
    const availableMerits = [];

    render(
      <MeritsPanel 
        earnedMerits={earnedMerits} 
        availableMerits={availableMerits}
        spentMerits={{}}
        onPurchaseUpgrade={() => {}}
      />
    );

    // Check upgrade cards are displayed
    expect(screen.getByText('Gentle Touch')).toBeInTheDocument();
    expect(screen.getByText('Play Master')).toBeInTheDocument();
    expect(screen.getByText('Home Designer')).toBeInTheDocument();
    expect(screen.getByText('Nutrition Expert')).toBeInTheDocument();
    expect(screen.getByText('Work Ethic')).toBeInTheDocument();

    // Check buy buttons are present
    expect(screen.getAllByText(/Buy \(1\)/)).toHaveLength(5);
  });

  test('calls onPurchaseUpgrade when upgrade button is clicked', () => {
    const earnedMerits = [createMockMerit({ id: 'earned_1' })];
    const availableMerits = [];
    const mockPurchase = vi.fn();

    render(
      <MeritsPanel 
        earnedMerits={earnedMerits} 
        availableMerits={availableMerits}
        spentMerits={{}}
        onPurchaseUpgrade={mockPurchase}
      />
    );

    // Click the first buy button (should be enabled since we have 1 merit available)
    const buyButtons = screen.getAllByText(/Buy \(1\)/);
    fireEvent.click(buyButtons[0]);

    expect(mockPurchase).toHaveBeenCalledWith('love_per_pet_multiplier');
  });

  test('shows achievement badges with correct CSS classes when on Achievements tab', () => {
    const earnedMerits = [
      createMockMerit({ id: 'earned_1', title: 'Earned Merit' })
    ];
    const availableMerits = [
      createMockMerit({ id: 'available_1', title: 'Available Merit' })
    ];

    const { container } = render(
      <MeritsPanel 
        earnedMerits={earnedMerits} 
        availableMerits={availableMerits}
        spentMerits={{}}
        onPurchaseUpgrade={() => {}}
      />
    );

    // Switch to Achievements tab
    fireEvent.click(screen.getByText('Achievements'));

    const earnedBadge = container.querySelector('.merit-badge.earned');
    const lockedBadge = container.querySelector('.merit-badge.locked');

    expect(earnedBadge).toBeInTheDocument();
    expect(lockedBadge).toBeInTheDocument();
  });

  test('shows merit breakdown tooltip on counter hover', () => {
    const earnedMerits = [
      createMockMerit({ id: 'earned_1' }),
      createMockMerit({ id: 'earned_2' }),
      createMockMerit({ id: 'earned_3' })
    ];
    const availableMerits = [];
    const spentMerits = { love_per_pet_multiplier: 1 }; // Spent 1 merit (cost = 1)

    render(
      <MeritsPanel 
        earnedMerits={earnedMerits} 
        availableMerits={availableMerits}
        spentMerits={spentMerits}
        onPurchaseUpgrade={() => {}}
      />
    );

    // Should have 3 earned - 1 spent = 2 available  
    const meritCounter = document.querySelector('.upgrades-available-info');
    expect(meritCounter).toHaveTextContent('2');
    fireEvent.mouseEnter(meritCounter!);

    // Check tooltip appears with breakdown
    expect(screen.getByText('Merit Points')).toBeInTheDocument();
    expect(screen.getByText('Total Earned:')).toBeInTheDocument();
    expect(screen.getByText('Spent on Upgrades:')).toBeInTheDocument();
    expect(screen.getByText('Available:')).toBeInTheDocument();
  });
});