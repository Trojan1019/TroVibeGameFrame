import React from 'react';
import { SquirrelSvg } from './SquirrelSvg';

interface AvatarProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const FoxAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      {/* Left Ear */}
      <path
        d="M 20 40 Q 15 5 40 25 Z"
        fill="#EA580C"
        stroke="#78350F"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M 24 35 Q 20 15 35 27 Z"
        fill="#FCA5A5"
      />

      {/* Right Ear */}
      <path
        d="M 80 40 Q 85 5 60 25 Z"
        fill="#EA580C"
        stroke="#78350F"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M 76 35 Q 80 15 65 27 Z"
        fill="#FCA5A5"
      />

      {/* Main Face Base */}
      <path
        d="M 15 60 C 15 35, 85 35, 85 60 C 85 85, 50 95, 15 60 Z"
        fill="#F97316"
        stroke="#78350F"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Chubby White Cheeks */}
      <path
        d="M 16 62 C 22 75, 42 75, 48 64 C 48 55, 18 52, 16 62 Z"
        fill="#FFFDF7"
        stroke="#78350F"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M 84 62 C 78 75, 58 75, 52 64 C 52 55, 82 52, 84 62 Z"
        fill="#FFFDF7"
        stroke="#78350F"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Nose Snout overlay */}
      <path
        d="M 40 60 L 50 72 L 60 60 Z"
        fill="#EA580C"
      />

      {/* Black Nose Dot */}
      <circle cx="50" cy="70" r="4.5" fill="#1E293B" />

      {/* Little Whisker Lines */}
      <path d="M 22 66 L 12 65" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 23 71 L 14 73" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 78 66 L 88 65" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 77 71 L 86 73" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

      {/* Cute Eyes */}
      <circle cx="36" cy="52" r="5" fill="#1E293B" />
      <circle cx="34" cy="50" r="1.8" fill="#FFFFFF" />
      <circle cx="64" cy="52" r="5" fill="#1E293B" />
      <circle cx="62" cy="50" r="1.8" fill="#FFFFFF" />

      {/* Pink Blushes */}
      <circle cx="26" cy="59" r="4" fill="#F87171" opacity="0.65" />
      <circle cx="74" cy="59" r="4" fill="#F87171" opacity="0.65" />
    </svg>
  );
};

export const BearAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      {/* Left Ear */}
      <circle cx="25" cy="28" r="14" fill="#854D0E" stroke="#78350F" strokeWidth="3.5" />
      <circle cx="25" cy="28" r="7" fill="#FCA5A5" />

      {/* Right Ear */}
      <circle cx="75" cy="28" r="14" fill="#854D0E" stroke="#78350F" strokeWidth="3.5" />
      <circle cx="75" cy="28" r="7" fill="#FCA5A5" />

      {/* Head Base */}
      <circle cx="50" cy="58" r="34" fill="#A16207" stroke="#78350F" strokeWidth="3.5" />

      {/* Cute Cheeks */}
      <ellipse cx="25" cy="64" rx="7" ry="5" fill="#EAB308" opacity="0.4" />
      <ellipse cx="75" cy="64" rx="7" ry="5" fill="#EAB308" opacity="0.4" />

      {/* White Snout */}
      <ellipse cx="50" cy="68" rx="14" ry="11" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />

      {/* Nose */}
      <path
        d="M 45 64 Q 50 59, 55 64 Q 50 69, 45 64"
        fill="#1E293B"
      />

      {/* Mouth */}
      <path
        d="M 46 70 Q 50 73, 54 70"
        stroke="#78350F"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Eyes */}
      <circle cx="36" cy="50" r="5" fill="#1E293B" />
      <circle cx="34" cy="48" r="1.8" fill="#FFFFFF" />
      <circle cx="64" cy="50" r="5" fill="#1E293B" />
      <circle cx="62" cy="48" r="1.8" fill="#FFFFFF" />

      {/* Pink Blushes */}
      <circle cx="28" cy="56" r="3.5" fill="#F87171" opacity="0.6" />
      <circle cx="72" cy="56" r="3.5" fill="#F87171" opacity="0.6" />
    </svg>
  );
};

