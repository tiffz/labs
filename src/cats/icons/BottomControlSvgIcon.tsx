import React from 'react';

/**
 * Inline SVGs (Material Symbols Outlined, 24px) for bottom circular controls.
 * Avoids font/ligature FOUC in visual baselines and during slow font loads.
 * Paths from Google gstatic Material Symbols Outlined 24px SVG exports.
 */
const PATHS = {
  pets: 'M180-475q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm109-189q-29-29-29-71t29-71q29-29 71-29t71 29q29 29 29 71t-29 71q-29 29-71 29t-71-29Zm240 0q-29-29-29-71t29-71q29-29 71-29t71 29q29 29 29 71t-29 71q-29 29-71 29t-71-29Zm251 189q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM266-75q-45 0-75.5-34.5T160-191q0-52 35.5-91t70.5-77q29-31 50-67.5t50-68.5q22-26 51-43t63-17q34 0 63 16t51 42q28 32 49.5 69t50.5 69q35 38 70.5 77t35.5 91q0 47-30.5 81.5T694-75q-54 0-107-9t-107-9q-54 0-107 9t-107 9Z',
  close:
    'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z',
  auto_fix_high:
    'm800-680-38-82-82-38 82-38 38-82 38 82 82 38-82 38-38 82Zm-460 0-38-82-82-38 82-38 38-82 38 82 82 38-82 38-38 82Zm460 460-38-82-82-38 82-38 38-82 38 82 82 38-82 38-38 82ZM204-92 92-204q-12-12-12-29t12-29l446-446q12-12 29-12t29 12l112 112q12 12 12 29t-12 29L262-92q-12 12-29 12t-29-12Zm30-84 286-288-56-56-288 286 58 58Z',
  directions_run:
    'M520-40v-240l-84-80-40 176-276-56 16-80 192 40 64-324-72 28v136h-80v-188l158-68q35-15 51.5-19.5T480-720q21 0 39 11t29 29l40 64q26 42 70.5 69T760-520v80q-66 0-123.5-27.5T540-540l-24 120 84 80v300h-80Zm-36.5-723.5Q460-787 460-820t23.5-56.5Q507-900 540-900t56.5 23.5Q620-853 620-820t-23.5 56.5Q573-740 540-740t-56.5-23.5Z',
} as const;

export type BottomControlIconName = keyof typeof PATHS;

type BottomControlSvgIconProps = {
  name: BottomControlIconName;
  className?: string;
};

const BottomControlSvgIcon: React.FC<BottomControlSvgIconProps> = ({ name, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height="24"
    viewBox="0 -960 960 960"
    width="24"
    className={className}
    fill="currentColor"
    aria-hidden
    focusable="false"
  >
    <path d={PATHS[name]} />
  </svg>
);

export default BottomControlSvgIcon;
