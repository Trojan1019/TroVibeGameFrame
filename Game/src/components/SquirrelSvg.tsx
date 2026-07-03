import React from 'react';

interface SquirrelSvgProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  variant?: 'normal' | 'happy' | 'proud' | 'shy';
  showTile?: boolean;
  tileValue?: number;
}

export const SquirrelSvg: React.FC<SquirrelSvgProps> = ({
  className = '',
  width = '100%',
  height = '100%',
  variant = 'normal',
  showTile = false,
  tileValue = 2048,
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background soft shadow */}
      <ellipse cx="100" cy="180" rx="60" ry="12" fill="#4B5320" fillOpacity="0.15" />

      {/* Bushy Tail (Back) */}
      <path
        d="M 120 160 C 180 180, 220 120, 190 70 C 160 20, 110 50, 130 90 C 140 110, 120 140, 100 150"
        fill="#A16207" /* Dark Golden Amber */
        stroke="#78350F" /* Brown Stroke */
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tail Inner Pattern */}
      <path
        d="M 135 150 C 175 165, 195 115, 175 80 C 155 45, 125 65, 135 90"
        fill="#CA8A04" /* Soft lighter Orange-Brown */
        opacity="0.8"
      />

      {/* Ears */}
      {/* Left Ear */}
      <g>
        <path
          d="M 60 70 C 40 30, 65 20, 75 55 Z"
          fill="#A16207"
          stroke="#78350F"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M 62 65 C 50 40, 65 35, 70 55 Z"
          fill="#FCA5A5" /* Pink Inner Ear */
        />
        {/* Cute tuft on left ear */}
        <path d="M 60 25 C 55 20, 58 15, 59 10" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Right Ear */}
      <g>
        <path
          d="M 140 70 C 160 30, 135 20, 125 55 Z"
          fill="#A16207"
          stroke="#78350F"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M 138 65 C 150 40, 135 35, 130 55 Z"
          fill="#FCA5A5" /* Pink Inner Ear */
        />
        {/* Cute tuft on right ear */}
        <path d="M 140 25 C 145 20, 142 15, 141 10" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Squirrel Body */}
      <rect
        x="65"
        y="100"
        width="70"
        height="75"
        rx="35"
        fill="#A16207"
        stroke="#78350F"
        strokeWidth="4"
      />
      {/* Tummy (Light yellow/cream) */}
      <ellipse cx="100" cy="140" rx="25" ry="30" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />

      {/* Squirrel Head */}
      <circle
        cx="100"
        cy="90"
        r="42"
        fill="#A16207"
        stroke="#78350F"
        strokeWidth="4"
      />

      {/* Face Cheeks */}
      <ellipse cx="65" cy="110" rx="14" ry="12" fill="#EAB308" opacity="0.9" /> {/* Chubby cheek left */}
      <ellipse cx="135" cy="110" rx="14" ry="12" fill="#EAB308" opacity="0.9" /> {/* Chubby cheek right */}

      {/* Pink blush */}
      <circle cx="68" cy="106" r="6" fill="#F87171" opacity="0.6" />
      <circle cx="132" cy="106" r="6" fill="#F87171" opacity="0.6" />

      {/* Eyes */}
      {variant === 'normal' && (
        <>
          {/* Left Eye */}
          <circle cx="78" cy="90" r="8" fill="#1E293B" />
          <circle cx="76" cy="87" r="3" fill="#FFFFFF" />
          <circle cx="80" cy="92" r="1" fill="#FFFFFF" />
          {/* Right Eye */}
          <circle cx="122" cy="90" r="8" fill="#1E293B" />
          <circle cx="120" cy="87" r="3" fill="#FFFFFF" />
          <circle cx="124" cy="92" r="1" fill="#FFFFFF" />
          {/* Eyelashes */}
          <path d="M 72 84 C 74 81, 78 81, 80 82" stroke="#78350F" strokeWidth="2" fill="none" />
          <path d="M 128 84 C 126 81, 122 81, 120 82" stroke="#78350F" strokeWidth="2" fill="none" />
        </>
      )}

      {variant === 'happy' && (
        <>
          {/* Happy curving eyes ^_^ */}
          <path
            d="M 68 92 Q 78 82, 88 92"
            stroke="#1E293B"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 112 92 Q 122 82, 132 92"
            stroke="#1E293B"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {variant === 'proud' && (
        <>
          {/* Playful/Winking eye */}
          <path
            d="M 68 92 Q 78 82, 88 92"
            stroke="#1E293B"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="122" cy="90" r="8" fill="#1E293B" />
          <circle cx="120" cy="87" r="3" fill="#FFFFFF" />
          {/* Highlight cheeks */}
          <path d="M 115 80 L 130 84" stroke="#78350F" strokeWidth="2" />
        </>
      )}

      {variant === 'shy' && (
        <>
          {/* Blushing shy eyes */}
          <ellipse cx="78" cy="90" rx="7" ry="5" fill="#1E293B" />
          <circle cx="76" cy="88" r="2" fill="#FFFFFF" />
          <ellipse cx="122" cy="90" rx="7" ry="5" fill="#1E293B" />
          <circle cx="120" cy="88" r="2" fill="#FFFFFF" />
          <path d="M 72 98 Q 78 100, 84 98" stroke="#F87171" strokeWidth="2" fill="none" />
          <path d="M 116 98 Q 122 100, 128 98" stroke="#F87171" strokeWidth="2" fill="none" />
        </>
      )}

      {/* Nose */}
      <polygon points="96,96 104,96 100,101" fill="#78350F" />

      {/* Mouth */}
      <path
        d="M 94 103 Q 98 107, 100 104 Q 102 107, 106 103"
        stroke="#78350F"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tiny buck teeth */}
      <rect x="97" y="104" width="3" height="4" fill="#FFFFFF" stroke="#78350F" strokeWidth="1" />
      <rect x="100" y="104" width="3" height="4" fill="#FFFFFF" stroke="#78350F" strokeWidth="1" />

      {/* Hands */}
      {/* Left Hand */}
      <circle cx="58" cy="130" r="8" fill="#A16207" stroke="#78350F" strokeWidth="3" />
      {/* Right Hand */}
      <circle cx="142" cy="130" r="8" fill="#A16207" stroke="#78350F" strokeWidth="3" />

      {/* Feet */}
      {/* Left Foot */}
      <rect
        x="64"
        y="170"
        width="22"
        height="12"
        rx="6"
        fill="#854D0E"
        stroke="#78350F"
        strokeWidth="3"
      />
      {/* Right Foot */}
      <rect
        x="114"
        y="170"
        width="22"
        height="12"
        rx="6"
        fill="#854D0E"
        stroke="#78350F"
        strokeWidth="3"
      />

      {/* Forest details on squirrel / Optional 2048 Block holding */}
      {showTile && (
        <g transform="translate(50, 115)">
          {/* Small 3D wooden box */}
          <rect
            x="0"
            y="0"
            width="100"
            height="50"
            rx="12"
            fill="#F59E0B"
            stroke="#78350F"
            strokeWidth="4"
          />
          {/* Orange base border */}
          <rect
            x="4"
            y="4"
            width="92"
            height="38"
            rx="8"
            fill="#E2E8F0"
            opacity="0.1"
          />
          <text
            x="50"
            y="33"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="24"
            fontWeight="bold"
            fontFamily="Arial Black, Impact, sans-serif"
            stroke="#B45309"
            strokeWidth="1.5"
            paintOrder="stroke"
          >
            {tileValue}
          </text>
        </g>
      )}
    </svg>
  );
};
