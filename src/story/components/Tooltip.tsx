import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64 = 16rem = 256px
      
      // Calculate ideal position (below and centered)
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      let top = rect.bottom + 8;
      
      // Adjust if it would go off the left edge
      if (left < 8) {
        left = 8;
      }
      
      // Adjust if it would go off the right edge
      if (left + tooltipWidth > window.innerWidth - 8) {
        left = window.innerWidth - tooltipWidth - 8;
      }
      
      // If tooltip would go off bottom, show above instead
      if (top + 100 > window.innerHeight) {
        top = rect.top - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isVisible]);

  return (
    <div 
      ref={triggerRef}
      className="relative inline-flex"
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
          className="fixed w-64 px-3 py-2 bg-slate-800 text-white text-xs rounded-md z-[100] shadow-lg pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

