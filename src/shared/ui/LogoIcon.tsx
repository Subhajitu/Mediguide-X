import React from 'react';
import { motion } from 'framer-motion';

export interface LogoIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  size = 64,
  className = '',
  animated = false,
}) => {
  const containerVariants = {
    animate: {
      y: [0, -8, 0],
      transition: {
        duration: 5,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
    static: { y: 0 },
  } as any;

  const glowVariants = {
    animate: {
      opacity: [0.6, 1, 0.6],
      scale: [0.95, 1.05, 0.95],
      transition: {
        duration: 8,
        ease: "easeInOut",
        repeat: Infinity,
      },
    },
    static: { opacity: 1, scale: 1 },
  } as any;

  return (
    <motion.div
      className={`logo-icon-container ${className}`}
      style={{ width: size, height: size, flexShrink: 0, position: 'relative' }}
      variants={containerVariants}
      animate={animated ? "animate" : "static"}
    >
      <motion.div 
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        variants={glowVariants}
        animate={animated ? "animate" : "static"}
      >
        <svg viewBox="0 0 256 256" width="100%" height="100%">
          <defs>
            <radialGradient id="mintGlowIcon" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
            </radialGradient>
            <filter id="softGlowIcon" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="24" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <circle cx="128" cy="128" r="110" fill="url(#mintGlowIcon)" filter="url(#softGlowIcon)" />
        </svg>
      </motion.div>
      <svg viewBox="0 0 256 256" width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
        <defs>
          <linearGradient id="xGradientIcon" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
          <filter id="dropShadowIcon" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#0F766E" floodOpacity="0.12" />
          </filter>
        </defs>
        
        {/* Rounded Hexagon */}
        <polygon points="128,36 207.6,82 207.6,174 128,220 48.4,174 48.4,82" 
                 fill="#FFFFFF" 
                 stroke="#D7F5E6" 
                 strokeWidth="16" 
                 strokeLinejoin="round" 
                 filter="url(#dropShadowIcon)" />

        {/* Stylized Elegant X */}
        <g stroke="url(#xGradientIcon)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 100,100 C 120,100 128,120 128,128 C 128,136 136,156 156,156" />
          <path d="M 156,100 C 136,100 128,120 128,128 C 128,136 120,156 100,156" />
          <circle cx="128" cy="128" r="3" fill="url(#xGradientIcon)" stroke="none" />
          <path d="M 88,88 L 94,94 M 168,168 L 162,162 M 168,88 L 162,94 M 88,168 L 94,162" strokeWidth="4" />
        </g>
      </svg>
    </motion.div>
  );
};
