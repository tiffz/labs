import React, { useState, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { PagePreview } from './components/PagePreview';
import { parseAndSortFiles } from './utils/fileParser';
import { processFiles, validateImageDimensions } from './utils/imageProcessor';
import { downloadPDF } from './utils/pdfGenerator';
import type { ParsedFile, PageInfo, SpreadInfo, PDFGenerationOptions, ValidationResult } from './types';

const App: React.FC = () => {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [spreads, setSpreads] = useState<SpreadInfo[]>([]);
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: false,
    errors: [],
    warnings: [],
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [options, setOptions] = useState<PDFGenerationOptions>({
    convertToCMYK: false,
  });

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    try {
      // Parse files
      const parsed = parseAndSortFiles(files);
      setParsedFiles(parsed);

      // Process images
      const { pages: processedPages, spreads: processedSpreads } = await processFiles(parsed);
      setPages(processedPages);
      setSpreads(processedSpreads);

      // Validate
      const validationResult = validateImageDimensions(processedPages, processedSpreads);
      setValidation(validationResult);
    } catch (error) {
      console.error('Error processing files:', error);
      setValidation({
        isValid: false,
        errors: [`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleRemoveFile = useCallback(async (parsedFile: ParsedFile) => {
    const newFiles = parsedFiles.filter(f => f.originalName !== parsedFile.originalName);
    setParsedFiles(newFiles);

    if (newFiles.length > 0) {
      // Reprocess remaining files
      const { pages: processedPages, spreads: processedSpreads } = await processFiles(newFiles);
      setPages(processedPages);
      setSpreads(processedSpreads);
      const validationResult = validateImageDimensions(processedPages, processedSpreads);
      setValidation(validationResult);
    } else {
      setPages([]);
      setSpreads([]);
      setValidation({ isValid: false, errors: [], warnings: [] });
    }
  }, [parsedFiles]);

  const handleReplaceFile = useCallback(async (parsedFile: ParsedFile) => {
    // Create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Replace the file in parsedFiles
      const newFiles = parsedFiles.map(f => 
        f.originalName === parsedFile.originalName 
          ? parseAndSortFiles([file])[0]
          : f
      );
      setParsedFiles(newFiles);

      // Reprocess all files
      const { pages: processedPages, spreads: processedSpreads } = await processFiles(newFiles);
      setPages(processedPages);
      setSpreads(processedSpreads);
      const validationResult = validateImageDimensions(processedPages, processedSpreads);
      setValidation(validationResult);
    };
    
    input.click();
  }, [parsedFiles]);

  const handleGeneratePDF = useCallback(async () => {
    if (!validation.isValid) {
      alert('Please fix validation errors before generating PDF.');
      return;
    }

    setIsGenerating(true);
    setPdfProgress(0);
    try {
      await downloadPDF(
        pages, 
        spreads, 
        options, 
        'mixam-comic.pdf',
        (progress) => {
          setPdfProgress(progress);
        }
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
      setPdfProgress(0);
    }
  }, [pages, spreads, options, validation.isValid]);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-purple-600 mb-2">
          Mixam Comic PDF Converter
        </h1>
        <p className="text-gray-600">
          Convert comic page images into Mixam-compatible PDFs with automatic spread detection
        </p>
      </header>

      <div className="space-y-6">
        {/* File Upload */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Upload Files</h2>
          <FileUploader onFilesSelected={handleFilesSelected} />
          {isProcessing && (
            <div className="mt-4 text-center text-gray-600">
              Processing images...
            </div>
          )}
        </section>

        {/* Preview and Validation */}
        {(pages.length > 0 || spreads.length > 0) && (
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Preview</h2>
            <PagePreview
              pages={pages}
              spreads={spreads}
              validation={validation}
              onRemove={handleRemoveFile}
              onReplace={handleReplaceFile}
            />
          </section>
        )}

        {/* Options */}
        {(pages.length > 0 || spreads.length > 0) && (
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Options</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.convertToCMYK}
                  onChange={(e) =>
                    setOptions({ ...options, convertToCMYK: e.target.checked })
                  }
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-gray-700">
                  Convert RGB to CMYK (Note: Browser limitations apply. Mixam can handle RGB conversion.)
                </span>
              </label>
            </div>
          </section>
        )}

        {/* Generate PDF Button */}
        {(pages.length > 0 || spreads.length > 0) && (
          <section>
            <div className="space-y-4">
              <div className="flex justify-center">
                <button
                  onClick={handleGeneratePDF}
                  disabled={!validation.isValid || isGenerating}
                  className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                    validation.isValid && !isGenerating
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? 'Generating PDF...' : 'Generate Mixam PDF'}
                </button>
              </div>
              {isGenerating && (
                <div className="max-w-md mx-auto">
                  <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-purple-600 h-full transition-all duration-300 ease-out"
                      style={{ width: `${pdfProgress * 100}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-gray-600 mt-2">
                    {Math.round(pdfProgress * 100)}% complete
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Instructions */}
        <section className="bg-purple-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-purple-800 mb-3">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Upload your comic page images using flexible naming conventions</li>
            <li>
              For regular pages: Use numbers in filename (e.g., &quot;page1.png&quot;, &quot;page_1.png&quot;, &quot;1.png&quot;)
            </li>
            <li>
              For explicit double page spreads: Use hyphenated page numbers (e.g., &quot;page1-2.png&quot;, &quot;1-2.png&quot;)
            </li>
            <li>Special keywords: &quot;front&quot;, &quot;back&quot;, &quot;rear&quot;, &quot;last&quot;, &quot;inner&quot; are recognized</li>
            <li>
              <strong>Automatic pairing:</strong> Consecutive pages are automatically paired into spreads. 
              For example, a 24-page comic becomes 12 spreads in the final PDF.
            </li>
            <li>Review the preview to ensure pages are detected correctly</li>
            <li>Click &quot;Generate Mixam PDF&quot; to download your print-ready PDF</li>
          </ol>
          <p className="mt-4 text-sm text-gray-600">
            <strong>Note:</strong> All regular pages must be the same size. Explicit spreads must be exactly 2× the width of regular pages.
            Pages are automatically paired into spreads when possible.
          </p>
        </section>
      </div>
    </div>
  );
};

export default App;

