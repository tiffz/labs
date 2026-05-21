import CompareAxisReadout from './CompareAxisReadout';
import type { CompareChallenge } from '../types';

interface CompareOklchRevealProps {
  challenge: CompareChallenge;
  pickedSide: 'left' | 'right';
  passed: boolean;
  visible?: boolean;
}

/** Compare feedback: one prominent Oklch axis per question (L or C). */
export default function CompareOklchReveal({
  challenge,
  pickedSide,
  passed,
  visible = true,
}: CompareOklchRevealProps): React.ReactElement {
  return (
    <CompareAxisReadout
      challenge={challenge}
      pickedSide={pickedSide}
      passed={passed}
      visible={visible}
    />
  );
}
