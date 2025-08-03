/**
 * Pure Game State Manager
 * 
 * Handles only business logic - no timers, no animations, no DOM concerns.
 * This is the "model" in our MVC-like architecture.
 */

export interface CatGameState {
  // Cat-specific values only
  energy: number;
  
  // Pounce system state
  pounceConfidence: number;
  wandMode: boolean;
  
  // Tracking values for calculations
  cursorVelocity: number;
  proximityMultiplier: number;
  movementNovelty: number;
  
  // Click-based excitement (separate from movement-based confidence)
  clickExcitement: number;
  lastClickTime: number;
  
  // Cooldowns and timing (logical, not animation)
  lastPounceTime: number;
  lastPlayTime: number;
}

export interface GlobalGameState {
  // Global game systems (managed at App level)
  love: number;
  treats: number;
}

export interface CatGameActions {
  // Cat-specific state mutations
  updateEnergy: (delta: number) => void;
  setEnergy: (energy: number) => void;
  
  // Wand system actions
  toggleWandMode: () => void;
  processWandMovement: (position: { x: number; y: number }, timestamp: number) => void;
  processWandClick: (timestamp: number) => void;
  
  // Reset/initialization
  resetConfidence: () => void;
}

export interface CatGameEvents {
  // Events that the cat system emits for external systems
  onPounceTriggered: (pounceData: { 
    distance: number; 
    angle: number; 
    intensity: number;
    catEnergy: number;
    wandPosition: { x: number; y: number };
    catPosition: { x: number; y: number };
  }) => void;
  onPlayingTriggered: (playData: { intensity: number; duration: number }) => void;
  onLoveGained: (amount: number) => void;  // Request to global love system
  onTreatsGained: (amount: number) => void;  // Request to global treats system
}

/**
 * Pure Cat-specific game state with no side effects
 * Does NOT manage global systems like love/treats
 */
export class CatGameStateManager {
  private state: CatGameState;
  private events: CatGameEvents;
  
  // Game constants (extracted from magic numbers)
  private static readonly CONFIDENCE_THRESHOLDS = {
    POUNCE_TRIGGER: 85,
    VELOCITY_MIN: 0.1,
    SUDDEN_STOP_MIN: 1.6,
    SUDDEN_STOP_MAX: 0.3,
    SUDDEN_START_MAX: 0.4,
    SUDDEN_START_MIN: 1.5,
    CONFIDENCE_DECAY: 0.90,
  };

  private static readonly CONFIDENCE_MULTIPLIERS = {
    VELOCITY: 12,
    SUDDEN_STOP: 30,
    SUDDEN_START: 35,
    CLICK_BOOST: 18,
  };

  private static readonly COOLDOWNS = {
    POUNCE: 1200, // ms
    PLAYING_DURING_POUNCE: 150,
    PLAYING_REGULAR: 300,
  };

  // Internal tracking for calculations
  private velocityHistory: number[] = [];
  private lastWandPosition: { x: number; y: number } = { x: 0, y: 0 };
  private lastWandMoveTime = 0;
  private lastVelocity = 0;

  constructor(initialState: Partial<CatGameState>, events: CatGameEvents) {
    this.state = {
      energy: 100,
      pounceConfidence: 0,
      wandMode: false,
      cursorVelocity: 0,
      proximityMultiplier: 1,
      movementNovelty: 1,
      clickExcitement: 0,
      lastClickTime: 0,
      lastPounceTime: 0,
      lastPlayTime: 0,
      ...initialState,
    };
    this.events = events;
  }

  getState(): Readonly<CatGameState> {
    return { ...this.state };
  }

