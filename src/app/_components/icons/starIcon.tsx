import React from "react";

interface StarIconProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

const StarIcon: React.FC<StarIconProps> = ({
  size = 24,
  className = "",
  filled = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.75L14.86 8.54L21.25 9.47L16.62 13.98L17.71 20.35L12 17.35L6.29 20.35L7.38 13.98L2.75 9.47L9.14 8.54L12 2.75Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default StarIcon;
