import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

function listAppEntryHtml(): string[] {
  const entries: string[] = [];
  // Root landing page
  const rootEntry = path.join(SRC_ROOT, 'index.html');
  if (fs.existsSync(rootEntry)) entries.push(rootEntry);

  // Per-app entries
  for (const dirent of fs.readdirSync(SRC_ROOT, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name === 'shared') continue;
    const candidate = path.join(SRC_ROOT, dirent.name, 'index.html');
    if (fs.existsSync(candidate)) entries.push(candidate);
  }

  // Nested entries (e.g., src/drums/universal_tom/index.html)
  for (const dirent of fs.readdirSync(SRC_ROOT, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const appDir = path.join(SRC_ROOT, dirent.name);
    for (const inner of fs.readdirSync(appDir, { withFileTypes: true })) {
      if (!inner.isDirectory()) continue;
      const candidate = path.join(appDir, inner.name, 'index.html');
      if (fs.existsSync(candidate)) entries.push(candidate);
    }
  }

  return entries;
}

function listAppTsxRoots(): Array<{ app: string; file: string }> {
  const out: Array<{ app: string; file: string }> = [];
  for (const dirent of fs.readdirSync(SRC_ROOT, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name === 'shared') continue;
    const candidate = path.join(SRC_ROOT, dirent.name, 'App.tsx');
    if (fs.existsSync(candidate)) {
      out.push({ app: dirent.name, file: candidate });
    }
  }
  return out;
}

describe('SPA shell guardrails', () => {
  const entries = listAppEntryHtml();

  it('finds at least one app entry', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  describe.each(entries.map((file) => [path.relative(REPO_ROOT, file), file]))(
    '%s',
    (_label, file) => {
      const html = fs.readFileSync(file, 'utf8');

      it('uses a lowercase <!doctype html> declaration', () => {
        expect(html).toMatch(/<!doctype html>/);
      });

      it('declares a color-scheme meta', () => {
        expect(html).toMatch(/<meta\s+name="color-scheme"/i);
      });

      it('has a critical inline <style> block on <html>', () => {
        expect(html).toMatch(/<style>[^<]*html\s*\{[^}]*background[^}]*\}[^<]*<\/style>/i);
      });

      it('links the shared stylesheet', () => {
        expect(html).toMatch(/href="\/styles\/shared\.css"/);
      });

      it('does not register a PWA manifest or service worker', () => {
        expect(html).not.toMatch(/<link[^>]+rel="manifest"/i);
        expect(html).not.toMatch(/navigator\.serviceWorker\.register/);
      });

      it('does not pull bundleable fonts from Google Fonts directly', () => {
        // Only Noto Color Emoji (not on @fontsource) is allowed as an exception.
        // Allow <link rel="preconnect"> warmups; block any stylesheet fetch
        // of a Google Fonts family other than Noto Color Emoji.
        const stylesheetFetches = Array.from(
          html.matchAll(/<link\b[^>]*href="([^"]*fonts\.googleapis\.com[^"]*)"[^>]*>/gi),
        ).map((match) => match[0]);
        const disallowed = stylesheetFetches.filter((tag) => {
          if (/rel=["']preconnect["']/i.test(tag)) return false;
          if (/Noto\+Color\+Emoji/.test(tag)) return false;
          return true;
        });
        expect(disallowed).toEqual([]);
      });

      it('uses a single Cache-Control: no-cache meta (no no-store/must-revalidate/Pragma/Expires)', () => {
        expect(html).not.toMatch(/no-store/i);
        expect(html).not.toMatch(/must-revalidate/i);
        expect(html).not.toMatch(/http-equiv="Pragma"/i);
        expect(html).not.toMatch(/http-equiv="Expires"/i);
      });

      it('guards analytics behind a non-localhost check', () => {
        if (!/analytics\.js/.test(html)) return; // not every entry opts in
        expect(html).toMatch(/localhost/);
        expect(html).toMatch(/127\.0\.0\.1/);
      });
    },
  );
});

describe('React app a11y guardrails', () => {
  const apps = listAppTsxRoots();

  it('finds at least one App.tsx', () => {
    expect(apps.length).toBeGreaterThan(0);
  });

  // Apps that do not render a conventional app shell with <main> (e.g. pure
  // 3D scenes or experiments) can opt out here. Keep this list tight.
  const MAIN_LANDMARK_OPT_OUT = new Set<string>([
    // Intentionally empty — if you need to add to this list, document why.
  ]);

  /** Dense single-task apps may omit <SkipToMain />; still require `<main id="main">`. */
  const SKIP_TO_MAIN_OPT_OUT = new Set<string>(['agility']);

  describe.each(apps.map(({ app, file }) => [app, file]))('%s/App.tsx', (app, file) => {
    const source = fs.readFileSync(file, 'utf8');

    if (!MAIN_LANDMARK_OPT_OUT.has(app)) {
      it('renders a <main id="main"> landmark', () => {
        expect(source).toMatch(/<main[^>]*id=["']main["']/);
      });

      if (!SKIP_TO_MAIN_OPT_OUT.has(app)) {
        it('renders <SkipToMain /> from shared components', () => {
          expect(source).toMatch(/SkipToMain/);
        });
      }
    }

    it('does not import from the @mui/material barrel', () => {
      // Barrel imports look like: import { Button } from '@mui/material';
      // Path imports look like:   import Button from '@mui/material/Button';
      const barrelImport = /from\s+['"]@mui\/material['"]/;
      expect(source).not.toMatch(barrelImport);
    });
  });
});

describe('React StrictMode policy', () => {
  // Policy: new apps MUST wrap their root render in <React.StrictMode>. Older
  // apps listed below have not yet been migrated (they predate StrictMode
  // adoption and some rely on side-effecting renders that would double up).
  // Removing an app from this opt-out list requires a manual StrictMode audit
  // pass — do not add new apps here.
  const STRICT_MODE_OPT_OUT = new Set<string>([
    'beat',
    'chords',
    'corp',
    'drums',
    'forms',
    'ui',
    'words',
    'zines',
  ]);

  function listMainTsxRoots(): Array<{ app: string; file: string }> {
    const out: Array<{ app: string; file: string }> = [];
    for (const dirent of fs.readdirSync(SRC_ROOT, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      if (dirent.name === 'shared') continue;
      const candidate = path.join(SRC_ROOT, dirent.name, 'main.tsx');
      if (fs.existsSync(candidate)) {
        out.push({ app: dirent.name, file: candidate });
      }
    }
    return out;
  }

  const mains = listMainTsxRoots();

  describe.each(mains.map(({ app, file }) => [app, file]))('%s/main.tsx', (app, file) => {
    const source = fs.readFileSync(file, 'utf8');
    const hasStrictMode = /<(React\.)?StrictMode\b/.test(source);

    if (STRICT_MODE_OPT_OUT.has(app)) {
      it('is on the StrictMode opt-out list (grandfathered)', () => {
        expect(hasStrictMode).toBe(false);
      });
    } else {
      it('wraps its root render in <React.StrictMode>', () => {
        expect(hasStrictMode).toBe(true);
      });
    }
  });
});
