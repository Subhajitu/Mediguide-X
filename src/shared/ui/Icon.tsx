import React from 'react';

export type IconName = 
  | 'menu' | 'plus' | 'search' | 'upload' | 'bell' | 'chevron-down' 
  | 'chevron-left' | 'chevron-right'
  | 'dna' | 'heart' | 'stethoscope' | 'shield' | 'cross' 
  | 'symptom' | 'report' | 'prescription' | 'pill' | 'microscope' | 'calendar'
  | 'arrow-right' | 'attach' | 'mic' | 'scan' | 'send' 
  | 'heart-rate' | 'blood-pressure' | 'health-score' | 'add-record' | 'reminder' | 'insurance' | 'emergency' | 'chat' | 'settings' | 'user';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', ...props }) => {
  const getPath = () => {
    switch (name) {
      case 'menu':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />;
      case 'plus':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />;
      case 'search':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
      case 'bell':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />;
      case 'chevron-down':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />;
      case 'chevron-left':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />;
      case 'chevron-right':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />;
      case 'arrow-right':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />;
      case 'send':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />;
      case 'mic':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />;
      case 'attach':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />;
      case 'scan':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />;
      case 'chat':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />;
      case 'upload':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />;
      case 'dna':
        return (
          <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 3c5 3 5 15 10 18M17 3C12 6 12 18 7 21" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 6h7M9.5 10h5M9.5 14h5M8.5 18h7" />
          </>
        );
      case 'heart':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />;
      case 'stethoscope':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v5a4 4 0 008 0V3M4 3h4M12 3h4M10 12v2a5 5 0 0010 0v-1M20 13a2 2 0 10-4 0 2 2 0 004 0z" />;
      case 'cross':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z" />;
      case 'symptom':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />;
      case 'report':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2zm7 0v5h5M8 13h8M8 17h5" />;
      case 'prescription':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h7a4 4 0 010 8H7V4zm0 8l9 8M7 12v8" />;
      case 'pill':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21a5 5 0 01-7-7l6.5-6.5a5 5 0 017 7L10.5 21zm-3-10.5l6 6" />;
      case 'microscope':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h5v4H9V3zm2.5 4v4.5M8 21h10M10 17h6M13 11.5A4.5 4.5 0 018.5 16H7m7-8l4 4" />;
      case 'calendar':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3M17 3v3M4 8h16M6 5h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zm2 7h3v3H8v-3z" />;
      case 'shield':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />;
      case 'heart-rate':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-6 4 12 2-6h6" />;
      case 'blood-pressure':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a7 7 0 007-7c0-2-1-3.9-3-5.5S12.5 4.5 12 2c-.5 2.5-2 4.9-4 6.5S5 12 5 14a7 7 0 007 7z" />;
      case 'health-score':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s8-4.5 8-11V5l-8-3-8 3v5c0 6.5 8 11 8 11zm-3-10l2 2 4-5" />;
      case 'add-record':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h9l3 3v15H6a2 2 0 01-2-2V5a2 2 0 012-2zm8 0v4h4M9 14h6M12 11v6" />;
      case 'reminder':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 2M5 5l-2 2M19 5l2 2M12 22a8 8 0 100-16 8 8 0 000 16z" />;
      case 'insurance':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 3v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3zm-3 9l2 2 4-5" />;
      case 'emergency':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z" />;
      case 'settings':
        return <><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" /></>;
      case 'user':
        return <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />;
      default:
        // Generic circle as fallback
        return <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />;
    }
  };

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={`icon icon-${name} ${className}`}
      width={size} 
      height={size}
      {...props}
    >
      {getPath()}
    </svg>
  );
};
