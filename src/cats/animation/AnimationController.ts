/**
 * Animation Controller
 * 
 * Handles all visual timing, animation orchestration, and presentation concerns.
 * Takes game state changes as input and manages visual effects.
 * This is the "controller" in our MVC-like architecture.
 */

import { HeartSpawningService } from '../services/HeartSpawningService';

export interface AnimationState {
  // Cat animation states
  isPouncing: boolean;
  isPlaying: boolean;
  isShaking: boolean;
  isEarWiggling: boolean;
  isHappyPlaying: boolean;
  
  // Animation data
  pounceTarget: { x: number; y: number };
  pounceIntensity: number;
  playingIntensity: number;
  excitementLevel: number;
  lastWandPosition?: { x: number; y: number };
  
  // Visual timing
  currentAnimationPhase: 'idle' | 'preparing' | 'pouncing' | 'returning' | 'playing';
  animationProgress: number;
}

export interface AnimationEvents {
  // Visual effect callbacks
  onHeartSpawned: (position: { x: number; y: number }) => void;
  onTrackableHeartSet: (heartId: number | null) => void;
}

/**
 * Manages all animation timing and visual effects
 */
export class CatAnimationController {
  private state: AnimationState;
  private events: AnimationEvents;
  
  // Animation timing constants
  private static readonly ANIMATION_DURATIONS = {
    POUNCE: 500,
    PLAYING: 300,
    PLAYING_DURING_POUNCE: 500,
    SHAKE: 500,
    EAR_WIGGLE: 600,
    HEART_CLEANUP: 1000,
    RETURN_TO_CENTER: 250,
  } as const;

  private static readonly PROBABILITIES = {
    EAR_WIGGLE_ON_POUNCE: 0.7,
    HAPPY_FACE_WHILE_PLAYING: 0.3,
  } as const;

  // Active animation timers
  private activeTimers: Set<number> = new Set();
  private animationFrame: number | null = null;
  private heartSpawningService: HeartSpawningService;

  constructor(events: AnimationEvents) {
    this.state = {
      isPouncing: false,
      isPlaying: false,
      isShaking: false,
      isEarWiggling: false,
      isHappyPlaying: false,
      pounceTarget: { x: 0, y: 0 },
      pounceIntensity: 0,
      playingIntensity: 1,
      excitementLevel: 0,
      currentAnimationPhase: 'idle',
      animationProgress: 0,
    };
    this.events = events;
    
    // Initialize heart spawning service
    this.heartSpawningService = new HeartSpawningService({
      onHeartSpawned: (heart) => {
        this.events.onHeartSpawned({ x: heart.x, y: heart.y });
      },
      onTrackableHeartSet: (heartId) => {
        this.events.onTrackableHeartSet(heartId);
      }
    });
  }

  getState(): Readonly<AnimationState> {
    return { ...this.state };
  }

  // === Game Event Handlers ===
  
  /**
   * Handle pounce triggered from game state
   */
  onPounceTriggered(pounceData: { 
    distance: number; 
    angle: number; 
    intensity: number;
    catEnergy: number;
    wandPosition: { x: number; y: number };
    catPosition: { x: number; y: number };
  }) {
    if (this.state.isPouncing) return; // Don't interrupt existing pounce

    // Store wand position for heart spawning
    this.state.lastWandPosition = pounceData.wandPosition;


    // Calculate pounce target based on game data
    const maxPounceDistance = 50 + (pounceData.distance / 6) + Math.random() * 20;
    this.state.pounceTarget = {
      x: Math.cos(pounceData.angle) * maxPounceDistance,
      y: Math.sin(pounceData.angle) * maxPounceDistance,
    };
    
    this.state.pounceIntensity = pounceData.intensity;
    this.state.excitementLevel = Math.min(3, this.state.excitementLevel + pounceData.intensity);
    
    this.startPounceAnimation();
    this.maybeStartEarWiggle();
  }

  /**
   * Handle playing state triggered from game
   */
  onPlayingTriggered(playData: { intensity: number; duration: number }) {
    this.state.playingIntensity = playData.intensity;
    this.startPlayingAnimation(playData.duration);
    this.maybeStartShakeAnimation();
    this.maybeShowHappyFace();
  }

  /**
   * Handle wand clicks (always shake for feedback)
   */
  onWandClicked() {
    this.maybeStartShakeAnimation();
  }

  /**
   * Handle love gained (spawn hearts) - used for pouncing hearts
   */
  onLoveGained(amount: number) {
    const position = this.calculateHeartSpawnPosition();
    
    this.heartSpawningService.spawnHearts({
      position,
      loveAmount: amount,
      interactionType: 'pouncing' // AnimationController is used for pouncing hearts
    });
  }

