import React from 'react';

interface GeneratedChipProps {
  rerollId: string;
  content: string;
  onReroll: (rerollId: string) => void;
  compact?: boolean;
  inline?: boolean;
}

export const GeneratedChip: React.FC<GeneratedChipProps> = ({ 
  rerollId, 
  content, 
  onReroll,
  compact = false,
  inline = false
}) => {
  const containerClass = inline
    ? "inline-flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-md px-1.5 py-0.5"
    : compact
    ? "inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1"
    : "inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1";
  
  const buttonClass = inline
    ? "flex items-center justify-center w-4 h-4 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-orange-400"
    : compact
    ? "flex items-center justify-center w-4 h-4 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-orange-400"
    : "flex items-center justify-center w-5 h-5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-orange-400";
  
  const textClass = inline
    ? "text-xs font-medium text-slate-700"
    : compact
    ? "text-xs font-medium text-slate-700"
    : "text-xs font-medium text-slate-700";
  
  const iconSize = inline ? 12 : compact ? 12 : 14;

  return (
    <div className={containerClass}>
      <button
        className={`${buttonClass} self-start`}
        onClick={() => onReroll(rerollId)}
        title="Reroll this element"
        aria-label={`Reroll ${rerollId}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height={iconSize}
          viewBox="0 -960 960 960"
          width={iconSize}
          fill="currentColor"
        >
          <path d="M220-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h520q24 0 42 18t18 42v520q0 24-18 42t-42 18H220Zm0-60h520v-520H220v520Zm170-110q21 0 35.5-14.5T440-380q0-21-14.5-35.5T390-430q-21 0-35.5 14.5T340-380q0 21 14.5 35.5T390-330Zm180 0q21 0 35.5-14.5T620-380q0-21-14.5-35.5T570-430q-21 0-35.5 14.5T520-380q0 21 14.5 35.5T570-330ZM390-510q21 0 35.5-14.5T440-560q0-21-14.5-35.5T390-610q-21 0-35.5 14.5T340-560q0 21 14.5 35.5T390-510Zm180 0q21 0 35.5-14.5T620-560q0-21-14.5-35.5T570-610q-21 0-35.5 14.5T520-560q0 21 14.5 35.5T570-510ZM220-740v520-520Z" />
        </svg>
      </button>
      <span className={textClass}>{content}</span>
    </div>
  );
};

