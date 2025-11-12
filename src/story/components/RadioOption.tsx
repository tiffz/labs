import React, { useState, useRef, useEffect } from 'react';

interface RadioOptionProps {
  group: string;
  value: string;
  isChecked: boolean;
  onChange: () => void;
  tooltip?: string;
}

export const RadioOption: React.FC<RadioOptionProps> = ({
  group,
  value,
  isChecked,
  onChange,
  tooltip,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const labelRef = useRef<HTMLLabelElement>(null);
  const inputId = `${group}-${value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  useEffect(() => {
    if (showTooltip && tooltip && labelRef.current) {
      const rect = labelRef.current.getBoundingClientRect();
      const tooltipWidth = 256; // w-64
      
      // Calculate position
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      let top = rect.bottom + 8;
      
      // Adjust for left edge
      if (left < 8) {
        left = 8;
      }
      
      // Adjust for right edge (sidebar is 320px wide, so check against that)
      const sidebarWidth = 320;
      if (left + tooltipWidth > sidebarWidth - 8) {
        left = sidebarWidth - tooltipWidth - 8;
      }
      
      // If would go off bottom, show above
      if (top + 100 > window.innerHeight) {
        top = rect.top - 8;
      }
      
      setTooltipPosition({ top, left });
    }
  }, [showTooltip, tooltip]);

  return (
    <div className="relative inline-flex">
      <input
        type="radio"
        id={inputId}
        name={group}
        value={value}
        checked={isChecked}
        onChange={onChange}
        className="sr-only peer"
      />
      <label
        ref={labelRef}
        htmlFor={inputId}
        className="cursor-pointer rounded-full border border-orange-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:border-orange-400 hover:bg-orange-50 peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-white"
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {value}
      </label>
      {tooltip && showTooltip && (
        <div 
          className="fixed w-64 px-3 py-2 bg-slate-800 text-white text-xs rounded-md z-[100] shadow-lg pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};

