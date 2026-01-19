/* eslint-disable react/prop-types */
import React, { memo, useCallback, useMemo } from 'react';
import type { PaperConfigurationProps, BleedConfig } from '../types';

interface SizePreset {
  name: string;
  width: number;
  height: number;
  unit: 'in' | 'cm' | 'mm';
  category: 'minizine' | 'booklet' | 'both';
}

// Mixam standard bleed for staple-bound booklets
const MIXAM_STANDARD_BLEED = 0.125; // inches

// Minizine sheet size presets
const MINIZINE_PRESETS: SizePreset[] = [
  { name: 'US Letter', width: 11, height: 8.5, unit: 'in', category: 'minizine' },
  { name: 'A4', width: 297, height: 210, unit: 'mm', category: 'minizine' },
  { name: 'US Legal', width: 14, height: 8.5, unit: 'in', category: 'minizine' },
  { name: 'Tabloid', width: 17, height: 11, unit: 'in', category: 'minizine' },
];

// Mixam-compatible booklet page size presets (all booklet presets are Mixam-compatible)
const BOOKLET_PRESETS: SizePreset[] = [
  { name: 'Digest', width: 5.5, height: 8.5, unit: 'in', category: 'booklet' },
  { name: 'US Trade', width: 6, height: 9, unit: 'in', category: 'booklet' },
  { name: 'US Standard', width: 6.69, height: 10.24, unit: 'in', category: 'booklet' },
  { name: 'Letter', width: 8.5, height: 11, unit: 'in', category: 'booklet' },
  { name: 'A6', width: 4.1, height: 5.8, unit: 'in', category: 'booklet' },
  { name: 'A5', width: 5.8, height: 8.3, unit: 'in', category: 'booklet' },
  { name: 'A4 Page', width: 8.3, height: 11.7, unit: 'in', category: 'booklet' },
];

// Format dimensions for display
const formatDimensions = (preset: SizePreset): string => {
  if (preset.unit === 'mm') {
    return `${preset.width} × ${preset.height} mm`;
  }
  return `${preset.width}" × ${preset.height}"`;
};

const BLEED_PRESETS: { name: string; value: number; unit: 'mm' | 'in' }[] = [
  { name: 'None', value: 0, unit: 'in' },
  { name: '⅛"', value: 0.125, unit: 'in' },
  { name: '¼"', value: 0.25, unit: 'in' },
  { name: '3mm', value: 3, unit: 'mm' },
  { name: '5mm', value: 5, unit: 'mm' },
];

interface ExtendedPaperConfigurationProps extends PaperConfigurationProps {
  bleedConfig?: BleedConfig;
  onBleedChange?: (bleed: BleedConfig) => void;
}

