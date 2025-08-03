import React, { useState, useEffect } from 'react';
import HeartIcon from '../../icons/HeartIcon';
import FishIcon from '../../icons/FishIcon';
import { TooltipManager } from './TooltipManager';

interface CurrencyTooltipProps {
  children: React.ReactNode;
  type: 'treats' | 'love';
  treatsPerSecond: number;
  conversionRate: number;
  loveMultiplier: number;
  currentTreats: number;
  // New love per interaction props
  baseLovePerInteraction?: number;
}

const CurrencyTooltip: React.FC<CurrencyTooltipProps> = ({
  children,
  type,
  treatsPerSecond,
  conversionRate,
  loveMultiplier,
  currentTreats,
  baseLovePerInteraction
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const tooltipId = `tooltip-${type}`;

  // Subscribe to tooltip manager to handle exclusive visibility
  useEffect(() => {
    const unsubscribe = TooltipManager.subscribe((activeTooltip) => {
      // Only hide if another tooltip becomes active and this one is currently visible
      if (activeTooltip && activeTooltip !== tooltipId) {
        setIsVisible(false);
        // Clear any pending timeout when another tooltip takes over
        setTimeoutId((currentTimeoutId) => {
          if (currentTimeoutId) {
            clearTimeout(currentTimeoutId);
          }
          return null;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tooltipId]); // Only depend on tooltipId, not the changing state

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Calculate how many treats can be converted per second
  // This is limited by: conversion rate OR available treats per second (if no stockpile)
  const maxConvertiblePerSecond = currentTreats > 0 ? conversionRate : Math.min(conversionRate, treatsPerSecond);
  const treatsConvertedPerSecond = maxConvertiblePerSecond;
  const lovePerSecond = treatsConvertedPerSecond * loveMultiplier;
  const finalTreatsPerSecond = treatsPerSecond - treatsConvertedPerSecond;
  const isHungry = conversionRate > treatsPerSecond && currentTreats === 0;

  const renderTooltipContent = () => {
    if (type === 'treats') {
      return (
        <div className="currency-tooltip-content">
          {/* Primary total first */}
          <div className="tooltip-total">
            <FishIcon className="tooltip-total-icon" />
            <span className="tooltip-total-text">
              <strong>{Math.floor(finalTreatsPerSecond)}</strong> treats per second
            </span>
          </div>
          
          {/* Breakdown details */}
          <div className="tooltip-breakdown">
            <div className="tooltip-breakdown-line">
              <FishIcon className="tooltip-breakdown-icon" />
                             <span>Earned from jobs: <strong>{Math.floor(treatsPerSecond)}</strong>/sec</span>
            </div>
            <div className="tooltip-breakdown-line">
              <div className="tooltip-conversion">
                <FishIcon className="tooltip-breakdown-icon" />
                <span className="conversion-arrow">→</span>
                <HeartIcon className="tooltip-breakdown-icon" />
              </div>
                             <span>Converted to love: <strong>{Math.floor(treatsConvertedPerSecond)}</strong>/sec</span>
            </div>
          </div>
          
          <div className="tooltip-flavor">
            {finalTreatsPerSecond > 0 
              ? "Your cat is building a treat stash!" 
              : finalTreatsPerSecond === 0 
                ? "Perfect balance - your cat eats everything fresh!"
                : "Your cat is eating more than you can provide."
            }
          </div>
        </div>
      );
    } else {
      return (
        <div className="currency-tooltip-content">
          {/* Primary total first */}
          <div className="tooltip-total">
            <HeartIcon className="tooltip-total-icon" />
            <span className="tooltip-total-text">
              <strong>{Math.floor(lovePerSecond)}</strong> love per second
            </span>
          </div>
          
          {/* Breakdown details */}
          <div className="tooltip-breakdown">
            <div className="tooltip-breakdown-line">
              <FishIcon className="tooltip-breakdown-icon" />
                             <span>Treats earned: <strong>{Math.floor(treatsPerSecond)}</strong>/sec</span>
            </div>
            <div className="tooltip-breakdown-line">
              <div className="tooltip-conversion">
                <FishIcon className="tooltip-breakdown-icon" />
                <span className="conversion-arrow">→</span>
                <HeartIcon className="tooltip-breakdown-icon" />
              </div>
                             <span>Conversion rate: <strong>{Math.floor(conversionRate)}</strong>/sec max</span>
            </div>
            <div className="tooltip-breakdown-line">
              <HeartIcon className="tooltip-breakdown-icon" />
                             <span>Love multiplier: <strong>{Math.floor(loveMultiplier)}x</strong> per treat</span>
            </div>
            {baseLovePerInteraction && (
              <div className="tooltip-breakdown-line">
                <HeartIcon className="tooltip-breakdown-icon" />
                               <span>Love per interaction: <strong>{baseLovePerInteraction}</strong> base</span>
              </div>
            )}
          </div>
          
          {isHungry && (
            <div className="tooltip-warning">
              <span>Your cat wants more treats than you can provide!</span>
            </div>
          )}
          

          
          <div className="tooltip-flavor">
            {lovePerSecond > 0 
              ? isHungry 
                ? "Your cat is grateful but still hungry!"
                : "Your cat is purring with contentment!"
              : "Aww, there's no treats... yet?"
            }
          </div>
        </div>
      );
    }
  };



  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    // Set this tooltip as active in the manager
    TooltipManager.setActiveTooltip(tooltipId);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      // Only clear if this tooltip is still the active one
      if (TooltipManager.getActiveTooltip() === tooltipId) {
        TooltipManager.setActiveTooltip(null);
      }
      setIsVisible(false);
    }, 200);
    setTimeoutId(id);
  };

  return (
    <div 
      className="currency-tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="currency-tooltip-container">
        {children}
      </div>
      {isVisible && (
        <div 
          className="currency-tooltip"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {renderTooltipContent()}
        </div>
      )}
    </div>
  );
};

export default CurrencyTooltip; 