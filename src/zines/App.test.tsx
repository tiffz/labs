import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import PaperConfiguration from './components/PaperConfiguration';
import ZinePageDisplay from './components/ZinePageDisplay';
import { DEFAULT_PAPER_CONFIG } from './constants';

// Mock the StPageFlip library since it's loaded via CDN
global.window.St = {
  PageFlip: vi.fn().mockImplementation(() => ({
    loadFromHTML: vi.fn(),
    on: vi.fn(),
    flipNext: vi.fn(),
    flipPrev: vi.fn(),
    getPageCount: vi.fn(() => 10),
    destroy: vi.fn()
  }))
};

// Mock Canvas API for PrintSheetCanvas component
beforeEach(() => {
  const mockCanvas = {
    getContext: vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn()
    })),
    width: 800,
    height: 600
  };
  
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: mockCanvas.getContext,
    writable: true
  });
  
  // Mock Image constructor for PrintSheetCanvas
  const MockImage = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src = '';
    width = 100;
    height = 100;
    
    constructor() {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  };
  
  Object.defineProperty(global, 'Image', {
    value: MockImage,
    writable: true
  });
});

describe('Minizine Maker App', () => {
  beforeEach(() => {
    // Clear any existing DOM elements
    document.body.innerHTML = '';
  });

  it('renders the main app with title', () => {
    render(<App />);
    
    expect(screen.getByText('Minizine Maker')).toBeInTheDocument();
    expect(screen.getByText('Craft your tiny tales & art!')).toBeInTheDocument();
  });

  it('renders the view mode selector with all three modes', () => {
    render(<App />);
    
    expect(screen.getByText('✏️ Edit')).toBeInTheDocument();
    expect(screen.getByText('👁️ Print Sheet')).toBeInTheDocument();
    expect(screen.getByText('📖 Read Zine')).toBeInTheDocument();
  });

  it('starts in edit mode by default', () => {
    render(<App />);
    
    const editButton = screen.getByText('✏️ Edit');
    expect(editButton).toHaveClass('active');
  });

  it('switches between view modes when buttons are clicked', () => {
    render(<App />);
    
    const printButton = screen.getByText('👁️ Print Sheet');
    fireEvent.click(printButton);
    
    expect(printButton).toHaveClass('active');
    expect(screen.getByText('✏️ Edit')).not.toHaveClass('active');
  });

  it('renders the folding guide instructions', () => {
    render(<App />);
    
    expect(screen.getByText('Folding Guide')).toBeInTheDocument();
    expect(screen.getByText(/Cut along center horizontal crease \(2 panels long\)/)).toBeInTheDocument();
  });

  it('renders the download button', () => {
    render(<App />);
    
    expect(screen.getByText('Download Zine as PNG')).toBeInTheDocument();
  });
});

describe('PaperConfiguration Component', () => {
  const mockOnConfigChange = vi.fn();

  beforeEach(() => {
    mockOnConfigChange.mockClear();
  });

  it('renders all paper configuration inputs', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange} 
      />
    );

    expect(screen.getByLabelText('Width')).toBeInTheDocument();
    expect(screen.getByLabelText('Height')).toBeInTheDocument();
    expect(screen.getByLabelText('Unit')).toBeInTheDocument();
    expect(screen.getByLabelText('Print DPI')).toBeInTheDocument();
  });

  it('displays default values correctly', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange} 
      />
    );

    expect(screen.getByDisplayValue('11')).toBeInTheDocument(); // width
    expect(screen.getByDisplayValue('8.5')).toBeInTheDocument(); // height
    expect(screen.getByDisplayValue('300')).toBeInTheDocument(); // dpi
    
    // For select elements, check the selected option differently
    const unitSelect = screen.getByLabelText('Unit') as HTMLSelectElement;
    expect(unitSelect.value).toBe('in');
  });

  it('calls onConfigChange when width input changes', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange} 
      />
    );

    const widthInput = screen.getByLabelText('Width');
    fireEvent.change(widthInput, { target: { value: '12' } });

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...DEFAULT_PAPER_CONFIG,
      width: 12
    });
  });

  it('calls onConfigChange when unit changes', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange} 
      />
    );

    const unitSelect = screen.getByLabelText('Unit');
    fireEvent.change(unitSelect, { target: { value: 'cm' } });

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...DEFAULT_PAPER_CONFIG,
      unit: 'cm'
    });
  });
});

describe('ZinePageDisplay Component', () => {
  const mockPaperConfig = {
    width: 11,
    height: 8.5,
    unit: 'in' as const,
    dpi: 300
  };

  it('renders with placeholder image when no imageSrc provided', () => {
    render(
      <ZinePageDisplay 
        paperConfig={mockPaperConfig}
        altText="Test Page" 
      />
    );

    const img = screen.getByAltText('Test Page');
    expect(img).toBeInTheDocument();
    // Should use the dummy placeholder image
    expect(img).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
  });

  it('renders with provided image source', () => {
    const testImageSrc = 'data:image/png;base64,test';
    
    render(
      <ZinePageDisplay 
        imageSrc={testImageSrc}
        paperConfig={mockPaperConfig}
        altText="Test Page" 
      />
    );

    const img = screen.getByAltText('Test Page');
    expect(img).toHaveAttribute('src', testImageSrc);
  });

  it('applies correct fit mode styles', () => {
    render(
      <ZinePageDisplay 
        imageSrc="test.jpg"
        fitMode="contain"
        paperConfig={mockPaperConfig}
        altText="Test Page" 
      />
    );

    const img = screen.getByAltText('Test Page');
    expect(img).toHaveStyle('object-fit: contain');
  });

  it('applies rotation transform', () => {
    render(
      <ZinePageDisplay 
        imageSrc="test.jpg"
        rotation={180}
        paperConfig={mockPaperConfig}
        altText="Test Page" 
      />
    );

    const img = screen.getByAltText('Test Page');
    expect(img).toHaveStyle('transform: rotate(180deg)');
  });
}); 