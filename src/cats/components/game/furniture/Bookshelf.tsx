import React from 'react';
import { UnifiedFurnitureRenderer } from '../../rendering/UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from '../../rendering/furnitureUtils';

interface BookshelfProps {
  x: number;
  z: number;
}

/**
 * Bookshelf - Unified Rendering System
 * 
 * Migrated from legacy positioning to unified system.
 * Key improvements:
 * - Consistent scaling and positioning
 * - Standardized coordinate system usage
 * - Proper responsive behavior
 */

// Bookshelf with three shelves and various books/decorations
const VB_W = 320; // Doubled from 160 (2x bigger and wider)
const VB_H = 640; // Doubled from 320 (2x bigger)

const Bookshelf: React.FC<BookshelfProps> = ({ x, z }) => {
  // Create furniture configuration using unified system
  const config = createFurnitureConfig({
    kind: 'bookshelf',
    ...FurniturePositioning.floor(x, z),
    viewBoxWidth: VB_W,
    viewBoxHeight: VB_H,
  });

  // Book colors
  const bookColors = [
    '#f5a3a3', // red
    '#a3c5f5', // blue
    '#a3f5a3', // green
    '#f5f5a3', // yellow
    '#c5a3f5', // purple
    '#f5c5a3', // orange
    '#a3f5f5', // teal
    '#f5a3c5', // pink
  ];

  return (
    <UnifiedFurnitureRenderer {...config} ariaLabel="bookshelf">
      {/* SVG content with consistent styling */}
      <defs>
          <linearGradient id="bookshelfFrame" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f0c8c8" />
            <stop offset="100%" stopColor="#e8b8b8" />
          </linearGradient>
          <linearGradient id="shelfWood" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b8722d" />
            <stop offset="100%" stopColor="#a0522d" />
          </linearGradient>
        </defs>

      {/* Bookshelf frame */}
          <rect x={0} y={0} width={VB_W} height={VB_H} rx={6} fill="url(#bookshelfFrame)" />

          {/* Shelves - scaled 2x */}
          <rect x={24} y={60} width={VB_W - 48} height={140} rx={6} fill="url(#shelfWood)" />
          <rect x={24} y={240} width={VB_W - 48} height={140} rx={6} fill="url(#shelfWood)" />
          <rect x={24} y={440} width={VB_W - 48} height={140} rx={6} fill="url(#shelfWood)" />

          {/* Books on shelf 1 (bottom) - scaled 2x */}
          {(() => {
            const books = [];
            const shelfY = 72; // 36 * 2
            const bookHeight = 108; // 54 * 2
            const bookWidth = 36; // 18 * 2
            const startX = 36; // 18 * 2
            
            for (let i = 0; i < 6; i++) {
              const x = startX + i * (bookWidth + 4); // gap also scaled
              const color = bookColors[i % bookColors.length];
              books.push(
                <rect 
                  key={`shelf1-book-${i}`}
                  x={x} 
                  y={shelfY} 
                  width={bookWidth} 
                  height={bookHeight} 
                  rx={4} 
                  fill={color}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="1"
                />
              );
            }
            return books;
          })()}

          {/* Books on shelf 2 (middle) - scaled 2x */}
          {(() => {
            const books = [];
            const shelfY = 252; // 126 * 2
            const bookHeight = 108; // 54 * 2
            const bookWidth = 36; // 18 * 2
            const startX = 36; // 18 * 2
            
            for (let i = 0; i < 5; i++) {
              const x = startX + i * (bookWidth + 4); // gap also scaled
              const color = bookColors[(i + 2) % bookColors.length];
              books.push(
                <rect 
                  key={`shelf2-book-${i}`}
                  x={x} 
                  y={shelfY} 
                  width={bookWidth} 
                  height={bookHeight} 
                  rx={4} 
                  fill={color}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="1"
                />
              );
            }
            
            // Add a plant pot - scaled 2x
            books.push(
              <g key="plant-pot">
                <rect x={256} y={shelfY} width={40} height={48} rx={4} fill="#d7a3a3" />
                <ellipse cx={276} cy={shelfY + 32} rx={16} ry={16} fill="#228b22" />
              </g>
            );
            
            return books;
          })()}

          {/* Books on shelf 3 (top) - scaled 2x */}
          {(() => {
            const books = [];
            const shelfY = 452; // 226 * 2
            const bookHeight = 108; // 54 * 2
            const bookWidth = 36; // 18 * 2
            const startX = 36; // 18 * 2
            
            for (let i = 0; i < 4; i++) {
              const x = startX + i * (bookWidth + 4); // gap also scaled
              const color = bookColors[(i + 4) % bookColors.length];
              books.push(
                <rect 
                  key={`shelf3-book-${i}`}
                  x={x} 
                  y={shelfY} 
                  width={bookWidth} 
                  height={bookHeight} 
                  rx={4} 
                  fill={color}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="1"
                />
              );
            }
            
            // Add a decorative plant in pot - scaled 2x
            books.push(
              <g key="decorative-plant">
                {/* Pot */}
                <rect x={220} y={shelfY} width={32} height={24} rx={4} fill="#8b4513" />
                <rect x={222} y={shelfY + 2} width={28} height={20} rx={3} fill="#a0522d" />
                
                {/* Plant stems and leaves - positioned to grow FROM INSIDE the pot */}
                <g fill="#228b22">
                  {/* Stems start from pot bottom and grow upward */}
                  <ellipse cx={228} cy={shelfY + 10} rx={2} ry={12} />
                  <ellipse cx={232} cy={shelfY + 8} rx={2} ry={14} />
                  <ellipse cx={236} cy={shelfY + 12} rx={2} ry={10} />
                  <ellipse cx={240} cy={shelfY + 9} rx={2} ry={13} />
                  <ellipse cx={244} cy={shelfY + 11} rx={2} ry={11} />
                </g>
                
                {/* Pot rim on top to show depth */}
                <ellipse cx={236} cy={shelfY + 2} rx={14} ry={3} fill="#654321" />
              </g>
            );
            
            return books;
          })()}

          {/* Bookshelf frame details - scaled 2x */}
          <rect x={4} y={4} width={VB_W - 8} height={VB_H - 8} rx={8} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
    </UnifiedFurnitureRenderer>
  );
};

export default Bookshelf;
