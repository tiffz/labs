# Tab import (drums)

Paste Ultimate Guitar–style **drum** or **guitar** tabs into the notation field (or Load Rhythm → Import Tab). Auto-detect opens a preview modal before applying.

**Code:** tab parsers under `src/drums/` (search `tabImport` / paste detection in the notation input). Prefer tests over this doc when behavior conflicts.

## Drum tabs

| Drum | Darbuka | Default               |
| ---- | ------- | --------------------- |
| BD   | D (Dum) | On                    |
| SD   | T (Tek) | On                    |
| HH   | K (Ka)  | Off (often too dense) |

Same-beat priority: **BD > SD > HH**. Other kit lines ignored. Best with rock/pop skeletons.

## Guitar tabs

Uses **strumming** lines (`d`/`u`/`PM`), not frets.

| Strum | Darbuka | Default |
| ----- | ------- | ------- |
| d     | D       | On      |
| u     | K or T  | On      |
| PM    | S       | On      |

Same-beat priority: **d > u > PM**. Needs a strumming footer or “Strumming:” metadata. Timing from character spacing is approximate; BPM set manually after import. Output normalized to 16ths.

## Gotchas

- Choose Simplified (unique patterns) vs Full (all measures) in the modal.
- Complex fills / toms simplify away; guitar without strumming cannot convert.
