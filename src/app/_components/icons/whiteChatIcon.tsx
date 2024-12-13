import React from "react";

interface WhiteSpeechBubbleIconProps {
  size?: number;
  className?: string;
}

const WhiteChatIcon: React.FC<WhiteSpeechBubbleIconProps> = ({
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
        d="M18 14C18 14.3978 17.842 14.7794 17.5607 15.0607C17.2794 15.342 16.8978 15.5 16.5 15.5H7.5L4.5 18.5V7C4.5 6.60218 4.65804 6.22064 4.93934 5.93934C5.22064 5.65804 5.60218 5.5 6 5.5H16.5C16.8978 5.5 17.2794 5.65804 17.5607 5.93934C17.842 6.22064 18 6.60218 18 7V14Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.25" cy="10.5" r="0.75" fill="black" />
      <circle cx="11.25" cy="10.5" r="0.75" fill="black" />
      <circle cx="14.25" cy="10.5" r="0.75" fill="black" />
    </svg>
  );
};

export default WhiteChatIcon;