  // === Animation Management ===

  private startPounceAnimation() {
    this.state.isPouncing = true;
    this.state.currentAnimationPhase = 'preparing';
    this.state.animationProgress = 0;

    this.startAnimationLoop();

    // End pounce after duration
    this.scheduleTimer(() => {
      this.endPounceAnimation();
    }, CatAnimationController.ANIMATION_DURATIONS.POUNCE);
  }

  private endPounceAnimation() {
    this.state.isPouncing = false;
    this.state.currentAnimationPhase = 'returning';
    
    // Return to center animation
    this.scheduleTimer(() => {
      this.state.currentAnimationPhase = 'idle';
      this.state.animationProgress = 0;
      this.stopAnimationLoop();
    }, CatAnimationController.ANIMATION_DURATIONS.RETURN_TO_CENTER);
  }

  private startPlayingAnimation(duration: number) {
    this.state.isPlaying = true;
    
    this.scheduleTimer(() => {
      this.state.isPlaying = false;
    }, duration);
  }

  private maybeStartEarWiggle() {
    if (Math.random() < CatAnimationController.PROBABILITIES.EAR_WIGGLE_ON_POUNCE) {
      this.state.isEarWiggling = true;
      
      this.scheduleTimer(() => {
        this.state.isEarWiggling = false;
      }, CatAnimationController.ANIMATION_DURATIONS.EAR_WIGGLE);
    }
  }

  private maybeStartShakeAnimation() {
    this.state.isShaking = true;
    
    this.scheduleTimer(() => {
      this.state.isShaking = false;
    }, CatAnimationController.ANIMATION_DURATIONS.SHAKE);
  }

  private maybeShowHappyFace() {
    if (this.state.isPlaying && Math.random() < CatAnimationController.PROBABILITIES.HAPPY_FACE_WHILE_PLAYING) {
      this.state.isHappyPlaying = true;
      
      const duration = 1000 + Math.random() * 2000; // 1-3 seconds
      this.scheduleTimer(() => {
        this.state.isHappyPlaying = false;
      }, duration);
    }
  }

  private startAnimationLoop() {
    if (this.animationFrame) return; // Already running

    const animate = () => {
      if (this.state.isPouncing) {
        this.updatePounceAnimation();
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  private stopAnimationLoop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private updatePounceAnimation() {
    // Update animation progress based on phase
    // This is simplified - in real implementation would calculate based on start time
    
    // Gradually reduce excitement level
    this.state.excitementLevel = Math.max(0, this.state.excitementLevel - 0.01);
  }

  private calculateHeartSpawnPosition(): { x: number; y: number } {
    // Use wand position if available, otherwise use cat center
    if (this.state.lastWandPosition) {
      return {
        x: this.state.lastWandPosition.x + (Math.random() - 0.5) * 40,
        y: this.state.lastWandPosition.y + (Math.random() - 0.5) * 40,
      };
    }
    
    // Fallback to cat center with randomness
    return {
      x: 200 + (Math.random() - 0.5) * 100,
      y: 200 + (Math.random() - 0.5) * 100,
    };
  }

  // === Timer Management ===

  private scheduleTimer(callback: () => void, delay: number): number {
    const timerId = window.setTimeout(() => {
      callback();
      this.activeTimers.delete(timerId);
    }, delay);
    
    this.activeTimers.add(timerId);
    return timerId;
  }

  /**
   * Clean up all active timers and animations
   */
  cleanup() {
    // Clear all active timers
    this.activeTimers.forEach(timerId => {
      clearTimeout(timerId);
    });
    this.activeTimers.clear();

    // Stop animation loop
    this.stopAnimationLoop();

    // Reset state
    this.state = {
      isPouncing: false,
      isPlaying: false,
      isShaking: false,
      isEarWiggling: false,
      isHappyPlaying: false,
      pounceTarget: { x: 0, y: 0 },
      pounceIntensity: 0,
      playingIntensity: 1,
      excitementLevel: 0,
      currentAnimationPhase: 'idle',
      animationProgress: 0,
    };
  }

  // === Integration Methods ===

  /**
   * Get simplified state for React components
   */
  getReactState() {
    return {
      isPouncing: this.state.isPouncing,
      isPlaying: this.state.isPlaying,
      isShaking: this.state.isShaking,
      isEarWiggling: this.state.isEarWiggling,
      isHappyPlaying: this.state.isHappyPlaying,
      pounceTarget: this.state.pounceTarget,
      excitementLevel: this.state.excitementLevel,
    };
  }
} 