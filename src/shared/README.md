# Shared Modules

`src/shared` contains cross-app primitives and utilities. Keep this layer app-agnostic.

## Major Areas

- `shared/components/`: reusable UI controls and design primitives.
- `shared/music/`: canonical music theory/types/progression helpers.
- `shared/playback/`: timing/lifecycle/transport/scheduler infrastructure.
- `shared/audio/`: audio playback helpers and click/metronome services.
- `shared/rhythm/`: rhythm parsing + time-signature utilities.
- `shared/test/`: test helpers used across apps.

## Boundary Rule

`src/shared/**` must not import from app directories (`beat`, `cats`, `chords`, `corp`, `count`, `drums`, `forms`, `piano`, `pitch`, `scales`, `story`, `ui`, `words`, `zines`). The enforced app list lives in [`scripts/check-import-boundaries.mjs`](../../scripts/check-import-boundaries.mjs) and [`importBoundaries.test.ts`](./importBoundaries.test.ts) — keep them in sync when a new app is added.

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
