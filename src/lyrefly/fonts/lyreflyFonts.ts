/**
 * Lyrefly typography — native system UI first (SF Pro on Apple), Inter as cross-platform fallback.
 */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

/** Headlines, wordmark, comic titles — Display optical size on Apple. */
export const LYREFLY_DISPLAY_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, sans-serif";

/** Chrome, body, forms — Text optical size on Apple. */
export const LYREFLY_BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', system-ui, sans-serif";
