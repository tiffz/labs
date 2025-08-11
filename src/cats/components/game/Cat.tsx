import React, { useState, useEffect, useRef } from 'react';
import type { MouseState } from '../../hooks/useMouseTracking';
// useCatPosition import removed - using new coordinate system via props

// === ANIMATION CONSTANTS ===
// Constants removed - using direct values in code for clarity

interface CatProps {
  onClick: (event: React.MouseEvent) => void;
  onEyeClick: (event: React.MouseEvent) => void;
  onEarClick: (ear: 'left' | 'right', event: React.MouseEvent) => void;
  onNoseClick: (event: React.MouseEvent) => void;
  onCheekClick: (side: 'left' | 'right', event: React.MouseEvent) => void;
  onTailClick: (event: React.MouseEvent) => void;
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
  isTailFlicking: boolean;
  headTiltAngle: number;
  mouseState: MouseState;
  pounceTarget: { x: number; y: number };
  wigglingEar: 'left' | 'right' | null;
  lastHeart: HTMLDivElement | null;
  wandMode: boolean;
  pounceConfidence: number;
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
      onTailClick,
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
      isTailFlicking,
      headTiltAngle,
      mouseState,
      pounceTarget,
      wigglingEar,
      lastHeart,
      wandMode,
      // pounceConfidence, // Disabled for now
    } = props;
      // Removed pupilsPos state - now using direct DOM manipulation for smooth animation
    const [isBlinking, setIsBlinking] = useState(false);
    
    // Position data now comes from props via the new coordinate system
    // Old useCatPosition hook removed to eliminate dual positioning systems
    
    const drowsinessState = useRef({
      startTime: 0,
      drowsinessTimer: null as number | null,
    });

    // jumpState removed - using new coordinate system for animations

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

    // Happy jump effect integrated with 3D positioning
    // Happy jump animation disabled - needs integration with new coordinate system
    // TODO: Re-implement happy jumps using new positioning system

    // DISABLED: Confidence-based pounce preparation - causing animation loops
    // useEffect(() => {
    //   if (!wandMode || isPouncing || isJumping || isAnimating) return;
    //   
    //   // Confidence thresholds for different preparation stages  
    //   const CONFIDENCE_THRESHOLDS = {
    //     READY_STANCE: 30,     // Cat gets into ready position
    //     CROUCH_PREP: 50,      // Cat crouches lower, moves forward slightly
    //     STRIKE_READY: 60      // Final positioning before strike
    //   };
    //   
    //   if (pounceConfidence >= CONFIDENCE_THRESHOLDS.READY_STANCE) {
    //     let targetZ = 0.5; // Default rest position
    //     let targetY = 0;   // Ground level
    //     
    //     if (pounceConfidence >= CONFIDENCE_THRESHOLDS.STRIKE_READY) {
    //       // Final strike preparation: move closer, crouch low
    //       targetZ = 0.7 + pounceConfidence * 0.003; // Move forward based on confidence
    //       targetY = -0.1; // Slight crouch below ground level
    //       
    //     } else if (pounceConfidence >= CONFIDENCE_THRESHOLDS.CROUCH_PREP) {
    //       // Mid preparation: move slightly forward, slight crouch
    //       targetZ = 0.6 + (pounceConfidence - CONFIDENCE_THRESHOLDS.CROUCH_PREP) * 0.002;
    //       targetY = -0.05; // Light crouch
    //       
    //     } else {
    //       // Early preparation: alert stance, move forward a bit
    //       targetZ = 0.55 + (pounceConfidence - CONFIDENCE_THRESHOLDS.READY_STANCE) * 0.001;
    //       targetY = 0; // Normal ground level
    //     }
    //     
    //     // Smooth transition to preparation position
    //     moveCatTo({ y: targetY, z: targetZ }, 400);
    //   }
    // }, [pounceConfidence, wandMode, isPouncing, isJumping, isAnimating, moveCatTo]);

    // World-aware pouncing system that follows wand toy
    useEffect(() => {
      if (isPouncing && !pounceState.current.isActive) {
        const now = Date.now();
        const timeSinceLastPounce = now - pounceState.current.lastPounceTime;
        
        // Calculate excitement level based on rapid pouncing
        if (timeSinceLastPounce < 2000) {
          pounceState.current.excitementLevel = Math.min(3, pounceState.current.excitementLevel + 1);
        } else {
          pounceState.current.excitementLevel = Math.max(0, pounceState.current.excitementLevel - 1);
        }
        
        if (pounceState.current.returning) {
          pounceState.current.excitementLevel = Math.min(3, pounceState.current.excitementLevel + 0.5);
        }
        
        // Pounce calculation disabled - using new coordinate system
        
        pounceState.current = {
          startTime: now,
          isActive: true,
          x: pounceTarget.x,
          y: pounceTarget.y,
          arcHeight: 25 + Math.random() * 25,
          overshootX: (Math.random() - 0.5) * 16,
          overshootY: (Math.random() - 0.5) * 16,
          duration: 0, // Will be calculated by chaseWorldTarget
          returning: false,
          returnStartTime: 0,
          returnStartX: 0,
          returnStartY: 0,
          excitementLevel: pounceState.current.excitementLevel,
          lastPounceTime: now,
        };
        
        // Chase functionality disabled - using new pounce system from useCatSystem
        // TODO: Integrate with new coordinate system for visual pounce animation
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
    // We intentionally keep this effect static because chase/pounce animation
    // is handled by the new coordinate system. Adding dependencies causes
    // unnecessary restarts of disabled logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // DISABLED: Gradual return to rest when idle - causing animation loops
    // useEffect(() => {
    //   if (!isPouncing && !isJumping && !isAnimating) {
    //     const idleTimer = setTimeout(() => {
    //       // Check if cat is far from rest position
    //       const restPos = 560; // Default rest position
    //       const currentPos = worldPosition.x;
    //       const distance = Math.abs(currentPos - restPos);
    //       
    //       // If cat is more than 200px from rest, gradually return
    //       if (distance > 200) {
    //         returnToRest(2000 + Math.random() * 1000);
    //       }
    //       
    //       // Return Z position to neutral when idle (only if significantly off)
    //       if (Math.abs(position.z) > 0.3) {
    //         moveCatTo({ z: 0.5 }, 1200); // Move to stable rest Z position
    //       }
    //     }, 3000); // Wait 3 seconds of inactivity
    //     
    //     return () => clearTimeout(idleTimer);
    //   }
    // }, [isPouncing, isJumping, isAnimating, worldPosition.x, returnToRest, moveCatTo]);



    // Happy face logic is now handled by AnimationController

    // Pupil tracking effect (only non-conflicting animation)
    useEffect(() => {
      let animationFrameId: number;
      let isActive = true;
      let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      const animate = () => {
        if (!isActive) return;

        const catElement = catRef && 'current' in catRef ? catRef.current : null;
        if (!catElement) {
          if (isActive) {
            animationFrameId = requestAnimationFrame(animate);
          }
          return;
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

        // Only schedule next frame if still active
        if (isActive) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        isActive = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
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
      isTailFlicking ? 'tail-flicking' : '',
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
      <div className="cat-with-shadow">
        {/* Shadow removed - now rendered in CatInteractionManager with new coordinate system */}
        
        {/* Cat SVG with dynamic positioning */}
        <svg
          ref={catRef}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 220 200"
          className={svgClasses}
          data-cat-ref="true"
          data-testid="cat"
          style={{
            display: 'block',
            width: '100%'
          }}
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
              d="M 155 148 C 165 145, 180 135, 190 115 C 200 95, 195 85, 192 88 C 189 91, 185 100, 178 115 C 170 130, 162 142, 155 148"
              fill="#212121"
              onClick={(e) => {
                e.stopPropagation();
                onTailClick(e);
              }}
              style={{ cursor: 'pointer' }}
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
      </div>
    );
  }
);
Cat.displayName = 'Cat';

export default Cat; 