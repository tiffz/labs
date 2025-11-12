import React, { useState } from 'react';

interface TooltipProps {
  content: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex ml-1"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-xs font-bold cursor-help hover:bg-slate-400 transition-colors duration-200">
        ?
      </span>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg z-50 shadow-2xl pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-[6px] border-transparent border-t-slate-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

