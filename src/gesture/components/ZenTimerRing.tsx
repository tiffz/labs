import type { ReactNode } from 'react';

type ZenTimerRingProps = {
  /** 0 = empty, 1 = full ring remaining */
  progress: number;
  size?: number;
  children: ReactNode;
  ariaLabel: string;
};

export default function ZenTimerRing({
  progress,
  size = 52,
  children,
  ariaLabel,
}: ZenTimerRingProps): React.ReactElement {
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <div
      className="gesture-zen-timer-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="gesture-zen-timer-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="gesture-zen-timer-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="gesture-zen-timer-ring-center">{children}</div>
    </div>
  );
}
