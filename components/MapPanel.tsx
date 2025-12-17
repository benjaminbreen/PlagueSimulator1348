
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Globe from './Globe';
import { Entity } from '../types';
import { buildEntityPositionMap, buildItemLocationMap } from '../utils/mapUtils';

interface MapPanelProps {
  location: string;
  mapAscii: string;
  entities?: Entity[];
  interactables?: string[];
  lightMode?: boolean;
  onExitClick?: () => void;
  onContainerClick?: (x: number, y: number) => void;
  playerName?: string;
  immediateLocation?: string;
}

const MapPanel: React.FC<MapPanelProps> = ({ location, mapAscii, entities = [], interactables = [], onExitClick, onContainerClick, playerName = 'Player', immediateLocation }) => {
  const [viewMode, setViewMode] = useState<'SECTOR' | 'OVERWORLD' | 'REGION'>('SECTOR');
  const [hoveredCell, setHoveredCell] = useState<{ x: number, y: number, char: string, label: string } | null>(null);
  const [globePaused, setGlobePaused] = useState(false);
  const [globeScale, setGlobeScale] = useState(1);
  
  // Transform State
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContentRef = useRef<HTMLDivElement>(null);
  
  // Dimensions for Globe
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 });

  useEffect(() => {
    if (containerRef.current) {
        setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
        });
    }
  }, [viewMode]);

  const MAP_PADDING = 16; // matches p-4

  // Parse Map String into Grid and normalize widths for consistent vertical alignment
  const rawRows = useMemo(() => {
    const normalized = (mapAscii || '').replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    return lines;
  }, [mapAscii]);

  const colCount = rawRows.length > 0 ? rawRows.reduce((max, r) => Math.max(max, r.length), 0) : 0;
  const rows = useMemo(() => rawRows.map(r => r.padEnd(colCount, ' ')), [rawRows, colCount]);
  const rowCount = rows.length;

  // Overworld (Damascus) static map
  const damascusAreas = useMemo(() => ([
    { key: 'old city', label: 'Old City (Madinat al-Qadima)', matchers: ['old city', 'qadima'], marker: { x: 24, y: 2 } },
    { key: 'umayyad mosque quarter', label: 'Umayyad Mosque Quarter', matchers: ['umayyad', 'mosque'], marker: { x: 27, y: 5 } },
    { key: 'bab sharqi', label: 'Bab Sharqi (East Gate)', matchers: ['bab sharqi', 'sharqi', 'east gate'], marker: { x: 36, y: 3 } },
    { key: 'bab al-jabiya', label: 'Bab al-Jabiya (West Gate)', matchers: ['bab al-jabiya', 'jabiya'], marker: { x: 6, y: 3 } },
    { key: 'al-midan', label: 'Al-Midan', matchers: ['al-midan', 'midan'], marker: { x: 8, y: 5 } },
    { key: 'harats', label: 'Harats / Craft Quarters', matchers: ['harat', 'craft', 'weaver', 'coppersmith'], marker: { x: 21, y: 6 } },
    { key: 'sultan al-malik al-asraf', label: 'Sultan al-Malik al-Asraf Quarter', matchers: ['asraf', 'as-sharaf', 'al-asraf'], marker: { x: 10, y: 8 } },
    { key: 'jewish quarter', label: 'Jewish Quarter', matchers: ['jewish', 'yahud'], marker: { x: 34, y: 6 } },
  ]), []);

  const damascusOverworldLines = useMemo(() => ([
    "                     ▲ QASIYUN RIDGE                       ",
    "            ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~                    ",
    "                [OLD CITY WALLS]                          ",
    "    [BAB AL-JABIYA]   ║             [BAB SHARQI]           ",
    "    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                  ",
    "    ▓  [AL-MIDAN]     │   [UMAYYAD MOSQUE]      ▓          ",
    "    ▓        │   [HARATS]       │   [JEWISH QTR]▓▓        ",
    "    ▓        │                  │              ▓▓▓         ",
    "    ▓ [SULTAN AL-ASRAF]         │              ▓           ",
    "    ▓────────── BARADA RIVER ────────────────▓▓           ",
    "                 ▼ to GHOUTA / ORCHARDS                   ",
  ]), []);

  const damascusOverworldRows = useMemo(() => {
    const width = damascusOverworldLines.reduce((m, l) => Math.max(m, l.length), 0);
    const base = damascusOverworldLines.map(l => l.padEnd(width, ' '));
    const isDamascus = /damascus/i.test(location);
    if (!isDamascus) return base;

    const lowerLoc = location.toLowerCase();
    const matched = damascusAreas.find(a => a.matchers.some(m => lowerLoc.includes(m))) || damascusAreas[0];
    const rowsCopy = base.map(r => r.split(''));
    const { x, y } = matched.marker;
    if (rowsCopy[y] && rowsCopy[y][x]) {
        rowsCopy[y][x] = '✶';
    }
    return rowsCopy.map(r => r.join(''));
  }, [damascusOverworldLines, damascusAreas, location]);
  const entityPositionMap = useMemo(() => buildEntityPositionMap(mapAscii, entities), [mapAscii, entities]);

  // --- ITEM MAPPING LOGIC ---
  // Scans the map for special item chars (*, $, !, ?) and assigns them 
  // one-by-one to the strings in `interactables` list.
  const itemLocationMap = useMemo(() => buildItemLocationMap(mapAscii, interactables), [mapAscii, interactables]);

  // Track last location to only recentre when the player actually transitions areas
  const lastLocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (viewMode !== 'SECTOR' || !containerRef.current) return;

    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const mapW = mapContentRef.current?.offsetWidth || (colCount * 10 + MAP_PADDING * 4);
    const mapH = mapContentRef.current?.offsetHeight || (rowCount * 12 + MAP_PADDING * 4);

    const centerMap = (targetScale: number) => {
      const x = (containerW - mapW * targetScale) / 2;
      const y = (containerH - mapH * targetScale) / 2;
      setTranslate({ x, y });
    };

    const locationChanged = lastLocationRef.current !== location;

    if (locationChanged) {
      const defaultScale = 1.25;
      setScale(defaultScale);
      centerMap(defaultScale);
      lastLocationRef.current = location;
      return;
    }

    if (colCount === 0 || rowCount === 0) return;

    // Same location: only adjust when player nears edge of viewport
    let playerX = -1;
    let playerY = -1;

    for(let y = 0; y < rows.length; y++) {
        const x = rows[y].indexOf('@');
        if (x !== -1) {
            playerX = x;
            playerY = y;
            break;
        }
    }

    if (playerX === -1 && playerName) {
        const playerInitial = playerName.charAt(0).toUpperCase();
        for(let y = 0; y < rows.length; y++) {
            const x = rows[y].indexOf(playerInitial);
            if (x !== -1) {
                playerX = x;
                playerY = y;
                break;
            }
        }
    }

    if (playerX !== -1 && playerY !== -1) {
        const charWidth = mapW / colCount;
        const charHeight = mapH / rowCount;

        const pX = playerX * charWidth;
        const pY = playerY * charHeight;

      const edgeMargin = charHeight * 2;

        const currentPlayerScreenX = pX + translate.x;
        const currentPlayerScreenY = pY + translate.y;

        let newX = translate.x;
        let newY = translate.y;

        if (currentPlayerScreenX < edgeMargin) {
          newX = edgeMargin - pX;
        } else if (currentPlayerScreenX > containerW - edgeMargin) {
          newX = containerW - edgeMargin - pX;
        }

        if (currentPlayerScreenY < edgeMargin) {
          newY = edgeMargin - pY;
        } else if (currentPlayerScreenY > containerH - edgeMargin) {
          newY = containerH - edgeMargin - pY;
        }

        if (newX !== translate.x || newY !== translate.y) {
          setTranslate({ x: newX, y: newY });
        }
    }
  }, [mapAscii, viewMode, rowCount, colCount, translate.x, translate.y, location, rows, playerName]);

  const isLightMode = document.body.classList.contains('light-mode');

  // Helper to identify if a character index in a row is part of a bracketed label
  const getLabelRanges = (rowStr: string) => {
    const ranges: number[] = [];
    const regex = /\[(.*?)\]/g;
    let match;
    while ((match = regex.exec(rowStr)) !== null) {
        for (let i = match.index; i < match.index + match[0].length; i++) {
            ranges.push(i);
        }
    }
    return new Set(ranges);
  };

  const getCellClass = (char: string, isLabel: boolean) => {
    // 1. Room Labels
    if (isLabel) {
        return isLightMode
            ? 'text-cyan-600 font-bold opacity-100 drop-shadow-[0_0_6px_rgba(8,145,178,0.8)]'
            : 'text-cyan-500 font-bold tracking-wide opacity-100 relative z-[60] !shadow-none !filter-none';
    }

    // 2. Player
    if (char === '@') {
        return isLightMode
            ? 'map-glow-player font-bold cursor-help relative z-[60] !opacity-100 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,1)]'
            : 'map-glow-player font-bold cursor-help relative z-[60] !opacity-100';
    }

    // 3. NPCs
    if (/[A-Z]/.test(char) && !isLabel) {
        return isLightMode
            ? 'map-glow-npc font-bold cursor-help animate-pulse relative z-[60] !opacity-100 drop-shadow-[0_0_8px_rgba(220,38,38,0.9)]'
            : 'map-glow-npc font-bold cursor-help animate-pulse relative z-[60] !opacity-100';
    }

    // 4. Items
    if (char === '*' || char === '$' || char === '!' || char === '?') {
        return isLightMode
            ? 'map-glow-item font-bold cursor-help relative z-[60] !opacity-100 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)] animate-pulse'
            : 'map-glow-item font-bold cursor-help relative z-[60] !opacity-100';
    }

    // 5. Water & Fountains
    if (char === '~' || char === '≈') {
        return isLightMode
            ? 'text-blue-400 font-bold opacity-100 drop-shadow-[0_0_4px_rgba(96,165,250,0.7)] animate-pulse'
            : 'text-blue-500 opacity-80';
    }
    if (char === '◙') {
        return isLightMode
            ? 'text-cyan-400 font-bold opacity-100 drop-shadow-[0_0_6px_rgba(34,211,238,0.9)] animate-pulse'
            : 'text-cyan-400 font-bold opacity-90 animate-pulse';
    }

    // 6. Doors/Passages
    if (char === '+') {
        return isLightMode
            ? 'text-amber-500 font-bold opacity-100 drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]'
            : 'text-green-800 opacity-80';
    }

    // 7. Exits (all directions)
    if (char === '►' || char === '◄' || char === '▲' || char === '▼' || char === '⇨' || char === '◀') {
        return isLightMode
            ? 'text-yellow-300 font-black cursor-pointer animate-pulse drop-shadow-[0_0_12px_rgba(253,224,71,1)] hover:scale-125 transition-transform'
            : 'text-yellow-400 font-bold cursor-pointer animate-pulse hover:scale-110 transition-transform';
    }

    // 8. Containers
    if (char === '▪' || char === '◎') {
        return isLightMode
            ? 'text-amber-400 font-bold cursor-pointer drop-shadow-[0_0_5px_rgba(251,191,36,0.8)] hover:scale-125 transition-transform'
            : 'text-green-400 font-bold cursor-pointer hover:scale-110 transition-transform';
    }

    // 9. Nature (trees, wells, plants)
    if (char === '●') {
        return isLightMode
            ? 'text-green-700 font-bold opacity-90 drop-shadow-[0_0_3px_rgba(21,128,61,0.7)]'
            : 'text-green-600 font-bold opacity-80';
    }
    if (char === '○') {
        return isLightMode
            ? 'text-amber-600 font-bold opacity-90 drop-shadow-[0_0_4px_rgba(217,119,6,0.7)]'
            : 'text-amber-500 font-bold opacity-80';
    }

    // 10. Decorative elements
    if (char === '≋' || char === '◊' || char === '░') {
        return isLightMode
            ? 'text-amber-800 opacity-40'
            : 'text-green-900 opacity-30';
    }
    if (char === '▫') {
        return isLightMode
            ? 'text-sky-300 opacity-60'
            : 'text-cyan-700 opacity-50';
    }

    // 11. Buildings & Walls
    if (char === '▓' || char === '▒') {
        return isLightMode
            ? 'text-stone-600 font-bold opacity-80 drop-shadow-[0_0_2px_rgba(87,83,78,0.6)]'
            : 'text-gray-700 font-bold opacity-70';
    }


    // 12. Paths & Streets
    if (char === '╱' || char === '╲') {
        return isLightMode
            ? 'text-amber-600 opacity-60'
            : 'text-green-800 opacity-50';
    }
    if (char === '═' || char === '║') {
        return isLightMode
            ? 'text-stone-500 font-bold opacity-70'
            : 'text-gray-600 font-bold opacity-60';
    }
    if (char === ',') {
        return isLightMode
            ? 'text-amber-500 opacity-40'
            : 'text-green-900 opacity-30';
    }

    // 13. Indoor Walls/Structure (including Unicode box-drawing)
    if (['#', '|', '-', '_', '=', '┌', '┐', '└', '┘', '─', '│', '├', '┤', '┬', '┴', '┼'].includes(char)) {
        return isLightMode
            ? 'text-amber-600 font-bold opacity-90 drop-shadow-[0_0_3px_rgba(217,119,6,0.6)]'
            : 'text-green-800 opacity-80';
    }

    // Ground (default)
    return isLightMode
        ? 'text-amber-700 opacity-50 drop-shadow-[0_0_2px_rgba(180,83,9,0.4)]'
        : 'text-green-900 opacity-40';
  };

  const getLabelForChar = (x: number, y: number, char: string, isLabel: boolean) => {
    if (isLabel) return "Location Label";
    if (char === '@') return `YOU (${playerName})`;

    if (/[A-Z]/.test(char) && !isLabel) {
      const match = entityPositionMap.get(`${x},${y}`);
      return match ? `${match.name} [${match.status}]` : "Unknown Figure";
    }

    if (['*', '$', '!', '?'].includes(char)) {
       return itemLocationMap.get(`${x},${y}`) || "Interactable";
    }

    if (char === '►' || char === '◄' || char === '▲' || char === '▼') {
      const label = extractExitLabel(x, y);
      return label ? `EXIT to ${label}` : "EXIT (Click or move here)";
    }
    if (char === '▪') return "Container: CHEST (Click or press SPACE)";
    if (char === '◎') return "Container: JAR (Click or press SPACE)";
    if (char === '◙') return "Fountain";
    if (char === '○') return "Well";
    if (char === '●') return "Tree/Plant";
    if (char === '▓' || char === '▒') return "Wall";
    if (char === '#' || char === '-' || char === '|') return "Structure";
    if (char === '+') return "Passage";
    if (char === '~' || char === '≈') return "Water Source";
    return "";
  };

  const extractExitLabel = (x: number, y: number) => {
    const row = rows[y] || '';
    const after = row.slice(x);
    const before = row.slice(0, x);
    const matchAfter = after.match(/\[([^\]]+)\]/);
    if (matchAfter) return matchAfter[1];
    const matchBefore = before.match(/\[([^\]]+)\][^\[]*$/);
    return matchBefore ? matchBefore[1] : undefined;
  };

  const handleCellClick = (x: number, y: number, char: string) => {
    if (char === '►' || char === '◄' || char === '▲' || char === '▼') {
      onExitClick?.(extractExitLabel(x, y));
    } else if (char === '▪' || char === '◎') {
      onContainerClick?.(x, y);
    } else if (['*', '$', '!', '?'].includes(char)) {
      const key = `${x},${y}`;
      const label = itemLocationMap.get(key);
      if (label) {
        onObjectClick?.(label);
      }
    }
  };

  const handleMouseEnter = (x: number, y: number, char: string, isLabel: boolean, e: React.MouseEvent) => {
    if (char === ' ' || char === '.') return;
    const label = getLabelForChar(x, y, char, isLabel);
    if (label && label !== "Location Label") {
        setHoveredCell({ x: e.clientX, y: e.clientY, char, label });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  // --- Pan & Zoom Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
      if (viewMode === 'SECTOR') {
        const zoomSensitivity = 0.001;
        const newScale = Math.min(Math.max(scale - e.deltaY * zoomSensitivity, 0.5), 3.0);
        setScale(newScale);
        return;
      }

      if (viewMode === 'REGION') {
        const zoomSensitivity = 0.001;
        const newZoom = Math.min(Math.max(globeScale - e.deltaY * zoomSensitivity, 0.6), 2.5);
        setGlobeScale(newZoom);
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (viewMode !== 'SECTOR') return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { 
          x: e.clientX - translate.x, 
          y: e.clientY - translate.y 
      };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !dragStartRef.current || viewMode !== 'SECTOR') return;
      e.preventDefault();
      setTranslate({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y
      });
  };

  const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
  };

  const resetView = () => {
      setScale(1);
  };

  return (
    <div className="flex flex-col h-full w-full relative group">
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-grow overflow-hidden relative w-full flex items-center justify-center cursor-move
            ${isLightMode 
                ? 'bg-[#1a120b] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]' 
                : 'retro-pixel-mesh'
            }
        `}
      >
        {viewMode === 'SECTOR' ? (
            <div 
                ref={mapContentRef}
                className={`relative p-4 ${isLightMode ? '' : 'terminal-text-sharp'} transition-opacity duration-300`}
                style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.25s ease-out'
                }}
            >
                {immediateLocation && (
                  <div className="absolute top-1 left-0 w-full text-center z-[60] opacity-90">
                    <span className={`font-sans font-bold text-[10px] tracking-[0.3em] uppercase ${isLightMode ? 'text-[#e6dfcf]' : 'text-green-300'}`}>
                      {immediateLocation}
                    </span>
                  </div>
                )}
                {rows.map((row, y) => {
                    const labelIndices = getLabelRanges(row);
                    return (
                        <div key={y} className="flex justify-center leading-[1.1] md:leading-[1.2]">
                            {row.split('').map((char, x) => {
                                const isLabel = labelIndices.has(x);
                                return (
                                    <span
                                        key={`${x}-${y}`}
                                        className={`inline-block w-[10px] md:w-[12px] text-center text-[12px] md:text-[14px] ${getCellClass(char, isLabel)} transition-colors`}
                                        onMouseEnter={(e) => handleMouseEnter(x, y, char, isLabel, e)}
                                        onMouseLeave={handleMouseLeave}
                                        onClick={() => handleCellClick(x, y, char)}
                                    >
                                        {char}
                                    </span>
                                );
                            })}
                        </div>
                    );
                })}

                {/* Tooltip Portal */}
                {hoveredCell && createPortal(
                    <div 
                        className="fixed z-[9999] px-3 py-1 bg-black border border-stone-500 text-stone-200 text-xs font-mono shadow-[0_0_15px_rgba(0,0,0,0.8)] pointer-events-none rounded"
                        style={{ top: hoveredCell.y - 40, left: hoveredCell.x - 20 }}
                    >
                        <span className="font-bold text-white mr-2">{hoveredCell.char}</span>
                        {hoveredCell.label}
                    </div>,
                    document.body
                )}
            </div>
        ) : viewMode === 'OVERWORLD' ? (
            <div className="relative p-4">
              { /damascus/i.test(location) ? (
                <div className="space-y-1">
                  {damascusOverworldRows.map((row, y) => (
                    <div key={y} className="flex justify-center leading-[1.1] md:leading-[1.2]">
                      {row.split('').map((char, x) => {
                        const isMarker = char === '✶';
                        return (
                          <span
                            key={`${x}-${y}`}
                            className={`inline-block w-[10px] md:w-[12px] text-center text-[12px] md:text-[14px] ${
                              isMarker 
                                ? 'text-amber-300 font-black animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]' 
                                : getCellClass(char, false)
                            }`}
                          >
                            {char}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm opacity-70 italic">Overworld map available only within Damascus.</div>
              )}
            </div>
        ) : (
            <Globe 
              width={dimensions.width} 
              height={dimensions.height} 
              paused={globePaused}
              zoom={globeScale}
            />
        )}
      </div>

      {/* Control Bar */}
      <div className={`h-8 shrink-0 flex justify-between items-center px-2 z-20 border-t 
          ${isLightMode ? 'bg-[#2c1810] border-[#5d4037] text-[#e6dfcf]' : 'bg-green-900/10 border-green-900/50 text-green-700'}`}
      >
        <div className="flex gap-2 items-center">
            <div className="text-[10px] uppercase tracking-widest truncate max-w-[120px] opacity-80">
                {viewMode === 'SECTOR' ? 'LOCAL SECTOR' : 'PLANETARY POSITION'}
            </div>
            {viewMode === 'SECTOR' && (
                <div className="flex gap-1 border-l border-current pl-2 border-opacity-30">
                    <button onClick={() => setScale(s => Math.min(s + 0.2, 3))} className="hover:text-white px-1 font-bold text-xs">+</button>
                    <button onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} className="hover:text-white px-1 font-bold text-xs">-</button>
                    <button onClick={resetView} className="hover:text-white px-1 text-[10px] uppercase">RST</button>
                </div>
            )}
            {viewMode === 'REGION' && (
                <div className="flex gap-1 border-l border-current pl-2 border-opacity-30">
                    <button onClick={() => setGlobeScale(z => Math.min(z + 0.2, 2.5))} className="hover:text-white px-1 font-bold text-xs">+</button>
                    <button onClick={() => setGlobeScale(z => Math.max(z - 0.2, 0.6))} className="hover:text-white px-1 font-bold text-xs">-</button>
                    <button onClick={() => setGlobeScale(1)} className="hover:text-white px-1 text-[10px] uppercase">RST</button>
                    <button onClick={() => setGlobePaused(p => !p)} className="hover:text-white px-1 text-[10px] uppercase">
                        {globePaused ? 'RES' : 'PAU'}
                    </button>
                </div>
            )}
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={() => setViewMode('SECTOR')}
                className={`text-[10px] font-bold px-2 py-[2px] border border-transparent 
                    ${viewMode === 'SECTOR' 
                        ? (isLightMode ? 'bg-[#5d4037] text-white' : 'bg-green-800/30 text-green-300') 
                        : 'opacity-60 hover:opacity-100'}`}
            >
                [SECTOR]
            </button>
            <button 
                onClick={() => setViewMode('OVERWORLD')}
                className={`text-[10px] font-bold px-2 py-[2px] border border-transparent 
                    ${viewMode === 'OVERWORLD' 
                        ? (isLightMode ? 'bg-[#5d4037] text-white' : 'bg-green-800/30 text-green-300') 
                        : 'opacity-60 hover:opacity-100'}`}
            >
                [OVERWORLD]
            </button>
            <button 
                onClick={() => setViewMode('REGION')}
                className={`text-[10px] font-bold px-2 py-[2px] border border-transparent 
                    ${viewMode === 'REGION' 
                        ? (isLightMode ? 'bg-[#5d4037] text-white' : 'bg-green-800/30 text-green-300') 
                        : 'opacity-60 hover:opacity-100'}`}
            >
                [REGION]
            </button>
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
