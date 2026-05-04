export type GuidedRegimen = 'rhythm' | 'accuracy' | 'performance';

export interface RegimenProfile {
  listenRate: number;
  listenSeconds: number;
  attemptRate: number;
}

export function regimenProfile(regimen: GuidedRegimen): RegimenProfile {
  switch (regimen) {
    case 'rhythm':
      return { listenRate: 0.85, listenSeconds: 14, attemptRate: 1 };
    case 'accuracy':
      return { listenRate: 0.55, listenSeconds: 22, attemptRate: 0.8 };
    case 'performance':
      return { listenRate: 1, listenSeconds: 12, attemptRate: 1 };
    default: {
      const _exhaustive: never = regimen;
      return _exhaustive;
    }
  }
}
