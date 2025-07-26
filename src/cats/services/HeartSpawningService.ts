export interface HeartConfig {
  position: { x: number; y: number };
  loveAmount: number;
  interactionType: 'petting' | 'pouncing';
}

export interface HeartVisuals {
  id: number;
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
  animationDuration: number;
}

export interface HeartSpawningEvents {
  onHeartSpawned: (heart: HeartVisuals) => void;
  onTrackableHeartSet: (heartId: number | null) => void;
}

export class HeartSpawningService {
  private events: HeartSpawningEvents;

  constructor(events: HeartSpawningEvents) {
    this.events = events;
  }

  /**
   * Unified heart spawning based on love amount and interaction type
   */
  spawnHearts(config: HeartConfig): void {
    const { position, loveAmount, interactionType } = config;
    
    // Calculate number of hearts based on love amount
    const heartCount = this.calculateHeartCount(loveAmount);
    
    // Get configuration for this interaction type
    const visualConfig = this.getVisualConfig(interactionType);
    
    // Spawn hearts with appropriate delays and variations
    for (let i = 0; i < heartCount; i++) {
      const delay = i * visualConfig.delayBetweenHearts;
      
      setTimeout(() => {
        const heart = this.createHeart(position, loveAmount, visualConfig, i);
        this.events.onHeartSpawned(heart);
      }, delay);
    }
    
    // Set trackable heart for the first heart
    if (heartCount > 0) {
      const heartId = Date.now();
      this.events.onTrackableHeartSet(heartId);
      
      setTimeout(() => {
        this.events.onTrackableHeartSet(null);
      }, visualConfig.trackableDuration);
    }
  }

  private calculateHeartCount(loveAmount: number): number {
    // 1 heart per 2.5 love, minimum 1, maximum 5 for performance
    return Math.max(1, Math.min(5, Math.ceil(loveAmount / 2.5)));
  }

  private getVisualConfig(interactionType: 'petting' | 'pouncing') {
    switch (interactionType) {
      case 'pouncing':
        return {
          // Pouncing: faster, more spread out, more energetic
          delayBetweenHearts: 50, // 50ms between hearts
          spreadMultiplier: 1.5,  // More spread
          animationDuration: 0.8, // Faster animation
          velocityMultiplier: 1.3, // Faster float up
          trackableDuration: 1000,
        };
      case 'petting':
        return {
          // Petting: slower, tighter, more gentle
          delayBetweenHearts: 100, // 100ms between hearts  
          spreadMultiplier: 1.0,   // Standard spread
          animationDuration: 1.2,  // Slower animation
          velocityMultiplier: 1.0, // Standard float up
          trackableDuration: 1000,
        };
    }
  }

  private createHeart(
    position: { x: number; y: number },
    loveAmount: number,
    visualConfig: {
      delayBetweenHearts: number;
      spreadMultiplier: number;
      animationDuration: number;
      velocityMultiplier: number;
      trackableDuration: number;
    },
    heartIndex: number
  ): HeartVisuals {
    // Calculate heart size based on love amount
    const baseScale = this.calculateHeartScale(loveAmount);
    
    // Add some randomness to size
    const scaleVariation = (Math.random() - 0.5) * 0.2;
    const finalScale = Math.max(0.3, baseScale + scaleVariation);
    
    // Calculate spread based on interaction type and heart index
    const spreadAngle = (heartIndex / 5) * Math.PI * 2; // Distribute in circle
    const spreadDistance = 20 * visualConfig.spreadMultiplier;
    const spreadX = Math.cos(spreadAngle) * spreadDistance * Math.random();
    const spreadY = Math.sin(spreadAngle) * spreadDistance * Math.random();
    
    return {
      id: Date.now() + heartIndex, // Unique ID
      x: position.x + spreadX,
      y: position.y + spreadY,
      translateX: (Math.random() - 0.5) * 40 * visualConfig.spreadMultiplier,
      rotation: (Math.random() - 0.5) * 60,
      scale: finalScale,
      animationDuration: visualConfig.animationDuration,
    };
  }

  private calculateHeartScale(loveAmount: number): number {
    // Scale hearts based on love amount
    const minScale = 0.5;
    const maxScale = 2.0;
    const growthFactor = 0.15;
    
    const calculatedScale = minScale + Math.log(Math.max(1, loveAmount)) * growthFactor;
    return Math.min(calculatedScale, maxScale);
  }
} 