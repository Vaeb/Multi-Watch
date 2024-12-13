import React from "react";

interface WhiteSpeakerIconProps {
  size?: number;
  className?: string;
}

const WhiteSpeakerIcon: React.FC<WhiteSpeakerIconProps> = ({
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
        d="M11 5L6 9H2V15H6L11 19V5Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.54 8.46C16.4774 9.39764 17.0039 10.6692 17.0039 11.995C17.0039 13.3208 16.4774 14.5924 15.54 15.53"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.24 5.76C19.9778 7.49786 20.9377 9.84458 20.9377 12.285C20.9377 14.7254 19.9778 17.0721 18.24 18.81"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default WhiteSpeakerIcon;
