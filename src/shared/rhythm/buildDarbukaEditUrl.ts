import type { TimeSignature } from './types';

export const DARBUKA_TRAINER_LINK_TOOLTIP = 'Customize in Darbuka trainer';

export type DarbukaTrainerLinkParams = {
  notation?: string;
  bpm?: number;
  timeSignature?: TimeSignature;
  metronomeEnabled?: boolean;
};

export function buildDarbukaEditUrl(params: {
  notation: string;
  timeSignature: TimeSignature;
  bpm?: number;
  metronomeEnabled?: boolean;
}): string {
  const urlParams = new URLSearchParams();
  urlParams.set('rhythm', params.notation);
  urlParams.set('time', `${params.timeSignature.numerator}/${params.timeSignature.denominator}`);
  if (typeof params.bpm === 'number') {
    urlParams.set('bpm', String(Math.round(params.bpm)));
  }
  if (params.metronomeEnabled) {
    urlParams.set('metronome', 'true');
  }
  return `/drums/?${urlParams.toString()}`;
}

export function resolveDarbukaTrainerHref(
  href: string | null | undefined,
  params: DarbukaTrainerLinkParams | undefined,
): string | null {
  if (href) return href;
  if (!params?.notation) return null;
  return buildDarbukaEditUrl({
    notation: params.notation,
    bpm: params.bpm,
    timeSignature: params.timeSignature ?? { numerator: 4, denominator: 4 },
    metronomeEnabled: params.metronomeEnabled,
  });
}
