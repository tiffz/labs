interface WorkIconProps {
  className?: string;
  color?: string;
}

const WorkIcon = ({ className, color = "#00A5E0" }: WorkIconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    className={className}
    fill={color}
  >
    <path d="M14,6V4H10V6H8V8H6V19H18V8H16V6H14M12,8.75L15.25,12H13V16H11V12H8.75L12,8.75Z" />
  </svg>
);

export default WorkIcon; 