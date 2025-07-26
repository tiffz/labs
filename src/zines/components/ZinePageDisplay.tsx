import React, { useMemo } from 'react';
import type { ZinePageDisplayProps } from '../types';
import { DUMMY_PLACEHOLDER_IMAGE } from '../constants';

const ZinePageDisplay: React.FC<ZinePageDisplayProps> = ({ 
  imageSrc, 
  fitMode = 'cover', 
  rotation = 0, 
  altText = "Zine Page", 
  paperConfig, 
  isPrintSlot = false 
}) => {
  const imgSrcToDisplay = imageSrc || DUMMY_PLACEHOLDER_IMAGE;
  
  const zinePageAspectRatio = useMemo(() => {
    if (isPrintSlot) return 'auto';
    const pageW = paperConfig.width / 4;
    const pageH = paperConfig.height / 2;
    if (pageW === 0 || pageH === 0) return 'auto';
    return `${pageW} / ${pageH}`;
  }, [paperConfig, isPrintSlot]);

  const wrapperStyle = isPrintSlot 
    ? { aspectRatio: zinePageAspectRatio, width: '100%', height: '100%' } 
    : { width: '100%', height: '100%' };

  return (
    <div 
      className={`zine-page-display ${isPrintSlot ? 'zine-page-display-print-wrapper' : ''}`} 
      style={wrapperStyle}
    >
      <img 
        src={imgSrcToDisplay} 
        alt={altText} 
        style={{ 
          objectFit: fitMode, 
          transform: `rotate(${rotation}deg)` 
        }} 
      />
    </div>
  );
};

export default ZinePageDisplay; 