# Lyrefly script format

There is **no single industry-standard** comic script file format (unlike screenplays). Most creators use **Word or Google Docs** with numbered or bulleted lists — see [Fred Van Lente’s template](http://fredvanlente.com/comix.html), Dark Horse’s guide, and [Blambot’s script basics](https://blambot.com/pages/comic-script-basics).

Lyrefly aligns with that habit instead of inventing markup.

## How to write (low overhead)

Use the **script editor’s nested bullet list** — same muscle memory as Google Docs:

| Indent level      | Meaning     | Example                           |
| ----------------- | ----------- | --------------------------------- |
| Top bullet        | **Page**    | `Page 1` or `Opening spread`      |
| Indent once (Tab) | **Panel**   | `Wide shot` or `Panel 2`          |
| Indent again      | **Content** | action, `HERO: dialogue`, `*SFX*` |

**Keyboard:** bullet toolbar → **Tab** to nest → **Shift+Tab** to outdent. Autosaves; no Save button.

### Optional inline conventions (only when helpful)

- **Dialogue:** `CHARACTER: line` (same as many Word templates)
- **SFX:** `*CRASH*` or `SFX: BOOM`
- Everything else is treated as panel description / narration

You do **not** need `## Page 1`, `[P1]`, `@Hero:`, or beat-sheet headers — those were an earlier Lyrefly experiment and still parse if present in old projects.

## Storage

Scripts are stored as HTML (TipTap rich text) in Dexie and sync to `script/script.md` in the Drive project package. Legacy plain-text / markdown scripts continue to work until you edit them in the new editor.

## Related

- [`README.md`](README.md) — routes and storage
- [`DESIGN.md`](DESIGN.md) — visual design
