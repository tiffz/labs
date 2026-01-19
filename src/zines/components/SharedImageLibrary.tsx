/* eslint-disable react/prop-types */
import React, { memo, useCallback } from 'react';

interface UploadedImage {
  file?: File; // Optional - may be undefined for synthetic images (split/combined)
  name: string; // Display name for the image
  dataUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  id: string;
}

interface SharedImageLibraryProps {
  images: UploadedImage[];
  onRemove: (imageId: string) => void;
  onClearAll?: () => void;
  onSelectForSlot?: (imageId: string) => void;
  assignedImageIds?: Set<string>;
  slotsFilledCount?: number;
  totalSlots?: number;
  compact?: boolean;
}

const SharedImageLibrary: React.FC<SharedImageLibraryProps> = memo(({
  images,
  onRemove,
  onClearAll,
  onSelectForSlot,
  assignedImageIds = new Set(),
  slotsFilledCount,
  totalSlots,
  compact = false,
}) => {
  const handleClearAll = useCallback(() => {
    if (onClearAll && window.confirm('Remove all uploaded images? This cannot be undone.')) {
      onClearAll();
    }
  }, [onClearAll]);

  if (images.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between w-full">
          <h2 className="card-title">
            <span>🖼️</span>
            Images
            <span className="text-sm font-normal text-stone-500 ml-2">
              ({images.length} uploaded
              {slotsFilledCount !== undefined && totalSlots !== undefined && (
                <> · {slotsFilledCount}/{totalSlots} slots</>
              )}
              )
            </span>
          </h2>
          {onClearAll && (
            <button 
              onClick={handleClearAll}
              className="text-red-400 hover:text-red-500 text-sm font-heading font-bold flex items-center gap-1"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>
      
      <div className="card-body">
        <div className={`flex flex-wrap gap-2 ${compact ? 'max-h-28' : 'max-h-40'} overflow-y-auto`}>
          {images.map((image) => {
            const isAssigned = assignedImageIds.has(image.id);
            
            return (
              <div
                key={image.id}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                  isAssigned 
                    ? 'border-teal-400 opacity-60' 
                    : 'border-amber-200 hover:border-orange-400 cursor-pointer hover:scale-105'
                }`}
                style={{ 
                  width: compact ? '44px' : '56px', 
                  height: compact ? '44px' : '56px' 
                }}
                onClick={() => {
                  if (onSelectForSlot && !isAssigned) {
                    onSelectForSlot(image.id);
                  }
                }}
                title={`${image.name}${isAssigned ? ' (in use)' : ''}`}
              >
                <img
                  src={image.thumbnailUrl || image.dataUrl}
                  alt={image.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(image.id);
                  }}
                  className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
                  title="Remove"
                >
                  ×
                </button>
                
                {/* Assigned indicator */}
                {isAssigned && (
                  <div className="absolute bottom-0 left-0 right-0 bg-teal-600 text-white text-[7px] text-center">
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {onSelectForSlot && (
          <p className="text-xs text-amber-600 mt-2 font-handwriting">
            Click an image to add it to an empty slot
          </p>
        )}
      </div>
    </div>
  );
});

SharedImageLibrary.displayName = 'SharedImageLibrary';

export default SharedImageLibrary;
