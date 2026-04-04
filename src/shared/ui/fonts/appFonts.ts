/**
 * Self-hosted UI fonts for MUI micro-apps. Import once at the top of each `main.tsx`
 * (before `createRoot`) so Roboto/Inter/Caveat match `getAppTheme()` and Playwright stubs.
 * Avoids mixed `fonts.googleapis.com` `display=optional` vs `swap` and reduces hard-refresh jitter.
 */
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/600.css';
import '@fontsource/roboto/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
