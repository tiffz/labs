# ADR 0004: Stanza local stem mix via Web Audio (MediaElementSource graph)

## Status

Accepted

## Context

ADR [0003](./0003-stanza-multi-stem-playback.md) shipped stems as **extra hidden `<audio>` tags** mixed only through `HTMLMediaElement.volume` / `muted`, clock-locked to the primary `<video>` / `<audio>` in React. That matches a quick product slice but fights the platform:

- Each element has its **own decode clock**, `play()` promise, and **autoplay / user-activation** surface.
- Keeping many media elements phase-aligned is **glue code** against browser timing, not a single timeline.

Other Labs apps (e.g. Beat, Chords, `src/shared/playback/`) already use **one `AudioContext`** and **per-bus `GainNode`** for multi-track behavior.

## Decision

For **local** Stanza songs with **at least one stem** (`ytId == null` and `stems.length > 0`):

1. Build a **`StanzaLocalStemMixer`** graph: `MediaElementAudioSourceNode` from the **primary** media element and from **each stem `<audio>`**, each into its own **`GainNode`**, all summed to **`AudioContext.destination`**.
2. Drive **audible level only from `GainNode.gain`** (main + per-stem). Set each media element’s **`volume` to `0`** and **`muted` to `false`** so decoded audio flows only through the graph (avoids double output; `muted === true` would silence `MediaElementAudioSourceNode` output per HTML spec).
3. **Transport stays on the DOM**: `playUnified` / `pauseUnified` / `seekUnified` / `applyPlaybackRate` still control **play, pause, seek, and `playbackRate`** on the same elements; Web Audio does **not** replace the clock, only the **mix bus**. The graph is built synchronously from **`prepareStemMixerForPlaySync()`** in the **same synchronous turn** as **`HTMLMediaElement.play()`** (no `await` before `play()`, or user activation can be lost). **`finalizeStemMixerResume()`** runs immediately after `play()` to await **`ensureAudioContextRunning`** when the browser needs extra ticks.
4. **YouTube** and **local with zero stems** keep the prior **element-volume** path (no graph, no extra `AudioContext`).
5. Lifecycle is managed by **`useStanzaLocalStemMixer`** in `src/stanza/hooks/useStanzaLocalStemMixer.ts`: **dispose** the prior graph when `stemUrlKey` (blob identity) changes so revoked blob URLs cannot race stale sources; **(re)build** lazily from **`prepareStemMixerForPlaySync()`** immediately before `play()`; push mix updates to gains when `primaryMixKey` / `stemMixKey` change.
6. **`blob:` URLs** for the primary file and each stem are owned by **`useStanzaLocalPlaybackObjectUrls`** (`src/stanza/hooks/useStanzaLocalPlaybackObjectUrls.ts`): URLs are created synchronously in `useMemo` (first paint `src`), but **`URL.revokeObjectURL` only runs in `useLayoutEffect` cleanup** after React commits, so we do not revoke URLs the previous paint’s `<audio>` / `<video>` still reference. **`stemUrlKey`** is derived from **stem ids sorted** (`stanzaPlaybackBlobUrlKeys.ts`) so UI / Dexie stem **order** does not churn URLs.

## Consequences

- Mix and mute are **one coherent bus**; fewer “stems died because a deferred callback saw `paused` wrong” failures.
- **Extra `AudioContext`** per local+stems session (managed via `createManagedAudioContext`); tab lifecycle / resume follows existing shared helpers.
- **Memory / CPU**: small graph only; stems are still streamed from `<audio>` (no full-file `decodeAudioData` in this ADR).
- Metronome / Conductor / recording remain on **primary media time** (unchanged from ADR 0003).

## Links

- Implementation: [`src/stanza/audio/stanzaLocalStemMixer.ts`](../../src/stanza/audio/stanzaLocalStemMixer.ts), [`src/stanza/hooks/useStanzaLocalStemMixer.ts`](../../src/stanza/hooks/useStanzaLocalStemMixer.ts), [`src/stanza/hooks/useStanzaLocalPlaybackObjectUrls.ts`](../../src/stanza/hooks/useStanzaLocalPlaybackObjectUrls.ts), [`src/stanza/utils/stanzaPlaybackBlobUrlKeys.ts`](../../src/stanza/utils/stanzaPlaybackBlobUrlKeys.ts), [`src/stanza/components/StanzaWorkspace.tsx`](../../src/stanza/components/StanzaWorkspace.tsx)
- Prior stem data model: [0003](./0003-stanza-multi-stem-playback.md)
