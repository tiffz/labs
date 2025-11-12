import React from 'react';

interface GeneratedChipProps {
  rerollId: string;
  content: string;
  onReroll: (rerollId: string) => void;
}

export const GeneratedChip: React.FC<GeneratedChipProps> = ({ rerollId, content, onReroll }) => {
  return (
    <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
      <button
        className="flex items-center justify-center w-5 h-5 rounded bg-indigo-200 text-indigo-700 hover:bg-indigo-300 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        onClick={() => onReroll(rerollId)}
        title="Reroll this element"
        aria-label={`Reroll ${rerollId}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="14"
          viewBox="0 -960 960 960"
          width="14"
          fill="currentColor"
        >
          <path d="M220-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h520q24 0 42 18t18 42v520q0 24-18 42t-42 18H220Zm0-60h520v-520H220v520Zm170-110q21 0 35.5-14.5T440-380q0-21-14.5-35.5T390-430q-21 0-35.5 14.5T340-380q0 21 14.5 35.5T390-330Zm180 0q21 0 35.5-14.5T620-380q0-21-14.5-35.5T570-430q-21 0-35.5 14.5T520-380q0 21 14.5 35.5T570-330ZM390-510q21 0 35.5-14.5T440-560q0-21-14.5-35.5T390-610q-21 0-35.5 14.5T340-560q0 21 14.5 35.5T390-510Zm180 0q21 0 35.5-14.5T620-560q0-21-14.5-35.5T570-610q-21 0-35.5 14.5T520-560q0 21 14.5 35.5T570-510ZM220-740v520-520Z" />
        </svg>
      </button>
      <span className="text-xs font-medium text-slate-700">{content}</span>
    </div>
  );
};

