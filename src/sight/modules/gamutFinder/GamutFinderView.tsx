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

const DEFAULT_DEFORM = { h: 0, c: 0, scale: 1 };

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
  showLiveMetrics = true,
  reveal,
  interactionDisabled = false,
}: GamutFinderViewProps): React.ReactElement {
  const minPct = getLevelConfig(level).minGamutOverlapPct ?? 72;
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
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Fit the pink mask over the purple gamut
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Cover the white dots (landscape colors). Adjust hue, size, and chroma.
        </Typography>
        <div className="sight-wheel-wrap">
          <GamutWheelCanvas
            maskVertices={challenge.maskVertices}
            userMask={userMask}
            samplePoints={samples}
          />
        </div>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <div>
            <Typography variant="caption">Rotate (hue)</Typography>
            <Slider
              size="small"
              min={-50}
              max={50}
              value={deform.h}
              onChange={(_, v) => onDeformChange({ ...deform, h: v as number })}
              disabled={interactionDisabled}
              aria-label="Mask hue offset"
            />
          </div>
          <div>
            <Typography variant="caption">Size</Typography>
            <Slider
              size="small"
              min={0.65}
              max={1.45}
              step={0.02}
              value={deform.scale}
              onChange={(_, v) => onDeformChange({ ...deform, scale: v as number })}
              disabled={interactionDisabled}
              aria-label="Mask scale"
            />
          </div>
          <div>
            <Typography variant="caption">Chroma offset</Typography>
            <Slider
              size="small"
              min={-0.08}
              max={0.08}
              step={0.01}
              value={deform.c}
              onChange={(_, v) => onDeformChange({ ...deform, c: v as number })}
              disabled={interactionDisabled}
              aria-label="Mask chroma offset"
            />
          </div>
        </Stack>
        {showLiveMetrics && (
          <Typography
            variant="body2"
            sx={{
              mt: 2,
              fontVariantNumeric: 'tabular-nums',
              color: overlapPct >= minPct ? 'success.main' : 'text.secondary',
            }}
          >
            Coverage {overlapPct.toFixed(0)}% · need {minPct}%
          </Typography>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_DEFORM as defaultGamutDeform };
