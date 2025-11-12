import React, { useState } from 'react';

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
  const inputId = `${group}-${value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

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
        htmlFor={inputId}
        className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:border-indigo-400 hover:bg-indigo-50 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white"
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {value}
      </label>
      {tooltip && showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg z-50 shadow-2xl pointer-events-none">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-[6px] border-transparent border-t-slate-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

