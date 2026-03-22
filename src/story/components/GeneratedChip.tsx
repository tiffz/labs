import React from 'react';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';

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
    ? "inline-flex items-center gap-1 bg-gradient-to-br from-orange-50/60 via-white to-pink-50/40 border border-orange-200 rounded-md px-1.5 py-0.5 shadow-sm"
    : compact
    ? "inline-flex items-center gap-1.5 bg-gradient-to-br from-orange-50/60 via-white to-pink-50/40 border border-orange-200 rounded-lg px-2 py-1 shadow-sm"
    : "inline-flex items-center gap-1.5 bg-gradient-to-br from-orange-50/60 via-white to-pink-50/40 border border-orange-200 rounded-lg px-2 py-1 shadow-sm";
  
  const buttonClass = inline
    ? "flex items-center justify-center w-4 h-4 rounded bg-gradient-to-br from-orange-100/80 to-pink-100/60 text-orange-700 hover:from-orange-200/90 hover:to-pink-200/70 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-orange-400 shadow-sm"
    : compact
    ? "flex items-center justify-center w-4 h-4 rounded bg-gradient-to-br from-orange-100/80 to-pink-100/60 text-orange-700 hover:from-orange-200/90 hover:to-pink-200/70 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-orange-400 shadow-sm"
    : "flex items-center justify-center w-5 h-5 rounded bg-gradient-to-br from-orange-100/80 to-pink-100/60 text-orange-700 hover:from-orange-200/90 hover:to-pink-200/70 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-orange-400 shadow-sm";
  
  const textClass = inline
    ? "text-xs font-medium text-slate-700"
    : compact
    ? "text-xs font-medium text-slate-700"
    : "text-xs font-medium text-slate-700";
  
  const iconSize = inline ? 12 : compact ? 12 : 14;

  return (
    <div className={containerClass}>
      <AppTooltip title="Reroll this element">
        <button
          className={`${buttonClass} self-start`}
          onClick={() => onReroll(rerollId)}
          aria-label={`Reroll ${rerollId}`}
        >
          <DiceIcon variant="single" size={iconSize} />
        </button>
      </AppTooltip>
      <span className={textClass}>{content}</span>
    </div>
  );
};

