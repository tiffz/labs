/* eslint-disable react/prop-types */
import React, { useRef, useEffect, useState, memo, useMemo } from 'react';
import type { PrintSheetCanvasProps, PageSlot } from '../types';

interface LoadedImageData {
  img: HTMLImageElement;
  slotConfig: PageSlot;
}

// Cache for rendered canvases to avoid re-rendering on tab switches
const canvasCache = new Map<string, string>();

const PrintSheetCanvas: React.FC<PrintSheetCanvasProps> = memo(({ 
  images, 
  imageFitModes, 
  paperConfig, 
  pageSlotsConfig 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  
  // Generate a cache key based on all inputs
  const cacheKey = useMemo(() => {
    const imageKeys = Object.entries(images).sort().map(([k, v]) => `${k}:${v?.slice(-20)}`).join('|');
    const fitKeys = Object.entries(imageFitModes).sort().map(([k, v]) => `${k}:${v}`).join('|');
    return `${imageKeys}||${fitKeys}||${paperConfig.width}-${paperConfig.height}-${paperConfig.dpi}`;
  }, [images, imageFitModes, paperConfig]);

  // Calculate dimensions - render at 2x for sharpness, display at 1x
  const { renderWidth, renderHeight, displayWidth, displayHeight, aspectRatio } = useMemo(() => {
    const isLandscape = paperConfig.width >= paperConfig.height;
    const w = isLandscape ? paperConfig.width : paperConfig.height;
    const h = isLandscape ? paperConfig.height : paperConfig.width;
    const ratio = w / h;
    
    // Display size (CSS pixels)
    const maxDisplayWidth = 800;
    const displayW = maxDisplayWidth;
    const displayH = Math.round(maxDisplayWidth / ratio);
    
    // Render size (2x for retina/sharpness)
    const scale = 2;
    const renderW = displayW * scale;
    const renderH = displayH * scale;
    
    return {
      renderWidth: renderW,
      renderHeight: renderH,
      displayWidth: displayW,
      displayHeight: displayH,
      aspectRatio: ratio,
    };
  }, [paperConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check cache first
    const cached = canvasCache.get(cacheKey);
    if (cached) {
      const img = new Image();
      img.onload = () => {
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        ctx.drawImage(img, 0, 0, renderWidth, renderHeight);
        setIsRendering(false);
      };
      img.src = cached;
      return;
    }

    setIsRendering(true);

    // Set canvas to high-resolution render size
    canvas.width = renderWidth;
    canvas.height = renderHeight;
    
    // Enable high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const panelWidth = canvas.width / 4;
    const panelHeight = canvas.height / 2;

    const imageLoadPromises: Promise<LoadedImageData>[] = [];
    
    pageSlotsConfig.forEach(slotConfig => {
      const imageSrc = images[slotConfig.id];
      if (imageSrc) {
        const promise = new Promise<LoadedImageData>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ img, slotConfig });
          img.onerror = () => reject(new Error(`Failed to load image for ${slotConfig.label}`));
          img.src = imageSrc;
        });
        imageLoadPromises.push(promise);
      }
    });

    Promise.all(imageLoadPromises).then(loadedImagesData => {
      loadedImagesData.forEach(({ img, slotConfig }) => {
        const col = (slotConfig.gridOrder - 1) % 4;
        const row = Math.floor((slotConfig.gridOrder - 1) / 4);
        const x = col * panelWidth;
        const y = row * panelHeight;
        
        const fitMode = imageFitModes[slotConfig.id] || 'cover';
        
        ctx.save();
        ctx.translate(x + panelWidth / 2, y + panelHeight / 2);
        
        if (slotConfig.rotation === 180) ctx.rotate(Math.PI);
        
        ctx.beginPath();
        ctx.rect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
        ctx.clip();

        let dw: number, dh: number;
        const imgAspectRatio = img.width / img.height;
        const panelAspectRatio = panelWidth / panelHeight;

        if (fitMode === 'contain') {
          if (imgAspectRatio > panelAspectRatio) {
            dw = panelWidth;
            dh = panelWidth / imgAspectRatio;
          } else {
            dh = panelHeight;
            dw = panelHeight * imgAspectRatio;
          }
        } else { // cover
          if (imgAspectRatio > panelAspectRatio) {
            dh = panelHeight;
            dw = panelHeight * imgAspectRatio;
          } else {
            dw = panelWidth;
            dh = panelWidth / imgAspectRatio;
          }
        }

        const dx = -dw / 2;
        const dy = -dh / 2;

        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      });
      
      // Cache the rendered result
      try {
        const dataUrl = canvas.toDataURL('image/png');
        canvasCache.set(cacheKey, dataUrl);
        // Limit cache size
        if (canvasCache.size > 10) {
          const firstKey = canvasCache.keys().next().value;
          if (firstKey) canvasCache.delete(firstKey);
        }
      } catch {
        // Ignore cache errors
      }
      
      setIsRendering(false);
    }).catch(error => {
      console.error("Error loading images for canvas:", error);
      setIsRendering(false);
    });
  }, [images, imageFitModes, paperConfig, pageSlotsConfig, cacheKey, renderWidth, renderHeight]);

  return (
    <div 
      ref={containerRef}
      id="printSheetCanvasContainer" 
      className="w-full max-w-4xl mx-auto relative"
      style={{ aspectRatio: `${aspectRatio}` }}
    >
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <p className="text-stone-500">Rendering preview...</p>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        id="printSheetCanvas"
        className="rounded-lg shadow-sm border border-stone-200"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          maxWidth: '100%',
        }}
      />
    </div>
  );
});

PrintSheetCanvas.displayName = 'PrintSheetCanvas';

export default PrintSheetCanvas;
