import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { generateCompareChallenge } from '../generators/compare';
import { getLevelConfig, LEVEL_TABLE, MAX_LEVEL } from '../levels';
import AlbersEqualizerView from '../modules/albersEqualizer/AlbersEqualizerView';
import { initialEqualizerInput } from '../modules/albersEqualizer/albersEqualizerLogic';
import AnchorPivotView from '../modules/anchorPivot/AnchorPivotView';
import BrokenBridgeView from '../modules/brokenBridge/BrokenBridgeView';
import { initialBridgeSteps } from '../modules/brokenBridge/brokenBridgeLogic';
import CompareView from '../modules/compare/CompareView';
import ContextualMatcherView from '../modules/contextualMatcher/ContextualMatcherView';
import { initialContextualInput } from '../modules/contextualMatcher/contextualMatcherLogic';
import AlbersFlashcardView from '../modules/flashcard/AlbersFlashcardView';
import IsolatedFlashcardView from '../modules/flashcard/IsolatedFlashcardView';
import GamutFinderView from '../modules/gamutFinder/GamutFinderView';
import { defaultGamutDeform } from '../modules/gamutFinder/gamutFinderDefaults';
import MunsellSliceView from '../modules/munsellSlice/MunsellSliceView';
import YotCastView from '../modules/yotCast/YotCastView';
import { randomSeed } from '../generators/rng';
import { LEGACY_COMPARE_LEVEL, parseSandboxLevelFromHash } from '../debug/parseSandboxLevel';
import { deformMask } from '../scoring/gamutOverlap';
import { colorStateToHex } from '../scoring/perceptualScore';
import { challengeForLevel } from '../session/practiceChallenge';
import type { SightChallenge } from '../types';
import type { WheelPoint } from '../scoring/gamutOverlap';

function challengeForSandbox(
  pick: number,
  seed: number,
): { challenge: SightChallenge; displayLevel: number } {
  if (pick === LEGACY_COMPARE_LEVEL) {
    return { challenge: generateCompareChallenge(seed, 3), displayLevel: 3 };
  }
  const level = Math.max(1, Math.min(MAX_LEVEL, pick));
  return { challenge: challengeForLevel(seed, level), displayLevel: level };
}

interface SandboxPhaseProps {
  initialLevel?: number;
}

