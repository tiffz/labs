# Labs Home catalog

Source of truth for the app directory shown on `/` (`src/index.html`) and the explore grid on `src/404.html`.

## How it works

- [`labsCatalog.manifest.json`](labsCatalog.manifest.json) lists every app: `path`, `title`, `shortDescription`, `stage`, `category`, `iconClass`. Stages: `stable` (public) | `experimental` (public, WIP) | `private` (shown on the directory only when signed into a private app) | `in-development` (hidden from the public directory, localhost only). Visibility is discovery control — every app stays reachable by direct URL; the prod grid filter lives in `public/scripts/shared.js`.
- `npm run generate:labs-catalog` renders the manifest into static HTML between the `labs-catalog:generated` markers in `src/index.html` and `src/404.html` ([`scripts/render-labs-catalog.mjs`](../../scripts/render-labs-catalog.mjs)).
- `npm run check:labs-catalog` fails CI when the rendered HTML drifts from the manifest — never hand-edit inside the markers.

## Adding an app

1. Add a manifest entry (`stage: in-development` while hidden; `experimental` once public but WIP; `stable` when done; `private` for restricted apps kept off the public grid but reachable by URL).
2. Add an `.app-icon.<app>` rule in `public/styles/index.css`.
3. Run `npm run generate:labs-catalog` and commit both the manifest and rendered HTML.

Full new-app steps: skill [`labs-new-micro-app`](../../.cursor/skills/labs-new-micro-app/SKILL.md).
