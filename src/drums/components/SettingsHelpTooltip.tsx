import React, { useState, ReactNode, useRef, useEffect } from 'react';

interface SettingsHelpTooltipProps {
  content: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * Settings-specific help tooltip component:
 * - Shows on hover over the label text or help icon
 * - Toggles on click of help icon
 * - Positioned relative to the settings-group container
 * - Uses outlined help button style for lighter visual weight
 */
const SettingsHelpTooltip: React.FC<SettingsHelpTooltipProps> = ({ 
  content, 
  ariaLabel = "Show help",
  children 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTooltip && containerRef.current && tooltipRef.current) {
      const container = containerRef.current;
      const tooltip = tooltipRef.current;
      
      // Find the settings-group parent and dropdown container
      const settingsGroup = container.closest('.settings-group') as HTMLElement;
      const dropdown = container.closest('.settings-dropdown') as HTMLElement;
      if (!settingsGroup || !dropdown) return;
      
      // Get positions - tooltip is positioned relative to container (which has position: relative)
      // but we want it positioned relative to settings-group
      const containerRect = container.getBoundingClientRect();
      const groupRect = settingsGroup.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      
      // Calculate offset from container to settings-group
      const offsetTop = groupRect.top - containerRect.top;
      const offsetLeft = groupRect.left - containerRect.left;
      
      // Position tooltip below the label container, but relative to settings-group
      let relativeTop = containerRect.height + 4 - offsetTop; // 4px = 0.25rem
      tooltip.style.top = `${relativeTop}px`;
      
      // Force a layout recalculation to get accurate tooltip dimensions
      void tooltip.offsetHeight;
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // Center tooltip horizontally within the dropdown
      // We need to account for the dropdown's padding and the settings-group's position
      const dropdownWidth = dropdownRect.width;
      const tooltipWidth = tooltipRect.width;
      
      // Calculate the center position relative to the dropdown
      // The tooltip is positioned relative to settings-group, so we need to account for:
      // - The dropdown's left edge relative to the settings-group
      // - Half the dropdown width minus half the tooltip width
      const groupLeftRelativeToDropdown = groupRect.left - dropdownRect.left;
      const centeredLeft = (dropdownWidth - tooltipWidth) / 2 - groupLeftRelativeToDropdown - offsetLeft;
      
      tooltip.style.left = `${centeredLeft}px`;
      
      // Recalculate after positioning to check for clipping
      void tooltip.offsetHeight;
      const updatedTooltipRect = tooltip.getBoundingClientRect();
      
      // Check if tooltip would be clipped at the bottom of the dropdown
      const tooltipBottom = updatedTooltipRect.bottom;
      const dropdownBottom = dropdownRect.bottom;
      
      // If tooltip would be clipped at bottom, position it above instead
      if (tooltipBottom > dropdownBottom - 16) {
        // Position above the label instead
        relativeTop = -updatedTooltipRect.height - 4 - offsetTop;
        tooltip.style.top = `${relativeTop}px`;
      }
      
      // Final check: ensure tooltip doesn't overflow dropdown boundaries
      const finalTooltipRect = tooltip.getBoundingClientRect();
      const tooltipLeftRelativeToDropdown = finalTooltipRect.left - dropdownRect.left;
      const tooltipRightRelativeToDropdown = finalTooltipRect.right - dropdownRect.left;
      
      // If tooltip extends beyond dropdown, adjust position
      if (tooltipLeftRelativeToDropdown < 8) {
        // Too far left, align to left edge with padding
        tooltip.style.left = `${8 - groupLeftRelativeToDropdown - offsetLeft}px`;
      } else if (tooltipRightRelativeToDropdown > dropdownWidth - 8) {
        // Too far right, align to right edge with padding
        tooltip.style.left = `${dropdownWidth - tooltipWidth - 8 - groupLeftRelativeToDropdown - offsetLeft}px`;
      }
    }
  }, [showTooltip]);

  return (
    <div 
      ref={containerRef}
      className="settings-help-tooltip-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      <button
        className="help-button-outlined"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        type="button"
        aria-label={ariaLabel}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        ?
      </button>
      {showTooltip && (
        <div 
          ref={tooltipRef}
          className="tooltip settings-tooltip"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default SettingsHelpTooltip;

