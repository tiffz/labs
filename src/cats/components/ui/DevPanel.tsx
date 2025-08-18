import React, { useState, useEffect, useCallback } from 'react';
import { useWorld } from '../../context/useWorld';
import { FurniturePlacementService } from '../../services/FurniturePlacementService';

interface DevPanelProps {
  energy: number;
  pounceConfidence: number;
  lastVelocity: number;
  proximityMultiplier: number;
  lovePerClick: number;
  movementNovelty: number;
  clickExcitement: number;
  onTimeSkip: () => void;
  onGiveTreats: () => void;
  onGiveLove: () => void;
  // Cat position data
  catWorldCoords?: { x: number; y: number; z: number };
  catScreenCoords?: { x: number; y: number; scale: number };
  shadowCoords?: { x: number; y: number; scale: number };
  // Dev-only snapshot sender (provided in dev)
  onSendSnapshot?: () => void;
  // Cat state management
  isSleeping?: boolean;
  isDrowsy?: boolean;
  onToggleSleep?: () => void;
  onToggleDrowsy?: () => void;
  onResetInactivity?: () => void;
}

const DevPanel: React.FC<DevPanelProps> = ({
  energy,
  pounceConfidence,
  lastVelocity,
  proximityMultiplier,
  lovePerClick,
  movementNovelty,
  clickExcitement,
  onTimeSkip,
  onGiveTreats,
  onGiveLove,
  catWorldCoords,
  catScreenCoords,
  shadowCoords,
  onSendSnapshot,
  isSleeping,
  isDrowsy,
  onToggleSleep,
  onToggleDrowsy,
  onResetInactivity,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'position' | 'controls' | 'states'>('stats');
  const world = useWorld(); // Now automatically reactive!
  
  // Furniture randomization handler - memoized to prevent recreation on every render
  const handleRandomizeFurniture = useCallback(() => {
    // Randomize furniture button clicked
    console.log('World renderables count:', world.renderables.size);
    console.log('World transforms count:', world.transforms.size);
    console.log('All renderables:', Array.from(world.renderables.entries()));
    console.log('All transforms:', Array.from(world.transforms.entries()));
    
    // Check if reactive system is set up
    
    // Use the comprehensive furniture placement service to randomize all furniture
    try {
      const placementService = new FurniturePlacementService(world);
      const results = placementService.randomizeAllFurniture();
      
      if (results.failed.length > 0) {
        console.warn(`⚠️ Failed to move ${results.failed.length} items:`, results.failed);
        results.failed.forEach(failure => {
          console.warn(`  - ${failure.kind} (${failure.entityId}): ${failure.reason}`);
        });
      }
      
      // Force a manual re-render by dispatching a custom event as fallback
      window.dispatchEvent(new CustomEvent('world-update', { detail: { type: 'all-furniture-randomized', results } }));
      
    } catch (error) {
      console.error('❌ Error during furniture randomization:', error);
      alert(`ERROR: ${(error as Error).message}`);
    }
  }, [world]);

  // console.log('🔍 DevPanel rendering! activeTab:', activeTab);
  
  return (
    <div className="dev-panel-compact">
      <div className="dev-panel-header">
        <span className="dev-panel-title">🔧 Dev</span>
        <div className="dev-panel-tabs">
          <button 
            className={`dev-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Stats
          </button>
          <button 
            className={`dev-tab ${activeTab === 'position' ? 'active' : ''}`}
            onClick={() => setActiveTab('position')}
          >
            Pos
          </button>
          <button 
            className={`dev-tab ${activeTab === 'controls' ? 'active' : ''}`}
            onClick={() => setActiveTab('controls')}
          >
            Ctrl
          </button>
          <button 
            className={`dev-tab ${activeTab === 'states' ? 'active' : ''}`}
            onClick={() => setActiveTab('states')}
          >
            States
          </button>
        </div>
        {import.meta.env.DEV && onSendSnapshot && (
          <button className="compact-button" style={{ marginLeft: 'auto' }} onClick={onSendSnapshot}>
            📸 Snapshot
          </button>
        )}
      </div>

      <div className="dev-panel-content">
        {activeTab === 'stats' && (
          <div className="dev-tab-content">
            {/* {console.log('🔍 RENDERING STATS TAB - Button should be visible!')} */}
            <div className="compact-stats">
              <div className="stat-row">
                <span>Energy:</span> <span>{energy.toFixed(0)}/100</span>
              </div>
              <div className="stat-row">
                <span>Love/Click:</span> <span>{lovePerClick}</span>
              </div>
              <div className="stat-row">
                <span>Pounce:</span> <span>{pounceConfidence.toFixed(1)}</span>
              </div>
              <div className="stat-row">
                <span>Velocity:</span> <span>{lastVelocity.toFixed(1)}</span>
              </div>
              <div className="stat-row">
                <span>Proximity:</span> <span>{proximityMultiplier.toFixed(1)}x</span>
              </div>
              <div className="stat-row">
                <span>Movement:</span> <span>{movementNovelty.toFixed(1)}</span>
              </div>
              <div className="stat-row">
                <span>Excitement:</span> <span>{clickExcitement.toFixed(1)}</span>
              </div>
            </div>
            <div className="control-grid" style={{ marginTop: '8px' }}>
              {/* {console.log('🔍 RENDERING RANDOMIZE BUTTON!')} */}
              <button 
                className="compact-button" 
                style={{ backgroundColor: 'red', color: 'white' }}
                onClick={handleRandomizeFurniture}
              >
                🏠 Randomize Furniture
              </button>
            </div>
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="dev-tab-content">
            <div className="control-grid">
              <button className="compact-button" onClick={onTimeSkip}>
                ⏩ Skip Day
              </button>
              <button className="compact-button" onClick={onGiveTreats}>
                🐟 +1000 Treats
              </button>
              <button className="compact-button" onClick={onGiveLove}>
                ❤️ +1000 Love
              </button>
              <button className="compact-button" onClick={() => alert('Test button works!')}>
                🧪 Test Button
              </button>
              <button className="compact-button" onClick={handleRandomizeFurniture}>
                🏠 Randomize Furniture
              </button>
              {import.meta.env.DEV && onSendSnapshot && (
                <button className="compact-button" onClick={onSendSnapshot}>
                  🧪 Send Snapshot
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'position' && catWorldCoords && catScreenCoords && shadowCoords && (
          <div className="dev-tab-content">
            <div className="position-compact">
              <div className="coord-compact">
                <div className="coord-label">Cat (3D):</div>
                <div className="coord-values">
                  x:{catWorldCoords.x.toFixed(0)} y:{catWorldCoords.y.toFixed(0)} z:{catWorldCoords.z.toFixed(0)}
                </div>
              </div>
              <div className="coord-compact">
                <div className="coord-label">Cat (Pixels):</div>
                <div className="coord-values">
                  x:{catScreenCoords.x.toFixed(0)} y:{catScreenCoords.y.toFixed(0)} @{catScreenCoords.scale.toFixed(2)}x
                </div>
              </div>
              <div className="coord-compact">
                <div className="coord-label">Shadow (Pixels):</div>
                <div className="coord-values">
                  x:{shadowCoords.x.toFixed(0)} y:{shadowCoords.y.toFixed(0)} @{shadowCoords.scale.toFixed(2)}x
                </div>
              </div>
            </div>
            
            <div className="ecs-section">
              <DebugEcsPanel />
            </div>
          </div>
        )}

        {activeTab === 'states' && (
          <div className="dev-tab-content">
            <div className="states-compact">
              <div className="state-section">
                <div className="state-label">Sleep States</div>
                <div className="state-controls">
                  <div className="state-indicator">
                    <span className={`state-dot ${isSleeping ? 'active' : ''}`}></span>
                    <span>Sleeping: {isSleeping ? 'Yes' : 'No'}</span>
                    {onToggleSleep && (
                      <button className="state-btn" onClick={onToggleSleep}>
                        {isSleeping ? 'Wake' : 'Sleep'}
                      </button>
                    )}
                  </div>
                  <div className="state-indicator">
                    <span className={`state-dot ${isDrowsy ? 'active' : ''}`}></span>
                    <span>Drowsy: {isDrowsy ? 'Yes' : 'No'}</span>
                    {onToggleDrowsy && (
                      <button className="state-btn" onClick={onToggleDrowsy}>
                        {isDrowsy ? 'Drowsy' : 'Alert'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="state-section">
                <div className="state-label">Actions</div>
                <div className="state-actions">
                  {onResetInactivity && (
                    <button className="compact-button" onClick={onResetInactivity}>
                      🔄 Reset Inactivity
                    </button>
                  )}
                </div>
              </div>
              
              <div className="state-section">
                <div className="state-label">Visual Effects</div>
                <div className="state-info">
                  <div className="info-item">
                    💤 Zzz elements spawn when sleeping
                  </div>
                  <div className="info-item">
                    😴 Sleepy eyes show when drowsy/sleeping
                  </div>
                  <div className="info-item">
                    ⏰ Sleep after 30s inactivity
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DevPanel; 

// Live ECS debug panel that syncs directly from world and DOM every frame
const DebugEcsPanel: React.FC = () => {
  const world = useWorld();
  const [state, setState] = useState<{ walking: boolean; bobAmpl: string; speedInst: number; speedSmooth: number; dtMs: number; runSpeed?: number; runSpeedX?: number; runSpeedZ?: number }>(() => ({ walking: false, bobAmpl: '0px', speedInst: 0, speedSmooth: 0, dtMs: 0 }));
  useEffect(() => {
    let raf: number | null = null;
    const step = () => {
      try {
        const dbg = (world as unknown as { __debug?: Record<string, unknown> }).__debug || {};
        const walking = Boolean((dbg as { domWalkingClass?: boolean }).domWalkingClass);
        const bobAmpl = String((dbg as { domBobAmpl?: string }).domBobAmpl || '0px');
        const speedInst = Number((dbg as { walkSpeedInst?: number }).walkSpeedInst || 0);
        const speedSmooth = Number((dbg as { walkSpeedScreen?: number }).walkSpeedScreen || 0);
        const dtMs = Number((dbg as { dtMs?: number }).dtMs || 0);
        const runSpeed = Number((dbg as { runSpeed?: number }).runSpeed || 0);
        const runSpeedX = Number((dbg as { runSpeedX?: number }).runSpeedX || 0);
        const runSpeedZ = Number((dbg as { runSpeedZ?: number }).runSpeedZ || 0);
        setState(s => {
          if (s.walking !== walking || s.bobAmpl !== bobAmpl || s.speedInst !== speedInst || s.speedSmooth !== speedSmooth || s.dtMs !== dtMs || s.runSpeed !== runSpeed || s.runSpeedX !== runSpeedX || s.runSpeedZ !== runSpeedZ) {
            return { walking, bobAmpl, speedInst, speedSmooth, dtMs, runSpeed, runSpeedX, runSpeedZ };
          }
          return s;
        });
      } catch {
        // no-op
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [world]);
  return (
    <div className="compact-stats" style={{ fontSize: 11, lineHeight: 1.4 }}>
      <div className="stat-row"><span>Walking:</span> <span>{String(state.walking)}</span></div>
      <div className="stat-row"><span>Bob Ampl:</span> <span>{state.bobAmpl}</span></div>
      <div className="stat-row"><span>Speed Inst:</span> <span>{state.speedInst.toFixed(1)} px/s</span></div>
      <div className="stat-row"><span>Speed Smooth:</span> <span>{state.speedSmooth.toFixed(1)} px/s</span></div>
      <div className="stat-row"><span>Run Speed:</span> <span>{(state.runSpeed || 0).toFixed(1)} px/s</span></div>
      <div className="stat-row"><span>Run X/Z:</span> <span>{(state.runSpeedX || 0).toFixed(1)} / {(state.runSpeedZ || 0).toFixed(1)} px/s</span></div>
      <div className="stat-row"><span>dt:</span> <span>{state.dtMs} ms</span></div>
    </div>
  );
};