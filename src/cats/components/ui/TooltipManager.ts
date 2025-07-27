// Simple tooltip manager to ensure only one tooltip is visible at a time
let currentTooltip: string | null = null;
const listeners: Set<(activeTooltip: string | null) => void> = new Set();

export const TooltipManager = {
  setActiveTooltip: (tooltipId: string | null) => {
    if (currentTooltip !== tooltipId) {
      currentTooltip = tooltipId;
      listeners.forEach(listener => listener(currentTooltip));
    }
  },

  getActiveTooltip: () => currentTooltip,

  subscribe: (listener: (activeTooltip: string | null) => void) => {
    listeners.add(listener);
    // Return unsubscribe function
    return () => listeners.delete(listener);
  }
}; 