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
  test('renders with correct title and count', () => {
    const earnedMerits = [createMockMerit({ id: 'earned_1' })];
    const availableMerits = [createMockMerit({ id: 'available_1' })];

    render(
      <MeritsPanel earnedMerits={earnedMerits} availableMerits={availableMerits} />
    );

    expect(screen.getByText('Achievements (1/2)')).toBeInTheDocument();
    expect(screen.getByTestId('icon-emoji_events')).toBeInTheDocument();
  });

  test('renders earned and available merits correctly', () => {
    const earnedMerits = [
      createMockMerit({ id: 'earned_1', title: 'Earned Merit' })
    ];
    const availableMerits = [
      createMockMerit({ id: 'available_1', title: 'Available Merit' })
    ];

    render(
      <MeritsPanel earnedMerits={earnedMerits} availableMerits={availableMerits} />
    );

    expect(screen.getByText('Earned Merit')).toBeInTheDocument();
    expect(screen.getByText('Available Merit')).toBeInTheDocument();
  });

  test('applies correct CSS classes for earned and locked merits', () => {
    const earnedMerits = [
      createMockMerit({ id: 'earned_1', title: 'Earned Merit' })
    ];
    const availableMerits = [
      createMockMerit({ id: 'available_1', title: 'Available Merit' })
    ];

    const { container } = render(
      <MeritsPanel earnedMerits={earnedMerits} availableMerits={availableMerits} />
    );

    const earnedBadge = container.querySelector('.merit-badge.earned');
    const lockedBadge = container.querySelector('.merit-badge.locked');

    expect(earnedBadge).toBeInTheDocument();
    expect(lockedBadge).toBeInTheDocument();
  });

  test('shows tooltip on hover', async () => {
    const earnedMerits = [
      createMockMerit({ 
        id: 'earned_1', 
        title: 'Test Merit',
        description: 'Test description',
        reward: { love: 10, treats: 5, message: 'Test reward' }
      })
    ];

    render(
      <MeritsPanel earnedMerits={earnedMerits} availableMerits={[]} />
    );

    const badge = screen.getByText('Test Merit');
    fireEvent.mouseEnter(badge.closest('.merit-badge-wrapper')!);

    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('✓ Earned')).toBeInTheDocument();
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    expect(screen.getByTestId('fish-icon')).toBeInTheDocument();
  });

  test('hides tooltip on mouse leave', () => {
    const earnedMerits = [
      createMockMerit({ 
        id: 'earned_1', 
        title: 'Test Merit',
        description: 'Test description'
      })
    ];

    render(
      <MeritsPanel earnedMerits={earnedMerits} availableMerits={[]} />
    );

    const badge = screen.getByText('Test Merit');
    const wrapper = badge.closest('.merit-badge-wrapper')!;
    
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('Test description')).toBeInTheDocument();
    
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  test('generates correct merit type descriptions', () => {
    const merits = [
      createMockMerit({ 
        id: 'love_merit',
        type: 'love_milestone', 
        target: { currencyType: 'love', amount: 100 },
        title: 'Love Merit'
      }),
      createMockMerit({ 
        id: 'treats_merit',
        type: 'treats_milestone', 
        target: { currencyType: 'treats', amount: 50 },
        title: 'Treats Merit'
      }),
      createMockMerit({ 
        id: 'job_merit',
        type: 'job_achievement',
        title: 'Job Merit'
      }),
      createMockMerit({ 
        id: 'promotion_merit',
        type: 'promotion_milestone', 
        target: { jobLevel: 5 },
        title: 'Promotion Merit'
      })
    ];

    render(
      <MeritsPanel earnedMerits={[]} availableMerits={merits} />
    );

    // Hover over each to see descriptions
    const badgeWrappers = screen.getAllByText(/Merit/).map(el => el.closest('.merit-badge-wrapper')!);
    
    fireEvent.mouseEnter(badgeWrappers[0]);
    expect(screen.getByText('Reach 100 love')).toBeInTheDocument();
    fireEvent.mouseLeave(badgeWrappers[0]);

    fireEvent.mouseEnter(badgeWrappers[1]);
    expect(screen.getByText('Earn 50 treats')).toBeInTheDocument();
    fireEvent.mouseLeave(badgeWrappers[1]);

    fireEvent.mouseEnter(badgeWrappers[2]);
    expect(screen.getByText('First job achievement')).toBeInTheDocument();
    fireEvent.mouseLeave(badgeWrappers[2]);

    fireEvent.mouseEnter(badgeWrappers[3]);
    expect(screen.getByText('Reach job level 5')).toBeInTheDocument();
  });

  test('applies custom CSS properties for merit colors', () => {
    const earnedMerits = [
      createMockMerit({ 
        id: 'earned_1', 
        title: 'Test Merit',
        color: '#ff0000'
      })
    ];

    const { container } = render(
      <MeritsPanel earnedMerits={earnedMerits} availableMerits={[]} />
    );

    const badgeCircle = container.querySelector('.badge-circle') as HTMLElement;
    const badgeInnerRing = container.querySelector('.badge-inner-ring') as HTMLElement;

    expect(badgeCircle?.style.getPropertyValue('--merit-color')).toBe('#ff0000');
    expect(badgeInnerRing?.style.getPropertyValue('--merit-color')).toBe('#ff0000');
    expect(badgeInnerRing?.style.getPropertyValue('--merit-color-light')).toBe('#ff000040');
  });

  test('handles empty merit lists gracefully', () => {
    render(<MeritsPanel earnedMerits={[]} availableMerits={[]} />);
    
    expect(screen.getByText('Achievements (0/0)')).toBeInTheDocument();
  });
});