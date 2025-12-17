import React, { useState, useEffect } from 'react';

interface HealthBarProps {
  health: number;
  lightMode: boolean;
}

const HealthBar: React.FC<HealthBarProps> = ({ health, lightMode }) => {
  const [animatedHealth, setAnimatedHealth] = useState(0);
  const [showGlow, setShowGlow] = useState(true);

  // Clamp health between 0-100
  const clampedHealth = Math.max(0, Math.min(100, health));

  // Animate health bar on mount and changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedHealth(clampedHealth);
    }, 100);

    // Fade out glow after animation
    const glowTimer = setTimeout(() => {
      setShowGlow(false);
    }, 1500);

    return () => {
      clearTimeout(timer);
      clearTimeout(glowTimer);
    };
  }, [clampedHealth]);

  // Determine color based on health
  const getHealthColor = () => {
    if (clampedHealth >= 90) return lightMode ? 'bg-green-600' : 'bg-green-500';
    if (clampedHealth >= 75) return lightMode ? 'bg-green-500' : 'bg-green-400';
    if (clampedHealth >= 60) return lightMode ? 'bg-lime-500' : 'bg-lime-400';
    if (clampedHealth >= 45) return lightMode ? 'bg-yellow-500' : 'bg-yellow-400';
    if (clampedHealth >= 30) return lightMode ? 'bg-amber-600' : 'bg-amber-500';
    if (clampedHealth >= 15) return lightMode ? 'bg-orange-600' : 'bg-orange-500';
    if (clampedHealth >= 5) return lightMode ? 'bg-red-600' : 'bg-red-500';
    return lightMode ? 'bg-red-800' : 'bg-red-700';
  };

  const isCritical = clampedHealth < 15;
  const textColor = lightMode ? 'text-[#2c1810]' : 'text-green-400';
  const borderColor = lightMode ? 'border-[#5d4037]/50' : 'border-green-900';
  const bgColor = 'bg-black/20';

  // Determine gradient color based on health
  const getHealthGradient = () => {
    if (clampedHealth >= 90) return { from: 'from-green-500', to: 'to-green-600', shadow: '#22c55e' };
    if (clampedHealth >= 75) return { from: 'from-green-400', to: 'to-green-500', shadow: '#4ade80' };
    if (clampedHealth >= 60) return { from: 'from-lime-400', to: 'to-lime-500', shadow: '#a3e635' };
    if (clampedHealth >= 45) return { from: 'from-yellow-400', to: 'to-yellow-500', shadow: '#facc15' };
    if (clampedHealth >= 30) return { from: 'from-amber-500', to: 'to-amber-600', shadow: '#f59e0b' };
    if (clampedHealth >= 15) return { from: 'from-orange-500', to: 'to-orange-600', shadow: '#f97316' };
    if (clampedHealth >= 5) return { from: 'from-red-500', to: 'to-red-600', shadow: '#ef4444' };
    return { from: 'from-red-700', to: 'to-red-800', shadow: '#dc2626' };
  };

  const gradient = getHealthGradient();

  return (
    <div className={`w-full mb-3 ${textColor}`}>
      {/* Label Row */}
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">
          Health
        </span>
        <span className="text-xs font-bold opacity-80">
          {clampedHealth}%
        </span>
      </div>

      {/* Bar Container */}
      <div className={`h-3 w-full border ${borderColor} ${bgColor} p-[1px] overflow-hidden`}>
        {/* Fill with gradient and glow */}
        <div
          className={`h-full bg-gradient-to-r ${gradient.from} ${gradient.to} transition-all duration-700 ease-out ${
            isCritical ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${animatedHealth}%`,
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: showGlow ? `0 0 10px ${gradient.shadow}` : `0 0 6px ${gradient.shadow}`
          }}
        />
      </div>
    </div>
  );
};

export default HealthBar;
