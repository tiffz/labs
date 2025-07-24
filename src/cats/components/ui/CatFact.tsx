import React from 'react';

interface CatFactProps {
  fact: string;
}

const CatFact: React.FC<CatFactProps> = ({ fact }) => {
  return (
    <div className="cat-fact-container">
      <p>&ldquo;{fact}&rdquo;</p>
    </div>
  );
};

export default CatFact; 