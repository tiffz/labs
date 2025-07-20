import React from 'react';

interface CatProps {
  onClick: () => void;
  isPetting: boolean;
}

const Cat: React.FC<CatProps> = ({ onClick, isPetting }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 200"
      className="cat-svg"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <g id="cat-container" className={isPetting ? 'is-petting' : ''} transform="translate(10, 20)">
        {/* Tail */}
        <g id="tail">
          <path
            d="M 160 150 C 210 150, 210 90, 170 80 L 160 90 C 200 100, 200 145, 155 145 Z"
            fill="#212121"
          />
        </g>
        
        {/* Body */}
        <g id="body">
          <path
            d="M 30 100 C -20 185, 220 185, 170 100 Z"
            fill="#212121"
          />
        </g>

        {/* Head */}
        <g id="head">
          <path
            d="M 30 100 C 20 40, 180 40, 170 100 Z"
            fill="#212121"
          />
          <path
            d="M 50 55 L 65 30 L 80 55 Z"
            fill="#212121"
          />
          <path
            d="M 120 55 L 135 30 L 150 55 Z"
            fill="#212121"
          />
        </g>
        
        {/* Face */}
        <g id="face" transform="translate(0, -5)">
          {/* Eyes */}
          <circle cx="80" cy="80" r="10" fill="white" />
          <circle cx="82" cy="82" r="5" fill="black" />
          <circle cx="120" cy="80" r="10" fill="white" />
          <circle cx="122" cy="82" r="5" fill="black" />
          {/* Nose */}
          <path d="M 97 90 L 103 90 L 100 94 Z" fill="white" />
        </g>
      </g>
    </svg>
  );
};

export default Cat; 