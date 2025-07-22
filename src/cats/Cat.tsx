import React, { useState, useEffect, useRef } from 'react';

interface CatProps {
  onClick: (event: React.MouseEvent) => void;
  onEyeClick: (event: React.MouseEvent) => void;
  isPetting: boolean;
  isStartled: boolean;
  isSleeping: boolean;
  wiggleDuration: number | null;
  lastHeart: HTMLDivElement | null;
}

const Cat: React.FC<CatProps> = ({
  onClick,
  onEyeClick,
  isPetting,
  isStartled,
  isSleeping,
  wiggleDuration,
  lastHeart,
}) => {
  const [pupilsPos, setPupilsPos] = useState({ left: { x: 80, y: 80 }, right: { x: 120, y: 80 } });
  const catRef = useRef<SVGSVGElement>(null);
  const lerpFactorRef = useRef(0.6); // Fast by default

  useEffect(() => {
    // When the main target changes, slow down the lerp for a smooth transition.
    lerpFactorRef.current = 0.15;
    const timer = setTimeout(() => {
      lerpFactorRef.current = 0.6; // Return to fast tracking after the transition
    }, 400);

    return () => clearTimeout(timer);
  }, [lastHeart]);

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
      if (lastHeart && lastHeart.isConnected) {
        const heartRect = lastHeart.getBoundingClientRect();
        target = {
          x: heartRect.left + heartRect.width / 2,
          y: heartRect.top + heartRect.height / 2,
        };
      }

      if (catRef.current) {
        const catRect = catRef.current.getBoundingClientRect();
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
          const lerpFactor = lerpFactorRef.current;
          const newLeftX =
            currentPos.left.x +
            (desiredPupilLeftX - currentPos.left.x) * lerpFactor;
          const newLeftY =
            currentPos.left.y +
            (desiredPupilLeftY - currentPos.left.y) * lerpFactor;
          const newRightX =
            currentPos.right.x +
            (desiredPupilRightX - currentPos.right.x) * lerpFactor;
          const newRightY =
            currentPos.right.y +
            (desiredPupilRightY - currentPos.right.y) * lerpFactor;

          return {
            left: { x: newLeftX, y: newLeftY },
            right: { x: newRightX, y: newRightY },
          };
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [lastHeart]);

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