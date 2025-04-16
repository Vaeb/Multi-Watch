import React from "react";

interface RefreshIconProps {
  size?: number;
  className?: string;
  alt?: string;
}

const RefreshIcon: React.FC<RefreshIconProps> = ({
  size = 100,
  className = "",
  alt = "",
}) => {
  return (
    <svg
      height={size}
      width={size}
      viewBox={`0 0 100 100`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      >
        <path d="m50 10v35" />
        <path d="m20 29c-16 23-5 61 30 61s50-43 24-70" />
      </g>
      <path d="m2 21 29-2 2 29" fill="#fff" />
    </svg>
  );
};

export default RefreshIcon;
