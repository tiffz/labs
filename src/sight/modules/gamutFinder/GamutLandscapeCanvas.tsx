import { useEffect, useRef } from 'react';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { GamutChallenge } from '../../types';

interface GamutLandscapeCanvasProps {
  challenge: GamutChallenge;
}

export default function GamutLandscapeCanvas({
  challenge,
}: GamutLandscapeCanvasProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 400;
    const h = 240;
    canvas.width = w;
    canvas.height = h;

    const { skyA, skyB, bg, mid, fg } = challenge.colors;
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    grad.addColorStop(0, colorStateToHex(skyA));
    grad.addColorStop(1, colorStateToHex(skyB));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = colorStateToHex(bg);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.2, h * 0.38);
    ctx.lineTo(w * 0.55, h * 0.48);
    ctx.lineTo(w, h * 0.42);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colorStateToHex(mid);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.lineTo(w * 0.35, h * 0.52);
    ctx.lineTo(w * 0.7, h * 0.58);
    ctx.lineTo(w, h * 0.5);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colorStateToHex(fg);
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
  }, [challenge]);

  return (
    <div className="sight-landscape-wrap">
      <canvas ref={canvasRef} className="sight-landscape-canvas" aria-label="Procedural landscape" />
    </div>
  );
}
