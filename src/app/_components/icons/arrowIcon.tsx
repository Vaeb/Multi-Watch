import React from "react";

interface ArrowIconProps {
  size?: number;
  className?: string;
  alt?: string;
}

const ArrowIcon: React.FC<ArrowIconProps> = ({
  size = 24,
  className = "",
  alt = "",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 18 18"
      className={className}
    >
      <path
        d="M9 1a1 1 0 0 0-1 1v10.586L4.707 9.293a1 1 0 1 0-1.414 1.414l5 5a1 1 0 0 0 1.414 0l5-5a1 1 0 0 0-1.414-1.414L10 12.586V2a1 1 0 0 0-1-1Z"
        fill="#fff"
      />
    </svg>
  );
};

export default ArrowIcon;
