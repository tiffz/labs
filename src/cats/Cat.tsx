import React, { useState, useEffect, useRef } from 'react';

interface CatProps {
  onClick: (event: React.MouseEvent) => void;
  onEyeClick: (event: React.MouseEvent) => void;
  onEarClick: (ear: 'left' | 'right', event: React.MouseEvent) => void;
  onNoseClick: (event: React.MouseEvent) => void;
  onCheekClick: (side: 'left' | 'right', event: React.MouseEvent) => void;
  isPetting: boolean;
  isStartled: boolean;
  isSleeping: boolean;
  isDrowsy: boolean;
  isPouncing: boolean;
  isJumping: boolean;
  isPlaying: boolean;
  isSmiling: boolean;
  headTiltAngle: number;
  pounceTarget: { x: number; y: number };
  wigglingEar: 'left' | 'right' | null;
  wiggleDuration: number | null;
  lastHeart: HTMLDivElement | null;
  wandMode: boolean;
}

const Cat = React.forwardRef<SVGSVGElement, CatProps>(
  (
    props,
    catRef
  ) => {
    const {
      onClick,
      onEyeClick,
      onEarClick,
      onNoseClick,
      onCheekClick,
      isPetting,
      isStartled,
      isSleeping,
      isDrowsy,
      isPouncing,
      isJumping,
      isPlaying,
      isSmiling,
      headTiltAngle,
      pounceTarget,
      wigglingEar,
      wiggleDuration,
      lastHeart,
      wandMode,
    } = props;
    const [pupilsPos, setPupilsPos] = useState({
      left: { x: 80, y: 80 },
      right: { x: 120, y: 80 },
    });
    const [isBlinking, setIsBlinking] = useState(false);
    const drowsinessState = useRef({
      startTime: 0,
      drowsinessTimer: null as number | null,
    });

    const jumpState = React.useRef({
      startTime: 0,
      isActive: false,
      jumpHeight: 30,
      duration: 500,
    });

    const pounceState = React.useRef({
      startTime: 0,
      isActive: false,
      x: 0,
      y: 0,
      arcHeight: 30,
      overshootX: 0,
      overshootY: 0,
      duration: 500,
    });

    useEffect(() => {
      const drowsinessTimerRef = drowsinessState.current;
      if (isDrowsy) {
        drowsinessTimerRef.startTime = Date.now();
        const scheduleBlink = () => {
          const timeSinceDrowsy = Date.now() - drowsinessTimerRef.startTime;
          // As time progresses, blinks get more frequent (min interval 500ms)
          const blinkInterval = Math.max(500, 4000 - timeSinceDrowsy / 3);
          // As time progresses, blinks get longer (max duration 1000ms)
          const blinkDuration = Math.min(1000, 200 + timeSinceDrowsy / 5);

          drowsinessTimerRef.drowsinessTimer = window.setTimeout(() => {
            setIsBlinking(true);
            setTimeout(() => {
              setIsBlinking(false);
              scheduleBlink();
            }, blinkDuration);
          }, blinkInterval);
        };
        scheduleBlink();
      } else {
        if (drowsinessTimerRef.drowsinessTimer) {
          clearTimeout(drowsinessTimerRef.drowsinessTimer);
        }
        setIsBlinking(false);
        drowsinessTimerRef.startTime = 0;
      }

      return () => {
        if (drowsinessTimerRef.drowsinessTimer) {
          clearTimeout(drowsinessTimerRef.drowsinessTimer);
        }
      };
    }, [isDrowsy]);

    useEffect(() => {
      if (isJumping && !jumpState.current.isActive) {
        jumpState.current = {
          startTime: Date.now(),
          isActive: true,
          jumpHeight: 20 + Math.random() * 20, // Varies between 20 and 40
          duration: 450 + Math.random() * 100, // Varies between 450ms and 550ms
        };
      }
      if (!isJumping) {
        jumpState.current.isActive = false;
      }
    }, [isJumping]);

    useEffect(() => {
      if (isPouncing && !pounceState.current.isActive) {
        pounceState.current = {
          startTime: Date.now(),
          isActive: true,
          x: pounceTarget.x,
          y: pounceTarget.y,
          arcHeight: 20 + Math.random() * 20, // Varies between 20 and 40
          overshootX: (Math.random() - 0.5) * 10, // Varies between -5 and 5
          overshootY: (Math.random() - 0.5) * 10, // Varies between -5 and 5
          duration: 450 + Math.random() * 100, // Varies between 450ms and 550ms
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
        const catElement = catRef && 'current' in catRef ? catRef.current : null;
        if (!catElement) {
          animationFrameId = requestAnimationFrame(animate);
          return;
        }

        // Pounce Animation
        if (pounceState.current.isActive) {
          const progress =
            (Date.now() - pounceState.current.startTime) /
            pounceState.current.duration;
          if (progress < 1) {
            const yOffset =
              -Math.sin(progress * Math.PI) * pounceState.current.arcHeight;
            const targetX =
              pounceState.current.x + pounceState.current.overshootX;
            const targetY =
              pounceState.current.y + pounceState.current.overshootY;
            const currentPounceX = targetX * progress;
            const currentPounceY = targetY * progress;
            catElement.style.transform = `translate(${currentPounceX}px, ${
              currentPounceY + yOffset
            }px)`;
          } else {
            pounceState.current.isActive = false; // End the pounce
          }
        } else if (wandMode) {
          // Drift back to center if not pouncing
          const currentTransform = new DOMMatrix(
            getComputedStyle(catElement).transform
          );
          const currentX = currentTransform.m41;
          const currentY = currentTransform.m42;
          const driftFactor = 0.1;
          catElement.style.transform = `translate(${
            currentX * (1 - driftFactor)
          }px, ${currentY * (1 - driftFactor)}px)`;
        } else if (jumpState.current.isActive) {
          const progress =
            (Date.now() - jumpState.current.startTime) / jumpState.current.duration;
          if (progress < 1) {
            const jumpYOffset =
              -Math.sin(progress * Math.PI) * jumpState.current.jumpHeight;
            catElement.style.transform = `translateY(${jumpYOffset}px)`;
          } else {
            jumpState.current.isActive = false;
            catElement.style.transform = 'translateY(0px)';
          }
        } else {
          // Not in wand mode, not jumping - ensure it's at rest.
          const currentTransform = new DOMMatrix(
            getComputedStyle(catElement).transform
          );
          if (currentTransform.m41 !== 0 || currentTransform.m42 !== 0) {
            catElement.style.transform = `translate(0, 0)`;
          }
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
    }, [lastHeart, catRef, isPouncing, pounceTarget, wandMode]);

    const catContainerClasses = [
      isPetting ? 'is-petting' : '',
      wigglingEar ? 'is-wiggling' : '',
      isPlaying ? 'playing' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const earStyle = wiggleDuration ? { animationDuration: `${wiggleDuration}s` } : {};

    const headTiltTransform = `rotate(${headTiltAngle}deg)`;

    return (
      <svg
        ref={catRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 220 200"
        className="cat-svg"
      >
        <g
          id="cat-container"
          className={catContainerClasses}
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
            <path d="M 30 100 C -20 185, 220 185, 170 100 C 158.24 80, 41.76 80, 30 100 Z" fill="#212121" />
          </g>
          <g id="head-tilt-wrapper" style={{ transform: headTiltTransform, transformOrigin: '100px 110px' }}>
            <g id="head">
              <path
                d="M 30 100 C 20 40, 180 40, 170 100 C 170 120, 30 120, 30 100 Z"
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
                {/* Cheeks (invisible click targets) */}
                <g id="cheeks">
                  {/* Left Cheek */}
                  <circle
                    cx="60"
                    cy="95"
                    r="25"
                    fill="rgba(0,0,0,0)"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => onCheekClick('left', e)}
                  />
                  {/* Right Cheek */}
                  <circle
                    cx="140"
                    cy="95"
                    r="25"
                    fill="rgba(0,0,0,0)"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => onCheekClick('right', e)}
                  />
                </g>

                {/* Jumping Eyes */}
                <g
                  className={`eye-jumping ${
                    isJumping || isSmiling ? '' : 'hidden'
                  }`}
                  onClick={onEyeClick}
                >
                  <path
                    d="M 74 82 Q 80 77, 86 82"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d="M 114 82 Q 120 77, 126 82"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </g>

                {/* Sleeping Eyes */}
                <g className={`eye-sleeping ${isSleeping && !isJumping ? '' : 'hidden'}`} onClick={onEyeClick}>
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

                {/* Drowsy Eyes */}
                <g
                  className={`eye-drowsy ${
                    !isSleeping && isDrowsy && isBlinking && !isJumping ? '' : 'hidden'
                  }`}
                  onClick={onEyeClick}
                >
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
                    !isSleeping &&
                    !isStartled &&
                    (!isDrowsy || !isBlinking) &&
                    !isJumping &&
                    !isSmiling
                      ? ''
                      : 'hidden'
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
                    !isSleeping && isStartled && !isJumping ? '' : 'hidden'
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
                <path
                  d="M 97 90 L 103 90 L 100 94 Z"
                  fill="white"
                  onClick={onNoseClick}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            </g>
          </g>
        </g>
      </svg>
    );
  }
);
Cat.displayName = 'Cat';

export default Cat; 