export const RabbitAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Long Bunny Ears */}
      {/* Left Ear */}
      <path
        d="M 25 45 C 15 5, 40 5, 36 45"
        fill="#FFFDF9"
        stroke="#78350F"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 26 38 C 20 12, 34 12, 32 38"
        fill="#FCA5A5"
        strokeLinecap="round"
      />

      {/* Right Ear */}
      <path
        d="M 75 45 C 85 5, 60 5, 64 45"
        fill="#FFFDF9"
        stroke="#78350F"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 74 38 C 80 12, 66 12, 68 38"
        fill="#FCA5A5"
        strokeLinecap="round"
      />

      {/* Head Base */}
      <ellipse cx="50" cy="65" rx="32" ry="28" fill="#FFFDF9" stroke="#78350F" strokeWidth="3.5" />

      {/* Chubby Cheeks */}
      <ellipse cx="23" cy="72" rx="6" ry="5" fill="#FFF2F2" />
      <ellipse cx="77" cy="72" rx="6" ry="5" fill="#FFF2F2" />

      {/* Pink Blushes */}
      <circle cx="26" cy="68" r="4.5" fill="#F87171" opacity="0.65" />
      <circle cx="74" cy="68" r="4.5" fill="#F87171" opacity="0.65" />

      {/* Tiny Rabbit Nose */}
      <polygon points="47,65 53,65 50,69" fill="#EA580C" stroke="#78350F" strokeWidth="1" />

      {/* Smiling Mouth */}
      <path
        d="M 45 71 Q 48 74, 50 71 Q 52 74, 55 71"
        stroke="#78350F"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Eyes */}
      <circle cx="36" cy="56" r="5" fill="#1E293B" />
      <circle cx="34" cy="54" r="1.8" fill="#FFFFFF" />
      <circle cx="64" cy="56" r="5" fill="#1E293B" />
      <circle cx="62" cy="54" r="1.8" fill="#FFFFFF" />
    </svg>
  );
};

export const HamsterAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      {/* Left Ear */}
      <circle cx="28" cy="28" r="10" fill="#D97706" stroke="#78350F" strokeWidth="3.5" />
      <circle cx="28" cy="28" r="5" fill="#FCA5A5" />

      {/* Right Ear */}
      <circle cx="72" cy="28" r="10" fill="#D97706" stroke="#78350F" strokeWidth="3.5" />
      <circle cx="72" cy="28" r="5" fill="#FCA5A5" />

      {/* Head Shell */}
      <ellipse cx="50" cy="58" rx="34" ry="30" fill="#F59E0B" stroke="#78350F" strokeWidth="3.5" />

      {/* Golden Cheeks / Golden Pattern */}
      <ellipse cx="23" cy="62" rx="10" ry="12" fill="#D97706" opacity="0.3" />
      <ellipse cx="77" cy="62" rx="10" ry="12" fill="#D97706" opacity="0.3" />

      {/* Creamy Snout & Cheeks bottom */}
      <ellipse cx="50" cy="68" rx="13" ry="10" fill="#FFFDF4" stroke="#D97706" strokeWidth="2" />

      {/* Nose */}
      <polygon points="48,63 52,63 50,66" fill="#78350F" />

      {/* Mouth */}
      <path
        d="M 45 68 Q 48 71, 50 68 Q 52 71, 55 68"
        stroke="#78350F"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Whiskers */}
      <path d="M 18 64 L 8 62" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 19 69 L 10 70" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 82 64 L 92 62" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 81 69 L 90 70" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

      {/* Cute Eyes */}
      <circle cx="36" cy="48" r="5.5" fill="#1E293B" />
      <circle cx="34" cy="45" r="2" fill="#FFFFFF" />
      <circle cx="38" cy="50" r="0.7" fill="#FFFFFF" />
      <circle cx="64" cy="48" r="5.5" fill="#1E293B" />
      <circle cx="62" cy="45" r="2" fill="#FFFFFF" />
      <circle cx="66" cy="50" r="0.7" fill="#FFFFFF" />

      {/* Blushes */}
      <circle cx="24" cy="56" r="4.5" fill="#F87171" opacity="0.7" />
      <circle cx="76" cy="56" r="4.5" fill="#F87171" opacity="0.7" />
    </svg>
  );
};

