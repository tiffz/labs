import React, { useState, useEffect, useRef } from 'react';

interface CatProps {
  catRef: React.RefObject<SVGSVGElement>;
  onClick: (event: React.MouseEvent) => void;
  onEyeClick: (event: React.MouseEvent) => void;
  onEarClick: (ear: 'left' | 'right', event: React.MouseEvent) => void;
  isPetting: boolean;
  isStartled: boolean;
  isSleeping: boolean;
  isPouncing: boolean;
  isPlaying: boolean;
  pounceTarget: { x: number; y: number };
  wigglingEar: 'left' | 'right' | null;
  wiggleDuration: number | null;
  lastHeart: HTMLDivElement | null;
}

const Cat: React.FC<CatProps> = ({
  catRef,
  onClick,
  onEyeClick,
  onEarClick,
  isPetting,
  isStartled,
  isSleeping,
  isPouncing,
  isPlaying,
  pounceTarget,
  wigglingEar,
  wiggleDuration,
  lastHeart,
}) => {
  const [pupilsPos, setPupilsPos] = useState({
    left: { x: 80, y: 80 },
    right: { x: 120, y: 80 },
  });

  const pounceState = useRef({
    startTime: 0,
    isActive: false,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (isPouncing && !pounceState.current.isActive) {
      pounceState.current = {
        startTime: Date.now(),
        isActive: true,
        x: pounceTarget.x,
        y: pounceTarget.y,
      };
    }
    if (!isPouncing) {
      pounceState.current.isActive = false;
    }
  }, [isPouncing, pounceTarget]);

  useEffect(() => {
    let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let animationFrameId: number;

    const handleMouseMove = (event: MouseEvent) => {
      if (!lastHeart) {
        target = { x: event.clientX, y: event.clientY };
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      const catElement = catRef.current;
      if (!catElement) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      // Pounce Animation
      if (pounceState.current.isActive) {
        const progress = (Date.now() - pounceState.current.startTime) / 500;
        if (progress < 1) {
          const yOffset = -Math.sin(progress * Math.PI) * 30;
          const currentPounceX = pounceState.current.x * progress;
          const currentPounceY = pounceState.current.y * progress;
          catElement.style.transform = `translate(${currentPounceX}px, ${
            currentPounceY + yOffset
          }px)`;
        } else {
          pounceState.current.isActive = false; // End the pounce
        }
      } else {
        // Drift back to center if not pouncing
        const currentTransform = new DOMMatrix(getComputedStyle(catElement).transform);
        const currentX = currentTransform.m41;
        const currentY = currentTransform.m42;
        const driftFactor = 0.1;
        catElement.style.transform = `translate(${currentX * (1-driftFactor)}px, ${currentY * (1-driftFactor)}px)`;
      }

      // Eye Tracking
      if (lastHeart && lastHeart.isConnected) {
        const heartRect = lastHeart.getBoundingClientRect();
        target = {
          x: heartRect.left + heartRect.width / 2,
          y: heartRect.top + heartRect.height / 2,
        };
      }
      
      const catRect = catElement.getBoundingClientRect();
      const eyeLeftCenter = {
        x: catRect.left + (catRect.width * (90 / 220)),
        y: catRect.top + (catRect.height * (95 / 200)),
      };
      const eyeRightCenter = {
        x: catRect.left + (catRect.width * (130 / 220)),
        y: catRect.top + (catRect.height * (95 / 200)),
      };
      const maxPupilOffset = 4;

      const angleLeft = Math.atan2(target.y - eyeLeftCenter.y, target.x - eyeLeftCenter.x);
      const desiredPupilLeftX = 80 + Math.cos(angleLeft) * maxPupilOffset;
      const desiredPupilLeftY = 80 + Math.sin(angleLeft) * maxPupilOffset;

      const angleRight = Math.atan2(
        target.y - eyeRightCenter.y,
        target.x - eyeRightCenter.x
      );
      const desiredPupilRightX = 120 + Math.cos(angleRight) * maxPupilOffset;
      const desiredPupilRightY = 80 + Math.sin(angleRight) * maxPupilOffset;

      setPupilsPos((currentPos) => {
        const lerpFactor = 0.1;
        const newLeftX = currentPos.left.x + (desiredPupilLeftX - currentPos.left.x) * lerpFactor;
        const newLeftY = currentPos.left.y + (desiredPupilLeftY - currentPos.left.y) * lerpFactor;
        const newRightX = currentPos.right.x + (desiredPupilRightX - currentPos.right.x) * lerpFactor;
        const newRightY = currentPos.right.y + (desiredPupilRightY - currentPos.right.y) * lerpFactor;

        return {
          left: { x: newLeftX, y: newLeftY },
          right: { x: newRightX, y: newRightY },
        };
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [lastHeart, catRef, isPouncing, pounceTarget]);

  const containerClasses = [
    isPetting ? 'is-petting' : '',
    wiggleDuration ? 'is-wiggling' : '',
    isPlaying ? 'playing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const earStyle = wiggleDuration ? { animationDuration: `${wiggleDuration}s` } : {};

  const pounceStyle: React.CSSProperties = isPouncing
    ? ({
        '--pounce-x': `${pounceTarget.x}px`,
        '--pounce-y': `${pounceTarget.y}px`,
      } as React.CSSProperties)
    : {};

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
          <g
            id="left-ear"
            className={wigglingEar === 'left' ? 'ear-wiggling' : ''}
            style={earStyle}
            onClick={(e) => {
              e.stopPropagation();
              onEarClick('left', e);
            }}
          >
            <path
              d="M 50 70 L 60 45 L 80 70 Z"
              fill="#212121"
            />
          </g>
          {/* Right ear */}
          <g
            id="right-ear"
            className={wigglingEar === 'right' ? 'ear-wiggling' : ''}
            style={earStyle}
            onClick={(e) => {
              e.stopPropagation();
              onEarClick('right', e);
            }}
          >
            <path
              d="M 120 70 L 140 45 L 150 70 Z"
              fill="#212121"
            />
          </g>
          
          {/* Face */}
          <g id="face" transform="translate(0, -5)">
            {/* Sleeping Eyes */}
            <g className={`eye-sleeping ${isSleeping ? '' : 'hidden'}`}>
              <path
                d="M 74 82 Q 80 87, 86 82"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M 114 82 Q 120 87, 126 82"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
            </g>

            {/* Open Eyes */}
            <g
              className={`eye-open ${
                !isSleeping && !isStartled ? '' : 'hidden'
              }`}
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
              className={`eye-startled ${
                !isSleeping && isStartled ? '' : 'hidden'
              }`}
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