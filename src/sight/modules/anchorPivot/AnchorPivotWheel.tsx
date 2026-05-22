import { useEffect, useRef } from 'react';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { AnchorPivotChallenge } from '../../types';

interface AnchorPivotWheelProps {
  challenge: AnchorPivotChallenge;
  pivotHue: number;
  onPivotChange: (hue: number) => void;
  disabled?: boolean;
}

export default function AnchorPivotWheel({
  challenge,
  pivotHue,
  onPivotChange,
  disabled = false,
}: AnchorPivotWheelProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 280;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.42;

    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(0, 0, size, size);

    for (let h = 0; h < 360; h += 6) {
      const angle = (h / 360) * Math.PI * 2 - Math.PI / 2;
      const r = maxR * 0.85;
      ctx.fillStyle = colorStateToHex({ h, c: 0.14, l: 0.55 });
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    challenge.targetAngles.forEach((h) => {
      const angle = (h / 360) * Math.PI * 2 - Math.PI / 2;
      const r = (challenge.targetChroma / 0.4) * maxR;
      ctx.fillStyle = colorStateToHex({
        h,
        c: challenge.targetChroma,
        l: challenge.targetLightness,
      });
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    const userAngle = (pivotHue / 360) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(userAngle) * maxR, cy + Math.sin(userAngle) * maxR);
    ctx.stroke();
  }, [challenge, pivotHue]);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const deg = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
    onPivotChange(deg);
  };

  return (
    <canvas
      ref={canvasRef}
      className="sight-wheel-canvas sight-wheel-canvas--interactive"
      aria-label="Rotate harmony pivot"
      onPointerDown={onPointer}
      onPointerMove={(e) => {
        if (e.buttons > 0) onPointer(e);
      }}
    />
  );
}
