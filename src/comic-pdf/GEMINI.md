# Mixam Comic PDF Converter - AI Assistant Guide

## Overview

This microapp converts comic page images into Mixam-compatible PDFs for print production. It automates the tedious process of manually assembling pages in Adobe InDesign.

## Key Components

### File Parser (`utils/fileParser.ts`)

- Extracts page numbers from Mixam naming conventions
- Detects double page spreads using multiple patterns:
  - Hyphenated: `page14-15.jpg`, `14-15.jpg`
  - Concatenated: `page14page15.jpg`, `1415.jpg`
- Handles special keywords: "front", "back", "rear", "last", "inner"
- Sorts files into correct page order

### Image Processor (`utils/imageProcessor.ts`)

- Loads images asynchronously
- Validates image dimensions:
  - All regular pages must be same size
  - Spreads must be exactly 2x width of regular pages
- Optional CMYK conversion (browser limitations apply)

### PDF Generator (`utils/pdfGenerator.ts`)

- Uses `pdf-lib` for PDF creation
- Creates single pages for regular pages
- Creates double-width pages for spreads
- Maintains proper page order based on Mixam naming

## File Structure

```
src/comic-pdf/
  App.tsx              # Main component with upload, preview, and PDF generation
  main.tsx            # React entry point
  components/
    FileUploader.tsx  # Drag-and-drop file upload component
    PagePreview.tsx   # Preview of pages and spreads before PDF generation
  utils/
    fileParser.ts     # Parse Mixam naming conventions and detect spreads
    imageProcessor.ts # Load and validate images
    pdfGenerator.ts   # Generate Mixam-compatible PDF
  types/
    index.ts          # TypeScript type definitions
```

## Dependencies

- `pdf-lib`: PDF generation library
- `file-saver`: Download generated PDFs
- React 19 with TypeScript
- Tailwind CSS v3 for styling

## Testing

Unit tests are in `utils/fileParser.test.ts` covering:

- Page number extraction
- Spread detection
- File parsing and sorting

## Common Issues

1. **Spread detection fails**: Ensure spreads use hyphenated or concatenated page numbers
2. **Dimension validation errors**: All regular pages must be same size; spreads must be 2x width
3. **Page ordering incorrect**: Check that filenames contain numbers or recognized keywords

## Future Enhancements

- Support for custom spread naming patterns
- Better CMYK conversion (requires color profile library)
- Batch processing for multiple projects
- Preview of final PDF before download