export const CatAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      <path d="M 22 42 L 15 12 L 40 30 Z" fill="#FDBA74" stroke="#78350F" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M 24 38 L 19 18 L 36 29 Z" fill="#FECACA" />
      <path d="M 78 42 L 85 12 L 60 30 Z" fill="#FDBA74" stroke="#78350F" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M 76 38 L 81 18 L 64 29 Z" fill="#FECACA" />

      {/* Head */}
      <ellipse cx="50" cy="58" rx="34" ry="29" fill="#F97316" stroke="#78350F" strokeWidth="3.5" />

      {/* Stripes on forehead */}
      <path d="M 50 32 L 50 42" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
      <path d="M 44 33 L 46 40" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 56 33 L 54 40" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />

      {/* Cute Eyes */}
      <circle cx="35" cy="53" r="5" fill="#1E293B" />
      <circle cx="33" cy="51" r="1.8" fill="#FFFFFF" />
      <circle cx="65" cy="53" r="5" fill="#1E293B" />
      <circle cx="63" cy="51" r="1.8" fill="#FFFFFF" />

      {/* Snout Cream */}
      <ellipse cx="50" cy="67" rx="11" ry="8" fill="#FFFDF4" />

      {/* Nose */}
      <polygon points="48,63 52,63 50,66" fill="#F43F5E" />

      {/* Whiskers */}
      <path d="M 22 64 L 8 63" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 23 70 L 10 72" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 78 64 L 92 63" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
      <path d="M 77 70 L 90 72" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

      {/* Pink Blushes */}
      <circle cx="26" cy="62" r="4.5" fill="#F87171" opacity="0.65" />
      <circle cx="74" cy="62" r="4.5" fill="#F87171" opacity="0.65" />
    </svg>
  );
};

export const DogAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Floppy Ears */}
      <path d="M 12 36 C 5 45, 10 70, 24 64 C 24 50, 20 38, 12 36 Z" fill="#92400E" stroke="#78350F" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M 88 36 C 95 45, 90 70, 76 64 C 76 50, 80 38, 88 36 Z" fill="#92400E" stroke="#78350F" strokeWidth="3.5" strokeLinejoin="round" />

      {/* Head */}
      <circle cx="50" cy="54" r="31" fill="#FBBF24" stroke="#78350F" strokeWidth="3.5" />

      {/* Cute Patch on one eye */}
      <ellipse cx="36" cy="48" rx="9" ry="11" fill="#D97706" opacity="0.25" />

      {/* Cute Eyes */}
      <circle cx="36" cy="48" r="5" fill="#1E293B" />
      <circle cx="34" cy="46" r="1.8" fill="#FFFFFF" />
      <circle cx="64" cy="48" r="5" fill="#1E293B" />
      <circle cx="62" cy="46" r="1.8" fill="#FFFFFF" />

      {/* Dog Snout */}
      <ellipse cx="50" cy="62" rx="14" ry="10" fill="#FFFDF4" stroke="#78350F" strokeWidth="2.5" />

      {/* Nose */}
      <ellipse cx="50" cy="58" rx="6" ry="4.5" fill="#1E293B" />

      {/* Cute tongue hanging out */}
      <path d="M 47 67 C 47 75, 53 75, 53 67 Z" fill="#EF4444" stroke="#78350F" strokeWidth="2" />

      {/* Blush */}
      <circle cx="26" cy="56" r="4.5" fill="#F87171" opacity="0.6" />
      <circle cx="74" cy="56" r="4.5" fill="#F87171" opacity="0.6" />
    </svg>
  );
};

export const PandaAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      <circle cx="24" cy="30" r="13" fill="#1E293B" stroke="#78350F" strokeWidth="3.5" />
      <circle cx="76" cy="30" r="13" fill="#1E293B" stroke="#78350F" strokeWidth="3.5" />

      {/* Head */}
      <circle cx="50" cy="58" r="33" fill="#FFFDF9" stroke="#78350F" strokeWidth="3.5" />

      {/* Black Eye Patches */}
      <ellipse cx="35" cy="56" rx="9" ry="13" transform="rotate(-15 35 56)" fill="#1E293B" />
      <ellipse cx="65" cy="56" rx="9" ry="13" transform="rotate(15 65 56)" fill="#1E293B" />

      {/* White Sparkle Eyes */}
      <circle cx="35" cy="53" r="3.5" fill="#FFFFFF" />
      <circle cx="34" cy="51" r="1" fill="#1E293B" />
      <circle cx="65" cy="53" r="3.5" fill="#FFFFFF" />
      <circle cx="64" cy="51" r="1" fill="#1E293B" />

      {/* Snout Area */}
      <ellipse cx="50" cy="69" rx="9" ry="7" fill="#F1F5F9" />

      {/* Mini Nose */}
      <ellipse cx="50" cy="66" rx="4.5" ry="3" fill="#1E293B" />

      {/* Mouth */}
      <path d="M 47 71 Q 50 73, 53 71" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Blushes */}
      <circle cx="23" cy="65" r="4.5" fill="#F87171" opacity="0.7" />
      <circle cx="77" cy="65" r="4.5" fill="#F87171" opacity="0.7" />
    </svg>
  );
};

