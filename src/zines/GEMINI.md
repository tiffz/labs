# Zine Studio

A client-side web application for creating print-ready zines and booklets.

## What It Does

- **Two Modes**: Minizine (8-page folded) and Booklet (multi-page saddle-stitched)
- **Smart File Parsing**: Automatic page detection from filenames
- **Spread Management**: Link/unlink pages as double-page spreads
- **Book Preview**: Realistic page-flipping preview using StPageFlip
- **Multiple Export Formats**: Mixam spreads, home duplex, digital distribution
- **Blank Page Support**: Customizable fill color for padding pages

## Tech Stack

- React 18 + TypeScript
- StPageFlip for book preview
- pdf-lib for PDF generation
- HTML5 Canvas for image processing
- Tailwind CSS for styling

## Key Files

### Components

- `App.tsx` - Main application component with state management
- `components/SpreadPreview.tsx` - Spread view with link/unlink functionality
- `components/BookReader.tsx` - StPageFlip book preview integration
- `components/PaperConfiguration.tsx` - Paper size and bleed settings
- `components/ExportOptions.tsx` - PDF export UI

### Utilities

- `utils/spreadPairing.ts` - Core booklet page organization logic
- `utils/pdfGenerator.ts` - PDF generation for all export formats
- `utils/fileParser.ts` - Filename parsing for page detection
- `utils/imageManipulation.ts` - Spread splitting/combining

## Key Design Principles

### Multiple-of-4 Page Count

Booklets must have page counts that are multiples of 4 for proper folding. The app automatically:

1. Calculates required content pages using `calculateRequiredContentPages()`
2. Creates blank page slots in the UI for padding
3. Treats padding pages identically to other missing pages

### Spread Pairing Logic

Pages are organized into spreads for preview and printing:

- Outer Cover: Back Cover (left) + Front Cover (right)
- Inner Front spread: Inner Front + Page 1
- Content spreads: Even pages paired with odd pages
- Inner Back spread: Last even page + Inner Back

### Export Formats

- **Mixam**: Full spreads, each PDF page is a spread
- **Home Duplex**: Booklet-imposed for saddle-stitch folding
- **Distribution**: Sequential single pages for digital reading

## Development

```bash
npm run dev          # Start dev server
npm test src/zines   # Run tests
```

For architecture decisions, see `DEVELOPMENT.md`.
