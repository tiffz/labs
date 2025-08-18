import type { System } from '../ECS';

// Applies an upward impulse to cats when happyJump intent is set.
// Relies on MovementSystem gravity to create an arc and settle back to ground.
// Implements proper platformer-style double jumping with one boost per jump cycle.
export const JumpImpulseSystem: System = (world) => {
  for (const [id] of world.cats.entries()) {
    const intent = world.catIntents.get(id) || {};
    if (intent.happyJump) {
      const v = world.velocities.get(id) || { vx: 0, vy: 0, vz: 0 };
      const t = world.transforms.get(id);
      const jumpState = world.jumpStates.get(id) || {};
      
      if (t) {
        // Check if cat is on ground (position-based, not velocity-based for ground jumps)
        const isOnGround = t.y <= 0.5;
        
        // Update grounded state
        if (isOnGround) {
          jumpState.isGrounded = true;
          jumpState.hasDoubleJumped = false; // Reset double jump when landing
        } else {
          jumpState.isGrounded = false;
        }
        
        // Determine if jump is allowed
        let canJump = false;
        let isDoubleJump = false;
        
        if (isOnGround) {
          // Always allow ground jumps
          canJump = true;
          isDoubleJump = false;
        } else if (!jumpState.hasDoubleJumped) {
          // Allow double jump if we haven't used it yet in this jump cycle
          canJump = true;
          isDoubleJump = true;
        }
        
        if (canJump) {
          // Different jump velocities based on jump type
          const jumpType = intent.jumpType || 'happy'; // Default to happy jump
          const target = jumpType === 'happy' ? 260 : 520; // Light bounce vs powerful jump
          
          if (isDoubleJump) {
            // For double jump: add full jump velocity (no blending, full boost)
            world.velocities.set(id, { ...v, vy: target });
            jumpState.hasDoubleJumped = true;
          } else {
            // For ground jump: blend with existing velocity for smoothness
            const blendedVy = Math.abs(v.vy) > 1 ? (v.vy * 0.6 + target * 0.4) : target;
            world.velocities.set(id, { ...v, vy: blendedVy });
          }
          
          // Update jump state
          world.jumpStates.set(id, jumpState);
          
          try {
            const dbg = (world as unknown as { __debug?: Record<string, unknown> }).__debug || {};
            const key = String(id);
            const finalVy = world.velocities.get(id)?.vy || target;
            (dbg as { lastImpulse?: Record<string, { vy: number; ts: number; isDoubleJump: boolean }> }).lastImpulse = {
              ...(dbg as { lastImpulse?: Record<string, { vy: number; ts: number; isDoubleJump: boolean }> }).lastImpulse,
              [key]: { vy: finalVy, ts: performance.now(), isDoubleJump },
            };
            (world as unknown as { __debug?: Record<string, unknown> }).__debug = dbg;
          } catch {
            // no-op
          }
        }
      }
      
      // Clear the edge-triggered intent immediately
      world.catIntents.set(id, { ...intent, happyJump: false });
    }
    
    // Update jump state for all cats (to track grounding)
    const t = world.transforms.get(id);
    const v = world.velocities.get(id) || { vx: 0, vy: 0, vz: 0 };
    if (t) {
      const jumpState = world.jumpStates.get(id) || {};
      const isOnGround = t.y <= 0.5 && Math.abs(v.vy) < 1; // Use velocity check for landing detection
      
      if (isOnGround && !jumpState.isGrounded) {
        // Just landed - reset double jump
        jumpState.isGrounded = true;
        jumpState.hasDoubleJumped = false;
        world.jumpStates.set(id, jumpState);
      } else if (!isOnGround) {
        jumpState.isGrounded = false;
        world.jumpStates.set(id, jumpState);
      }
    }
  }
};


