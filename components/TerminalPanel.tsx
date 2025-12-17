
import React, { ReactNode } from 'react';

interface TerminalPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
  isFlickering?: boolean;
  activeTab?: string;
  tabs?: string[];
  onTabChange?: (tab: string) => void;
  onTitleClick?: () => void;
  lightMode?: boolean;
  variant?: 'standard' | 'crt';
  headerContent?: ReactNode;
  customBorderColor?: string; // New Prop
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ 
  title, 
  children, 
  className = "", 
  isFlickering = false,
  tabs = [],
  activeTab,
  onTabChange,
  onTitleClick,
  lightMode = false,
  variant = 'standard',
  headerContent,
  customBorderColor
}) => {
  
  // Dynamic Styles based on Theme
  // Dark: Green Border. Light: Double line Sepia border.
  // Use customBorderColor if provided
  const borderClass = customBorderColor 
    ? `border-2 ${customBorderColor}`
    : lightMode 
      ? "border-2 border-double border-[#5d4037]" 
      : "border-2 border-green-800";

  // If variant is 'crt' and not light mode, use the special bg class
  const useHighFidelityCRT = variant === 'crt' && !lightMode;
  
  const bgClass = lightMode 
    ? "bg-[#f5f1e6] shadow-md" // Paper color with slight shadow 
    : useHighFidelityCRT 
      ? "crt-panel-bg shadow-[0_0_15px_rgba(0,0,0,0.3)]" 
      : "bg-[#0a0a0a] shadow-[0_0_15px_rgba(0,0,0,0.3)]";
      
  const headerBg = lightMode 
    ? "bg-[#5d4037]/10 border-b border-[#5d4037]/30" 
    : `bg-green-900/20 border-b ${customBorderColor ? customBorderColor.replace('border-2 ', '') : 'border-green-800'}`;

  const textColor = lightMode ? "text-[#3e2723]" : "text-green-400";
  const titleColor = lightMode ? "text-[#5d4037]" : "text-green-500";
  
  // High fidelity text glow if CRT mode is on
  const glowClass = lightMode 
    ? "" 
    : useHighFidelityCRT 
      ? "crt-text-high-glow" 
      : "terminal-text";

  const tabStyle = (tab: string) => {
    const active = activeTab === tab;
    if (lightMode) {
      return `px-3 py-1 text-[11px] md:text-xs font-semibold uppercase rounded-t-md transition-all duration-200 ${
        active
          ? 'bg-white border border-[#d7c4b2] border-b-0 text-[#2c1810] shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
          : 'bg-[#f0e6da] text-[#5d4037] border border-transparent hover:border-[#d7c4b2] hover:-translate-y-0.5'
      }`;
    }
    return `px-3 py-1 text-[10px] md:text-xs font-bold uppercase rounded-t-md transition-all duration-200 ${
      active
        ? 'bg-green-800 text-black shadow-[0_-2px_10px_rgba(74,222,128,0.35)] border border-green-700 border-b-0'
        : 'bg-green-900/30 text-green-500 border border-transparent hover:border-green-800 hover:-translate-y-0.5'
    }`;
  };

  return (
    <div className={`relative ${borderClass} ${bgClass} rounded-sm overflow-hidden flex flex-col ${className} transition-colors duration-500`}>
      
      {/* Header Bar */}
      <div className={`${headerBg} px-2 py-1 flex justify-between items-center select-none min-h-[32px] z-20 relative transition-colors duration-500`}>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1">
          <span 
            className={`${titleColor} font-bold tracking-widest text-sm uppercase ${glowClass} mr-2 whitespace-nowrap font-header ${onTitleClick ? 'cursor-pointer underline decoration-dotted underline-offset-4' : ''}`}
            onClick={onTitleClick}
          >
            {title}
          </span>
          
          {/* Header Extra Content */}
          {headerContent && (
             <div className={`text-[10px] md:text-xs truncate flex-1 border-l ${lightMode ? 'border-[#5d4037]/30' : 'border-green-800'} pl-2 ml-1 opacity-70 ${lightMode ? 'text-[#5d4037]' : 'text-green-600'}`}>
                {headerContent}
             </div>
          )}

          {/* Tabs */}
          {tabs.length > 0 && (
            <div className="flex space-x-2 ml-auto items-end">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => onTabChange?.(tab)}
                  className={tabStyle(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pulse Indicator (Only if no tabs) */}
        {!tabs.length && (
            <div className="flex gap-1 ml-2">
                <div className={`w-2 h-2 rounded-full ${lightMode ? 'bg-[#8d6e63]' : 'bg-green-500 shadow-[0_0_5px_#4ade80]'} animate-pulse`}></div>
            </div>
        )}
      </div>

      {/* Content Area */}
      <div className={`p-3 md:p-4 ${textColor} font-mono relative z-20 h-full overflow-auto ${isFlickering ? 'animate-pulse' : ''} ${glowClass}`}>
        {children}
      </div>

      {/* Visual Effects (Only in Dark Mode) */}
      {!lightMode && !useHighFidelityCRT && (
        <>
          <div className="scanline animate-scanline"></div>
          <div className="absolute inset-0 bg-green-500/5 pointer-events-none z-10 mix-blend-overlay"></div>
        </>
      )}

      {/* Special Effects for CRT Variant */}
      {useHighFidelityCRT && (
         <>
            <div className="crt-panel-scanlines absolute inset-0 z-10 animate-scanline"></div>
            <div className="absolute inset-0 bg-green-500/10 pointer-events-none z-10 mix-blend-overlay"></div>
         </>
      )}
    </div>
  );
};

export default TerminalPanel;
