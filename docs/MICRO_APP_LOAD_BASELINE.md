# Micro-app load baseline (production build)

Captured after `npm run build` (gzip from Vite reporter). Use `npm run build:analyze` for treemap (`dist/stats.html`).

| Entry           | Entry JS (gzip) | Notes                                                                                                                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| forms           | ~3.6 kB         | Entry no longer inlines Three/R3F; `FormsThreeScene-*.js` ~2.2 kB gzip pulls the scene; `three` ~260 kB gzip may still be module-preloaded by Vite but parses after the shell. |
| zines           | ~18 kB          | Preloads `vendor`; `pdf-lib` on demand; PageFlip loads with BookReader only.                                                                                                   |
| vendor (shared) | ~161 kB gzip    | React + MUI + Emotion (single chunk by design).                                                                                                                                |
| three (shared)  | ~260 kB gzip    | Dominated by forms + R3F; code-split defers until scene chunk.                                                                                                                 |

Heaviest optional chunks: `vexflow` (notation apps), `pdf-lib` (zines export), Encore/Drive features per route.
