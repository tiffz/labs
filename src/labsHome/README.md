# Labs Home catalog

Source of truth for the app directory shown on `/` (`src/index.html`) and the explore grid on `src/404.html`.

## How it works

- [`labsCatalog.manifest.json`](labsCatalog.manifest.json) lists every app: `id`, `title`, `blurb`, `href`, `stage` (`stable` | `development` | `unlisted`), optional `iconClass`.
- `npm run generate:labs-catalog` renders the manifest into static HTML between the `labs-catalog:generated` markers in `src/index.html` and `src/404.html` ([`scripts/render-labs-catalog.mjs`](../../scripts/render-labs-catalog.mjs)).
- `npm run check:labs-catalog` fails CI when the rendered HTML drifts from the manifest — never hand-edit inside the markers.

## Adding an app

1. Add a manifest entry (`stage: development` until stable; `unlisted` keeps it off the home grid but reachable by URL).
2. Add an `.app-icon.<app>` rule in `public/styles/index.css`.
3. Run `npm run generate:labs-catalog` and commit both the manifest and rendered HTML.

Full new-app steps: skill [`labs-new-micro-app`](../../.cursor/skills/labs-new-micro-app/SKILL.md).
