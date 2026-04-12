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
      <rect x="14.5" y="5" width="2.4" height="31" />
    </svg>
  );
}

function EighthNotes() {
  return (
    <svg viewBox="0 0 50 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="10" cy="38" rx="7" ry="5" transform="rotate(-20 10 38)" />
      <ellipse cx="38" cy="38" rx="7" ry="5" transform="rotate(-20 38 38)" />
      <rect x="14.5" y="5" width="2.4" height="31" />
      <rect x="42.5" y="5" width="2.4" height="31" />
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
      <rect x="14.5" y="13" width="2.4" height="31" />
      <rect x="38.5" y="13" width="2.4" height="31" />
      <rect x="62.5" y="13" width="2.4" height="31" />
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
      <rect x="11" y="5" width="2.2" height="31" />
      <rect x="29" y="5" width="2.2" height="31" />
      <rect x="47" y="5" width="2.2" height="31" />
      <rect x="65" y="5" width="2.2" height="31" />
      <rect x="11" y="3" width="56.2" height="3.5" rx="0.5" />
      <rect x="11" y="9" width="56.2" height="3.5" rx="0.5" />
    </svg>
  );
}

/**
 * Swing icon: quarter note + eighth note under a triplet bracket.
 * The quarter note (left, no flag) takes 2/3 of the beat; the eighth
 * note (right, with flag) takes 1/3. The flag is a filled bezier shape
 * tracing an S-curve pennant from the stem top — the outer edge sweeps
 * right then curves down, and the inner edge returns closer to the stem.
 */
function SwingEighthIcon() {
  return (
    <svg viewBox="0 0 56 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {/* Triplet bracket with "3" */}
      <rect x="14" y="0" width="1.4" height="6" />
      <rect x="14" y="0" width="12" height="1.4" />
      <text x="30" y="7" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="serif">3</text>
      <rect x="34" y="0" width="11" height="1.4" />
      <rect x="43.6" y="0" width="1.4" height="6" />
      {/* Left: quarter note (notehead + stem, no flag) */}
      <ellipse cx="10" cy="46" rx="7" ry="5" transform="rotate(-20 10 46)" />
      <rect x="14.5" y="13" width="2.4" height="31" />
      {/* Right: eighth note (notehead + stem + flag) */}
      <ellipse cx="38" cy="46" rx="7" ry="5" transform="rotate(-20 38 46)" />
      <rect x="42.5" y="13" width="2.4" height="31" />
      {/* Flag: attachment edge hidden inside the stem rect so only smooth curves are visible */}
      <path d="M43 12 C47.5 12, 54 18, 52 27 C51 22, 47.5 19, 43 19 Z" />
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
      {level === 'swing8' && <SwingEighthIcon />}
    </div>
  );
}
