import { describe, expect, it } from 'vitest';
import {
  getRhythmPresetFamilies,
  getRhythmPresetGroups,
  RHYTHM_DATABASE,
} from './presetDatabase';

describe('getRhythmPresetFamilies', () => {
  it('nests Middle Eastern rhythms under family with meter subgroups', () => {
    const families = getRhythmPresetFamilies();
    const middleEastern = families.find((family) => family.id === 'middle-eastern');
    expect(middleEastern?.label).toBe('Middle Eastern');

    const me44 = middleEastern?.meterGroups.find((group) => group.meterLabel === '4/4');
    const me24 = middleEastern?.meterGroups.find((group) => group.meterLabel === '2/4');
    const me88 = middleEastern?.meterGroups.find((group) => group.meterLabel === '6/8');
    const meEightEight = middleEastern?.meterGroups.find((group) => group.meterLabel === '8/8');

    expect(me44?.presetIds.sort()).toEqual(['baladi', 'maqsum', 'saeidi'].sort());
    expect(me24?.presetIds).toEqual(['ayoub', 'daem']);
    expect(me88).toBeUndefined();
    expect(meEightEight?.presetIds.sort()).toEqual(['kahleegi', 'malfuf'].sort());
  });

  it('nests Common rhythms under family with meter subgroups', () => {
    const families = getRhythmPresetFamilies();
    const common = families.find((family) => family.id === 'common');
    expect(common?.label).toBe('Common');

    const common44 = common?.meterGroups.find((group) => group.meterLabel === '4/4');
    const common68 = common?.meterGroups.find((group) => group.meterLabel === '6/8');

    expect(common44?.presetIds.sort()).toEqual(['rockAndRoll', 'simple'].sort());
    expect(common68?.presetIds).toEqual(['simple68']);
  });

  it('covers every preset exactly once', () => {
    const families = getRhythmPresetFamilies();
    const ids = families.flatMap((family) =>
      family.meterGroups.flatMap((meter) => meter.presetIds),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(Object.keys(RHYTHM_DATABASE).sort());
  });
});

describe('getRhythmPresetGroups', () => {
  it('flattens families into type · meter labels', () => {
    const groups = getRhythmPresetGroups();
    expect(groups.some((group) => group.label === 'Middle Eastern · 4/4')).toBe(true);
    expect(groups.some((group) => group.label === 'Common · 6/8')).toBe(true);
  });
});
