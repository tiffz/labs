import React, { useRef, useEffect } from 'react';
import type { PrintSheetCanvasProps, PageSlot } from '../types';

interface LoadedImageData {
  img: HTMLImageElement;
  slotConfig: PageSlot;
}

const PrintSheetCanvas: React.FC<PrintSheetCanvasProps> = ({ 
  images, 
  imageFitModes, 
  paperConfig, 
  pageSlotsConfig 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isLandscape = paperConfig.width >= paperConfig.height;
    const paperWidthInUnits = isLandscape ? paperConfig.width : paperConfig.height;
    const paperHeightInUnits = isLandscape ? paperConfig.height : paperConfig.width;
    
    let pixelWidth = paperWidthInUnits * paperConfig.dpi;
    let pixelHeight = paperHeightInUnits * paperConfig.dpi;
    
    const MAX_CANVAS_DIM = 16000;
    if (pixelWidth > MAX_CANVAS_DIM || pixelHeight > MAX_CANVAS_DIM) {
      const scaleDown = Math.min(MAX_CANVAS_DIM / pixelWidth, MAX_CANVAS_DIM / pixelHeight);
      pixelWidth *= scaleDown;
      pixelHeight *= scaleDown;
      console.warn("Canvas scaled down.");
    }

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    
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
    }).catch(error => console.error("Error loading images for canvas:", error));
  }, [images, imageFitModes, paperConfig, pageSlotsConfig]);

  return (
    <div 
      id="printSheetCanvasContainer" 
      className="w-full h-auto" 
      style={{ aspectRatio: `${paperConfig.width}/${paperConfig.height}` }}
    >
      <canvas ref={canvasRef} id="printSheetCanvas" />
    </div>
  );
};

export default PrintSheetCanvas; 