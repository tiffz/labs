import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultExpanded = true,
  children,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`collapsible-section ${className} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="collapsible-section-header"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
        aria-expanded={isExpanded}
      >
        <span className="collapsible-section-title">{title}</span>
        <span className="collapsible-section-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      {isExpanded && (
        <div className="collapsible-section-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;

