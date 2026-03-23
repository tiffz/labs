import React from 'react';

type FeatureItem = {
  icon?: string;
  customIconText?: string;
  customIconClassName?: string;
  title: string;
  description: string;
};

const FEATURE_ITEMS: FeatureItem[] = [
  {
    icon: 'music_note',
    title: 'BPM + Key',
    description: 'Detect tempo and key on uploads.',
  },
  {
    icon: 'timer',
    title: 'Metronome + Drums',
    description: 'Practice in time with rhythmic backing.',
  },
  {
    icon: 'loop',
    title: 'Loop Sections',
    description: 'Split songs into repeatable sections.',
  },
  {
    customIconText: '\u266f',
    customIconClassName: 'landing-feature-icon-accidental',
    title: 'Tempo + Pitch',
    description: 'Adjust speed and transposition to fit your level.',
  },
];

const LandingFeatureGrid: React.FC = () => {
  return (
    <div className="landing-feature-grid" aria-label="Beat Finder features">
      {FEATURE_ITEMS.map((feature) => (
        <article key={feature.title} className="landing-feature-card">
          {feature.icon ? (
            <span className="material-symbols-outlined">{feature.icon}</span>
          ) : (
            <span className={`landing-feature-custom-icon ${feature.customIconClassName ?? ''}`} aria-hidden="true">
              {feature.customIconText}
            </span>
          )}
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </article>
      ))}
    </div>
  );
};

export default LandingFeatureGrid;