const PaperConfiguration: React.FC<ExtendedPaperConfigurationProps> = memo(({ 
  paperConfig, 
  onConfigChange,
  bleedConfig,
  onBleedChange,
  mode = 'minizine' 
}) => {
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    onConfigChange({
      ...paperConfig,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value
    });
  }, [paperConfig, onConfigChange]);

  const handlePresetSelect = useCallback((preset: SizePreset) => {
    onConfigChange({
      ...paperConfig,
      width: preset.width,
      height: preset.height,
      unit: preset.unit,
    });
    
    // Auto-set Mixam standard bleed for booklet presets
    if (preset.category === 'booklet' && onBleedChange) {
      onBleedChange({
        top: MIXAM_STANDARD_BLEED,
        bottom: MIXAM_STANDARD_BLEED,
        left: MIXAM_STANDARD_BLEED,
        right: MIXAM_STANDARD_BLEED,
        unit: 'in',
        quietArea: 0.25, // Mixam standard quiet area
      });
    }
  }, [paperConfig, onConfigChange, onBleedChange]);

  const handleBleedPresetSelect = useCallback((preset: { value: number; unit: 'mm' | 'in' }) => {
    if (onBleedChange && bleedConfig) {
      onBleedChange({
        top: preset.value,
        bottom: preset.value,
        left: preset.value,
        right: preset.value,
        unit: preset.unit,
        quietArea: bleedConfig.quietArea || (preset.unit === 'mm' ? 6.35 : 0.25), // Preserve or use default
      });
    }
  }, [onBleedChange, bleedConfig]);

  const handleBleedValueChange = useCallback((value: number) => {
    if (onBleedChange && bleedConfig) {
      onBleedChange({
        ...bleedConfig,
        top: value,
        bottom: value,
        left: value,
        right: value,
        quietArea: bleedConfig.quietArea || 0.25,
      });
    }
  }, [onBleedChange, bleedConfig]);

  const handleBleedUnitChange = useCallback((unit: 'mm' | 'in') => {
    if (onBleedChange && bleedConfig) {
      // Convert values when changing units
      let newValue = bleedConfig.top;
      let newQuietArea = bleedConfig.quietArea || 0.25;
      if (bleedConfig.unit !== unit) {
        if (unit === 'mm') {
          // Convert from inches to mm
          newValue = bleedConfig.top * 25.4;
          newQuietArea = newQuietArea * 25.4;
        } else {
          // Convert from mm to inches
          newValue = bleedConfig.top / 25.4;
          newQuietArea = newQuietArea / 25.4;
        }
        // Round to reasonable precision
        newValue = Math.round(newValue * 1000) / 1000;
        newQuietArea = Math.round(newQuietArea * 1000) / 1000;
      }
      onBleedChange({
        top: newValue,
        bottom: newValue,
        left: newValue,
        right: newValue,
        unit,
        quietArea: newQuietArea,
      });
    }
  }, [onBleedChange, bleedConfig]);

  const availablePresets = useMemo(() => 
    mode === 'minizine' ? MINIZINE_PRESETS : BOOKLET_PRESETS,
    [mode]
  );

  const matchingPreset = useMemo(() => 
    availablePresets.find(preset => 
      preset.width === paperConfig.width && 
      preset.height === paperConfig.height && 
      preset.unit === paperConfig.unit
    ),
    [availablePresets, paperConfig.width, paperConfig.height, paperConfig.unit]
  );

  const matchingBleedPreset = useMemo(() => {
    if (!bleedConfig) return null;
    return BLEED_PRESETS.find(preset => 
      preset.value === bleedConfig.top && preset.unit === bleedConfig.unit
    );
  }, [bleedConfig]);

  const sizeLabel = mode === 'minizine' ? 'Sheet Size' : 'Page Size';

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <span>📐</span>
          {sizeLabel}
        </h2>
      </div>
      <div className="card-body space-y-4">
        <div>
          <label className="block text-xs font-medium text-amber-700 mb-2">
            {mode === 'booklet' ? (
              <span className="flex items-center gap-2">
                Mixam Presets
                <span className="text-[10px] font-normal text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                  0.125&quot; bleed
                </span>
              </span>
            ) : (
              'Sheet Size Presets'
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availablePresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  matchingPreset?.name === preset.name
                    ? 'bg-teal-500 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span className="font-medium">{preset.name}</span>
                <span className={`ml-1 ${
                  matchingPreset?.name === preset.name ? 'text-teal-100' : 'text-amber-600'
                }`}>
                  {formatDimensions(preset)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div>
            <label htmlFor="width" className="block text-xs font-medium text-amber-700 mb-1">Width</label>
            <input
              type="number"
              name="width"
              id="width"
              value={paperConfig.width}
              onChange={handleInputChange}
              className="input-field text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label htmlFor="height" className="block text-xs font-medium text-amber-700 mb-1">Height</label>
            <input
              type="number"
              name="height"
              id="height"
              value={paperConfig.height}
              onChange={handleInputChange}
              className="input-field text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label htmlFor="unit" className="block text-xs font-medium text-amber-700 mb-1">Unit</label>
            <select
              name="unit"
              id="unit"
              value={paperConfig.unit}
              onChange={handleInputChange}
              className="input-field text-sm"
            >
              <option value="in">in</option>
              <option value="cm">cm</option>
              <option value="mm">mm</option>
            </select>
          </div>
          <div>
            <label htmlFor="dpi" className="block text-xs font-medium text-amber-700 mb-1">DPI</label>
            <input
              type="number"
              name="dpi"
              id="dpi"
              value={paperConfig.dpi}
              onChange={handleInputChange}
              className="input-field text-sm"
              step="1"
            />
          </div>
        </div>
        
        <p className="text-xs text-amber-600">
          {mode === 'minizine' 
            ? 'Full paper size for printing. Each zine page is 1/8 of this sheet.'
            : '300 DPI recommended for print quality.'}
        </p>

        {/* Bleed & Quiet Area Settings (Booklet only) */}
        {mode === 'booklet' && bleedConfig && onBleedChange && (
          <div className="pt-3 border-t border-amber-200 space-y-4">
            {/* Bleed */}
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-2">
                <span className="inline-block w-3 h-3 rounded-sm mr-1" style={{ backgroundColor: 'rgba(236, 72, 153, 0.3)' }} />
                Bleed (artwork extends beyond trim)
              </label>
              
              {/* Bleed presets */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {BLEED_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleBleedPresetSelect(preset)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      matchingBleedPreset?.name === preset.name
                        ? 'bg-teal-500 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Custom bleed input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={bleedConfig.top}
                  onChange={(e) => handleBleedValueChange(parseFloat(e.target.value) || 0)}
                  className="input-field text-sm w-20"
                  step={bleedConfig.unit === 'mm' ? '0.5' : '0.0625'}
                  min="0"
                />
                <select
                  value={bleedConfig.unit}
                  onChange={(e) => handleBleedUnitChange(e.target.value as 'mm' | 'in')}
                  className="input-field text-sm w-16"
                >
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>
            
            {/* Quiet Area (Safe Zone) */}
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-2">
                <span className="inline-block w-3 h-3 rounded-sm mr-1 border-2 border-dashed" style={{ borderColor: 'rgba(59, 130, 246, 0.6)' }} />
                Safe Zone (keep text/important content inside)
              </label>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={bleedConfig.quietArea || 0.25}
                  onChange={(e) => onBleedChange({ ...bleedConfig, quietArea: parseFloat(e.target.value) || 0 })}
                  className="input-field text-sm w-20"
                  step={bleedConfig.unit === 'mm' ? '0.5' : '0.0625'}
                  min="0"
                />
                <span className="text-xs text-amber-600">{bleedConfig.unit} from trim</span>
              </div>
            </div>
            
            {/* Learn more link */}
            <p className="text-xs text-amber-500">
              <a 
                href="https://mixam.com/support/bleed" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700"
              >
                Learn more about bleeds & safe zones →
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

PaperConfiguration.displayName = 'PaperConfiguration';

export default PaperConfiguration;