  getActions(): CatGameActions {
    return {
      updateEnergy: (delta: number) => {
        this.state.energy = Math.max(0, Math.min(100, this.state.energy + delta));
      },
      
      setEnergy: (energy: number) => {
        this.state.energy = Math.max(0, Math.min(100, energy));
      },

      toggleWandMode: () => {
        this.state.wandMode = !this.state.wandMode;

        if (!this.state.wandMode) {
          this.resetPounceState();
        }
      },

      processWandMovement: (position: { x: number; y: number }, timestamp: number) => {
        if (!this.state.wandMode) return;

        this.updateConfidenceFromMovement(position, timestamp);
        this.checkForPounce(timestamp);
      },

      processWandClick: (timestamp: number) => {
        if (!this.state.wandMode) return;

        this.state.lastClickTime = timestamp;
        
        // Calculate click effectiveness based on proximity
        const clickPower = CatGameStateManager.CONFIDENCE_MULTIPLIERS.CLICK_BOOST * this.state.proximityMultiplier;
        
        // Add to click excitement (separate from movement-based confidence)
        this.state.clickExcitement += clickPower;
        this.state.clickExcitement = Math.min(100, this.state.clickExcitement); // Cap at 100
        

        
        // Trigger playing state if cat is currently pouncing (within last 500ms)
        const timeSinceLastPounce = timestamp - this.state.lastPounceTime;
        if (timeSinceLastPounce < 500) {
          this.triggerPlayingState(timestamp);
        }
      },

      resetConfidence: () => {
        this.resetPounceState();
      },
    };
  }

  private updateConfidenceFromMovement(position: { x: number; y: number }, timestamp: number) {
    const timeDelta = timestamp - this.lastWandMoveTime;
    if (timeDelta < 10) return; // Throttle updates
    
    

    // Calculate velocity
    const distance = Math.hypot(
      position.x - this.lastWandPosition.x,
      position.y - this.lastWandPosition.y
    );
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;

    // Update velocity history for novelty calculation
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > 10) {
      this.velocityHistory.shift();
    }

    // Calculate movement novelty (reward varied movement)
    const avgVelocity = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;
    const noveltyRatio = this.velocityHistory.filter(v => Math.abs(v - avgVelocity) > 0.5).length / this.velocityHistory.length;
    this.state.movementNovelty = noveltyRatio > 0.5 
      ? Math.max(0.1, this.state.movementNovelty - 0.1)
      : Math.min(1.0, this.state.movementNovelty + 0.06);

    // Calculate proximity multiplier (closer = more exciting)
    // Get real cat position
    const catElement = document.querySelector('svg[data-cat-ref]') as SVGElement;
    let catCenterX = 200, catCenterY = 200; // Default fallback
    
    if (catElement) {
      const rect = catElement.getBoundingClientRect();
      catCenterX = rect.left + rect.width / 2;
      catCenterY = rect.top + rect.height / 2;
    }
    
    const catDistance = Math.hypot(position.x - catCenterX, position.y - catCenterY);
    this.state.proximityMultiplier = Math.max(0.5, Math.min(3.0, 300 / (catDistance + 50)));

    // Calculate confidence contributions
    let velocityConfidence = 0;
    let suddenStopConfidence = 0;
    let suddenStartConfidence = 0;

    if (velocity > CatGameStateManager.CONFIDENCE_THRESHOLDS.VELOCITY_MIN) {
      velocityConfidence = (velocity * CatGameStateManager.CONFIDENCE_MULTIPLIERS.VELOCITY) * this.state.movementNovelty;
    }
    
    if (this.lastVelocity > CatGameStateManager.CONFIDENCE_THRESHOLDS.SUDDEN_STOP_MIN && 
        velocity < CatGameStateManager.CONFIDENCE_THRESHOLDS.SUDDEN_STOP_MAX) {
      suddenStopConfidence = CatGameStateManager.CONFIDENCE_MULTIPLIERS.SUDDEN_STOP * this.state.proximityMultiplier;
    }
    
    if (this.lastVelocity > CatGameStateManager.CONFIDENCE_THRESHOLDS.SUDDEN_START_MAX && 
        velocity > CatGameStateManager.CONFIDENCE_THRESHOLDS.SUDDEN_START_MIN) {
      suddenStartConfidence = CatGameStateManager.CONFIDENCE_MULTIPLIERS.SUDDEN_START * this.state.proximityMultiplier;
    }

