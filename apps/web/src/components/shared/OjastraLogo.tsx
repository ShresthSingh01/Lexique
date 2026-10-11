import React from "react";

interface Props {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const OjastraLogo: React.FC<Props> = ({ size = 32, className, style }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id="ojastraBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E1FD" />
          <stop offset="100%" stopColor="#0553F9" />
        </linearGradient>
        <linearGradient id="ojastraOrangeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF930F" />
          <stop offset="100%" stopColor="#FF1C1C" />
        </linearGradient>
      </defs>

      {/* Minimal Infinity / O-J monogram */}
      <g transform="translate(250, 250)">
        {/* Blue dominant loop */}
        <path
          d="M-80,-40 C-130,-40 -150,0 -120,40 C-90,80 -40,80 0,40 C40,0 90,0 120,40 C150,80 130,120 80,120 L100,160 C170,160 200,90 150,30 C100,-30 50,-30 10,10 C-30,50 -70,50 -90,20 C-110,-10 -90,-40 -50,-40 Z"
          fill="url(#ojastraBlueGrad)"
        />

        {/* Orange accent loop */}
        <path
          d="M80,40 C130,40 150,0 120,-40 C90,-80 40,-80 0,-40 C-40,0 -90,0 -120,-40 C-150,-80 -130,-120 -80,-120 L-100,-160 C-170,-160 -200,-90 -150,-30 C-100,30 -50,30 -10,-10 C30,-50 70,-50 90,-20 C110,10 90,40 50,40 Z"
          fill="url(#ojastraOrangeGrad)"
        />
      </g>
    </svg>
  );
};
