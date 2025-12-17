
import React, { useState, useEffect } from 'react';
import TerminalPanel from './TerminalPanel';
import HealthBar from './HealthBar';
import { CharacterProfile, HumoralBalance } from '../types';

interface StatusPanelProps {
  health: number;
  symptoms: string[];
  humors: HumoralBalance;
  inventory: string[];
  worn: string[];
  bio: CharacterProfile;
  day: number;
  location: string;
  lightMode: boolean;
  onItemClick: (item: string) => void;
  onFamilyClick?: (name: string) => void;
}

type AnimationState = 'idle' | 'blink' | 'look_left' | 'look_right' | 'wipe' | 'cough' | 'walk' | 'snot_drip' | 'itch';

const StatusPanel: React.FC<StatusPanelProps> = ({ health, symptoms, humors, inventory, worn, bio, day, location, lightMode, onItemClick, onFamilyClick }) => {
  const [activeTab, setActiveTab] = useState('VITALS');
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  // Animation System
  const [animState, setAnimState] = useState<AnimationState>('idle');
  const [animFrame, setAnimFrame] = useState(0); 
  const [lastLocation, setLastLocation] = useState(location);

  const traits = bio.visuals;
  const hasSymptom = (key: string) => symptoms.some(s => s.toLowerCase().includes(key));

  // Determine Dynamic Border Color based on health - Clean feedback without overlays
  const getHealthBorderColor = () => {
      if (lightMode) {
          if (health < 30) return 'border-red-800 animate-pulse';
          if (health < 60) return 'border-orange-700';
          return 'border-[#5d4037]';
      } else {
          if (health < 30) return 'border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse';
          if (health < 60) return 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]';
          if (health < 80) return 'border-amber-500';
          return 'border-green-800';
      }
  };
  
  // --- ANIMATION CONTROLLER ---
  useEffect(() => {
    const frameRate = 180; 
    const timer = setInterval(() => {
        setAnimFrame(f => f + 1);
    }, frameRate);
    return () => clearInterval(timer);
  }, []);

  // State Logic
  useEffect(() => {
    if (location !== lastLocation) {
        setAnimState('walk');
        setAnimFrame(0);
        setLastLocation(location);
        setTimeout(() => setAnimState('idle'), 4000); 
        return;
    }

    if (animState === 'idle') {
        const rand = Math.random();
        const coughChance = hasSymptom('cough') ? 0.08 : 0.005;
        const itchChance = hasSymptom('bubo') ? 0.05 : 0.01;
        const wipeChance = hasSymptom('bleeding') || hasSymptom('fever') ? 0.05 : 0.01;

        if (rand < coughChance) {
            setAnimState('cough');
            setAnimFrame(0);
            setTimeout(() => setAnimState('idle'), 2500);
        }
        else if (rand < coughChance + itchChance) {
            setAnimState('itch');
            setAnimFrame(0);
            setTimeout(() => setAnimState('idle'), 2000);
        }
        else if (rand < coughChance + itchChance + wipeChance && !traits.missingLimbs.rightArm) {
            setAnimState('wipe');
            setAnimFrame(0);
            setTimeout(() => setAnimState('idle'), 2000);
        }
        else if (Math.random() < 0.02) {
             setAnimState('blink');
             setAnimFrame(0);
             setTimeout(() => setAnimState('idle'), 300);
        }
    }
  }, [animFrame, location, lastLocation, hasSymptom, traits, animState]); 
  
  useEffect(() => {
     if (animState !== 'idle') return; 
     const logicTick = setInterval(() => {
         if (Math.random() < 0.1) {
             setAnimState(Math.random() > 0.5 ? 'look_left' : 'look_right');
             setAnimFrame(0);
             setTimeout(() => setAnimState('idle'), 1500);
         }
     }, 2000);
     return () => clearInterval(logicTick);
  }, [animState, symptoms]);


  // Severity Color Mapping
  const getSeverityColor = (symptomKey: string) => {
      const isObsidian = lightMode; 
      if (['hallucination', 'necrosis', 'black spots', 'delirium', 'gangrene'].some(k => symptomKey.includes(k))) return 'text-purple-500 animate-pulse font-bold';
      if (['bleeding', 'bubo', 'vomiting', 'epistaxis'].some(k => symptomKey.includes(k))) return 'text-red-500 font-bold';
      if (['fever', 'nausea', 'labored'].some(k => symptomKey.includes(k))) return isObsidian ? 'text-orange-600 font-bold' : 'text-orange-500';
      if (['cough', 'headache', 'fatigue'].some(k => symptomKey.includes(k))) return isObsidian ? 'text-yellow-600 font-bold' : 'text-yellow-500';
      return isObsidian ? 'text-amber-700' : 'text-green-500';
  };

  const renderRagdollRows = () => {
    const colorNormal = lightMode
        ? "text-amber-300 font-black drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] brightness-110"
        : "text-green-500";

    const colorSkin = lightMode ? "text-amber-300 font-black drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] brightness-105" : "text-green-600";
    
    // Dynamic Styles
    const eyeStyle = hasSymptom('hallucination') ? 'text-purple-500 animate-pulse' : (hasSymptom('fever') ? 'text-orange-500' : (lightMode ? 'text-amber-500' : 'text-amber-500'));
    const mouthStyle = hasSymptom('vomiting') ? getSeverityColor('vomiting') : colorNormal;
    const neckStyle = hasSymptom('bubo_neck') ? getSeverityColor('bubo') : colorNormal;
    const chestStyle = hasSymptom('bubo_armpit') ? getSeverityColor('bubo') : (hasSymptom('cough') ? 'text-yellow-500 animate-pulse' : colorNormal);
    const groinStyle = hasSymptom('bubo_groin') ? getSeverityColor('bubo') : colorNormal;
    const handStyle = (hasSymptom('bleeding') || hasSymptom('necrosis') || hasSymptom('spots')) ? getSeverityColor('necrosis') : colorNormal;

    let headOffset = 0; 
    let eyes = { l: 'o', r: 'o' };
    let mouth = '----';
    let rArmPos = 'down'; 
    let lArmPos = 'down'; 

    if (animState === 'blink') { eyes.l = '-'; eyes.r = '-'; }
    
    if (animState === 'look_left') { eyes.l = '<'; eyes.r = '<'; headOffset = -1; }
    if (animState === 'look_right') { eyes.l = '>'; eyes.r = '>'; headOffset = 1; }

    if (animState === 'cough') {
        const step = animFrame % 4;
        if (step === 0) { mouth = 'o---'; rArmPos = 'chest'; }
        if (step === 1) { mouth = '-o--'; rArmPos = 'face'; headOffset = 1; }
        if (step === 2) { mouth = '--o-'; rArmPos = 'face'; headOffset = -1; }
        if (step === 3) { mouth = '---o'; rArmPos = 'chest'; }
        if (step === 1 || step === 2) eyes = { l: '>', r: '<' };
    }

    if (animState === 'wipe') {
        const step = animFrame % 4;
        if (step === 0) rArmPos = 'up'; 
        if (step === 1) rArmPos = 'face';
        if (step === 2) rArmPos = 'face';
        if (step === 3) rArmPos = 'up';
    }

    if (animState === 'itch') {
        const step = animFrame % 2;
        if (step === 0) lArmPos = 'chest';
        if (step === 1) lArmPos = 'up';
    }

    const headRows = [];
    let headTop = traits.hairStyle === 'bald' ? '.-------.' : ',.~"""""~.,';
    if (traits.hairStyle === 'turban') headTop = ',.~"""""~.,';
    
    let lEyeChar = traits.missingLimbs.leftEye ? 'x' : eyes.l;
    let rEyeChar = traits.missingLimbs.rightEye ? 'x' : eyes.r;
    if (hasSymptom('hallucination')) { lEyeChar = '@'; rEyeChar = '@'; }
    
    const eyesRow = <span>  |<span className={colorSkin}>`</span> <span className={eyeStyle}>{lEyeChar}</span>   <span className={eyeStyle}>{rEyeChar}</span> <span className={colorSkin}>`</span>|  </span>;

    let nose = "||";
    let cheekL = "(", cheekR = ")";
    if (animState === 'wipe' && rArmPos === 'face') cheekR = "/"; 
    const noseRow = <span className={colorNormal}>  {cheekL}    {nose}    {cheekR}  </span>;

    if (hasSymptom('vomiting')) mouth = '====';
    const beard = traits.facialHair ? "`'vvv'`" : "\\___/";
    const mouthRow = <span>   \  <span className={mouthStyle}>{mouth}</span>  /   </span>;
    const chinRow = <span className={colorNormal}>    {beard}    </span>;

    headRows.push(headTop);
    headRows.push(traits.hairStyle === 'turban' ? '/` _ ._  _ `\\' : (traits.hairStyle === 'bald' ? '/         \\' : '/   ___   \\'));
    
    const neckChar = hasSymptom('bubo_neck') ? <span className={neckStyle}>(o)</span> : "||";
    const neckRow = <span>     __{neckChar}__     </span>;

    let shoulderRow = <span>   .<span className={colorSkin}>d8888888b</span>.   </span>;
    if (rArmPos === 'face' || rArmPos === 'up') shoulderRow = <span>   .<span className={colorSkin}>d8888888</span>/   </span>;

    let lArmChar = traits.missingLimbs.leftArm ? ' ' : '/';
    let rArmChar = traits.missingLimbs.rightArm ? ' ' : '\\';
    
    if (rArmPos === 'chest') rArmChar = '<';
    if (rArmPos === 'up') rArmChar = '|';
    if (rArmPos === 'face') rArmChar = '/';

    if (lArmPos === 'chest') lArmChar = '>';
    if (lArmPos === 'up') lArmChar = '|';

    const pitL = hasSymptom('bubo_armpit') ? <span className={chestStyle}>o</span> : ".";
    const pitR = hasSymptom('bubo_armpit') ? <span className={chestStyle}>o</span> : ".";

    const chest1 = <span>  {lArmChar}  {pitL}_____{pitR}  {rArmChar}  </span>;
    
    let lMid = '|'; let rMid = '|';
    if (rArmPos === 'face' || rArmPos === 'up') rMid = ' '; 
    
    const chest2 = <span className={colorNormal}>  {lMid}  |:::::|  {rMid}  </span>;
    const chest3 = <span className={colorNormal}>  {lMid}  |:::::|  {rMid}  </span>;
    const chest4 = <span className={colorNormal}>  {lMid}  |:::::|  {rMid}  </span>;
    const stomach = <span className={colorNormal}>  {traits.missingLimbs.leftArm ? ' ' : 'd'}  /:::::\  {traits.missingLimbs.rightArm ? ' ' : 'b'}  </span>;

    const groinBubo = hasSymptom('bubo_groin') ? <span className={groinStyle}>(o)</span> : <span className={colorNormal}>_!_</span>;
    let lHand = traits.missingLimbs.leftArm ? ' ' : 'M';
    let rHand = traits.missingLimbs.rightArm ? ' ' : 'M';
    
    if (rArmPos !== 'down') rHand = ' ';
    
    const handRow = <span>  <span className={handStyle}>{lHand}</span>   {groinBubo}   <span className={handStyle}>{rHand}</span>  </span>;

    const legRows = [];
    const legL = traits.missingLimbs.leftLeg ? ':' : '|'; 
    const legR = traits.missingLimbs.rightLeg ? ':' : '|';
    const steps = 4;
    
    if (animState === 'walk') {
        const wStep = animFrame % 4;
        for (let i = 0; i < steps; i++) {
             if (wStep === 0 || wStep === 2) legRows.push(<span className={colorNormal}>     {legL}   {legR}     </span>);
             else if (wStep === 1) legRows.push(<span className={colorNormal}>    /     \    </span>);
             else if (wStep === 3) legRows.push(<span className={colorNormal}>     \   /     </span>);
        }
    } else {
        for (let i = 0; i < steps; i++) legRows.push(<span className={colorNormal}>     {legL}   {legR}     </span>);
    }

    let footL = traits.missingLimbs.leftLeg ? '_' : 'L';
    let footR = traits.missingLimbs.rightLeg ? '_' : 'L';
    if (animState === 'walk' && (animFrame % 4) === 1) { footL = '/'; footR = '\\'; }

    legRows.push(<span className={colorNormal}>    _{footL}  _{footR}    </span>);

    return [
        ...headRows.map(art => ({ id: 'head', art: <span className={colorNormal}>  {art}  </span> })),
        { id: 'head', art: eyesRow },
        { id: 'head', art: noseRow },
        { id: 'head', art: mouthRow },
        { id: 'head', art: chinRow },
        { id: 'neck', art: neckRow },
        { id: 'chest', art: shoulderRow },
        { id: 'chest', art: chest1 },
        { id: 'chest', art: chest2 },
        { id: 'chest', art: chest3 },
        { id: 'abdomen', art: chest4 },
        { id: 'abdomen', art: stomach },
        { id: 'groin', art: handRow },
        ...legRows.map(art => ({ id: 'legs', art })),
    ];
  };

  // Generate health status text
  const getHealthCondition = () => {
    if (health >= 90) return 'HEALTHY';
    else if (health >= 75) return 'SOUND';
    else if (health >= 60) return 'A BIT UNWELL';
    else if (health >= 45) return 'WEAKENED';
    else if (health >= 30) return 'AILING';
    else if (health >= 20) return 'GRAVE';
    else if (health >= 10) return 'DYING';
    else return 'DEATH\'S DOOR';
  };

  const getSymptomNote = () => {
    const symptomCount = symptoms.length;
    if (symptomCount === 0) return null;
    else if (symptomCount === 1) return '(Minor affliction)';
    else if (symptomCount <= 3) return '(Multiple afflictions)';
    else return '(Severe afflictions)';
  };

  const renderVitals = () => {
    const rows = renderRagdollRows();
    const isHighlighted = (partId: string) => hoveredPart === partId;

    const diagnostics = [
        { id: 'head', label: 'BRAIN', text: hasSymptom('hallucination') ? 'Hallucinations/Delirium' : (hasSymptom('headache') ? 'Severe Headache' : 'Lucid'), severity: hasSymptom('hallucination') ? 'critical' : (hasSymptom('headache') ? 'mild' : 'normal') },
        { id: 'neck', label: 'NECK', text: hasSymptom('bubo_neck') ? 'Cervical Buboes (Swollen)' : 'No lymphadenopathy', severity: hasSymptom('bubo_neck') ? 'severe' : 'normal' },
        { id: 'chest', label: 'CHEST', text: hasSymptom('bubo_armpit') ? 'Axillary Buboes' : (hasSymptom('labored') ? 'Respiratory Distress' : 'Clear Breath Sounds'), severity: hasSymptom('bubo_armpit') ? 'severe' : (hasSymptom('labored') ? 'moderate' : 'normal') },
        { id: 'groin', label: 'GROIN', text: hasSymptom('bubo_groin') ? 'Inguinal Buboes (Painful)' : 'No swelling', severity: hasSymptom('bubo_groin') ? 'severe' : 'normal' },
        { id: 'legs', label: 'SKIN', text: hasSymptom('necrosis') ? 'Acral Necrosis (Blackening)' : (hasSymptom('spots') ? 'Petechial Hemorrhage' : 'Perfusion Good'), severity: hasSymptom('necrosis') ? 'critical' : (hasSymptom('spots') ? 'severe' : 'normal') },
    ];
    
    return (
      <div className="flex flex-row h-full overflow-hidden animate-fade-in-up">

        {/* LEFT COLUMN: THE FIGURE */}
        <div className="w-[50%] md:w-[48%] flex flex-col border-r border-current border-opacity-10 animate-slide-in-left">
            <div className="flex-1 flex items-center justify-center p-2 relative">
                <div className={`relative w-full h-full border-2 rounded-sm flex items-center justify-center overflow-hidden
                    ${lightMode 
                        ? 'bg-[#1a120b] border-[#5d4037] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]' 
                        : 'retro-pixel-mesh border-green-800/60'
                    }`}
                >
                    {/* Decorative Grid for Obsidian Mode (Light Mode Only) */}
                    {lightMode && (
                        <div className="absolute inset-0 opacity-10 pointer-events-none" 
                            style={{ backgroundImage: `linear-gradient(#ca8a04 1px, transparent 1px), linear-gradient(90deg, #ca8a04 1px, transparent 1px)`, backgroundSize: '20px 20px' }}>
                        </div>
                    )}
                    
                    {/* Name Overlay */}
                    <div className={`absolute top-1 left-0 w-full text-center z-[60] opacity-90`}>
                        <span className={`font-sans font-bold text-[10px] tracking-[0.3em] uppercase ${lightMode ? 'text-[#e6dfcf]' : 'text-green-300'}`}>
                            {bio.name}
                        </span>
                    </div>

                    {/* The Figure */}
                    <div className={`font-mono text-[10px] md:text-xs leading-[1.1] whitespace-pre select-none flex flex-col items-center relative z-20 transition-transform duration-100 ${lightMode ? '' : 'terminal-text-sharp'}`}>
                        {rows.map((row, i) => (
                            <div
                                key={i}
                                className={`transition-all duration-200 ease-out cursor-crosshair ${
                                    isHighlighted(row.id)
                                        ? lightMode
                                            ? 'scale-105 brightness-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                                            : 'scale-105 brightness-120 drop-shadow-[0_0_4px_rgba(255,0,0,0.4)]'
                                        : lightMode ? 'opacity-95' : 'opacity-90'
                                }`}
                                onMouseEnter={() => setHoveredPart(row.id)}
                                onMouseLeave={() => setHoveredPart(null)}
                            >
                                {row.art}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Metrics */}
            <div className={`shrink-0 p-1 text-xs tracking-tighter grid grid-cols-2 gap-x-2 border-t border-current border-opacity-20 ${lightMode ? 'text-[#5d4037]' : 'text-green-300'}`}>
                <div className="flex justify-between">
                    <span className="opacity-70">Age:</span>
                    <span className={`font-bold ${lightMode ? 'drop-shadow-[0_0_10px_rgba(93,64,55,0.9)]' : ''}`}>
                        {bio.age}
                    </span>
                </div>
                <div className="flex justify-between">
                     <span className="opacity-80">Height:</span>
                     <span className={`font-bold ${lightMode ? 'drop-shadow-[0_0_2px_rgba(93,64,55,0.0)]' : ''}`}>
                        {bio.visuals.height.toUpperCase()}
                     </span>
                </div>
                <div className="flex justify-between">
                     <span className="opacity-80">Weight:</span>
                     <span className={`font-bold ${lightMode ? 'drop-shadow-[0_0_2px_rgba(93,64,55,0.0)]' : ''}`}>
                        {bio.visuals.weight}kg
                     </span>
                </div>
                <div className="flex justify-between">
                     <span className="opacity-80">Build:</span>
                     <span className={`font-bold ${lightMode ? 'drop-shadow-[0_0_2px_rgba(93,64,55,0.3)]' : ''}`}>
                        {bio.visuals.build.toUpperCase()}
                     </span>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: DATA LIST */}
        <div className="flex-1 flex flex-col p-2 min-w-0 animate-slide-in-right">
            {/* Health Bar */}
            <div className="shrink-0 px-3 pt-3">
                <HealthBar health={health} lightMode={lightMode} />
            </div>

            {/* Status Header */}
            <div className={`shrink-0 px-3 pb-2 border-b border-current border-opacity-20 ${lightMode ? 'bg-[#efebe0]' : 'bg-black/20'}`}>
                <div className="flex justify-between items-start">
                    <span className="text-[10px] opacity-60 uppercase tracking-widest">Condition</span>
                    <div className="flex flex-col items-end gap-0.5">
                        <span className={`font-mono text-sm  ${health < 30 ? 'text-red-500 animate-pulse' : health < 60 ? 'text-yellow-500' : 'text-green-600'}`}>
                            {getHealthCondition()}
                        </span>
                        {getSymptomNote() && (
                            <span className="text-[9px] opacity-70 font-sans italic">
                                {getSymptomNote()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {diagnostics.map((diag, i) => {
                    let severityColor = lightMode ? 'text-green-800' : 'text-green-400';
                    if (diag.severity === 'mild') severityColor = 'text-yellow-500';
                    if (diag.severity === 'moderate') severityColor = 'text-orange-500';
                    if (diag.severity === 'severe') severityColor = 'text-red-500 font-bold';
                    if (diag.severity === 'critical') severityColor = 'text-purple-500 font-bold';

                    const isFocus = isHighlighted(diag.id);
                    
                    return (
                        <div 
                            key={i} 
                            className={`flex flex-col border-b border-current border-opacity-10 pb-1 last:border-0 transition-all duration-200 
                                ${isFocus ? 'bg-red-900/10 pl-2 border-l-2 border-l-red-500' : ''}`}
                            onMouseEnter={() => setHoveredPart(diag.id)}
                            onMouseLeave={() => setHoveredPart(null)}
                        >
                            <div className="flex justify-between items-baseline">
                                <span className={`text-[10px] font-bold tracking-wider uppercase opacity-70 ${isFocus ? 'text-red-500' : ''}`}>
                                    {diag.label}
                                </span>
                            </div>
                            <span className={`text-xs md:text-sm font-mono ${severityColor} ${isFocus ? 'brightness-110' : ''}`}>
                                {diag.text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

      </div>
    );
  };

  const renderHumors = () => {
      const humorConfig = [
          { name: 'Sanguine (Blood)', value: humors?.blood || 50, color: 'bg-red-600', shadow: 'shadow-red-500', desc: 'Air • Hot & Moist' },
          { name: 'Phlegmatic (Phlegm)', value: humors?.phlegm || 50, color: 'bg-cyan-100', shadow: 'shadow-cyan-100', desc: 'Water • Cold & Moist' },
          { name: 'Choleric (Yellow Bile)', value: humors?.yellowBile || 50, color: 'bg-yellow-400', shadow: 'shadow-yellow-400', desc: 'Fire • Hot & Dry' },
          { name: 'Melancholic (Black Bile)', value: humors?.blackBile || 50, color: 'bg-purple-900', shadow: 'shadow-purple-900', desc: 'Earth • Cold & Dry' },
      ];

      return (
          <div className="p-4 space-y-6 h-full overflow-auto">
              <div className="text-[10px] opacity-60 uppercase tracking-widest text-center border-b border-current border-opacity-20 pb-2">
                  Medieval Humoral Balance
              </div>
              
              {humorConfig.map((h, i) => (
                  <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-bold uppercase">
                          <span>{h.name}</span>
                          <span>{h.value}%</span>
                      </div>
                      <div className="text-[10px] opacity-50 italic mb-1">{h.desc}</div>
                      
                      {/* Bar Container */}
                      <div className={`h-3 w-full border ${lightMode ? 'border-[#5d4037]/50' : 'border-green-900'} bg-black/20 p-[1px]`}>
                          <div 
                             className={`h-full transition-all duration-1000 ease-out ${h.color}`}
                             style={{ 
                                 width: `${h.value}%`,
                                 boxShadow: `0 0 8px var(--tw-shadow-color)` 
                             }}
                          >
                             <style>{`.${h.color} { --tw-shadow-color: ${h.color === 'bg-red-600' ? '#dc2626' : h.color === 'bg-cyan-100' ? '#cffafe' : h.color === 'bg-yellow-400' ? '#facc15' : '#581c87'}; }`}</style>
                          </div>
                      </div>
                  </div>
              ))}
              
              <div className="mt-4 p-2 border border-current border-opacity-20 text-[10px] opacity-70">
                  <span className="font-bold">PHYSICIAN'S NOTE:</span> An imbalance in the humors invites the pestilence. 
                  Excess heat (Choleric) suggests fever. Excess cold (Phlegmatic) suggests congestion. 
                  Corruption of the blood leads to death.
              </div>
          </div>
      );
  };

  const renderInventory = () => (
    <div className="h-full overflow-auto space-y-4 p-2">
      <div>
        <div className="text-[10px] tracking-widest opacity-70 mb-1 border-b border-current border-opacity-20 pb-1">EQUIPPED / WORN</div>
        <ul className="space-y-1 text-sm">
          {worn.length === 0 ? (
            <li className="italic opacity-50 text-xs">Ragged cloths only.</li>
          ) : (
            worn.map((item, i) => (
              <li key={`worn-${i}`} className="flex items-center gap-2 group cursor-pointer hover:bg-green-500/10 p-1 rounded transition-colors" onClick={() => onItemClick(item)}>
                <span className="opacity-50 text-[10px]">[E]</span> 
                <span className="underline decoration-dotted underline-offset-4 decoration-current/30">{item}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div>
        <div className="text-[10px] tracking-widest opacity-70 mb-1 border-b border-current border-opacity-20 pb-1">CARRIED GOODS</div>
        <ul className="space-y-1 text-sm">
          {inventory.length === 0 ? (
            <li className="italic opacity-50 text-xs">Pockets empty.</li>
          ) : (
            inventory.map((item, i) => (
              <li key={`inv-${i}`} className="flex items-center gap-2 group cursor-pointer hover:bg-green-500/10 p-1 rounded transition-colors" onClick={() => onItemClick(item)}>
                <span className="opacity-50 group-hover:opacity-100">-</span> 
                <span className="underline decoration-dotted underline-offset-4 decoration-current/30">{item}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );

  const renderBio = () => (
    <div className="h-full overflow-hidden flex flex-col p-2">
      <div className="shrink-0 border-b border-current border-opacity-20 pb-2 mb-2 flex justify-between items-end">
         <div className="flex flex-col">
             <div className="font-bold text-lg uppercase tracking-wide">{bio.name}</div>
             <div className="text-xs opacity-70 italic">
                 {bio.profession} • {bio.socialClass.toUpperCase()} • {bio.visuals.sex.toUpperCase()}
             </div>
         </div>
         <div className="text-4xl font-bold opacity-30 font-header leading-none">
             {bio.age}
         </div>
      </div>
      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
         <div className="w-1/2 overflow-auto pr-1 border-r border-current border-opacity-20">
             <div className="text-[10px] uppercase font-bold mb-2 opacity-50">Known Kin</div>
             <div className="space-y-3">
                 {bio.family.map((member, i) => (
                     <div key={i} className="flex flex-col">
                         <button 
                            onClick={() => onFamilyClick?.(member.name)}
                            className="font-bold text-sm text-left underline decoration-dotted underline-offset-2 hover:bg-green-500/10 transition-colors w-fit"
                         >
                            {member.name}
                         </button>
                         <div className="text-[10px] opacity-80 uppercase">{member.status}</div>
                         {member.note && <div className="text-[11px] opacity-60 italic leading-tight mt-0.5">"{member.note}"</div>}
                     </div>
                 ))}
             </div>
         </div>
         <div className="w-1/2 overflow-auto">
             <div className="text-[10px] uppercase font-bold mb-2 opacity-50">Life Record</div>
             <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-90">
                 {bio.history}
             </p>
         </div>
      </div>
    </div>
  );

  return (
    <TerminalPanel 
      title={`SUBJECT [DAY ${day}]`} 
      tabs={['VITALS', 'HUMORS', 'INVENTORY', 'BIO']}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      className="h-full"
      lightMode={lightMode}
      variant="crt" 
      customBorderColor={getHealthBorderColor()}
    >
      {activeTab === 'VITALS' && renderVitals()}
      {activeTab === 'HUMORS' && renderHumors()}
      {activeTab === 'INVENTORY' && renderInventory()}
      {activeTab === 'BIO' && renderBio()}
    </TerminalPanel>
  );
};

export default StatusPanel;