export default function SandboxPhase({ initialLevel }: SandboxPhaseProps): React.ReactElement {
  const [seed, setSeed] = useState(48291);
  const [levelPick, setLevelPick] = useState(() => initialLevel ?? parseSandboxLevelFromHash());
  const { challenge, displayLevel } = useMemo(
    () => challengeForSandbox(levelPick, seed),
    [levelPick, seed],
  );

  const [contextualInput, setContextualInput] = useState(() =>
    challenge.kind === 'contextual' ? initialContextualInput(challenge) : null,
  );
  const [equalizerInput, setEqualizerInput] = useState(() =>
    challenge.kind === 'albers-equalizer' ? initialEqualizerInput(challenge) : null,
  );
  const [pivotHue, setPivotHue] = useState(() =>
    challenge.kind === 'anchor-pivot' ? challenge.pivotHue : 0,
  );
  const [bridgeSteps, setBridgeSteps] = useState(() =>
    challenge.kind === 'bridge' ? initialBridgeSteps(challenge) : null,
  );
  const [bridgeSlot, setBridgeSlot] = useState(1);
  const [gamutDeform, setGamutDeform] = useState(defaultGamutDeform);
  const userMask: WheelPoint[] = useMemo(() => {
    if (challenge.kind !== 'gamut') return [];
    return deformMask(challenge.maskVertices, gamutDeform);
  }, [challenge, gamutDeform]);

  const regen = useCallback((nextSeed?: number) => {
    setSeed(nextSeed ?? randomSeed());
  }, []);

  useEffect(() => {
    if (challenge.kind === 'contextual') setContextualInput(initialContextualInput(challenge));
    else setContextualInput(null);
    if (challenge.kind === 'albers-equalizer') setEqualizerInput(initialEqualizerInput(challenge));
    else setEqualizerInput(null);
    if (challenge.kind === 'anchor-pivot') setPivotHue(challenge.pivotHue);
    if (challenge.kind === 'bridge') {
      setBridgeSteps(initialBridgeSteps(challenge));
      setBridgeSlot(1);
    } else {
      setBridgeSteps(null);
    }
    if (challenge.kind === 'gamut') setGamutDeform(defaultGamutDeform);
  }, [challenge]);

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

  const levelLabel =
    levelPick === LEGACY_COMPARE_LEVEL
      ? 'Legacy compare'
      : `${getLevelConfig(displayLevel).label} (${getLevelConfig(displayLevel).module})`;

  const telemetry = useMemo(() => {
    if (challenge.kind === 'compare') {
      return [
        ['Axis', challenge.axis],
        ['Left', colorStateToHex(challenge.left)],
        ['Right', colorStateToHex(challenge.right)],
        ['Correct', challenge.correctSide],
      ];
    }
    if (challenge.kind === 'flashcard-isolated') {
      return [
        ['Kind', challenge.kind],
        ['Profile', challenge.profile],
        ['Axis', challenge.axis],
        ['Correct', challenge.correctSide],
      ];
    }
    if (challenge.kind === 'flashcard-albers') {
      return [
        ['Kind', challenge.kind],
        ['Question', challenge.question],
        ['Correct side', challenge.correctSide ?? 'n/a'],
        ['Correct binary', challenge.correctBinary ?? 'n/a'],
      ];
    }
    if (challenge.kind === 'contextual') {
      return [
        ['Target', colorStateToHex(challenge.target)],
        ['Background', colorStateToHex(challenge.background)],
        [`Oklch T`, `L=${challenge.target.l.toFixed(3)} C=${challenge.target.c.toFixed(3)} H=${challenge.target.h.toFixed(0)}`],
        ['Display', challenge.display],
      ];
    }
    if (challenge.kind === 'bridge') {
      return challenge.referenceSteps.map((s, i) => [
        `Step ${i + 1}`,
        `${colorStateToHex(s)} · L${s.l.toFixed(2)}`,
      ]);
    }
    if (challenge.kind === 'munsell-slice') {
      return [
        ['Outlier index', String(challenge.outlierIndex)],
        ['Axis', challenge.axis],
      ];
    }
    if (challenge.kind === 'yot-cast') {
      return [
        ['Preset', challenge.lightPrompt],
        ['Correct index', String(challenge.correctIndex)],
      ];
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
          value={levelPick}
          onChange={(e) => setLevelPick(Number(e.target.value))}
          aria-label="Curriculum level"
          sx={{ minWidth: 220, maxWidth: 320 }}
        >
          <MenuItem value={LEGACY_COMPARE_LEVEL}>Legacy compare (dev)</MenuItem>
          {LEVEL_TABLE.map((row) => (
            <MenuItem key={row.level} value={row.level}>
              L{row.level} · {row.label}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary">
          {levelLabel} · Space = new seed
        </Typography>
      </div>
      {challenge.kind === 'compare' && (
        <CompareView challenge={challenge} reveal={null} onPick={() => {}} />
      )}
      {challenge.kind === 'flashcard-isolated' && (
        <IsolatedFlashcardView challenge={challenge} reveal={null} onPick={() => {}} />
      )}
      {challenge.kind === 'flashcard-albers' && (
        <AlbersFlashcardView
          challenge={challenge}
          reveal={null}
          onPickSide={() => {}}
          onPickBinary={() => {}}
        />
      )}
      {challenge.kind === 'contextual' && contextualInput && (
        <ContextualMatcherView
          challenge={challenge}
          level={displayLevel}
          input={contextualInput}
          onInputChange={setContextualInput}
          showLiveMetrics
          reveal={null}
        />
      )}
      {challenge.kind === 'bridge' && bridgeSteps && (
        <BrokenBridgeView
          challenge={challenge}
          level={displayLevel}
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
          level={displayLevel}
          userMask={userMask}
          deform={gamutDeform}
          onDeformChange={setGamutDeform}
          showLiveMetrics
          reveal={null}
        />
      )}
      {challenge.kind === 'anchor-pivot' && (
        <AnchorPivotView
          challenge={challenge}
          pivotHue={pivotHue}
          onPivotChange={setPivotHue}
          reveal={null}
        />
      )}
      {challenge.kind === 'albers-equalizer' && equalizerInput && (
        <AlbersEqualizerView
          challenge={challenge}
          level={displayLevel}
          input={equalizerInput}
          onInputChange={setEqualizerInput}
          reveal={null}
        />
      )}
      {challenge.kind === 'munsell-slice' && (
        <MunsellSliceView challenge={challenge} reveal={null} onPick={() => {}} />
      )}
      {challenge.kind === 'yot-cast' && (
        <YotCastView challenge={challenge} reveal={null} onPick={() => {}} />
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
