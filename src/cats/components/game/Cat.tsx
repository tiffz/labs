import React, { useState, useEffect, useRef } from 'react';
import type { MouseState } from '../../hooks/useMouseTracking';

// === ANIMATION CONSTANTS ===
const ANIMATION_TIMINGS = {
  PETTING_DURATION: 200,
  EAR_WIGGLE_DURATION: 600,
  HAPPY_PLAY_MIN: 1000,
  HAPPY_PLAY_MAX: 3000,
  RETURN_BASE_DURATION: 250,
  RETURN_MIN_DURATION: 150,
  FRAME_INTERVAL: 1000 / 60, // 60fps
} as const;

const POUNCE_ANIMATION = {
  PREP_PHASE_RATIO: 0.15, // First 15% is butt waggle
  BASE_WAGGLE: 0.12,
  WAGGLE_FREQUENCY_BASE: 4,
  HORIZONTAL_WAGGLE_MULTIPLIER: 0.3,
  HORIZONTAL_MOVEMENT_SCALE: 8,
  EXCITEMENT_SPEEDUP: 60,
} as const;

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
  isSubtleWiggling: boolean;
  isHappyPlaying: boolean;
  isEarWiggling: boolean;
  headTiltAngle: number;
  mouseState: MouseState;
  pounceTarget: { x: number; y: number };
  wigglingEar: 'left' | 'right' | null;
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
      isSubtleWiggling,
      isHappyPlaying,
      isEarWiggling,
      headTiltAngle,
      mouseState,
      pounceTarget,
      wigglingEar,
      lastHeart,
      wandMode,
    } = props;
      // Removed pupilsPos state - now using direct DOM manipulation for smooth animation
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
      returning: false,
      returnStartTime: 0,
      returnStartX: 0,
      returnStartY: 0,
      excitementLevel: 0, // Track rapid pouncing excitement
      lastPounceTime: 0,
    });

    // Refs for animation loop to prevent stale closures and infinite re-renders
    const wandModeRef = React.useRef(wandMode);
    const isPlayingRef = React.useRef(isPlaying);
    const lastHeartRef = React.useRef(lastHeart);
    
    // Update refs when values change (without causing re-renders)
    wandModeRef.current = wandMode;
    isPlayingRef.current = isPlaying;
    lastHeartRef.current = lastHeart;

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
        const now = Date.now();
        const timeSinceLastPounce = now - pounceState.current.lastPounceTime;
        
        // Calculate excitement level based on rapid pouncing
        if (timeSinceLastPounce < 2000) { // If pouncing within 2 seconds
          pounceState.current.excitementLevel = Math.min(3, pounceState.current.excitementLevel + 1);
        } else {
          pounceState.current.excitementLevel = Math.max(0, pounceState.current.excitementLevel - 1);
        }
        
        // If cat was returning and gets interrupted, boost excitement even more
        if (pounceState.current.returning) {
          pounceState.current.excitementLevel = Math.min(3, pounceState.current.excitementLevel + 0.5);
        }
        
        pounceState.current = {
          startTime: now,
          isActive: true,
          x: pounceTarget.x,
          y: pounceTarget.y,
          arcHeight: 25 + Math.random() * 25, // Varies between 25 and 50 - more dramatic
          overshootX: (Math.random() - 0.5) * 16, // Varies between -8 and 8 - more realistic overshoot
          overshootY: (Math.random() - 0.5) * 16, // Varies between -8 and 8
          duration: 420 + Math.random() * 80, // Slightly faster for more dynamic feel
          returning: false,
          returnStartTime: 0,
          returnStartX: 0,
          returnStartY: 0,
          excitementLevel: pounceState.current.excitementLevel,
          lastPounceTime: now,
        };
      }
      if (!isPouncing) {
        pounceState.current.isActive = false;
        pounceState.current.returning = false;
        
        // Gradually decay excitement when not pouncing
        const now = Date.now();
        const timeSinceLastPounce = now - pounceState.current.lastPounceTime;
        if (timeSinceLastPounce > 3000 && pounceState.current.excitementLevel > 0) {
          pounceState.current.excitementLevel = Math.max(0, pounceState.current.excitementLevel - 0.1);
        }
      }
    }, [isPouncing, pounceTarget]);



    // Happy face logic is now handled by AnimationController

    useEffect(() => {
      let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      let animationFrameId: number;

      // Throttle animation updates to 60fps for smoother performance
      let lastAnimationTime = 0;
      const frameInterval = ANIMATION_TIMINGS.FRAME_INTERVAL;

      const animate = (currentTime: number) => {
        const catElement = catRef && 'current' in catRef ? catRef.current : null;
        if (!catElement) {
          animationFrameId = requestAnimationFrame(animate);
          return;
        }

        // Throttle to target FPS
        if (currentTime - lastAnimationTime < frameInterval) {
          animationFrameId = requestAnimationFrame(animate);
          return;
        }
        lastAnimationTime = currentTime;

        // Pounce Animation
        if (pounceState.current.isActive) {
          const progress =
            (Date.now() - pounceState.current.startTime) /
            pounceState.current.duration;
          if (progress < 1) {
            let scale = 1;
            let currentPounceX = 0;
            let currentPounceY = 0;
            let yOffset = 0;
            
            // Phase 1: Enhanced butt waggle preparation - first 15% of animation  
            if (progress < POUNCE_ANIMATION.PREP_PHASE_RATIO) {
              const prepProgress = progress / POUNCE_ANIMATION.PREP_PHASE_RATIO;
              
              // Enhanced butt waggle for every pounce regardless of trigger
              const distance = Math.hypot(pounceState.current.x, pounceState.current.y);
              const distanceIntensity = Math.min(1, distance / 80); // More sensitive to distance
              const excitementMultiplier = 1 + (pounceState.current.excitementLevel * 0.4); // More excitement effect
              const randomVariation = 0.8 + Math.random() * 0.4; // 0.8-1.2 variation
              
              const baseWaggle = 0.12; // Increased base waggle for more visibility
              const dynamicWaggle = baseWaggle * distanceIntensity * excitementMultiplier * randomVariation;
              
              // Multi-axis waggle for more realistic cat behavior
              const waggleFrequency = 4 + pounceState.current.excitementLevel;
              const waggleIntensity = dynamicWaggle * (1 - prepProgress * 0.7); // Fade slightly toward launch
              
              // Primary vertical waggle (butt raising)
              scale = 1 + (Math.sin(prepProgress * Math.PI * waggleFrequency) * waggleIntensity);
              
              // Add subtle horizontal waggle 
              const horizontalWaggle = Math.sin(prepProgress * Math.PI * waggleFrequency * 1.3) * waggleIntensity * 0.3;
              currentPounceX = horizontalWaggle * 8; // Small side-to-side movement
              
              // Stay mostly in place during prep with micro-movements
            }
            // Phase 2: Launch and flight - remaining 85%
            else {
              const flightProgress = (progress - 0.15) / 0.85;
              
              // Smooth easing for natural movement
              const easeProgress = flightProgress < 0.5 
                ? 2 * flightProgress * flightProgress 
                : 1 - Math.pow(-2 * flightProgress + 2, 2) / 2;
              
              // Natural arc - higher at the beginning, trailing off
              const arcProgress = Math.sin(flightProgress * Math.PI);
              yOffset = -arcProgress * pounceState.current.arcHeight;
              
              const targetX = pounceState.current.x + pounceState.current.overshootX;
              const targetY = pounceState.current.y + pounceState.current.overshootY;
              
              currentPounceX = targetX * easeProgress;
              currentPounceY = targetY * easeProgress;
              
              // Return to normal size after prep phase
              scale = 1;
            }
            
            catElement.style.transform = `translate(${currentPounceX.toFixed(2)}px, ${
              (currentPounceY + yOffset).toFixed(2)
            }px) scale(${scale.toFixed(3)})`;
          } else {
            pounceState.current.isActive = false;
            // Start smooth return to center immediately, no landing bounce
            pounceState.current.returning = true;
            pounceState.current.returnStartTime = Date.now();
            pounceState.current.returnStartX = pounceState.current.x + pounceState.current.overshootX;
            pounceState.current.returnStartY = pounceState.current.y + pounceState.current.overshootY;
          }
        }
        
                  // Smooth return to center animation
          if (pounceState.current.returning) {
            // Much faster return for snappier gameplay
            const baseReturnDuration = 250; // Reduced from 350ms
            const excitementSpeedup = pounceState.current.excitementLevel * 60; // Up to 180ms faster when very excited
            const returnDuration = Math.max(150, baseReturnDuration - excitementSpeedup);
          
          const returnProgress = Math.min(1, (Date.now() - pounceState.current.returnStartTime) / returnDuration);
          
          // Smooth ease-out for natural settling, with excitement causing slight tremor
          const easeOut = 1 - Math.pow(1 - returnProgress, 3);
          let currentX = pounceState.current.returnStartX * (1 - easeOut);
          let currentY = pounceState.current.returnStartY * (1 - easeOut);
          
          // Add excitement tremor when very excited
          if (pounceState.current.excitementLevel > 1) {
            const tremor = pounceState.current.excitementLevel * 0.5;
            const trembleX = Math.sin(Date.now() * 0.03) * tremor;
            const trembleY = Math.cos(Date.now() * 0.025) * tremor;
            currentX += trembleX;
            currentY += trembleY;
          }
          
          catElement.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px)`;
          
          if (returnProgress >= 1) {
            pounceState.current.returning = false;
            catElement.style.transform = 'translate(0px, 0px)';
          }
        } else if (wandModeRef.current && !pounceState.current.returning) {
          // Only drift if not actively returning from pounce
          const currentTransform = new DOMMatrix(
            getComputedStyle(catElement).transform
          );
          const currentX = currentTransform.m41;
          const currentY = currentTransform.m42;
          
          if (isPlayingRef.current) {
            // When playing, stay closer to center and let the CSS batting animation handle the movement
            const distance = Math.hypot(currentX, currentY);
            if (distance > 15.0) { // Pull back toward center when playing but too far out
              const driftFactor = 0.06; // Faster drift back to center when playing
              const newX = currentX * (1 - driftFactor);
              const newY = currentY * (1 - driftFactor);
              catElement.style.transform = `translate(${newX.toFixed(2)}px, ${newY.toFixed(2)}px)`;
            }
          } else {
            // Normal drift back to center when not playing
            const distance = Math.hypot(currentX, currentY);
            if (distance > 1.0) {
              const driftFactor = 0.02; // Very gentle
              const newX = currentX * (1 - driftFactor);
              const newY = currentY * (1 - driftFactor);
              catElement.style.transform = `translate(${newX.toFixed(2)}px, ${newY.toFixed(2)}px)`;
            }
          }
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
          if (currentTransform.m41 !== 0 || currentTransform.m42 !== 0 || currentTransform.a !== 1) {
            catElement.style.transform = `translate(0, 0) scale(1)`;
          }
        }

        // Eye Tracking
        if (lastHeartRef.current && lastHeartRef.current.isConnected) {
          const heartRect = lastHeartRef.current.getBoundingClientRect();
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

        // Use unified mouse tracking for eye movement
        const currentTarget = !lastHeartRef.current ? mouseState.smoothPositionRef.current : target;
        
        const angleLeft = Math.atan2(currentTarget.y - eyeLeftCenter.y, currentTarget.x - eyeLeftCenter.x);
        const desiredPupilLeftX = 80 + Math.cos(angleLeft) * maxPupilOffset;
        const desiredPupilLeftY = 80 + Math.sin(angleLeft) * maxPupilOffset;

        const angleRight = Math.atan2(
          currentTarget.y - eyeRightCenter.y,
          currentTarget.x - eyeRightCenter.x
        );
        const desiredPupilRightX = 120 + Math.cos(angleRight) * maxPupilOffset;
        const desiredPupilRightY = 80 + Math.sin(angleRight) * maxPupilOffset;

        // Update pupils directly in DOM to avoid React re-renders
        if (catElement) {
          const leftPupil = catElement.querySelector('#pupil-left');
          const rightPupil = catElement.querySelector('#pupil-right');
          
          if (leftPupil && rightPupil) {
            // Use direct DOM manipulation instead of React state
            const lerpFactor = 0.1;
            const currentLeftX = parseFloat(leftPupil.getAttribute('cx') || '80');
            const currentLeftY = parseFloat(leftPupil.getAttribute('cy') || '80');
            const currentRightX = parseFloat(rightPupil.getAttribute('cx') || '120');
            const currentRightY = parseFloat(rightPupil.getAttribute('cy') || '80');
            
            const newLeftX = currentLeftX + (desiredPupilLeftX - currentLeftX) * lerpFactor;
            const newLeftY = currentLeftY + (desiredPupilLeftY - currentLeftY) * lerpFactor;
            const newRightX = currentRightX + (desiredPupilRightX - currentRightX) * lerpFactor;
            const newRightY = currentRightY + (desiredPupilRightY - currentRightY) * lerpFactor;
            
            leftPupil.setAttribute('cx', newLeftX.toString());
            leftPupil.setAttribute('cy', newLeftY.toString());
            rightPupil.setAttribute('cx', newRightX.toString());
            rightPupil.setAttribute('cy', newRightY.toString());
          }
        }

        animationFrameId = requestAnimationFrame(animate);
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }, [catRef, mouseState.smoothPositionRef]); // Include smoothPositionRef dependency

    const svgClasses = [
      'cat-svg',
      isPetting ? 'is-petting' : '',
      wigglingEar === 'left' ? 'wiggling-left' : '',
      wigglingEar === 'right' ? 'wiggling-right' : '',
      isSubtleWiggling ? 'subtle-wiggling' : '',
      isEarWiggling ? 'ear-wiggling' : '',
      isPlaying ? 'playing' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const headTiltTransform = `rotate(${headTiltAngle}deg)`;

    // Determine the single, definitive eye state based on a clear priority
    let activeEyeState: 'sleepy' | 'startled' | 'happy' | 'open';

    if (isSleeping || (isDrowsy && isBlinking)) {
      activeEyeState = 'sleepy';
    } else if (isStartled) {
      activeEyeState = 'startled';
    } else if (isJumping || isSmiling || isHappyPlaying) {
      activeEyeState = 'happy';
    } else {
      activeEyeState = 'open';
    }

    return (
      <svg
        ref={catRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 220 200"
        className={svgClasses}
        data-cat-ref="true"
        data-testid="cat"
      >
        <g
          id="cat-container"
          data-testid="cat-body"
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
                className="ear-wiggling-left"
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
                className="ear-wiggling-right"
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

                {/* Happy Eyes */}
                <g
                  data-testid="eye-happy"
                  className={`eye-happy ${
                    activeEyeState === 'happy' ? '' : 'hidden'
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

                {/* Sleepy Eyes */}
                <g
                  data-testid="eye-sleepy"
                  className={`eye-sleeping ${
                    activeEyeState === 'sleepy' ? '' : 'hidden'
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
                  data-testid="eye-open"
                  className={`eye-open ${
                    activeEyeState === 'open' ? '' : 'hidden'
                  }`}
                  onClick={onEyeClick}
                >
                  <g>
                    <circle cx="80" cy="80" r="10" fill="white" />
                    <circle
                      id="pupil-left"
                      cx="80"
                      cy="80"
                      r="5"
                      fill="black"
                    />
                  </g>
                  <g>
                    <circle cx="120" cy="80" r="10" fill="white" />
                    <circle
                      id="pupil-right"
                      cx="120"
                      cy="80"
                      r="5"
                      fill="black"
                    />
                  </g>
                </g>

                {/* Startled Eyes */}
                <g
                  data-testid="eye-startled"
                  className={`eye-startled ${
                    activeEyeState === 'startled' ? '' : 'hidden'
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