import React from 'react';
import type { GameState } from '../game/types';
import { CEO_FLOOR } from '../game/constants';

type Props = {
  state: GameState | null;
  onUseItem: (name: string) => void;
  onRestart: () => void;
};

export function UIPanel({ state, onUseItem, onRestart }: Props) {
  if (!state) {
    return (
      <div className="ui-panel">
        <div className="stats-section"><h3>FLOOR <span id="floor-number">-</span></h3></div>
        <div className="log-section"><h3>MEMOS</h3><div className="log-container"><div id="log-messages"><p>Loading…</p></div></div></div>
      </div>
    );
  }
  const inv = Object.entries(state.player.inventory);
  return (
    <div className="ui-panel">
      <div className="stats-section">
        <h3>FLOOR <span id="floor-number">{state.floor}</span></h3>
        <div className="stat">
          <i className="material-icons">trending_up</i>
          <div className="stat-bar-container"><div id="productivity-bar" className="stat-bar" style={{ width: `${(state.player.productivity / state.player.maxProductivity) * 100}%` }} /></div>
          <span className="tooltip">Productivity</span>
        </div>
        <div className="stat">
          <i className="material-icons">sentiment_satisfied</i>
          <div className="stat-bar-container"><div id="happiness-bar" className="stat-bar" style={{ width: `${state.player.happiness}%` }} /></div>
          <span className="tooltip">Happiness</span>
        </div>
        <div className="stat">
          <i className="material-icons">groups</i>
          <div className="stat-bar-container"><div id="reputation-bar" className="stat-bar" style={{ width: `${state.player.reputation}%` }} /></div>
          <span className="tooltip">Reputation</span>
        </div>
      </div>
      <div className="skills-section">
        <h3>SKILLS</h3>
        <div className="skills-grid">
          <div className="skill">
            <i className="material-icons">model_training</i>
            <span className="skill-value" id="proficiency-skill">{state.player.skills.proficiency}</span>
            <span className="tooltip">Proficiency</span>
          </div>
          <div className="skill">
            <i className="material-icons">psychology</i>
            <span className="skill-value" id="teamwork-skill">{state.player.skills.teamwork}</span>
            <span className="tooltip">Teamwork</span>
          </div>
        </div>
      </div>
      <div className="inventory-section">
        <h3>INVENTORY</h3>
        <div id="inventory-grid">
          {inv.length === 0 ? (
            <p className="empty">Empty</p>
          ) : (
            inv.map(([name, count]) => {
              const item = state.itemTypes.find(it => it.name === name)!;
              return (
                <div key={name} className="inventory-slot" data-item-name={name} onClick={() => onUseItem(name)}>
                  {item.emoji}
                  <span className="tooltip">{item.name.replace('a ', '')}</span>
                  {Number(count) > 1 && <span className="item-count">{String(count)}</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="log-section">
        <h3>MEMOS</h3>
        <div className="log-container" id="log-container">
          <div id="log-messages">
            {state.messages.map((m, i) => (<p key={i}>{m}</p>))}
          </div>
        </div>
      </div>
      <div id="game-over-overlay" className={state.gameOver ? 'visible' : ''}>
        <h2 id="game-over-title">{state.floor > CEO_FLOOR ? 'Promotion!' : state.player.productivity <= 0 || state.player.reputation <= 0 ? "You're Fired!" : state.player.happiness <= 0 ? 'You Quit!' : ''}</h2>
        <p id="game-over-text">{state.floor > CEO_FLOOR ? "The CEO is impressed with your synergy! You're promoted to Senior Vice President of Something-or-Other." : ''}</p>
        <button id="restart-button" onClick={onRestart}>Start a New Career</button>
      </div>
    </div>
  );
}


