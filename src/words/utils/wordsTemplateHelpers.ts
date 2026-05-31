import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../../shared/rhythm/types';
import {
  findRhythmTemplatePresetByNotation,
  getRhythmTemplatePresets,
  getTemplatePresetVariationIndex,
  getTemplatePresetVariations,
} from '../../shared/rhythm/presetDatabase';
import { BACKING_FALLBACK_TEMPLATE, TEMPLATE_PRESETS } from './wordsAppDefaults';
import type { EffectiveSection, SectionRenderPlan } from './wordsSectionPlans';

export type TemplatePresetOption = {
  id: string;
  label: string;
  notation: string;
};

export function buildTemplatePresets(
  timeSignature: TimeSignature
): TemplatePresetOption[] {
  return getRhythmTemplatePresets(timeSignature).map((preset) => ({
    id: preset.id,
    label: preset.label,
    notation: preset.notation,
  }));
}

export function findTemplatePresetByNotation(
  value: string,
  timeSignature: TimeSignature
): TemplatePresetOption | undefined {
  const preset = findRhythmTemplatePresetByNotation(value, timeSignature);
  if (!preset) return undefined;
  return {
    id: preset.id,
    label: preset.label,
    notation: preset.notation,
  };
}

export function buildTemplateNotationPool(
  templatePresets: TemplatePresetOption[],
  timeSignature: TimeSignature
): string[] {
  const allNotations: string[] = [];
  templatePresets.forEach((preset) => {
    const variations = getTemplatePresetVariations(preset.id, timeSignature);
    if (variations.length > 0) {
      variations.forEach((variation) => allNotations.push(variation.notation));
    } else {
      allNotations.push(preset.notation);
    }
  });
  const unique = [...new Set(allNotations)];
  return unique.length > 0
    ? unique
    : [templatePresets[0]?.notation ?? BACKING_FALLBACK_TEMPLATE];
}

export function buildBackingTemplateState(
  backingBeatNotation: string,
  timeSignature: TimeSignature,
  findTemplatePresetByNotation: (notation: string) => TemplatePresetOption | undefined
) {
  const backingSelectedTemplatePreset =
    findTemplatePresetByNotation(backingBeatNotation);
  const backingTemplateVariations = backingSelectedTemplatePreset
    ? getTemplatePresetVariations(backingSelectedTemplatePreset.id, timeSignature)
    : [];
  const backingActiveVariationIndex = backingSelectedTemplatePreset
    ? getTemplatePresetVariationIndex(
        backingSelectedTemplatePreset.id,
        backingBeatNotation,
        timeSignature
      )
    : -1;
  return {
    backingSelectedTemplatePreset,
    backingTemplateVariations,
    backingActiveVariationIndex,
  };
}

export function buildBackingPatternRhythm(params: {
  backingBeatEnabled: boolean;
  backingBeatUseTemplate: boolean;
  backingBeatNotation: string;
  timeSignature: TimeSignature;
  effectiveSections: EffectiveSection[];
  templatePresets: TemplatePresetOption[];
}) {
  const {
    backingBeatEnabled,
    backingBeatUseTemplate,
    backingBeatNotation,
    timeSignature,
    effectiveSections,
    templatePresets,
  } = params;
  if (!backingBeatEnabled) return null;
  if (!backingBeatUseTemplate) {
    const parsed = parseRhythm(
      backingBeatNotation || BACKING_FALLBACK_TEMPLATE,
      timeSignature
    );
    return parsed.isValid && parsed.measures.length > 0 ? parsed : null;
  }
  const sourceTemplate =
    effectiveSections[0]?.effectiveTemplateNotation ||
    templatePresets[0]?.notation ||
    TEMPLATE_PRESETS[0]?.notation ||
    BACKING_FALLBACK_TEMPLATE;
  const parsed = parseRhythm(sourceTemplate, timeSignature);
  return parsed.isValid && parsed.measures.length > 0 ? parsed : null;
}

export function buildBackingTemplateMeasureMap(params: {
  backingBeatEnabled: boolean;
  backingBeatUseTemplate: boolean;
  sectionRenderPlans: SectionRenderPlan[];
  timeSignature: TimeSignature;
}): Map<number, Array<{ durationInSixteenths: number; sound: string }>> {
  const map = new Map<
    number,
    Array<{ durationInSixteenths: number; sound: string }>
  >();
  const { backingBeatEnabled, backingBeatUseTemplate, sectionRenderPlans, timeSignature } =
    params;
  if (!backingBeatEnabled || !backingBeatUseTemplate) return map;
  sectionRenderPlans.forEach((plan) => {
    const parsed = parseRhythm(
      plan.section.effectiveTemplateNotation || BACKING_FALLBACK_TEMPLATE,
      timeSignature
    );
    if (!parsed.isValid || parsed.measures.length === 0) return;
    for (let localOffset = 0; localOffset < plan.totalMeasureCount; localOffset += 1) {
      const templateMeasure =
        parsed.measures[localOffset % parsed.measures.length];
      map.set(plan.startMeasure + localOffset, templateMeasure.notes);
    }
  });
  return map;
}
