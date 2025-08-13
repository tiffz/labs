// Shared debug overlay helpers and color system

export const OverlayColors = {
  baseline: '#0096ff',
  massBox: '#ff00aa',
  containerBox: 'rgba(0,255,255,0.6)',
  shadowCenter: '#00c853',
} as const;

export function isOverlayEnabled(): boolean {
  try {
    // Primary toggle via global flag
    const global = (window as unknown as { __CAT_OVERLAY__?: boolean }).__CAT_OVERLAY__ === true;
    if (global) return true;
    // Fallback: parse URL so this works before App mount
    const params = new URLSearchParams(window.location.search);
    const v = params.get('overlay');
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

