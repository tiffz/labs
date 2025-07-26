import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { PaperConfig, ModalContent, ViewMode } from './types';
import { PAGE_SLOTS_CONFIG, FILENAME_MAP, DEFAULT_PAPER_CONFIG } from './constants';
import PaperConfiguration from './components/PaperConfiguration';
import ImageUploaderSlot from './components/ImageUploaderSlot';
import BookPreview from './components/BookPreview';
import PrintSheetCanvas from './components/PrintSheetCanvas';

const App: React.FC = () => {
  const [paperConfig, setPaperConfig] = useState<PaperConfig>(DEFAULT_PAPER_CONFIG);
  const [images, setImages] = useState<Record<string, string>>({});
  const [imageFitModes, setImageFitModes] = useState<Record<string, 'cover' | 'contain'>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  
  const multipleFilesInputRef = useRef<HTMLInputElement>(null);

  const handleImageFitChange = useCallback((slotId: string, mode: 'cover' | 'contain') => {
    setImageFitModes(prev => ({ ...prev, [slotId]: mode }));
  }, []);

  const handleSingleImageUpload = useCallback((slotId: string, imageDataUrl: string) => {
    setImages(prev => ({ ...prev, [slotId]: imageDataUrl }));
    setImageFitModes(prev => ({ ...prev, [slotId]: 'cover' }));
  }, []);

  const handleImageRemove = useCallback((slotId: string) => {
    setImages(prev => {
      const newImages = { ...prev };
      delete newImages[slotId];
      return newImages;
    });
    setImageFitModes(prev => {
      const newFitModes = { ...prev };
      delete newFitModes[slotId];
      return newFitModes;
    });
  }, []);

  const handleMultipleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      event.target.value = '';
      return;
    }

    const filesToProcess = files.map(file => {
      const normalizedName = file.name.replace(/\.[^/.]+$/, "").replace(/[\s_-]/g, "").toLowerCase();
      for (const [slotId, keywords] of Object.entries(FILENAME_MAP)) {
        if (keywords.some(kw => normalizedName.includes(kw))) {
          return { file, slotId, matched: true };
        }
      }
      return { file, slotId: null, matched: false };
    });

    const smartPlaced: Record<string, File> = {};
    const sequentialFiles: File[] = [];

    filesToProcess.forEach(item => {
      if (item.matched && item.slotId) {
        smartPlaced[item.slotId] = item.file;
      } else {
        sequentialFiles.push(item.file);
      }
    });

    // Handle smart-placed files
    Object.entries(smartPlaced).forEach(([slotId, file]) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => ({ ...prev, [slotId]: e.target?.result as string }));
        setImageFitModes(prev => ({ ...prev, [slotId]: 'cover' }));
      };
      reader.readAsDataURL(file);
    });

    // Handle sequential files
    if (sequentialFiles.length > 0) {
      setTimeout(() => {
        setImages(prevImages => {
          const updatedImages = { ...prevImages };
          let fileIdx = 0;
          for (const slotConfig of PAGE_SLOTS_CONFIG) {
            if (fileIdx >= sequentialFiles.length) break;
            if (!updatedImages[slotConfig.id]) {
              const file = sequentialFiles[fileIdx];
              const reader = new FileReader();
              reader.onload = (e) => {
                setImages(prev => ({ ...prev, [slotConfig.id]: e.target?.result as string }));
                setImageFitModes(prev => ({ ...prev, [slotConfig.id]: 'cover' }));
              };
              reader.readAsDataURL(file);
              fileIdx++;
              updatedImages[slotConfig.id] = 'placeholder'; // Prevent re-filling
            }
          }
          return updatedImages;
        });
      }, 100);
    }

    event.target.value = '';
  };

  const handleDragStart = useCallback((slotId: string) => {
    setDraggedSlotId(slotId);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent, targetSlotId: string) => {
    event.preventDefault();
    if (targetSlotId !== dragOverSlotId) setDragOverSlotId(targetSlotId);
  }, [dragOverSlotId]);

  const handleDragLeave = useCallback(() => {
    setDragOverSlotId(null);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent, targetSlotId: string) => {
    event.preventDefault();
    setDragOverSlotId(null);
    
    if (event.dataTransfer.files.length > 0) return;
    
    const draggedId = event.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== targetSlotId) {
      const imgDrag = images[draggedId];
      const imgTarget = images[targetSlotId];
      const fitDrag = imageFitModes[draggedId] || 'cover';
      const fitTarget = imageFitModes[targetSlotId] || 'cover';
      
      setImages(currentImages => {
        const newImages = { ...currentImages };
        newImages[targetSlotId] = imgDrag;
        newImages[draggedId] = imgTarget;
        if (!imgTarget) delete newImages[draggedId];
        if (!imgDrag && imgTarget) delete newImages[targetSlotId];
        return newImages;
      });
      
      setImageFitModes(currentFitModes => {
        const newFitModes = { ...currentFitModes };
        newFitModes[targetSlotId] = fitDrag;
        newFitModes[draggedId] = fitTarget;
        if (!imgTarget) delete newFitModes[draggedId];
        if (!imgDrag && imgTarget) delete newFitModes[targetSlotId];
        return newFitModes;
      });
    }
    setDraggedSlotId(null);
  }, [images, imageFitModes]);

  const handleDragEnd = useCallback(() => {
    setDraggedSlotId(null);
    setDragOverSlotId(null);
  }, []);

  const handlePaperConfigChange = (newConfig: PaperConfig) => {
    setPaperConfig(newConfig);
  };

  const handleDownloadPNG = () => {
    const canvas = document.getElementById('printSheetCanvas') as HTMLCanvasElement;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'minizine_layout.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Please switch to 'Print Sheet' view to generate the PNG.");
    }
  };

  const selectViewMode = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const aspectRatioPaddingForGrid = useMemo(() => {
    const w = paperConfig.width > paperConfig.height ? paperConfig.width : paperConfig.height;
    const h = paperConfig.width > paperConfig.height ? paperConfig.height : paperConfig.width;
    if (w === 0 || h === 0) return '50%';
    return `${(h / w) * 100}%`;
  }, [paperConfig]);

  return (
    <>
      {modalContent && (
        <div className="modal-overlay" onClick={() => setModalContent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{modalContent.title}</h2>
            <p className="modal-body">{modalContent.message}</p>
            <button className="custom-button" onClick={() => setModalContent(null)}>
              Got it
            </button>
          </div>
        </div>
      )}
      
      <div className="container mx-auto p-4 md:p-6">
        <header className="mb-10 text-center">
          <h1 className="font-heading text-5xl md:text-6xl font-bold text-orange-600">
            Minizine Maker
          </h1>
          <p className="text-amber-700 mt-3 text-xl">Craft your tiny tales & art!</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-8">
            <PaperConfiguration 
              paperConfig={paperConfig} 
              onConfigChange={handlePaperConfigChange} 
            />
            
            <div className="instruction-card-bg p-5 rounded-xl custom-shadow-sm">
              <h3 className="font-heading text-2xl font-bold mb-3 text-teal-700 flex items-center">
                <span className="mr-2 text-2xl">📜</span> Folding Guide
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-teal-800 font-secondary-text">
                <li>Download your zine as a PNG.</li>
                <li>Open the PNG and print it. Ensure printer settings match your paper size & DPI, use <strong>Landscape</strong> orientation, and scale to <strong>100%</strong> (Actual Size). Print on one side.</li>
                <li>Fold hotdog style (lengthwise).</li>
                <li>Fold hamburger style (widthwise).</li>
                <li>Fold outer edges to center crease.</li>
                <li>Unfold last two. Cut along center horizontal crease (2 panels long).</li>
                <li>Refold into booklet! (Search &ldquo;8 page zine fold&rdquo; for videos).</li>
              </ol>
            </div>
          </div>
          
          <div className="lg:col-span-2 zine-layout-container">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
              <h2 className="font-heading text-3xl font-bold text-orange-500 text-center sm:text-left">
                Your Zine Layout
              </h2>
              <div className="view-mode-selector flex justify-center sm:justify-end">
                <button 
                  onClick={() => selectViewMode('edit')} 
                  className={viewMode === 'edit' ? 'active' : ''}
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => selectViewMode('printPreview')} 
                  className={viewMode === 'printPreview' ? 'active' : ''}
                >
                  👁️ Print Sheet
                </button>
                <button 
                  onClick={() => selectViewMode('bookPreview')} 
                  className={viewMode === 'bookPreview' ? 'active' : ''}
                >
                  📖 Read Zine
                </button>
              </div>
            </div>
            
            {viewMode === 'edit' && (
              <>
                <div className="flex justify-center mb-3">
                  <div className="text-center">
                    <button 
                      className="custom-button-secondary" 
                      onClick={() => multipleFilesInputRef.current && multipleFilesInputRef.current.click()}
                    >
                      Upload Multiple Images
                    </button>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      ref={multipleFilesInputRef} 
                      className="hidden" 
                      onChange={handleMultipleFilesSelected}
                    />
                    <p className="text-xs text-amber-700 mt-1">
                      Tip: Name files &ldquo;page1&rdquo;, &ldquo;frontcover&rdquo;, etc. for auto-placement!
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-700 mb-3 text-center">
                  Click slots to upload. Drag & drop to reorder. Use &lsquo;Fit&rsquo; or &lsquo;Fill&rsquo;.
                </p>
              </>
            )}
            
            {viewMode === 'printPreview' && (
              <p className="text-xs text-amber-700 mb-3 text-center">
                This is how your zine will look on a single sheet for printing.
              </p>
            )}
            
            {viewMode === 'bookPreview' && (
              <p className="text-xs text-amber-700 mb-3 text-center">
                Realistic book experience! Covers appear as single pages, spreads show page ranges, all with silky-smooth floppy animation.
              </p>
            )}
            
            {viewMode === 'edit' ? (
              <div 
                className="aspect-ratio-container-for-grid custom-shadow-lg" 
                style={{ 
                  '--aspect-ratio-padding': aspectRatioPaddingForGrid, 
                  '--grid-gap': '8px', 
                  '--grid-padding': '8px', 
                  '--grid-bg-color': '#FFE0B2', 
                  '--grid-border': 'none', 
                  '--grid-border-radius': '12px' 
                } as React.CSSProperties} 
                onDragLeave={handleDragLeave}
              >
                <div className="aspect-ratio-content-for-grid">
                  {PAGE_SLOTS_CONFIG.map(slot => (
                    <ImageUploaderSlot
                      key={slot.id}
                      slot={slot}
                      imageSrc={images[slot.id]}
                      fitMode={imageFitModes[slot.id] || 'cover'}
                      rotation={slot.rotation}
                      onImageUpload={handleSingleImageUpload}
                      onImageRemove={handleImageRemove}
                      onFitModeChange={handleImageFitChange}
                      onDragStart={handleDragStart}
                      onDragOver={(e) => handleDragOver(e, slot.id)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDraggingOver={dragOverSlotId === slot.id}
                      isBeingDragged={draggedSlotId === slot.id}
                      isPreviewMode={false}
                      paperConfig={paperConfig}
                      setModalContent={setModalContent}
                    />
                  ))}
                </div>
              </div>
            ) : viewMode === 'printPreview' ? (
              <PrintSheetCanvas 
                images={images} 
                imageFitModes={imageFitModes} 
                paperConfig={paperConfig} 
                pageSlotsConfig={PAGE_SLOTS_CONFIG} 
              />
            ) : (
              <BookPreview 
                images={images} 
                imageFitModes={imageFitModes} 
                paperConfig={paperConfig} 
              />
            )}
            
            <div className="text-center mt-6 download-button-container">
              <button onClick={handleDownloadPNG} className="custom-button">
                <span className="mr-2 text-xl">🖼️</span> Download Zine as PNG
              </button>
            </div>
          </div>
        </div>
        
        <footer className="text-center mt-16 py-8 border-t-2 border-dashed border-amber-300">
          <p className="text-amber-700">Minizine Magic Maker ~ Made with ♡</p>
        </footer>
      </div>
    </>
  );
};

export default App; 