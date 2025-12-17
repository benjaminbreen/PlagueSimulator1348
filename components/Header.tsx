
import React, { useState, useEffect } from 'react';
import { audioManager } from '../utils/audioManager';

interface HeaderProps {
  date: number;
  location: string;
  country: string;
  lightMode: boolean;
  toggleTheme: () => void;
  onRestart: () => void;
  gameTime: Date;
  onOpenAbout: () => void;
  eraDate: string;
}

const Header: React.FC<HeaderProps> = ({ date, location, country, lightMode, toggleTheme, onRestart, gameTime, onOpenAbout, eraDate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const textColor = lightMode ? "text-[#2c1810]" : "text-green-500";
  const borderColor = lightMode ? "border-[#5d4037]" : "border-green-800";
  const menuBg = lightMode ? "bg-[#e6dfcf]" : "bg-[#0a1a0a]";
  const menuBorder = lightMode ? "border-2 border-double border-[#5d4037]" : "border-2 border-green-800";

  const toggleAudio = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
    // Ensure audio context is running if they click this
    audioManager.resume();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const longLocation = location.length > 34;

  return (
    <header className={`w-full max-w-8xl mb-4 px-10 flex justify-between items-end border-b-2 ${borderColor} pb-2 select-none relative z-40 transition-colors duration-500`} style={{ textShadow: lightMode ? 'none' : '0 0 2px rgba(74,222,128,1.9)' }}>
      
      {/* Logotype (Clickable for About) */}
      <div 
        className="flex flex-col shrink-0 cursor-pointer group"
        onClick={onOpenAbout}
      >
        <h1 className={`text-2xl md:text-3xl ml-5 font-extrabold tracking-tight leading-none transition-all duration-300 ${lightMode ? 'bg-gradient-to-r from-[#1f7a3e] via-[#238f4c] to-[#1f7a3e] bg-clip-text text-transparent drop-shadow-[0_4px_10px_rgba(31,122,62,0.25)] group-hover:drop-shadow-[0_8px_16px_rgba(35,143,76,0.35)]' : 'text-green-400 group-hover:opacity-80'}`} style={{ textShadow: lightMode ? 'none' : '0 0 10px rgba(74,222,128,0.3)' }}>
          PLAGUE SIMULATOR: 1348
        </h1>
        <span className={`text-[11px] ml-5 md:text-xs font-bold ${lightMode ? 'text-[#5d4037]' : 'text-green-200'} tracking-[0.3em] uppercase group-hover:underline decoration-dotted underline-offset-4`}>
          AN EXPERIMENTAL HISTORY SIMULATION
        </span>
      </div>

      {/* Center Location - Adjusted for hierarchy */}
      <div className={`hidden md:flex flex-col items-center absolute left-1/2 transform -translate-x-1/2 bottom-2 pointer-events-none px-2`}>
        <div className={`text-[10px] md:text-xs uppercase tracking-widest ${textColor} font-bold opacity-90 font-mono text-center leading-tight whitespace-normal break-words max-w-[48vw] lg:max-w-[52vw] xl:max-w-[56vw] ${longLocation ? 'max-h-[56px] overflow-hidden' : ''}`}>
            {location}
        </div>
        <div className={`text-[10px] md:text-[11px] font-bold mt-0.5 uppercase tracking-[0.18em] ${lightMode ? 'text-[#8d6e63]' : 'text-green-300'} leading-tight max-w-[48vw] lg:max-w-[52vw] xl:max-w-[56vw] text-center`}>
             {country || 'Syria'} • {eraDate} • Day {date} • {formatTime(gameTime)}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-end gap-4 shrink-0">
          
        {/* Mobile Time Display (since center is hidden on small screens) */}
        <div className={`md:hidden text-xs font-mono font-bold ${textColor}`}>
            {formatTime(gameTime)}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`relative flex items-center w-14 h-7 rounded-full border transition-all duration-300 ${
            lightMode ? 'bg-[#f5e6d3] border-[#5d4037]/60' : 'bg-green-900 border-green-700'
          }`}
          aria-label="Toggle theme"
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all duration-300 shadow-md flex items-center justify-center ${
              lightMode ? 'translate-x-7 bg-[#2c1810] text-[#fdf6e3]' : 'translate-x-0 bg-green-400 text-black'
            }`}
          >
            {lightMode ? '☀' : '☾'}
          </span>
        </button>

        {/* Audio Toggle */}
        <button 
            onClick={toggleAudio}
            className={`opacity-60 hover:opacity-100 transition-opacity ${textColor} mb-1`}
            aria-label={isMuted ? "Unmute" : "Mute"}
        >
            {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            )}
        </button>

        {/* Settings Hamburger */}
        <div className="relative">
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex flex-col justify-center items-end w-8 h-8 space-y-1.5 focus:outline-none group p-1`}
                aria-label="Settings"
            >
                <span className={`block h-0.5 w-6 ${lightMode ? 'bg-[#2c1810]' : 'bg-green-500'} transform transition duration-300 ease-in-out ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block h-0.5 w-4 ${lightMode ? 'bg-[#2c1810]' : 'bg-green-500'} transform transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'opacity-0' : 'group-hover:w-6'}`}></span>
                <span className={`block h-0.5 w-6 ${lightMode ? 'bg-[#2c1810]' : 'bg-green-500'} transform transition duration-300 ease-in-out ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className={`absolute right-0 top-10 w-48 ${menuBorder} ${menuBg} shadow-xl p-2 flex flex-col gap-2 z-50 font-mono`}>
                    <div className={`text-[10px] uppercase border-b ${lightMode ? 'border-[#5d4037]/30' : 'border-green-800'} pb-1 mb-1 ${textColor} opacity-70`}>
                        SYSTEM CONFIG
                    </div>
                    
                    <button 
                        onClick={() => { toggleTheme(); setIsMenuOpen(false); }}
                        className={`text-left px-2 py-1 text-sm font-bold border ${lightMode ? 'border-[#5d4037] text-[#5d4037] hover:bg-[#5d4037] hover:text-[#fdf6e3]' : 'border-green-800 text-green-400 hover:bg-green-500 hover:text-black'} transition-colors`}
                    >
                        DISPLAY: {lightMode ? 'JOURNAL' : 'TERMINAL'}
                    </button>

                    <button 
                        onClick={() => { onOpenAbout(); setIsMenuOpen(false); }}
                        className={`text-left px-2 py-1 text-sm font-bold border ${lightMode ? 'border-[#5d4037] text-[#5d4037] hover:bg-[#5d4037] hover:text-[#fdf6e3]' : 'border-green-800 text-green-400 hover:bg-green-500 hover:text-black'} transition-colors`}
                    >
                        ABOUT SIMULATION
                    </button>

                    <div className={`h-[1px] ${lightMode ? 'bg-[#5d4037]/20' : 'bg-green-900'} my-1`}></div>

                    <button 
                        onClick={() => { if(window.confirm("RESET SIMULATION?")) { onRestart(); setIsMenuOpen(false); } }}
                        className={`text-left px-2 py-1 text-sm font-bold bg-red-900/20 border border-red-900 hover:bg-red-900/50 text-red-500 transition-colors`}
                    >
                        RESTART STORY
                    </button>
                </div>
            )}
        </div>
      </div>

    </header>
  );
};

export default Header;