    // Apply energy boost
    const energyBoost = 1 + (this.state.energy / 100);
    const movementConfidenceGain = (velocityConfidence + suddenStopConfidence + suddenStartConfidence) * energyBoost;
    
    // Decay click excitement over time (time-based, not update-based)
    const timeSinceLastClick = timestamp - this.state.lastClickTime;
    if (timeSinceLastClick > 500) { // Only decay after 500ms of no clicks
      const decayTime = Math.min(timeSinceLastClick - 500, 5000); // Cap decay at 5 seconds
      const decayAmount = (decayTime / 5000) * 0.5; // Decay up to 0.5 per second
      this.state.clickExcitement = Math.max(0, this.state.clickExcitement - decayAmount);
    }
    
    // Combine movement confidence with click excitement
    const clickContribution = this.state.clickExcitement * 0.3; // 30% of click excitement contributes to confidence
    const totalConfidenceGain = movementConfidenceGain + clickContribution;
    
    // Update confidence with decay
    this.state.pounceConfidence += totalConfidenceGain;
    this.state.pounceConfidence = Math.max(0, this.state.pounceConfidence * CatGameStateManager.CONFIDENCE_THRESHOLDS.CONFIDENCE_DECAY);

    // Update tracking values
    this.state.cursorVelocity = velocity;
    this.lastVelocity = velocity;
    this.lastWandPosition = position;
    this.lastWandMoveTime = timestamp;
    
    
  }

  private checkForPounce(timestamp: number) {
    const timeSinceLastPounce = timestamp - this.state.lastPounceTime;
    
    if (this.state.pounceConfidence > CatGameStateManager.CONFIDENCE_THRESHOLDS.POUNCE_TRIGGER && 
        timeSinceLastPounce > CatGameStateManager.COOLDOWNS.POUNCE) {
      
      // Get real cat position from DOM
      const catElement = document.querySelector('svg[data-cat-ref]') as SVGElement;
      let catCenterX = 200, catCenterY = 200; // Default fallback
      
      if (catElement) {
        const rect = catElement.getBoundingClientRect();
        catCenterX = rect.left + rect.width / 2;
        catCenterY = rect.top + rect.height / 2;
      }
      
      // Calculate pounce data
      const vectorX = this.lastWandPosition.x - catCenterX;
      const vectorY = this.lastWandPosition.y - catCenterY;
      const distance = Math.hypot(vectorX, vectorY);
      const angle = Math.atan2(vectorY, vectorX);
      const intensity = Math.min(1, this.state.pounceConfidence / 100);

      // Trigger pounce
      
      this.events.onPounceTriggered({ 
        distance, 
        angle, 
        intensity,
        catEnergy: this.state.energy,
        wandPosition: this.lastWandPosition,
        catPosition: { x: catCenterX, y: catCenterY }
      });
      
      // Update cat state  
      this.getActions().updateEnergy(-5); // Energy cost for pounce
      this.state.lastPounceTime = timestamp;
      this.resetPounceState();
    }
  }

  private triggerPlayingState(timestamp: number) {
    const timeSinceLastPlay = timestamp - this.state.lastPlayTime;
    const isPouncing = (timestamp - this.state.lastPounceTime) < 500; // Recent pounce
    
    const cooldown = isPouncing ? CatGameStateManager.COOLDOWNS.PLAYING_DURING_POUNCE : CatGameStateManager.COOLDOWNS.PLAYING_REGULAR;
    
    if (timeSinceLastPlay > cooldown) {
      const loveAmount = isPouncing ? 2 : 1;
      const duration = isPouncing ? 500 : 300;
      const intensity = isPouncing ? 1.5 : 1.0;
      
      this.events.onPlayingTriggered({ intensity, duration });
      this.events.onLoveGained(loveAmount);  // Request love from global system
      this.state.lastPlayTime = timestamp;
    }
  }

  private resetPounceState() {
    this.state.pounceConfidence = 0;
    this.velocityHistory = [];
    this.state.movementNovelty = 1.0;
  }
} 