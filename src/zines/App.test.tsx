import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import PaperConfiguration from './components/PaperConfiguration';
import { DEFAULT_PAPER_CONFIG, DEFAULT_BOOKLET_PAPER_CONFIG } from './constants';
import { DEFAULT_BLEED_CONFIG } from './types';

// Mock the StPageFlip library since it's loaded via CDN
beforeEach(() => {
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
});

// Mock Canvas API for PrintSheetCanvas component
beforeEach(() => {
  const mockContext = {
    fillStyle: '',
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  };
  
  // Canvas mock setup uses prototype patching below
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _mockCanvas = {
    getContext: vi.fn(() => mockContext),
    width: 800,
    height: 600,
    toDataURL: vi.fn(() => 'data:image/png;base64,test'),
  };
  
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: vi.fn(() => mockContext),
    writable: true
  });
  
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    value: vi.fn(() => 'data:image/png;base64,test'),
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

describe('Zine Studio App', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the main app with title', () => {
    render(<App />);
    
    // Title appears in header and footer, use getAllByText
    expect(screen.getAllByText('Zine Studio').length).toBeGreaterThan(0);
    expect(screen.getByText('Format zines for printing')).toBeInTheDocument();
  });

  it('renders mode toggle with minizine and booklet options', () => {
    render(<App />);
    
    expect(screen.getByText('Minizine')).toBeInTheDocument();
    expect(screen.getByText('Booklet')).toBeInTheDocument();
  });

  it('starts in minizine mode by default', () => {
    render(<App />);
    
    // In minizine mode, we should see the edit/print/preview toggle
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Print')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('switches to booklet mode when clicked', async () => {
    render(<App />);
    
    const bookletButton = screen.getByText('Booklet');
    fireEvent.click(bookletButton);
    
    // In booklet mode, we should see spreads/preview toggle
    await waitFor(() => {
      expect(screen.getByText('Spreads')).toBeInTheDocument();
    });
  });

  it('renders the export section', () => {
    render(<App />);
    
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders quality and size controls', () => {
    render(<App />);
    
    expect(screen.getByText('Quality & Size')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Resolution')).toBeInTheDocument();
  });

  it('renders upload slots in minizine edit mode', () => {
    render(<App />);
    
    // In edit mode, should see page slots
    expect(screen.getByText('Front Cover')).toBeInTheDocument();
    expect(screen.getByText('Back Cover')).toBeInTheDocument();
    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });

  it('renders instructions/folding guide', () => {
    render(<App />);
    
    expect(screen.getByText('Folding Guide')).toBeInTheDocument();
  });
});

