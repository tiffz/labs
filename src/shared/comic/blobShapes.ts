/** Procedural blob paths for low-fi comic mockups (no external assets). */

export function blobEllipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

export function blobHeadPath(cx: number, cy: number, scale: number): string {
  const s = scale;
  return `M ${cx} ${cy - 18 * s}
    C ${cx + 22 * s} ${cy - 20 * s}, ${cx + 24 * s} ${cy + 8 * s}, ${cx + 10 * s} ${cy + 16 * s}
    C ${cx + 2 * s} ${cy + 22 * s}, ${cx - 2 * s} ${cy + 22 * s}, ${cx - 10 * s} ${cy + 16 * s}
    C ${cx - 24 * s} ${cy + 8 * s}, ${cx - 22 * s} ${cy - 20 * s}, ${cx} ${cy - 18 * s} Z`;
}

export function blobTorsoPath(cx: number, top: number, scale: number): string {
  const s = scale;
  return `M ${cx - 14 * s} ${top}
    Q ${cx - 20 * s} ${top + 40 * s}, ${cx - 12 * s} ${top + 70 * s}
    L ${cx + 12 * s} ${top + 70 * s}
    Q ${cx + 20 * s} ${top + 40 * s}, ${cx + 14 * s} ${top} Z`;
}

export function blobLimbPath(x1: number, y1: number, x2: number, y2: number, width: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * width;
  const ny = (dx / len) * width;
  return `M ${x1 + nx} ${y1 + ny} L ${x2 + nx} ${y2 + ny} L ${x2 - nx} ${y2 - ny} L ${x1 - nx} ${y1 - ny} Z`;
}

export function benDayDots(
  x: number,
  y: number,
  w: number,
  h: number,
  spacing: number,
  r: number,
): string {
  const dots: string[] = [];
  for (let py = y + spacing; py < y + h; py += spacing) {
    for (let px = x + spacing; px < x + w; px += spacing) {
      dots.push(`M ${px} ${py} m -${r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`);
    }
  }
  return dots.join(' ');
}

export function citySkylinePath(x: number, y: number, w: number, h: number): string {
  const blocks = [
    [0, 0.55, 0.14, 0.45],
    [0.14, 0.35, 0.12, 0.65],
    [0.26, 0.5, 0.1, 0.5],
    [0.36, 0.2, 0.16, 0.8],
    [0.52, 0.42, 0.12, 0.58],
    [0.64, 0.3, 0.14, 0.7],
    [0.78, 0.48, 0.1, 0.52],
    [0.88, 0.38, 0.12, 0.62],
  ];
  return blocks
    .map(([bx, by, bw, bh]) => {
      const px = x + bx * w;
      const py = y + by * h;
      const pw = bw * w;
      const ph = bh * h;
      return `M ${px} ${py + ph} L ${px} ${py} L ${px + pw} ${py} L ${px + pw} ${py + ph} Z`;
    })
    .join(' ');
}

export function natureHillsPath(x: number, y: number, w: number, h: number): string {
  const base = y + h * 0.72;
  return `M ${x} ${base}
    Q ${x + w * 0.2} ${y + h * 0.35}, ${x + w * 0.38} ${base}
    Q ${x + w * 0.55} ${y + h * 0.22}, ${x + w * 0.72} ${base}
    Q ${x + w * 0.86} ${y + h * 0.4}, ${x + w} ${base}
    L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}
