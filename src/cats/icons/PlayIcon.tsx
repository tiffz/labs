interface PlayIconProps {
  className?: string;
  color?: string;
}

const PlayIcon = ({ className, color = "#9C27B0" }: PlayIconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className={className}
    fill={color}
  >
    <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
  </svg>
);

export default PlayIcon; 