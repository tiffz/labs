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

`src/shared/**` must not import from app directories (`beat`, `chords`, `drums`, `piano`, `words`).

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