describe('PaperConfiguration Component', () => {
  const mockOnConfigChange = vi.fn();
  const mockOnBleedChange = vi.fn();

  beforeEach(() => {
    mockOnConfigChange.mockClear();
    mockOnBleedChange.mockClear();
  });

  it('renders all paper configuration inputs', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange} 
        mode="minizine"
      />
    );

    expect(screen.getByLabelText('Width')).toBeInTheDocument();
    expect(screen.getByLabelText('Height')).toBeInTheDocument();
    expect(screen.getByLabelText('Unit')).toBeInTheDocument();
    expect(screen.getByLabelText('DPI')).toBeInTheDocument();
  });

  it('displays default values correctly', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange}
        mode="minizine" 
      />
    );

    expect(screen.getByDisplayValue('11')).toBeInTheDocument(); // width
    expect(screen.getByDisplayValue('8.5')).toBeInTheDocument(); // height
    expect(screen.getByDisplayValue('300')).toBeInTheDocument(); // dpi
  });

  it('calls onConfigChange when width input changes', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange}
        mode="minizine" 
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
        mode="minizine" 
      />
    );

    const unitSelect = screen.getByLabelText('Unit');
    fireEvent.change(unitSelect, { target: { value: 'cm' } });

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...DEFAULT_PAPER_CONFIG,
      unit: 'cm'
    });
  });

  it('renders size presets', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange}
        mode="minizine" 
      />
    );

    expect(screen.getByText('US Letter')).toBeInTheDocument();
    expect(screen.getByText('A4')).toBeInTheDocument();
  });

  it('applies preset when clicked', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange}
        mode="minizine" 
      />
    );

    const a4Button = screen.getByText('A4');
    fireEvent.click(a4Button);

    expect(mockOnConfigChange).toHaveBeenCalledWith({
      ...DEFAULT_PAPER_CONFIG,
      width: 297,
      height: 210,
      unit: 'mm'
    });
  });

  it('shows bleed settings in booklet mode', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_BOOKLET_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange}
        mode="booklet"
        bleedConfig={DEFAULT_BLEED_CONFIG}
        onBleedChange={mockOnBleedChange}
      />
    );

    // Check for bleed label (now includes description)
    expect(screen.getByText(/Bleed \(artwork extends beyond trim\)/)).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('3mm')).toBeInTheDocument();
    // Check for safe zone label
    expect(screen.getByText(/Safe Zone/)).toBeInTheDocument();
  });

  it('does not show bleed settings in minizine mode', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange}
        mode="minizine"
      />
    );

    expect(screen.queryByText('Bleed')).not.toBeInTheDocument();
  });

  it('calls onBleedChange when bleed preset is clicked', () => {
    render(
      <PaperConfiguration 
        paperConfig={DEFAULT_BOOKLET_PAPER_CONFIG} 
        onConfigChange={mockOnConfigChange}
        mode="booklet"
        bleedConfig={DEFAULT_BLEED_CONFIG}
        onBleedChange={mockOnBleedChange}
      />
    );

    const bleedButton = screen.getByText('3mm');
    fireEvent.click(bleedButton);

    expect(mockOnBleedChange).toHaveBeenCalledWith({
      top: 3,
      bottom: 3,
      left: 3,
      right: 3,
      unit: 'mm',
      quietArea: expect.any(Number), // Preserve existing or use default
    });
  });
});

describe('Mode Toggle Behavior', () => {
  it('displays correct presets for minizine mode', () => {
    render(<App />);
    
    // Minizine-specific presets
    expect(screen.getByText('US Letter')).toBeInTheDocument();
    expect(screen.getByText('Tabloid')).toBeInTheDocument();
  });

  it('displays correct presets for booklet mode', async () => {
    render(<App />);
    
    const bookletButton = screen.getByText('Booklet');
    fireEvent.click(bookletButton);
    
    await waitFor(() => {
      expect(screen.getByText('Digest')).toBeInTheDocument();
      expect(screen.getByText('US Standard')).toBeInTheDocument();
    });
  });
});

describe('Regression Tests', () => {
  it('default bleed should be 0.125 inches for Mixam compatibility', () => {
    // The default bleed config should be 0.125 inches
    expect(DEFAULT_BLEED_CONFIG.top).toBe(0.125);
    expect(DEFAULT_BLEED_CONFIG.unit).toBe('in');
  });

  it('default booklet paper config should be Digest size', () => {
    // Default should be Digest (5.5" x 8.5")
    expect(DEFAULT_BOOKLET_PAPER_CONFIG.width).toBe(5.5);
    expect(DEFAULT_BOOKLET_PAPER_CONFIG.height).toBe(8.5);
    expect(DEFAULT_BOOKLET_PAPER_CONFIG.unit).toBe('in');
  });

  it('booklet mode should show Mixam Presets label', async () => {
    render(<App />);
    
    const bookletButton = screen.getByText('Booklet');
    fireEvent.click(bookletButton);
    
    await waitFor(() => {
      expect(screen.getByText('Mixam Presets')).toBeInTheDocument();
    });
  });

  it('booklet presets should show dimensions inline', async () => {
    render(<App />);
    
    const bookletButton = screen.getByText('Booklet');
    fireEvent.click(bookletButton);
    
    await waitFor(() => {
      // Check that dimensions are shown for Digest preset
      expect(screen.getByText(/5\.5" × 8\.5"/)).toBeInTheDocument();
    });
  });

  it('minizine mode should NOT show Mixam Presets label', () => {
    render(<App />);
    
    // In minizine mode by default, should show "Sheet Size Presets"
    expect(screen.queryByText('Mixam Presets')).not.toBeInTheDocument();
    expect(screen.getByText('Sheet Size Presets')).toBeInTheDocument();
  });
});
