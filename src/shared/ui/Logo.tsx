import React from 'react';


// The highly stylized curved 'X'
const StylizedX = ({ className = '', fill = '#128261', style }: { className?: string; fill?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 100 100" className={className} width="1em" height="1em" overflow="visible" style={style}>
    <path 
      d="M30,20 C45,20 50,45 50,50 C50,55 55,80 70,80 C75,80 78,75 75,70 C65,55 60,50 60,50 C60,50 65,45 75,30 C78,25 75,20 70,20 C55,20 50,45 50,50 C50,45 45,20 30,20 C25,20 22,25 25,30 C35,45 40,50 40,50 C40,50 35,55 25,70 C22,75 25,80 30,80 C45,80 50,55 50,50 C50,45 45,20 30,20 Z" 
      fill={fill} 
    />
  </svg>
);

export const SidebarLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
   <div className={`flex items-center gap-2 ${className}`}>
      {/* Green Hexagon Icon */}
      <svg width="32" height="32" viewBox="0 0 100 100" className="flex-shrink-0">
     <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="#128261" />
      {/* Asterisk/Cross symbol */}
        <path d="M50,25 L50,75 M25,50 L75,50 M32,32 L68,68 M32,68 L68,32" stroke="white" strokeWidth="6" strokeLinecap="round" />
      </svg>
       {/* Mediguide Text */}
      <div className="sidebar-logo-text flex items-center" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0', color: '#1e293b' }}>
        Mediguide
        {/* Stylized X */}
        <StylizedX className="ml-1" fill="#128261" style={{ fontSize: '1.2em', transform: 'translateY(-1px)' }} />
    
      </div>
    </div>
  );
};

export const HeroLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: '120px', height: '120px' }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-xl" style={{ filter: 'drop-shadow(0 0 18px rgba(255,255,255,1)) drop-shadow(0 0 34px rgba(74,222,128,0.48)) drop-shadow(0 18px 34px rgba(18,130,97,0.16))' }}>
      <polygon points="50,2 98,25 98,75 50,98 2,75 2,25" fill="white" stroke="rgba(74,222,128,0.28)" strokeWidth="2" />
        <polygon points="50,10 87,31 87,69 50,90 13,69 13,31" fill="rgba(230,247,242,0.55)" stroke="#e6f7f2" strokeWidth="3" />
        <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill="none" stroke="rgba(18,130,97,0.12)" strokeWidth="2" />
      </svg>
<StylizedX className="brand-x-hero" />    </div>
  );
};
