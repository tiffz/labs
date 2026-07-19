# Shared Modules

`src/shared` contains cross-app primitives and utilities. Keep this layer app-agnostic.

## Major Areas

- `shared/components/`: reusable UI controls and design primitives.
- `shared/music/`: canonical music theory/types/progression helpers.
- [`shared/playback/`](playback/README.md): timing/lifecycle/transport/scheduler infrastructure.
- `shared/audio/`: audio playback helpers and click/metronome services.
- [`shared/rhythm/`](rhythm/README.md): rhythm parsing, presets, time-signature utilities.
- [`shared/notation/`](notation/README.md): VexFlow score rendering + playback highlight.
- [`shared/drive/`](drive/README.md): Google Drive v3 client, portfolio backup layout, conflict assessment, auto-sync hook.
- [`shared/google/`](google/README.md): OAuth session, `LabsDriveAccountMenu`, sign-in chrome.
- [`shared/undo/`](undo/README.md): app-level undo stack (Tier A CRUD contract).
- `shared/test/`: test helpers used across apps.

See [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) for sync architecture across Encore, Stanza, and Scales.

## Boundary Rule

`src/shared/**` must not import from any app directory (`cats`, `drums`, `encore`, `stanza`, `zinebox`, …). The enforced app list lives in [`scripts/check-import-boundaries.mjs`](../../scripts/check-import-boundaries.mjs) and [`importBoundaries.test.ts`](./importBoundaries.test.ts) — keep them in sync when a new app is added; do not duplicate the list here.

## Server Logger

To enable shared server logging in an app:

```ts
import { installServerLogger } from '../shared/utils/serverLogger';
installServerLogger('APP_NAME');
```

Test command:

```sh
npm test -- src/shared/utils/serverLogger.test.ts
```
