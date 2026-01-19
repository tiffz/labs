# Zine Studio

A web application for creating print-ready zines and booklets. Supports two modes: **Minizine** (8-page folded zine) and **Booklet** (multi-page saddle-stitched booklet).

## Features

### Minizine Mode

- **8-Page Folded Zine**: Classic one-sheet folded zine format
- **Drag-and-Drop Upload**: Easy image placement
- **Print Sheet Preview**: High-fidelity canvas preview with exact DPI control
- **High-Resolution Export**: Download print-ready PNG files

### Booklet Mode

- **Multi-Page Booklets**: Create booklets of any page count (auto-padded to multiples of 4)
- **Smart File Naming**: Automatic page detection from filenames (e.g., `front.png`, `page1.png`, `innerback.png`)
- **Spread Management**: Link/unlink pages as double-page spreads
- **Blank Page Colors**: Customize fill color for blank/padding pages
- **Book Preview**: Realistic page-flipping preview
- **Multiple Export Formats**:
  - **Mixam Print Ready**: Spreads for professional printing
  - **Home Duplex**: Booklet-imposed for double-sided home printing
  - **Digital Distribution**: Sequential pages for digital reading

## How to Use

### Minizine Mode

1. Select "Minizine" mode
2. Configure paper size and DPI
3. Upload up to 8 images
4. Preview and download print sheet

### Booklet Mode

1. Select "Booklet" mode
2. Configure page size (Mixam presets available)
3. Upload page images (named for automatic placement)
4. Use Spreads view to manage page pairings
5. Use Preview view to see the book
6. Export in your preferred format

## Page Naming Convention

For automatic page placement, name your files:

- `front.png` or `cover.png` - Front cover
- `innerfront.png` - Inside front cover
- `page1.png`, `page2.png`, etc. - Content pages
- `innerback.png` - Inside back cover
- `back.png` - Back cover
- `page2-page3.png` - Double-page spread

## Architecture

See `GEMINI.md` for technical architecture and `DEVELOPMENT.md` for architecture decision records.

## Development

```bash
npm run dev          # Start dev server
npm test src/zines   # Run tests (123+ tests)
```
