import { describe, test, expect } from 'vitest';
import { gameMerits } from './meritData';

describe('meritData', () => {
  test('all merits have required fields', () => {
    gameMerits.forEach((merit) => {
      expect(merit).toHaveProperty('id');
      expect(merit).toHaveProperty('title');
      expect(merit).toHaveProperty('description');
      expect(merit).toHaveProperty('type');
      expect(merit).toHaveProperty('icon');
      expect(merit).toHaveProperty('color');
      
      expect(typeof merit.id).toBe('string');
      expect(typeof merit.title).toBe('string');
      expect(typeof merit.description).toBe('string');
      expect(typeof merit.icon).toBe('string');
      expect(typeof merit.color).toBe('string');
      
      expect(merit.id.length).toBeGreaterThan(0);
      expect(merit.title.length).toBeGreaterThan(0);
      expect(merit.description).toBeDefined();
      expect(typeof merit.description).toBe('string');
      expect(merit.icon.length).toBeGreaterThan(0);
      expect(merit.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  test('all merit IDs are unique', () => {
    const ids = gameMerits.map(merit => merit.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('merit types are valid', () => {
    const validTypes = [
      'love_milestone',
      'treats_milestone', 
      'job_achievement',
      'purchase_achievement',
      'promotion_milestone'
    ];
    
    gameMerits.forEach((merit) => {
      expect(validTypes).toContain(merit.type);
    });
  });

  test('love milestone merits have correct target structure', () => {
    const loveMerits = gameMerits.filter(m => m.type === 'love_milestone');
    
    loveMerits.forEach((merit) => {
      expect(merit.target).toBeDefined();
      expect(merit.target?.currencyType).toBe('love');
      expect(merit.target?.amount).toBeGreaterThan(0);
      expect(typeof merit.target?.amount).toBe('number');
    });
  });

  test('treats milestone merits have correct target structure', () => {
    const treatsMerits = gameMerits.filter(m => m.type === 'treats_milestone');
    
    treatsMerits.forEach((merit) => {
      expect(merit.target).toBeDefined();
      expect(merit.target?.currencyType).toBe('treats');
      expect(merit.target?.amount).toBeGreaterThan(0);
      expect(typeof merit.target?.amount).toBe('number');
    });
  });

  test('promotion milestone merits have correct target structure', () => {
    const promotionMerits = gameMerits.filter(m => m.type === 'promotion_milestone');
    
    promotionMerits.forEach((merit) => {
      expect(merit.target).toBeDefined();
      expect(merit.target?.jobLevel).toBeGreaterThan(0);
      expect(typeof merit.target?.jobLevel).toBe('number');
    });
  });

  test('purchase achievement merits have correct target structure', () => {
    const purchaseMerits = gameMerits.filter(m => m.type === 'purchase_achievement');
    
    purchaseMerits.forEach((merit) => {
      expect(merit.target).toBeDefined();
      expect(merit.target?.thingId).toBeDefined();
      expect(typeof merit.target?.thingId).toBe('string');
      expect(merit.target?.thingId!.length).toBeGreaterThan(0);
    });
  });

  test('job achievement merits have correct target structure', () => {
    const jobMerits = gameMerits.filter(m => m.type === 'job_achievement');
    
    jobMerits.forEach((merit) => {
      expect(merit.target).toBeDefined();
      expect(merit.target?.jobId).toBeDefined();
      expect(typeof merit.target?.jobId).toBe('string');
      expect(merit.target?.jobId!.length).toBeGreaterThan(0);
    });
  });

  test('merit rewards are properly structured when present', () => {
    const meritsWithRewards = gameMerits.filter(m => m.reward);
    
    meritsWithRewards.forEach((merit) => {
      const { reward } = merit;
      
      if (reward?.love !== undefined) {
        expect(typeof reward.love).toBe('number');
        expect(reward.love).toBeGreaterThan(0);
      }
      
      if (reward?.treats !== undefined) {
        expect(typeof reward.treats).toBe('number');
        expect(reward.treats).toBeGreaterThan(0);
      }
      
      if (reward?.message !== undefined) {
        expect(typeof reward.message).toBe('string');
        expect(reward.message.length).toBeGreaterThan(0);
      }
    });
  });

  test('notification data is properly structured when present', () => {
    const meritsWithNotifications = gameMerits.filter(m => m.notification);
    
    meritsWithNotifications.forEach((merit) => {
      const { notification } = merit;
      
      if (notification?.title !== undefined) {
        expect(typeof notification.title).toBe('string');
        expect(notification.title.length).toBeGreaterThan(0);
      }
      
      if (notification?.message !== undefined) {
        expect(typeof notification.message).toBe('string');
        expect(notification.message.length).toBeGreaterThan(0);
      }
    });
  });

  test('merit data does not contain isEarned property', () => {
    gameMerits.forEach((merit) => {
      expect(merit).not.toHaveProperty('isEarned');
    });
  });

  test('merit progression makes sense', () => {
    // Test love milestones are in ascending order
    const loveMerits = gameMerits
      .filter(m => m.type === 'love_milestone')
      .sort((a, b) => (a.target?.amount || 0) - (b.target?.amount || 0));
    
    for (let i = 1; i < loveMerits.length; i++) {
      const prev = loveMerits[i - 1].target?.amount || 0;
      const curr = loveMerits[i].target?.amount || 0;
      expect(curr).toBeGreaterThan(prev);
    }

    // Test treats milestones are in ascending order
    const treatsMerits = gameMerits
      .filter(m => m.type === 'treats_milestone')
      .sort((a, b) => (a.target?.amount || 0) - (b.target?.amount || 0));
    
    for (let i = 1; i < treatsMerits.length; i++) {
      const prev = treatsMerits[i - 1].target?.amount || 0;
      const curr = treatsMerits[i].target?.amount || 0;
      expect(curr).toBeGreaterThan(prev);
    }

    // Test promotion milestones are in ascending order
    const promotionMerits = gameMerits
      .filter(m => m.type === 'promotion_milestone')
      .sort((a, b) => (a.target?.jobLevel || 0) - (b.target?.jobLevel || 0));
    
    for (let i = 1; i < promotionMerits.length; i++) {
      const prev = promotionMerits[i - 1].target?.jobLevel || 0;
      const curr = promotionMerits[i].target?.jobLevel || 0;
      expect(curr).toBeGreaterThan(prev);
    }
  });

  test('has expected number of merits by type', () => {
    const meritsByType = {
      love_milestone: gameMerits.filter(m => m.type === 'love_milestone'),
      treats_milestone: gameMerits.filter(m => m.type === 'treats_milestone'),
      job_achievement: gameMerits.filter(m => m.type === 'job_achievement'),
      purchase_achievement: gameMerits.filter(m => m.type === 'purchase_achievement'),
      promotion_milestone: gameMerits.filter(m => m.type === 'promotion_milestone')
    };

    // Should have reasonable progression of milestones
    expect(meritsByType.love_milestone.length).toBeGreaterThanOrEqual(3);
    expect(meritsByType.treats_milestone.length).toBeGreaterThanOrEqual(3);
    expect(meritsByType.job_achievement.length).toBeGreaterThanOrEqual(1);
    expect(meritsByType.purchase_achievement.length).toBeGreaterThanOrEqual(2);
    expect(meritsByType.promotion_milestone.length).toBeGreaterThanOrEqual(2);
  });
});