# Minizine Maker

A client-side web application for laying out images in an 8-page folded zine format with print-ready export.

## What It Does

- **Image Upload**: Drag-and-drop image placement in 8-page zine layout
- **Print Preview**: High-resolution canvas preview with DPI control
- **Book Preview**: Realistic page-flipping preview using StPageFlip
- **Export**: Download high-resolution PNG ready for printing

## Tech Stack

- React 18 + TypeScript
- StPageFlip for book preview
- HTML5 Canvas for print output
- Tailwind CSS for styling

## Key Files

- `App.tsx` - Main application component
- `components/ImageUploaderSlot.tsx` - Image upload and drag-and-drop
- `components/PrintSheetCanvas.tsx` - Canvas-based export
- `components/BookPreview.tsx` - StPageFlip integration

## Development

```bash
npm run dev          # Start dev server
npm test src/zines  # Run tests
```

For detailed architecture, see `DEVELOPMENT.md`.
