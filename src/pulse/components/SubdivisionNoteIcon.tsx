import type { SubdivisionLevel } from '../engine/types';

interface SubdivisionNoteIconProps {
  level: SubdivisionLevel;
  width?: number;
  height?: number;
}

function QuarterNote() {
  return (
    <svg viewBox="0 0 24 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="10" cy="38" rx="7" ry="5" transform="rotate(-20 10 38)" />
      <rect x="14.5" y="5" width="2.4" height="34" />
    </svg>
  );
}

function EighthNotes() {
  return (
    <svg viewBox="0 0 50 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="10" cy="38" rx="7" ry="5" transform="rotate(-20 10 38)" />
      <ellipse cx="38" cy="38" rx="7" ry="5" transform="rotate(-20 38 38)" />
      <rect x="14.5" y="5" width="2.4" height="34" />
      <rect x="42.5" y="5" width="2.4" height="34" />
      <rect x="14.5" y="3" width="30.4" height="4" rx="0.5" />
    </svg>
  );
}

function TripletNotes() {
  return (
    <svg viewBox="0 0 72 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="14.5" y="0" width="1.4" height="6" />
      <rect x="14.5" y="0" width="14" height="1.4" />
      <text x="36" y="7" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="serif">3</text>
      <rect x="43" y="0" width="14" height="1.4" />
      <rect x="55.6" y="0" width="1.4" height="6" />
      <ellipse cx="10" cy="46" rx="7" ry="5" transform="rotate(-20 10 46)" />
      <ellipse cx="34" cy="46" rx="7" ry="5" transform="rotate(-20 34 46)" />
      <ellipse cx="58" cy="46" rx="7" ry="5" transform="rotate(-20 58 46)" />
      <rect x="14.5" y="13" width="2.4" height="34" />
      <rect x="38.5" y="13" width="2.4" height="34" />
      <rect x="62.5" y="13" width="2.4" height="34" />
      <rect x="14.5" y="11" width="50.4" height="4" rx="0.5" />
    </svg>
  );
}

function SixteenthNotes() {
  return (
    <svg viewBox="0 0 72 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="7" cy="38" rx="6" ry="4.5" transform="rotate(-20 7 38)" />
      <ellipse cx="25" cy="38" rx="6" ry="4.5" transform="rotate(-20 25 38)" />
      <ellipse cx="43" cy="38" rx="6" ry="4.5" transform="rotate(-20 43 38)" />
      <ellipse cx="61" cy="38" rx="6" ry="4.5" transform="rotate(-20 61 38)" />
      <rect x="11" y="5" width="2.2" height="34" />
      <rect x="29" y="5" width="2.2" height="34" />
      <rect x="47" y="5" width="2.2" height="34" />
      <rect x="65" y="5" width="2.2" height="34" />
      <rect x="11" y="3" width="56.2" height="3.5" rx="0.5" />
      <rect x="11" y="9" width="56.2" height="3.5" rx="0.5" />
    </svg>
  );
}

export function SubdivisionNoteIcon({ level, width = 80, height = 44 }: SubdivisionNoteIconProps) {
  return (
    <div
      className="pulse-subdiv-vex-icon"
      aria-hidden="true"
      style={{ width, height, color: 'inherit' }}
    >
      {level === 1 && <QuarterNote />}
      {level === 2 && <EighthNotes />}
      {level === 3 && <TripletNotes />}
      {level === 4 && <SixteenthNotes />}
    </div>
  );
}
