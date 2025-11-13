import React, { useState } from 'react';

interface TooltipProps {
  content: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 cursor-help hover:bg-slate-300 hover:text-slate-700 transition-colors duration-150"
        style={{ fontSize: '9px', fontWeight: '600' }}
      >
        ?
      </span>
      {isVisible && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 px-3 py-2 bg-slate-800 text-white text-xs rounded-md z-[100] shadow-lg pointer-events-none whitespace-normal"
        >
          {content}
        </div>
      )}
    </div>
  );
};

