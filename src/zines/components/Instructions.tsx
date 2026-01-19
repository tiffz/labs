/* eslint-disable react/prop-types */
import React, { useState, memo } from 'react';
import type { ZineMode } from '../types';

interface InstructionsProps {
  mode: ZineMode;
}

const Instructions: React.FC<InstructionsProps> = memo(({ mode }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (mode === 'minizine') {
    return (
      <div className="card">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-amber-50/50 transition-colors rounded-lg"
        >
          <span className="card-title">
            <span>📜</span>
            Folding Guide
          </span>
          <span className="text-amber-400 text-sm">{isExpanded ? '−' : '+'}</span>
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-amber-100">
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-amber-800 mt-3">
              <li>Download your zine as a PNG</li>
              <li>Print at <strong>100%</strong> scale, <strong>Landscape</strong>, one-sided</li>
              <li>Fold lengthwise (hotdog style)</li>
              <li>Fold widthwise (hamburger style)</li>
              <li>Fold outer edges to center</li>
              <li>Unfold, cut along center horizontal crease</li>
              <li>Refold into booklet</li>
            </ol>
            <p className="mt-3 text-xs text-amber-600">
              Search &quot;8 page zine fold&quot; on YouTube for tutorials
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-amber-50/50 transition-colors rounded-lg"
      >
        <span className="card-title">
          <span>📖</span>
          How It Works
        </span>
        <span className="text-amber-400 text-sm">{isExpanded ? '−' : '+'}</span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-amber-100">
          <div className="mt-3 space-y-2 text-sm text-amber-800">
            <p><strong>File naming for auto-ordering:</strong></p>
            <ul className="list-disc list-inside ml-2 text-xs space-y-0.5 text-amber-600">
              <li>&quot;page1.png&quot;, &quot;1.png&quot; for numbered pages</li>
              <li>&quot;front&quot;, &quot;back&quot; for covers</li>
              <li>&quot;page14-15.jpg&quot; for double-page spreads</li>
            </ul>
          </div>
          <p className="mt-3 text-xs text-amber-600">
            PDF exports are formatted as facing pages for professional printing
          </p>
        </div>
      )}
    </div>
  );
});

Instructions.displayName = 'Instructions';

export default Instructions;
