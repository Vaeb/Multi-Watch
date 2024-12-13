import React from "react";

interface WhiteRotatingIconProps {
  size?: number;
  className?: string;
}

const WhiteRotatingIcon: React.FC<WhiteRotatingIconProps> = ({
  size = 24,
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4C14.0011 4 15.9127 4.79506 17.3431 6.22183C18.7734 7.64861 19.7971 9.55279 20 11.6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12.4C4.20294 14.4472 5.22663 16.3514 6.65685 17.7782C8.08707 19.2049 9.99891 20 12 20"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 15.5L6.65685 17.7782C8.08707 19.2049 9.99891 20 12 20"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 8.5L17.3431 6.22183C15.9127 4.79506 14.0011 4 12 4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default WhiteRotatingIcon;
