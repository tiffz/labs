import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { generateCompareChallenge } from '../generators/compare';
import { generateBridgeChallenge } from '../generators/brokenBridge';
import { generateContextualMatchChallenge } from '../generators/contextualMatch';
import { generateGamutChallenge } from '../generators/gamutLandscape';
import { randomSeed } from '../generators/rng';
import CompareView from '../modules/compare/CompareView';
import ContextualMatcherView from '../modules/contextualMatcher/ContextualMatcherView';
import { initialContextualInput } from '../modules/contextualMatcher/contextualMatcherLogic';
import BrokenBridgeView from '../modules/brokenBridge/BrokenBridgeView';
import { initialBridgeSteps } from '../modules/brokenBridge/brokenBridgeLogic';
import GamutFinderView from '../modules/gamutFinder/GamutFinderView';
import { deformMask } from '../scoring/gamutOverlap';
import { colorStateToHex } from '../scoring/perceptualScore';
import type { ModuleId, SightChallenge } from '../types';
import type { WheelPoint } from '../scoring/gamutOverlap';

type SandboxModule = ModuleId;

function challengeForModule(module: SandboxModule, seed: number): SightChallenge {
  if (module === 'compare') return generateCompareChallenge(seed, 3);
  if (module === 'contextual') return generateContextualMatchChallenge(seed, 12);
  if (module === 'bridge') return generateBridgeChallenge(seed, 17);
  return generateGamutChallenge(seed, 19);
}

export default function SandboxPhase(): React.ReactElement {
  const [seed, setSeed] = useState(48291);
  const [module, setModule] = useState<SandboxModule>('contextual');
  const challenge = useMemo(() => challengeForModule(module, seed), [module, seed]);

  const [contextualInput, setContextualInput] = useState(() =>
    challenge.kind === 'contextual' ? initialContextualInput(challenge) : initialContextualInput(generateContextualMatchChallenge(seed, 12)),
  );
  const [bridgeSteps, setBridgeSteps] = useState(() =>
    challenge.kind === 'bridge' ? initialBridgeSteps(challenge) : initialBridgeSteps(generateBridgeChallenge(seed, 17)),
  );
  const [bridgeSlot, setBridgeSlot] = useState(1);
  const [gamutDeform, setGamutDeform] = useState({ h: 0, c: 0, scale: 1 });
  const userMask: WheelPoint[] = useMemo(() => {
    if (challenge.kind !== 'gamut') return [];
    return deformMask(challenge.maskVertices, gamutDeform);
  }, [challenge, gamutDeform]);

  const regen = useCallback((nextSeed?: number) => {
    const s = nextSeed ?? randomSeed();
    setSeed(s);
  }, []);

  useEffect(() => {
    const c = challengeForModule(module, seed);
    if (c.kind === 'contextual') setContextualInput(initialContextualInput(c));
    if (c.kind === 'bridge') setBridgeSteps(initialBridgeSteps(c));
    if (c.kind === 'gamut') setGamutDeform({ h: 0, c: 0, scale: 1 });
  }, [module, seed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        regen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [regen]);

  const telemetry = useMemo(() => {
    if (challenge.kind === 'compare') {
      return [
        ['Axis', challenge.axis],
        ['Left', colorStateToHex(challenge.left)],
        ['Right', colorStateToHex(challenge.right)],
        ['Correct', challenge.correctSide],
      ];
    }
    if (challenge.kind === 'contextual') {
      return [
        ['Target', colorStateToHex(challenge.target)],
        ['Background', colorStateToHex(challenge.background)],
        [`Oklch T`, `L=${challenge.target.l.toFixed(3)} C=${challenge.target.c.toFixed(3)} H=${challenge.target.h.toFixed(0)}`],
        ['Display', challenge.display],
        ['Max ΔE (L8)', '3.5'],
      ];
    }
    if (challenge.kind === 'bridge') {
      return challenge.referenceSteps.map((s, i) => [
        `Step ${i + 1}`,
        `${colorStateToHex(s)} · L${s.l.toFixed(2)}`,
      ]);
    }
    if (challenge.kind !== 'gamut') {
      return [['Challenge', challenge.kind]];
    }
    const { colors } = challenge;
    return [
      ['Sky A', colorStateToHex(colors.skyA)],
      ['Sky B', colorStateToHex(colors.skyB)],
      ['Background', colorStateToHex(colors.bg)],
      ['Midground', colorStateToHex(colors.mid)],
      ['Foreground', colorStateToHex(colors.fg)],
      ['Mask shape', challenge.maskShape],
      ...challenge.maskVertices.map((v, i) => [`Mask v${i + 1}`, `H${v.h.toFixed(0)} C${v.c.toFixed(3)}`]),
    ];
  }, [challenge]);

  return (
    <div className="sight-app">
      <div className="sight-sandbox-toolbar">
        <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>
          SANDBOX
        </Typography>
        <TextField
          size="small"
          label="Seed"
          type="number"
          value={seed}
          onChange={(e) => setSeed(Number(e.target.value) || 0)}
          sx={{ width: 100 }}
        />
        <Button size="small" variant="outlined" onClick={() => regen()}>
          Regen
        </Button>
        <Select
          size="small"
          value={module}
          onChange={(e) => setModule(e.target.value as SandboxModule)}
          aria-label="Module"
        >
          <MenuItem value="compare">Compare</MenuItem>
          <MenuItem value="contextual">Contextual</MenuItem>
          <MenuItem value="bridge">Bridge</MenuItem>
          <MenuItem value="gamut">Gamut</MenuItem>
        </Select>
        <Typography variant="caption" color="text.secondary">
          Space = new seed
        </Typography>
      </div>
      {challenge.kind === 'compare' && (
        <CompareView challenge={challenge} reveal={null} onPick={() => {}} />
      )}
      {challenge.kind === 'contextual' && (
        <ContextualMatcherView
          challenge={challenge}
          level={5}
          input={contextualInput}
          onInputChange={setContextualInput}
          showLiveMetrics
          reveal={null}
        />
      )}
      {challenge.kind === 'bridge' && (
        <BrokenBridgeView
          challenge={challenge}
          level={9}
          userSteps={bridgeSteps}
          onUserStepsChange={setBridgeSteps}
          selectedSlot={bridgeSlot}
          onSelectSlot={setBridgeSlot}
          showLiveMetrics
          reveal={null}
        />
      )}
      {challenge.kind === 'gamut' && (
        <GamutFinderView
          challenge={challenge}
          level={11}
          userMask={userMask}
          deform={gamutDeform}
          onDeformChange={setGamutDeform}
          showLiveMetrics
          reveal={null}
        />
      )}
      <aside className="sight-control-zone" style={{ maxHeight: 200, borderTop: '1px solid var(--sight-border)' }}>
        <dl className="sight-telemetry">
          {telemetry.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
