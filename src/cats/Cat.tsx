import React, { useState, useEffect, useRef } from 'react';

interface CatProps {
  onClick: (event: React.MouseEvent) => void;
  onEyeClick: (event: React.MouseEvent) => void;
  isPetting: boolean;
  isStartled: boolean;
  wiggleDuration: number | null;
}

const Cat: React.FC<CatProps> = ({
  onClick,
  onEyeClick,
  isPetting,
  isStartled,
  wiggleDuration,
}) => {
  const [pupilsPos, setPupilsPos] = useState({ left: { x: 80, y: 80 }, right: { x: 120, y: 80 } });
  const catRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!catRef.current) return;

      const { clientX, clientY } = event;
      const catRect = catRef.current.getBoundingClientRect();
      
      const eyeLeftCenter = { x: catRect.left + (catRect.width * (90 / 220)), y: catRect.top + (catRect.height * (95 / 200)) };
      const eyeRightCenter = { x: catRect.left + (catRect.width * (130 / 220)), y: catRect.top + (catRect.height * (95 / 200)) };

      const maxPupilOffset = 4;

      const angleLeft = Math.atan2(clientY - eyeLeftCenter.y, clientX - eyeLeftCenter.x);
      const pupilLeftX = 80 + Math.cos(angleLeft) * maxPupilOffset;
      const pupilLeftY = 80 + Math.sin(angleLeft) * maxPupilOffset;

      const angleRight = Math.atan2(clientY - eyeRightCenter.y, clientX - eyeRightCenter.x);
      const pupilRightX = 120 + Math.cos(angleRight) * maxPupilOffset;
      const pupilRightY = 80 + Math.sin(angleRight) * maxPupilOffset;

      setPupilsPos({
        left: { x: pupilLeftX, y: pupilLeftY },
        right: { x: pupilRightX, y: pupilRightY },
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const containerClasses = [
    isPetting ? 'is-petting' : '',
    wiggleDuration ? 'is-wiggling' : ''
  ].filter(Boolean).join(' ');

  const earStyle = wiggleDuration ? { animationDuration: `${wiggleDuration}s` } : {};

  return (
    <svg
      ref={catRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 200"
      className="cat-svg"
    >
      <g
        id="cat-container"
        className={containerClasses}
        transform="translate(10, 20)"
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Tail */}
        <g id="tail">
          <path
            d="M 160 150 C 210 150, 210 90, 170 80 L 160 90 C 200 100, 200 145, 155 145 Z"
            fill="#212121"
          />
        </g>
        
        {/* Body */}
        <g id="body">
          <path
            d="M 30 100 C -20 185, 220 185, 170 100 Z"
            fill="#212121"
          />
        </g>

        {/* Head */}
        <g id="head">
          <path
            d="M 30 100 C 20 40, 180 40, 170 100 C 170 110, 30 110, 30 100 Z"
            fill="#212121"
          />
          {/* Left ear */}
          <g id="left-ear" style={earStyle}>
            <path
              d="M 50 70 L 60 45 L 80 70 Z"
              fill="#212121"
            />
          </g>
          {/* Right ear */}
          <g id="right-ear" style={earStyle}>
            <path
              d="M 120 70 L 140 45 L 150 70 Z"
              fill="#212121"
            />
          </g>
          
          {/* Face */}
          <g id="face" transform="translate(0, -5)">
            {/* Open Eyes */}
            <g
              className={`eye-open ${isStartled ? 'hidden' : ''}`}
              onClick={onEyeClick}
            >
              <g>
                <circle cx="80" cy="80" r="10" fill="white" />
                <circle
                  cx={pupilsPos.left.x}
                  cy={pupilsPos.left.y}
                  r="5"
                  fill="black"
                />
              </g>
              <g>
                <circle cx="120" cy="80" r="10" fill="white" />
                <circle
                  cx={pupilsPos.right.x}
                  cy={pupilsPos.right.y}
                  r="5"
                  fill="black"
                />
              </g>
            </g>

            {/* Startled Eyes */}
            <g
              className={`eye-startled ${isStartled ? '' : 'hidden'}`}
              onClick={onEyeClick}
            >
              <path
                d="M 75 75 L 85 80 L 75 85"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M 125 75 L 115 80 L 125 85"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
            </g>
            {/* Nose */}
            <path d="M 97 90 L 103 90 L 100 94 Z" fill="white" />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default Cat; 