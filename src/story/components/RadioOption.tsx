import React from 'react';
import AppTooltip from '../../shared/components/AppTooltip';

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
      <AppTooltip title={tooltip ?? ''}>
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-full border border-orange-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:border-orange-300 hover:bg-gradient-to-br hover:from-orange-50/50 hover:to-pink-50/30 peer-checked:border-orange-400 peer-checked:bg-gradient-to-br peer-checked:from-orange-500 peer-checked:via-orange-500 peer-checked:to-pink-500/70 peer-checked:text-white shadow-sm hover:shadow"
        >
          {value}
        </label>
      </AppTooltip>
    </div>
  );
};

