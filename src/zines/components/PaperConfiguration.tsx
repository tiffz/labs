import React from 'react';
import type { PaperConfigurationProps } from '../types';

const PaperConfiguration: React.FC<PaperConfigurationProps> = ({ paperConfig, onConfigChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    onConfigChange({
      ...paperConfig,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value
    });
  };

  return (
    <div className="card-bg p-6 custom-shadow mb-8">
      <h2 className="font-heading text-3xl font-bold mb-5" style={{ color: 'var(--heading-color)' }}>
        <span className="mr-3 text-3xl">🎨</span> Paper Settings
      </h2>
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-24">
          <label htmlFor="width" className="block text-sm font-secondary-text mb-1 text-orange-800">
            Width
          </label>
          <input
            type="number"
            name="width"
            id="width"
            value={paperConfig.width}
            onChange={handleInputChange}
            className="input-field"
            step="0.1"
          />
        </div>
        <div className="flex-1 min-w-24">
          <label htmlFor="height" className="block text-sm font-secondary-text mb-1 text-orange-800">
            Height
          </label>
          <input
            type="number"
            name="height"
            id="height"
            value={paperConfig.height}
            onChange={handleInputChange}
            className="input-field"
            step="0.1"
          />
        </div>
        <div className="flex-1 min-w-32">
          <label htmlFor="unit" className="block text-sm font-secondary-text mb-1 text-orange-800">
            Unit
          </label>
          <select
            name="unit"
            id="unit"
            value={paperConfig.unit}
            onChange={handleInputChange}
            className="input-field"
          >
            <option value="in">Inches (in)</option>
            <option value="cm">Centimeters (cm)</option>
            <option value="mm">Millimeters (mm)</option>
          </select>
        </div>
        <div className="flex-1 min-w-24">
          <label htmlFor="dpi" className="block text-sm font-secondary-text mb-1 text-orange-800">
            Print DPI
          </label>
          <input
            type="number"
            name="dpi"
            id="dpi"
            value={paperConfig.dpi}
            onChange={handleInputChange}
            className="input-field"
            step="1"
          />
        </div>
      </div>
      <p className="mt-4 text-xs font-secondary-text text-orange-700">
        <span className="inline mr-1">💡</span>
        Set your desired print resolution. 300 DPI is standard for good quality prints. Ensure your printer settings match.
      </p>
    </div>
  );
};

export default PaperConfiguration; 