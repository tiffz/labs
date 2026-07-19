import { useState } from 'react';
import Typography from '@mui/material/Typography';
import BridgeReveal from '../../components/reveal/BridgeReveal';
import OklchSliders from '../../components/OklchSliders';
import { getLevelConfig } from '../../levels';
import { colorStateToHex } from '../../scoring/perceptualScore';
import { meanBridgeVariancePct } from '../../scoring/bridgeVariance';
import type { BridgeChallenge, ColorState, PracticeReveal } from '../../types';

interface BrokenBridgeViewProps {
  challenge: BridgeChallenge;
  level: number;
  userSteps: ColorState[];
  onUserStepsChange: (steps: ColorState[]) => void;
  selectedSlot: number;
  onSelectSlot: (index: number) => void;
  showLiveMetrics?: boolean;
  reveal: PracticeReveal | null;
  interactionDisabled?: boolean;
}

export default function BrokenBridgeView({
  challenge,
  level,
  userSteps,
  onUserStepsChange,
  selectedSlot,
  onSelectSlot,
  showLiveMetrics = false,
  reveal,
  interactionDisabled = false,
}: BrokenBridgeViewProps): React.ReactElement {
  const editingEmpty = challenge.emptyIndices.includes(selectedSlot);
  const [pickerOpen, setPickerOpen] = useState(editingEmpty);

  if (reveal?.kind === 'bridge') {
    return (
      <div className="sight-workspace">
        <div className="sight-canvas-zone sight-canvas-zone--full">
          <BridgeReveal reveal={reveal} />
        </div>
      </div>
    );
  }

  const updateSlot = (next: ColorState) => {
    const copy = [...userSteps];
    copy[selectedSlot] = next;
    onUserStepsChange(copy);
  };

  const variancePct = meanBridgeVariancePct(
    challenge.referenceSteps,
    userSteps,
    challenge.emptyIndices,
  );
  const maxPct = getLevelConfig(level).maxBridgeVariancePct ?? 6;

  return (
    <div className={`sight-workspace ${interactionDisabled ? 'sight-workspace--dimmed' : ''}`}>
      <div className="sight-canvas-zone">
        <div className="sight-bridge-slots" role="list" aria-label="Palette interpolation slots">
          {userSteps.map((step, i) => {
            const empty = challenge.emptyIndices.includes(i);
            return (
              <button
                key={i}
                type="button"
                className={`sight-bridge-slot ${empty ? '' : 'filled'}`}
                style={{ background: colorStateToHex(step) }}
                onClick={() => {
                  onSelectSlot(i);
                  setPickerOpen(challenge.emptyIndices.includes(i));
                }}
                disabled={interactionDisabled}
                aria-label={empty ? `Empty slot ${i + 1}, select to fill` : `Anchor slot ${i + 1}`}
                aria-pressed={selectedSlot === i}
              />
            );
          })}
        </div>
      </div>
      <div className="sight-control-zone">
        <Typography variant="subtitle2">Fill the empty steps between anchors</Typography>
        {pickerOpen && editingEmpty && !interactionDisabled ? (
          <OklchSliders
            value={userSteps[selectedSlot]!}
            onChange={updateSlot}
            locked={{ hue: false, chroma: false, lightness: false }}
          />
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Select an empty slot to adjust its color.
          </Typography>
        )}
        {showLiveMetrics ? (
          <p className="sight-metrics">
            Variance <strong>{variancePct.toFixed(1)}%</strong> · Target ≤ <strong>{maxPct}%</strong>
          </p>
        ) : (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Submit when your bridge feels smooth. Score appears after submit.
          </Typography>
        )}
      </div>
    </div>
  );
}
