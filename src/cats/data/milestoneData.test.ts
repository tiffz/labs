import { describe, test, expect } from 'vitest';
import { allMilestones } from './milestoneData';
import type { Milestone } from './milestoneData';

describe('milestoneData', () => {
  test('all milestones have required fields', () => {
    allMilestones.forEach((milestone) => {
      expect(milestone).toHaveProperty('id');
      expect(milestone).toHaveProperty('title');
      expect(milestone).toHaveProperty('description');
      // Note: milestones don't have a type property, they're implicitly type 'milestone'
      expect(milestone).toHaveProperty('target');
      expect(milestone).toHaveProperty('icon');
      expect(milestone).toHaveProperty('color');
      
      expect(typeof milestone.id).toBe('string');
      expect(typeof milestone.title).toBe('string');
      expect(typeof milestone.description).toBe('string');
      expect(typeof milestone.icon).toBe('string');
      expect(typeof milestone.color).toBe('string');
      
      expect(milestone.id.length).toBeGreaterThan(0);
      expect(milestone.title.length).toBeGreaterThan(0);
      expect(milestone.description.length).toBeGreaterThan(0);
    });
  });

  test('all milestone IDs are unique', () => {
    const ids = allMilestones.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all milestone targets are valid', () => {
    allMilestones.forEach((milestone) => {
      // Milestones can have different target types (currencyType/amount, jobLevel, thingId, etc.)
      expect(milestone.target).toBeTruthy();
      
      if (milestone.target.currencyType) {
        expect(['love', 'treats'].includes(milestone.target.currencyType)).toBe(true);
      }
      if (milestone.target.amount) {
        expect(typeof milestone.target.amount).toBe('number');
        expect(milestone.target.amount).toBeGreaterThan(0);
      }
    });
  });

  test('milestones have proper progression within groups', () => {
    const groups = new Map<string, Milestone[]>();
    
    allMilestones.forEach(milestone => {
      const groupKey = `${milestone.target.currencyType}_${milestone.type}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(milestone);
    });

    groups.forEach((groupMilestones) => {
      if (groupMilestones.length > 1) {
        groupMilestones.sort((a, b) => (a.target.amount || 0) - (b.target.amount || 0));
        
        for (let i = 1; i < groupMilestones.length; i++) {
          if (groupMilestones[i].target.amount && groupMilestones[i - 1].target.amount) {
            expect(groupMilestones[i].target.amount).toBeGreaterThan(
              groupMilestones[i - 1].target.amount!
            );
          }
        }
      }
    });
  });

  test('milestone rewards are appropriate', () => {
    allMilestones.forEach((milestone) => {
      if (milestone.reward) {
        if (milestone.reward.love) {
          expect(typeof milestone.reward.love).toBe('number');
          expect(milestone.reward.love).toBeGreaterThan(0);
        }
        if (milestone.reward.treats) {
          expect(typeof milestone.reward.treats).toBe('number');
          expect(milestone.reward.treats).toBeGreaterThan(0);
        }
      }
    });
  });

  test('milestones exist', () => {
    expect(allMilestones.length).toBeGreaterThan(0);
  });

  test('love milestones have proper progression', () => {
    const loveMilestones = allMilestones
      .filter(m => m.target.currencyType === 'love')
      .sort((a, b) => (a.target.amount || 0) - (b.target.amount || 0));

    expect(loveMilestones.length).toBeGreaterThan(0);
    
    // Check that we have reasonable progression (e.g., 10, 100, 1000, etc.)
    const amounts = loveMilestones.map(m => m.target.amount).filter(Boolean);
    expect(amounts).toContain(10);
    expect(amounts).toContain(100);
    expect(amounts).toContain(1000);
  });

  test('treat milestones have proper progression', () => {
    const treatMilestones = allMilestones
      .filter(m => m.target.currencyType === 'treats')
      .sort((a, b) => (a.target.amount || 0) - (b.target.amount || 0));

    expect(treatMilestones.length).toBeGreaterThan(0);
    
    // Check that we have reasonable progression
    const amounts = treatMilestones.map(m => m.target.amount).filter(Boolean);
    expect(amounts).toContain(10);
    expect(amounts).toContain(100);
    expect(amounts).toContain(1000);
  });

  test('job and thing milestones exist', () => {
    const jobMilestones = allMilestones.filter(m => m.target.jobLevel);
    const thingMilestones = allMilestones.filter(m => m.target.thingId);

    expect(jobMilestones.length).toBeGreaterThan(0);
    expect(thingMilestones.length).toBeGreaterThan(0);
  });

  test('milestone colors are valid CSS colors', () => {
    allMilestones.forEach((milestone) => {
      // Should be either a hex color, named color, or valid CSS color
      expect(typeof milestone.color).toBe('string');
      expect(milestone.color.length).toBeGreaterThan(0);
      // Basic validation - should start with # for hex or be a known CSS color name
      expect(
        milestone.color.startsWith('#') || 
        /^[a-zA-Z]+$/.test(milestone.color) ||
        milestone.color.startsWith('rgb') ||
        milestone.color.startsWith('hsl')
      ).toBe(true);
    });
  });

  test('milestone icons are valid Material Design icons', () => {
    allMilestones.forEach((milestone) => {
      // Should be non-empty string (specific icon validation would require Material Icons list)
      expect(typeof milestone.icon).toBe('string');
      expect(milestone.icon.length).toBeGreaterThan(0);
      // Should not contain spaces or special characters (basic validation)
      expect(/^[a-z_]+$/.test(milestone.icon)).toBe(true);
    });
  });
});