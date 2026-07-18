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
