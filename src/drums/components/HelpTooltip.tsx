import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const tooltipWidth = 360;
    const minX = 12;
    const maxX = Math.max(minX, window.innerWidth - tooltipWidth - 12);
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(minX, Math.min(centeredLeft, maxX)),
    });
  }, []);

  const showNow = useCallback(() => {
    clearHideTimeout();
    updatePosition();
    setShowTooltip(true);
  }, [clearHideTimeout, updatePosition]);

  const hideSoon = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      setShowTooltip(false);
      hideTimeoutRef.current = null;
    }, 90);
  }, [clearHideTimeout]);

  useEffect(() => {
    if (!showTooltip) return;
    updatePosition();
    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [showTooltip, updatePosition]);

  useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);

  return (
    <>
      <button
        ref={buttonRef}
        className="help-button"
        onMouseEnter={showNow}
        onMouseLeave={hideSoon}
        onClick={() => {
          clearHideTimeout();
          if (showTooltip) {
            setShowTooltip(false);
          } else {
            showNow();
          }
        }}
        type="button"
        aria-label={ariaLabel}
      >
        ?
      </button>
      {showTooltip && typeof document !== 'undefined'
        ? createPortal(
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <div
              className="tooltip"
              role="tooltip"
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 12000,
                width: 'min(360px, calc(100vw - 24px))',
              }}
              onMouseEnter={showNow}
              onMouseLeave={hideSoon}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default HelpTooltip;

