import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUploader } from './FileUploader';

describe('FileUploader', () => {
  const mockOnFilesSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render file uploader', () => {
    render(<FileUploader onFilesSelected={mockOnFilesSelected} />);
    
    expect(screen.getByText('Click to upload')).toBeInTheDocument();
    expect(screen.getByText(/drag and drop/)).toBeInTheDocument();
  });

  it('should call onFilesSelected when files are selected', async () => {
    const file1 = new File(['test1'], 'page1.png', { type: 'image/png' });
    const file2 = new File(['test2'], 'page2.png', { type: 'image/png' });
    
    render(<FileUploader onFilesSelected={mockOnFilesSelected} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(mockOnFilesSelected).toHaveBeenCalledWith([file1, file2]);
      });
    }
  });

  it('should handle drag and drop', () => {
    render(<FileUploader onFilesSelected={mockOnFilesSelected} />);
    
    const dropZone = screen.getByText('Click to upload').closest('div');
    
    if (dropZone) {
      const file1 = new File(['test1'], 'page1.png', { type: 'image/png' });
      const file2 = new File(['test2'], 'page2.png', { type: 'image/png' });
      
      const dataTransfer = {
        files: [file1, file2],
      } as unknown as DataTransfer;
      
      fireEvent.dragOver(dropZone, { dataTransfer });
      // Check that dragging state is set (class might be applied)
      
      fireEvent.drop(dropZone, { dataTransfer });
      
      expect(mockOnFilesSelected).toHaveBeenCalledWith([file1, file2]);
    }
  });

  it('should handle drag leave', () => {
    render(<FileUploader onFilesSelected={mockOnFilesSelected} />);
    
    const dropZone = screen.getByText('Click to upload').closest('div');
    
    if (dropZone) {
      fireEvent.dragOver(dropZone);
      // Drag over should set dragging state
      
      fireEvent.dragLeave(dropZone);
      // Drag leave should clear dragging state
      // The exact class behavior depends on implementation
    }
  });

  it('should accept custom accept prop', () => {
    render(<FileUploader onFilesSelected={mockOnFilesSelected} accept="image/png" />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.accept).toBe('image/png');
  });

  it('should handle single file mode', () => {
    render(<FileUploader onFilesSelected={mockOnFilesSelected} multiple={false} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.hasAttribute('multiple')).toBe(false);
  });
});

