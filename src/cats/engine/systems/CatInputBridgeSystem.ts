import type { System } from '../ECS';

// Bridges existing React-driven flags into ECS intents for the cat entity.
// Temporary during refactor; once input fully ECS, this can be removed.
export const CatInputBridgeSystem: System = (world) => {
  for (const [entityId] of world.cats.entries()) {
    // Ensure an intent component exists
    const intent = world.catIntents.get(entityId) || {};
    // No logic yet; placeholder to keep wiring consistent
    world.catIntents.set(entityId, intent);
  }
};


