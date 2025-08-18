import React, { useState, useEffect, useCallback } from 'react';
import { World } from '../engine';
import { WorldContext } from './WorldContextCore';

/**
 * Hook that provides reactive access to ECS world state.
 * Automatically triggers React re-renders when entities or their components change.
 * This is the primary way to access the world - reactivity is built-in by default.
 */
export const useWorld = (): World => {
  const ctx = React.useContext(WorldContext);
  const world = ctx || (() => {
    if (!(useWorld as unknown as { __fallback?: World }).__fallback) {
      (useWorld as unknown as { __fallback?: World }).__fallback = new World();
    }
    return (useWorld as unknown as { __fallback?: World }).__fallback!;
  })();

  const [, setUpdateCounter] = useState(0);

  // Force a re-render by incrementing the counter
  const forceUpdate = useCallback(() => setUpdateCounter(prev => prev + 1), []);

  useEffect(() => {
    // Check if already wrapped to prevent multiple setups
    if ((world as unknown as { __reactiveWrapped?: boolean }).__reactiveWrapped) {
      return;
    }
    
    // Store original methods
    const originalTransformSet = world.transforms.set.bind(world.transforms);
    
    // Store all force update functions to call them all when furniture moves
    const forceUpdateFunctions = new Set<() => void>();
    forceUpdateFunctions.add(forceUpdate);
    
    // Wrap the transform.set method to trigger React updates
    world.transforms.set = (id, value) => {
      originalTransformSet(id, value);
      
      // Only trigger React updates for furniture changes, not cat movement
      const renderable = world.renderables.get(id);
      if (renderable && renderable.kind !== 'cat') {
        // Call all registered force update functions
        forceUpdateFunctions.forEach(fn => {
          try {
            fn();
          } catch (error) {
            console.warn('Error calling forceUpdate function:', error);
          }
        });
      }
    };
    
    // Store the forceUpdateFunctions set on the world for other useWorld calls to access
    (world as unknown as { __forceUpdateFunctions?: Set<() => void> }).__forceUpdateFunctions = forceUpdateFunctions;
    
    // Mark as wrapped
    (world as unknown as { __reactiveWrapped?: boolean }).__reactiveWrapped = true;
    
    return () => {
      // Remove this forceUpdate function from the set
      forceUpdateFunctions.delete(forceUpdate);
      
      // Only restore if this is the last component using the world
      if (forceUpdateFunctions.size === 0) {
        world.transforms.set = originalTransformSet;
        (world as unknown as { __reactiveWrapped?: boolean }).__reactiveWrapped = false;
        delete (world as unknown as { __forceUpdateFunctions?: Set<() => void> }).__forceUpdateFunctions;
      }
    };
  }, [world, forceUpdate]);

  // If reactive system is already set up by another component, register this forceUpdate function
  useEffect(() => {
    const forceUpdateFunctions = (world as unknown as { __forceUpdateFunctions?: Set<() => void> }).__forceUpdateFunctions;
    if (forceUpdateFunctions && !forceUpdateFunctions.has(forceUpdate)) {
      forceUpdateFunctions.add(forceUpdate);
      
      return () => {
        forceUpdateFunctions.delete(forceUpdate);
      };
    }
  }, [world, forceUpdate]);

  return world;
};


