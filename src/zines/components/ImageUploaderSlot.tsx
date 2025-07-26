import React, { useRef, useState } from 'react';
import type { ImageUploadProps } from '../types';
import ZinePageDisplay from './ZinePageDisplay';

const ImageUploaderSlot: React.FC<ImageUploadProps> = ({
  slot,
  imageSrc,
  fitMode = 'cover',
  rotation = 0,
  onImageUpload,
  onImageRemove,
  onFitModeChange,
  onDragStart,
  onDrop,
  isDraggingOver,
  isBeingDragged,
  isPreviewMode,
  paperConfig,
  setModalContent
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileDragOver, setFileDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    setIsUploading(true);
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageUpload(slot.id, e.target?.result as string);
        if (event.target) event.target.value = '';
        setIsUploading(false);
      };
      reader.onerror = () => {
        console.error("Error reading file for slot " + slot.id);
        if (event.target) event.target.value = '';
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } else {
      if (event.target) event.target.value = '';
      setIsUploading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageRemove(slot.id);
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUploading && inputRef.current) inputRef.current.click();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(false);
    
    if (e.dataTransfer.types.includes('text/plain')) {
      onDrop(e, slot.id);
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
      return;
    }
    
    const html = e.dataTransfer.getData('text/html');
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const imgTag = doc.querySelector('img');
      const imgSrc = imgTag ? imgTag.src : null;
      if (imgSrc) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          onImageUpload(slot.id, dataUrl);
        };
        img.onerror = () => {
          setModalContent({
            title: 'Image Load Error',
            message: "Couldn't load image from that source due to security restrictions (CORS policy). Please try saving the image to your computer, then drag the file from your desktop."
          });
        };
        img.src = imgSrc;
      }
    }
  };

  const handleFileDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes('text/html')) {
      setFileDragOver(true);
    }
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(false);
  };

  let classNames = `image-uploader-slot relative ${isDraggingOver || fileDragOver ? 'dragging-over' : ''} ${isBeingDragged ? 'is-being-dragged' : ''}`;
  if (isPreviewMode) {
    classNames += ' preview-mode';
  } else {
    classNames += ' p-1';
  }

  return (
    <div
      className={classNames}
      onClick={() => !isPreviewMode && !imageSrc && !isUploading && inputRef.current && inputRef.current.click()}
      draggable={!isPreviewMode && !!imageSrc}
      onDragStart={(e) => {
        if (!isPreviewMode && imageSrc) {
          e.dataTransfer.setData("text/plain", slot.id);
          onDragStart(slot.id);
        } else {
          e.preventDefault();
        }
      }}
      onDragEnter={handleFileDragEnter}
      onDragLeave={handleFileDragLeave}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={handleFileDrop}
    >
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        id={`file-upload-${slot.id}`}
      />
      
      {!isPreviewMode && imageSrc && (
        <div className="persistent-label">{slot.label}</div>
      )}
      
      {imageSrc ? (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
          <ZinePageDisplay
            imageSrc={imageSrc}
            fitMode={fitMode}
            rotation={rotation}
            altText={slot.label}
            paperConfig={paperConfig}
            isPrintSlot={isPreviewMode}
          />
          {!isPreviewMode && (
            <div className="slot-controls">
              <div className="top-right-controls">
                <button onClick={handleReplace} className="icon-button replace-button" title="Replace Image">
                  <span>🔁</span>
                </button>
                <button onClick={handleRemove} className="icon-button remove-button" title="Remove image">
                  <span>🗑️</span>
                </button>
              </div>
              <div className="image-fit-controls z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFitModeChange(slot.id, 'contain');
                  }}
                  className={`image-fit-button ${fitMode === 'contain' ? 'active' : ''}`}
                  title="Fit image to frame (show all)"
                >
                  Fit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFitModeChange(slot.id, 'cover');
                  }}
                  className={`image-fit-button ${fitMode === 'cover' ? 'active' : ''}`}
                  title="Fill frame with image (may crop)"
                >
                  Fill
                </button>
              </div>
              {rotation > 0 && (
                <div className="rotation-indicator absolute top-1.5 left-1.5" title={`Rotated ${rotation}°`}>
                  <span className="mr-0.5">🔄</span> {rotation}°
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        !isPreviewMode && (
          <div className="placeholder-content flex flex-col items-center text-center" onClick={() => !isUploading && inputRef.current && inputRef.current.click()}>
            <span className="text-3xl mb-1 text-orange-400">🖼️</span>
            <span className="text-xs font-semibold text-amber-800">{slot.label}</span>
            <span className="text-xs text-amber-600">{slot.notes}</span>
            {rotation > 0 && (
              <div className="mt-1 text-xs text-teal-600 flex items-center">
                <span className="mr-0.5">🔄</span> Rotated {rotation}°
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default ImageUploaderSlot; 