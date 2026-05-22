import { useEffect, useRef } from 'react';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { WheelPoint } from '../../scoring/gamutOverlap';

interface GamutWheelCanvasProps {
  maskVertices: WheelPoint[];
  userMask: WheelPoint[];
  samplePoints?: WheelPoint[];
}

export default function GamutWheelCanvas({
  maskVertices,
  userMask,
  samplePoints = [],
}: GamutWheelCanvasProps): React.ReactElement {
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
      for (let c = 0; c <= 0.4; c += 0.05) {
        const angle = (h / 360) * Math.PI * 2 - Math.PI / 2;
        const r = (c / 0.4) * maxR;
        ctx.fillStyle = colorStateToHex({ h, c, l: 0.55 });
        ctx.fillRect(cx + Math.cos(angle) * r - 2, cy + Math.sin(angle) * r - 2, 4, 4);
      }
    }

    const drawPoly = (verts: WheelPoint[], stroke: string, fill: string) => {
      if (verts.length < 2) return;
      ctx.beginPath();
      verts.forEach((v, i) => {
        const angle = (v.h / 360) * Math.PI * 2 - Math.PI / 2;
        const r = (v.c / 0.4) * maxR;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawPoly(maskVertices, '#a78bfa', 'rgba(167, 139, 250, 0.22)');
    drawPoly(userMask, '#f472b6', 'rgba(244, 114, 182, 0.12)');

    for (const p of samplePoints) {
      const angle = (p.h / 360) * Math.PI * 2 - Math.PI / 2;
      const r = (p.c / 0.4) * maxR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fafafa';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [maskVertices, userMask, samplePoints]);

  return (
    <canvas
      ref={canvasRef}
      className="sight-wheel-canvas"
      aria-label="Color wheel gamut mask; white dots are landscape colors to cover"
    />
  );
}
