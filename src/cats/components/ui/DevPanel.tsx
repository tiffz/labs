import React, { useState, useEffect } from 'react';
import { useWorld } from '../../context/useWorld';

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
  onMoveCat?: (x: number, y: number, z: number) => void;
  onNudgeY?: (deltaY: number) => void;
  onJump?: () => void;
  // Dev-only snapshot sender (provided in dev)
  onSendSnapshot?: () => void;
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
  onMoveCat,
  onNudgeY,
  onJump,
  onSendSnapshot,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'position' | 'controls' | 'ecs'>('stats');

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
            className={`dev-tab ${activeTab === 'ecs' ? 'active' : ''}`}
            onClick={() => setActiveTab('ecs')}
          >
            ECS
          </button>
        </div>
        {import.meta.env.DEV && onSendSnapshot && (
          <button className="compact-button" style={{ marginLeft: 'auto' }} onClick={onSendSnapshot}>
            🧪 Send Snapshot
          </button>
        )}
      </div>

      <div className="dev-panel-content">
        {activeTab === 'stats' && (
          <div className="dev-tab-content">
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
          </div>
        )}

        {activeTab === 'ecs' && (
          <div className="dev-tab-content">
            <DebugEcsPanel />
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
            
            {onMoveCat && (
              <div className="movement-compact">
                <div className="move-controls">
                  <button className="move-btn" onClick={() => onMoveCat(catWorldCoords.x - 50, catWorldCoords.y, catWorldCoords.z)}>←</button>
                  <button className="move-btn" onClick={() => onMoveCat(catWorldCoords.x + 50, catWorldCoords.y, catWorldCoords.z)}>→</button>
                  <button className="move-btn" onClick={() => onMoveCat(catWorldCoords.x, catWorldCoords.y, Math.max(0, catWorldCoords.z - 30))}>↑ Far</button>
                  <button className="move-btn" onClick={() => onMoveCat(catWorldCoords.x, catWorldCoords.y, Math.min(1000, catWorldCoords.z + 30))}>↓ Near</button>
                </div>
                <div className="action-controls">
                  <button className="compact-button" onClick={() => onJump && onJump()}>🐱 Jump</button>
                  <button className="compact-button" onClick={() => onNudgeY && onNudgeY(+10)}>Up</button>
                  <button className="compact-button" onClick={() => onNudgeY && onNudgeY(-10)}>Down</button>
                  <button className="compact-button" onClick={() => onMoveCat(560, 0, 400)}>
                    🏠 Reset
                  </button>
                </div>
              </div>
            )}
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