import React, { useCallback } from 'react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  accept = 'image/*',
  multiple = true,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        onFilesSelected(Array.from(files));
      }
    },
    [onFilesSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging
          ? 'border-purple-500 bg-purple-50'
          : 'border-gray-300 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="space-y-4">
        <div className="text-4xl">📄</div>
        <div>
          <button
            type="button"
            onClick={handleClick}
            className="text-purple-600 hover:text-purple-700 font-semibold underline"
          >
            Click to upload
          </button>
          <span className="text-gray-600"> or drag and drop</span>
        </div>
        <p className="text-sm text-gray-500">
          Upload comic page images. Flexible naming: page1.png, page_1.png, 1.png, etc.
          <br />
          Explicit spreads: page1-2.png or 1-2.png. Pages are automatically paired into spreads.
        </p>
      </div>
    </div>
  );
};

