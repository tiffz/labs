import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import GamutReveal from '../../components/reveal/GamutReveal';
import { getLevelConfig } from '../../levels';
import { gamutOverlapPct, colorsToWheelPoints } from '../../scoring/gamutOverlap';
import type { GamutChallenge, PracticeReveal } from '../../types';
import type { WheelPoint } from '../../scoring/gamutOverlap';
import GamutLandscapeCanvas from './GamutLandscapeCanvas';
import GamutWheelCanvas from './GamutWheelCanvas';

interface GamutFinderViewProps {
  challenge: GamutChallenge;
  level: number;
  userMask: WheelPoint[];
  deform: { h: number; c: number; scale: number };
  onDeformChange: (d: { h: number; c: number; scale: number }) => void;
  showLiveMetrics?: boolean;
  reveal: PracticeReveal | null;
  interactionDisabled?: boolean;
}

export default function GamutFinderView({
  challenge,
  level,
  userMask,
  deform,
  onDeformChange,
  showLiveMetrics = false,
  reveal,
  interactionDisabled = false,
}: GamutFinderViewProps): React.ReactElement {
  const minPct = getLevelConfig(level).minGamutOverlapPct ?? 85;
  const samples = colorsToWheelPoints([
    challenge.colors.skyA,
    challenge.colors.skyB,
    challenge.colors.bg,
    challenge.colors.mid,
    challenge.colors.fg,
  ]);
  const overlapPct = gamutOverlapPct(challenge.maskVertices, userMask, samples);

  if (reveal?.kind === 'gamut') {
    return (
      <div className="sight-workspace">
        <div className="sight-canvas-zone sight-canvas-zone--full">
          <GamutReveal reveal={reveal} />
        </div>
      </div>
    );
  }

  return (
    <div className={`sight-workspace ${interactionDisabled ? 'sight-workspace--dimmed' : ''}`}>
      <div className="sight-canvas-zone">
        <GamutLandscapeCanvas challenge={challenge} />
      </div>
      <div className="sight-control-zone">
        <Typography variant="subtitle2">Align the mask with the landscape gamut</Typography>
        <div className="sight-wheel-wrap">
          <GamutWheelCanvas maskVertices={challenge.maskVertices} userMask={userMask} />
        </div>
        <Stack spacing={1}>
          <Typography variant="caption">Rotate mask (hue)</Typography>
          <Slider
            size="small"
            min={-60}
            max={60}
            value={deform.h}
            onChange={(_, v) => onDeformChange({ ...deform, h: v as number })}
            disabled={interactionDisabled}
            aria-label="Mask hue offset"
          />
          <Typography variant="caption">Resize mask (scale)</Typography>
          <Slider
            size="small"
            min={0.6}
            max={1.4}
            step={0.02}
            value={deform.scale}
            onChange={(_, v) => onDeformChange({ ...deform, scale: v as number })}
            disabled={interactionDisabled}
            aria-label="Mask scale"
          />
        </Stack>
        {showLiveMetrics ? (
          <p className="sight-metrics">
            Overlap <strong>{overlapPct.toFixed(0)}%</strong> · Target ≥ <strong>{minPct}%</strong>
          </p>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Submit when the mask fits the landscape. Overlap score appears after submit.
          </Typography>
        )}
      </div>
    </div>
  );
}
