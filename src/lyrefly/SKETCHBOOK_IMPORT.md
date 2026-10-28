# Sketchbook bulk import

Bring in a batch of past flashes or ideas from another tool instead of retyping them one by one.
Use **Import ideas** in the Sketchbook masthead and pick one or more `.md`, `.txt`, or `.jsonl` files.

## Markdown / plain text convention

Start each entry with a `##` heading. Everything after it, up to the next `##` heading, is the body:

```md
## Daily Flash 87 - Dec 23, 2025 - A group of friends

They wait at a bus stop that never comes.

## Daily Flash 88 - Dec 24, 2025 - A locked door

Someone left a note taped to the glass.
```

The heading splits on `-` into up to three parts: a label (`Daily Flash 87`), a date
(`Dec 23, 2025` or `2025-12-23`), and a short title (`A group of friends`). The date becomes the
card's date; the label and title become the card title. A heading with fewer parts still imports:
you just get less on the card.

A file with no `##` headings imports as a single idea, title taken from the first line.

## JSONL convention

One JSON object per line:

```jsonl
{"title":"A group of friends","body":"They wait at a bus stop that never comes.","createdAt":"2025-12-23"}
{"title":"A locked door","body":"Someone left a note taped to the glass.","createdAt":"2025-12-24"}
```

`title` and `body` are both optional, but a line needs at least one to import. `createdAt` accepts
`YYYY-MM-DD` or a written date like `Dec 23, 2025`.

## PDFs

PDF text isn't parsed in the browser. Export the PDF to plain text or Markdown first (most word
processors and note apps offer this), then import that file.

## Lyrefly bundles (comics and ideas together)

To move a whole tracker in at once (a queue of comics with their stage, story notes, scripts and
links, plus Sketchbook ideas), pick a `.json` **Lyrefly bundle** with **Import ideas**. A preview
says what will be added before anything is written.

```json
{
  "format": "lyrefly-bundle",
  "version": 1,
  "source": "My story tracker",
  "comics": [
    {
      "key": "tracker:the-lantern",
      "title": "The Lantern",
      "pipelineStatus": "ready_to_draw",
      "priorityRank": 1,
      "brainstormHtml": "<p><strong>Setting</strong></p><p>A shore at low tide.</p>",
      "scriptHtml": "<ul><li><p>Page 1</p><ul><li><p>Wide shot</p></li></ul></li></ul>",
      "links": [
        {
          "title": "Lantern script",
          "url": "https://docs.google.com/document/d/…"
        }
      ]
    }
  ],
  "seeds": [
    {
      "key": "tracker:seed:kite",
      "kind": "idea",
      "title": "Kite",
      "body": "Plain text.\n- Bullets are fine."
    },
    {
      "key": "tracker:flash:rain",
      "kind": "daily_flash",
      "title": "Rain",
      "occurredOn": "2025-10-07"
    }
  ]
}
```

- `pipelineStatus` is `fleshing_out`, `ready_to_draw` or `complete`; lower `priorityRank` comes first
  in the queue. "Ready to draw" marks Brainstorm and Script done.
- A comic's `scriptHtml` is the Script stage's nested list: page, then panel, then content.
- An idea's `body` is **plain text** (the Sketchbook shows tags literally; HTML is refused).
- Every `key` must be unique and stable. Rows get ids derived from it, so importing the same file
  again adds nothing, a comic you already have (same key, or same title) only has its gaps filled,
  and an idea you deleted stays deleted. Your edits in Lyrefly are never overwritten.

### Collections of images

A bundle can also carry `collections`: finished pieces, such as old strips or a run of daily zines.
Each piece names an image file, and you pick those files **together with the bundle** (select the
whole folder's contents in **Import ideas**). Old sources rarely let a browser read their images
(Google Photos shared albums do not), so download them first and import from disk.

```json
"collections": [
  {
    "key": "archive:old-site",
    "title": "Old Site",
    "status": "archived",
    "sourceUrl": "https://example.com/",
    "pieces": [
      { "key": "1", "file": "old-01.jpg", "title": "Sheep", "notes": "The caption.", "sourceUrl": "https://example.com/1" }
    ]
  }
]
```

- `status` is `ongoing` or `archived`; archived collections stay searchable but fold out of the way.
- Pieces keep the bundle's order. Each image uploads to Drive under `Lyrefly/collections/<title>/`,
  so Import asks you to sign in to Drive first.
- Re-importing uploads only what is missing: a piece whose file you did not pick is listed and
  skipped, and a stopped import resumes where it stopped. A piece or collection you deleted stays
  deleted.
- `occurredOn` (YYYY-MM-DD) is the day you made the piece. Leave it out rather than guess: a
  photo's capture date is when it was photographed, not drawn.
