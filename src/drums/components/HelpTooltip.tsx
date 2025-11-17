import React, { useState, ReactNode } from 'react';

interface HelpTooltipProps {
  content: ReactNode;
  ariaLabel?: string;
}

/**
 * Shared help tooltip component with consistent behavior:
 * - Shows on hover (mouse enter/leave)
 * - Toggles on click
 * - Stays visible when hovering over tooltip content
 */
const HelpTooltip: React.FC<HelpTooltipProps> = ({ content, ariaLabel = "Show help" }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <>
      <button
        className="help-button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        type="button"
        aria-label={ariaLabel}
      >
        ?
      </button>
      {showTooltip && (
        <div 
          className="tooltip"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {content}
        </div>
      )}
    </>
  );
};

export default HelpTooltip;

