import React from 'react';
import { LogoIcon } from './LogoIcon';
import './logo.css';

export interface LogoProps {
  small?: boolean;
  large?: boolean;
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  small = false,
  large = false,
  showText = true,
  animated = false,
  className = '',
}) => {
  let size = 48;
  if (small) size = 32;
  if (large) size = 64;

  return (
    <div className={`logo-wrapper ${className}`}>
      <LogoIcon size={size} animated={animated} />
      {showText && (
        <span className={`logo-text ${large ? 'logo-text-large' : ''}`} style={{ marginLeft: size * 0.25 }}>
          Mediguide<span className="logo-text-x">X</span>
        </span>
      )}
    </div>
  );
};

export const HeroLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => {
  return (
    <div className={`flex items-center justify-center ${className}`} style={style}>
      <LogoIcon size={120} animated={true} />
    </div>
  );
};
