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
      
      // Calculate offset from container to settings-group (for top positioning)
      const offsetTop = groupRect.top - containerRect.top;
      
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
      
      // Calculate the center position
      // The tooltip is positioned relative to the container (which has position: relative)
      // We want to center it within the dropdown
      // Tooltip screen left = containerRect.left + tooltip.style.left
      // We want: containerRect.left + tooltip.style.left + tooltipWidth/2 = dropdownRect.left + dropdownWidth/2
      // So: tooltip.style.left = dropdownRect.left + dropdownWidth/2 - tooltipWidth/2 - containerRect.left
      const dropdownCenter = dropdownRect.left + dropdownWidth / 2;
      const tooltipCenterOffset = tooltipWidth / 2;
      const centeredLeft = dropdownCenter - tooltipCenterOffset - containerRect.left;
      tooltip.style.left = `${centeredLeft}px`;
      
      // Recalculate after positioning to check for clipping
      void tooltip.offsetHeight;
      let updatedTooltipRect = tooltip.getBoundingClientRect();
      
      // Check if tooltip would be clipped at the bottom of the dropdown
      const tooltipBottom = updatedTooltipRect.bottom;
      const dropdownBottom = dropdownRect.bottom;
      
      // If tooltip would be clipped at bottom, position it above instead
      if (tooltipBottom > dropdownBottom - 16) {
        // Position above the label instead
        relativeTop = -updatedTooltipRect.height - 4 - offsetTop;
        tooltip.style.top = `${relativeTop}px`;
        // Recalculate position after moving above
        void tooltip.offsetHeight;
        updatedTooltipRect = tooltip.getBoundingClientRect();
        // Re-center horizontally after moving above
        const newTooltipWidth = updatedTooltipRect.width;
        const newTooltipCenterOffset = newTooltipWidth / 2;
        const newCenteredLeft = dropdownCenter - newTooltipCenterOffset - containerRect.left;
        tooltip.style.left = `${newCenteredLeft}px`;
        // Recalculate again for final boundary check
        void tooltip.offsetHeight;
        updatedTooltipRect = tooltip.getBoundingClientRect();
      }
      
      // Final check: ensure tooltip doesn't overflow dropdown boundaries
      // Always recalculate center position to ensure accuracy
      const finalTooltipRect = tooltip.getBoundingClientRect();
      const finalTooltipWidth = finalTooltipRect.width;
      const finalTooltipCenterOffset = finalTooltipWidth / 2;
      
      // Calculate the ideal centered position relative to container
      const idealCenteredLeft = dropdownCenter - finalTooltipCenterOffset - containerRect.left;
      
      // Calculate what the tooltip's actual screen position would be
      const idealScreenLeft = containerRect.left + idealCenteredLeft;
      const idealScreenRight = idealScreenLeft + finalTooltipWidth;
      const dropdownScreenLeft = dropdownRect.left;
      const dropdownScreenRight = dropdownRect.right;
      
      // Only adjust if tooltip would be cut off - otherwise use ideal centered position
      if (idealScreenLeft < dropdownScreenLeft + 8) {
        // Too far left, align to left edge with padding
        tooltip.style.left = `${dropdownScreenLeft + 8 - containerRect.left}px`;
      } else if (idealScreenRight > dropdownScreenRight - 8) {
        // Too far right, align to right edge with padding
        tooltip.style.left = `${dropdownScreenRight - 8 - finalTooltipWidth - containerRect.left}px`;
      } else {
        // Tooltip fits - use ideal centered position
        tooltip.style.left = `${idealCenteredLeft}px`;
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

