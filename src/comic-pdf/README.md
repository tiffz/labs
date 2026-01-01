# Mixam Comic PDF Converter

A microapp that automates the conversion of comic page images into Mixam-compatible PDFs for print production. The app handles Mixam's file naming conventions, detects double page spreads, and assembles them into a properly formatted PDF where spreads are single continuous pages.

## Features

- **Automatic Page Detection**: Parses Mixam naming conventions to determine page order
- **Spread Detection**: Automatically detects double page spreads from filename patterns
- **Image Validation**: Validates that all pages have consistent dimensions and spreads are correctly sized
- **PDF Generation**: Creates print-ready PDFs with proper page ordering
- **Spread Handling**: Double page spreads are created as single continuous pages (2x width) for proper printing

## Usage

1. Upload your comic page images using Mixam's naming convention
2. For regular pages: Use numbers in filename (e.g., "file1.pdf", "page2.jpg")
3. For double page spreads: Use hyphenated or concatenated page numbers (e.g., "page14-15.jpg" or "14-15.jpg")
4. Special keywords: "front", "back", "rear", "last", "inner" are recognized
5. Review the preview to ensure pages are detected correctly
6. Click "Generate Mixam PDF" to download your print-ready PDF

## File Naming Conventions

### Regular Pages

- `file1.pdf`, `file2.pdf`, `file3.pdf`
- `page1.jpg`, `page2.jpg`, `page3.jpg`
- Any filename containing a number will be used for ordering

### Double Page Spreads

- Hyphenated: `page14-15.jpg`, `14-15.jpg`
- Concatenated: `page14page15.jpg`, `1415.jpg`
- The app detects consecutive page numbers and treats them as spreads

### Special Keywords

- `front` or `frontcover` - Front cover (placed first)
- `back`, `rear`, `backcover` - Back cover (placed last)
- `last` - Last page
- `inner` - Inner back cover

## Requirements

- All regular pages must be the same size
- Spreads must be exactly 2× the width of regular pages
- Images should already include proper bleed areas as per Mixam templates

## Technical Details

- Built with React and TypeScript
- Uses `pdf-lib` for PDF generation
- Browser-based - no server required
- Supports drag-and-drop file upload
- Validates image dimensions before PDF generation