export const FrogAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Giant Eyes Outer */}
      <circle cx="32" cy="34" r="14" fill="#4ADE80" stroke="#78350F" strokeWidth="3.5" />
      <circle cx="68" cy="34" r="14" fill="#4ADE80" stroke="#78350F" strokeWidth="3.5" />

      {/* Giant Eyes Inner White */}
      <circle cx="32" cy="34" r="9" fill="#FFFFFF" />
      <circle cx="68" cy="34" r="9" fill="#FFFFFF" />

      {/* Giant Eyes Pupil */}
      <circle cx="32" cy="34" r="4.5" fill="#1E293B" />
      <circle cx="30" cy="32" r="1.5" fill="#FFFFFF" />
      <circle cx="68" cy="34" r="4.5" fill="#1E293B" />
      <circle cx="66" cy="32" r="1.5" fill="#FFFFFF" />

      {/* Head Oval Base */}
      <ellipse cx="50" cy="61" rx="36" ry="26" fill="#22C55E" stroke="#78350F" strokeWidth="3.5" />

      {/* Cute Cheek Blush Circles */}
      <circle cx="24" cy="64" r="6" fill="#F87171" opacity="0.8" />
      <circle cx="76" cy="64" r="6" fill="#F87171" opacity="0.8" />

      {/* Big Happy Mouth */}
      <path
        d="M 36 60 Q 50 74, 64 60"
        stroke="#78350F"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Nose Mini Dots */}
      <circle cx="47" cy="52" r="1.5" fill="#1E293B" />
      <circle cx="53" cy="52" r="1.5" fill="#1E293B" />
    </svg>
  );
};

export const TigerAvatar: React.FC<AvatarProps> = ({
  className = '',
  width = '100%',
  height = '100%',
}) => {
  return (
    <svg
      className={`select-none ${className}`}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      <circle cx="25" cy="32" r="12" fill="#EA580C" stroke="#78350F" strokeWidth="3.5" />
      <circle cx="25" cy="32" r="6" fill="#FEF08A" />
      <circle cx="75" cy="32" r="12" fill="#EA580C" stroke="#78350F" strokeWidth="3.5" />
      <circle cx="75" cy="32" r="6" fill="#FEF08A" />

      {/* Head */}
      <ellipse cx="50" cy="60" rx="34" ry="29" fill="#F97316" stroke="#78350F" strokeWidth="3.5" />

      {/* Tiger Stripes */}
      {/* Forehead */}
      <path d="M 50 34 L 50 43" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 43 35 L 46 41" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 57 35 L 54 41" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      {/* Side Stripes */}
      <path d="M 18 56 C 24 56, 24 58, 22 58" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <path d="M 17 62 C 22 62, 22 64, 20 64" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <path d="M 82 56 C 76 56, 76 58, 78 58" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <path d="M 83 62 C 78 62, 78 64, 80 64" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />

      {/* Eyes */}
      <circle cx="35" cy="52" r="5" fill="#1E293B" />
      <circle cx="33" cy="50" r="1.8" fill="#FFFFFF" />
      <circle cx="65" cy="52" r="5" fill="#1E293B" />
      <circle cx="63" cy="50" r="1.8" fill="#FFFFFF" />

      {/* Snout */}
      <ellipse cx="50" cy="68" rx="11" ry="8" fill="#FEF08A" stroke="#78350F" strokeWidth="2" />
      <circle cx="50" cy="64" r="3.5" fill="#1E293B" />

      {/* Smiling Mouth */}
      <path d="M 46 70 Q 50 73, 54 70" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Cheek Pink Blushes */}
      <circle cx="26" cy="60" r="4.5" fill="#F87171" opacity="0.65" />
      <circle cx="74" cy="60" r="4.5" fill="#F87171" opacity="0.65" />
    </svg>
  );
};

export const UniversalAvatar: React.FC<{
  id: string;
  className?: string;
}> = ({ id, className = '' }) => {
  switch (id) {
    case 'player':
      return (
        <div className={`w-full h-full scale-125 translate-y-0.5 ${className}`}>
          <SquirrelSvg variant="happy" />
        </div>
      );
    case 'fox':
      return <FoxAvatar className={className} />;
    case 'bear':
      return <BearAvatar className={className} />;
    case 'rabbit':
      return <RabbitAvatar className={className} />;
    case 'hamster':
      return <HamsterAvatar className={className} />;
    case 'cat':
      return <CatAvatar className={className} />;
    case 'dog':
      return <DogAvatar className={className} />;
    case 'panda':
      return <PandaAvatar className={className} />;
    case 'frog':
      return <FrogAvatar className={className} />;
    case 'tiger':
      return <TigerAvatar className={className} />;
    default:
      return (
        <div className={`w-full h-full scale-125 translate-y-0.5 ${className}`}>
          <SquirrelSvg variant="happy" />
        </div>
      );
  }
};
