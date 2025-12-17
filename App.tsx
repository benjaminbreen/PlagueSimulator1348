
import React, { useState, useEffect, useRef } from 'react';
import TerminalPanel from './components/TerminalPanel';
import NarratorPanel from './components/NarratorPanel';
import Header from './components/Header';
import Globe from './components/Globe';
import MapContainer from './components/MapContainer';
import StatusPanel from './components/StatusPanel';
import DetailModal from './components/DetailModal';
import AboutModal from './components/AboutModal';
import ContainerModal from './components/ContainerModal';
import { generateTurn, generateItemMetadata, generateEntityMetadata, initializeGameStory, generateLookImage } from './services/geminiService';
import { generateProceduralProfile } from './utils/generators';
import { findItemMatch, generateProceduralEntity } from './utils/procGen';
import { audioManager } from './utils/audioManager';
import { generateMovementNarrative } from './utils/movementNarrative';
import { buildEntityPositionMap, buildItemLocationMap } from './utils/mapUtils';
import { GameState, ItemMetadata, EntityMetadata, Entity, Container, LlmTranscript, HumoralBalance } from './types';

const MAX_MAP_COLS = 30;
const MAX_MAP_ROWS = 14;
const TURN_MINUTES = 20;

type NormalizedMap = { map: string; warning?: string; offsetX?: number; offsetY?: number };

const normalizeMapAscii = (rawMap: string, prevMap?: string): NormalizedMap => {
  const sanitized = (rawMap || '').replace(/\r\n/g, '\n');
  const lines = sanitized.split('\n');

  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

  if (!lines.length) {
    return {
      map: generateFallbackMap(),
      warning: 'Map data missing; generated fallback.'
    };
  }

  const width = Math.max(...lines.map(line => line.length));
  const height = lines.length;
  let warning = '';

  let processed = lines.map(l => l.padEnd(width, ' '));
  let offsetX = 0;
  let offsetY = 0;

  // Crop around player if too large
  if (width > MAX_MAP_COLS || height > MAX_MAP_ROWS) {
    let playerX = -1;
    let playerY = -1;
    processed.forEach((row, y) => {
      const idx = row.indexOf('@');
      if (idx !== -1) {
        playerX = idx;
        playerY = y;
      }
    });
    const startX = Math.max(0, Math.min(playerX === -1 ? 0 : playerX - Math.floor(MAX_MAP_COLS / 2), width - MAX_MAP_COLS));
    const startY = Math.max(0, Math.min(playerY === -1 ? 0 : playerY - Math.floor(MAX_MAP_ROWS / 2), height - MAX_MAP_ROWS));
    const cropped: string[] = [];
    for (let y = startY; y < Math.min(startY + MAX_MAP_ROWS, height); y++) {
      const slice = processed[y].slice(startX, startX + MAX_MAP_COLS);
      cropped.push(slice.padEnd(MAX_MAP_COLS, ' '));
    }
    processed = cropped;
    offsetX = startX;
    offsetY = startY;
    warning = `Map exceeded bounds (${width}x${height}); cropped to ${MAX_MAP_COLS}x${MAX_MAP_ROWS}.`;
  }

  const padded = processed.map(line => line.padEnd(Math.max(...processed.map(l => l.length)), ' '));
  let mapStr = padded.join('\n');

  // Ensure a single player marker exists
  if (!mapStr.includes('@')) {
    const rows = mapStr.split('\n');
    const h = rows.length;
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    if (rows[cy]) {
      const rowArr = rows[cy].split('');
      rowArr[cx] = '@';
      rows[cy] = rowArr.join('').padEnd(w, ' ');
    }
    mapStr = rows.map(r => r.padEnd(w, ' ')).join('\n');
  }

  return {
    map: mapStr,
    warning,
    offsetX,
    offsetY
  };
};

const clampHumors = (humors: HumoralBalance, fallback: HumoralBalance): HumoralBalance => ({
  blood: Math.min(100, Math.max(0, humors?.blood ?? fallback.blood)),
  phlegm: Math.min(100, Math.max(0, humors?.phlegm ?? fallback.phlegm)),
  yellowBile: Math.min(100, Math.max(0, humors?.yellowBile ?? fallback.yellowBile)),
  blackBile: Math.min(100, Math.max(0, humors?.blackBile ?? fallback.blackBile))
});

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);

const deriveDayFromDate = (start: Date | null, current: Date) => {
  if (!start) return 1;
  const diffMs = current.getTime() - start.getTime();
  const day = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, day);
};

const formatEraDate = (date: Date | null) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const generateFallbackMap = (width = 20, height = 10) => {
  const w = Math.min(width, MAX_MAP_COLS);
  const h = Math.min(height, MAX_MAP_ROWS);
  const rows: string[] = [];
  const centerY = Math.floor(h / 2);
  const centerX = Math.floor(w / 2);
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const isBorder = y === 0 || y === h - 1 || x === 0 || x === w - 1;
      if (isBorder) {
        // Create exits on south, east, and west borders
        if (y === h - 1 && x === centerX) row += '▲';
        else if (x === 0 && y === centerY) row += '►';
        else if (x === w - 1 && y === centerY) row += '◄';
        else row += '▓';
      } else if (y === centerY && x === centerX) {
        row += '@';
      } else {
        row += '.';
      }
    }
    rows.push(row);
  }
  return rows.join('\n');
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [houseType, setHouseType] = useState<string>("");
  const [customInput, setCustomInput] = useState('');
  const [lightMode, setLightMode] = useState(true);
  const [initSeed, setInitSeed] = useState(0);
  const [activeNarrativeTab, setActiveNarrativeTab] = useState<'Narrative' | 'Look'>('Narrative');
  const [lookImage, setLookImage] = useState<string | null>(null);
  const [lookAlt, setLookAlt] = useState<string | null>(null);
  const [lookLoading, setLookLoading] = useState(false);
  const [lookError, setLookError] = useState<string | null>(null);
  const [eraDate, setEraDate] = useState<Date | null>(null);
  
  // New States
  const [showAbout, setShowAbout] = useState(false);
  const [gameTime, setGameTime] = useState<Date>(() => {
      const d = new Date();
      d.setHours(6, 30, 0, 0); // Start at 06:30 AM
      return d;
  });
  const startTimeRef = useRef<Date | null>(null);

  // Track what was under the player to restore it when moving
  const underfootCharRef = useRef<string>(' '); 
  // Track the turn count when underfoot was last reset to avoid stale sync
  const lastSyncTurnRef = useRef<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    type: 'item' | 'entity';
    data: ItemMetadata | EntityMetadata;
  } | null>(null);

  // Container Modal State
  const [containerModalOpen, setContainerModalOpen] = useState(false);
  const [activeContainer, setActiveContainer] = useState<Container | null>(null);

  // Sync theme
  useEffect(() => {
    if (lightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [lightMode]);

  useEffect(() => {
      if (!startTimeRef.current) {
          startTimeRef.current = gameTime;
      }
  }, [gameTime]);

  // Audio Init on Click
  const initAudio = () => {
      audioManager.init();
      audioManager.resume();
  };

  // Initialization Logic
  useEffect(() => {
    const init = async () => {
        setInitializing(true);
        // 1. Procedurally generate traits
        const { profile, houseType: hType, eraDate: eraStart } = generateProceduralProfile();
        setHouseType(hType);
        setEraDate(eraStart);

        const startDate = new Date(eraStart);
        startDate.setHours(6, 30, 0, 0);
        startTimeRef.current = startDate;
        setGameTime(startDate);

        // 2. Ask Gemini to generate the starting narrative and map based on these traits
        const startResponse = await initializeGameStory(profile, hType, formatEraDate(eraStart));

        // 3. Construct initial state
        const normalizedStartMap = normalizeMapAscii(startResponse.localMapAscii);
        const initialDay = deriveDayFromDate(startTimeRef.current, startDate);
        const initTranscript: LlmTranscript = {
            id: 'init',
            type: 'init',
            turn: 0,
            prompt: startResponse.debugPromptUsed || '',
            response: startResponse.debugRawResponse || JSON.stringify(startResponse, null, 2)
        };

        const initialHistory = [{
            id: 'init',
            role: 'system',
            text: startResponse.narrative,
            turnNumber: 0,
            day: initialDay,
            location: startResponse.newLocation,
            entities: startResponse.presentEntities,
            interactables: startResponse.presentInteractables
        }];

        if (startResponse.debugParseError) {
            initialHistory.push({
                id: 'init-parse-warning',
                role: 'system',
                text: `AI response invalid: ${startResponse.debugParseError}. Loaded fallback.`,
                turnNumber: 0,
                day: 1,
                location: startResponse.newLocation
            });
        }

        setGameState({
            history: initialHistory,
            day: initialDay,
            turnCount: 0,
            location: startResponse.newLocation,
            health: startResponse.updatedHealth,
            symptoms: startResponse.updatedSymptoms,
            humors: startResponse.updatedHumors, // New field
            worn: startResponse.updatedWorn,
            inventory: startResponse.updatedInventory,
            entities: startResponse.presentEntities,
            interactables: startResponse.presentInteractables,
            containers: startResponse.presentContainers || [],
            bio: profile,
            status: 'alive',
            options: startResponse.options,
            localMapAscii: normalizedStartMap.map,
            itemKnowledge: {},
            entityKnowledge: {},
            dialogueTarget: null,
            debugTranscripts: [initTranscript]
        });
        
        // Start Ambience
        audioManager.startAmbience();

        underfootCharRef.current = ' '; // Reset underfoot
        lastSyncTurnRef.current = 0;
        setInitializing(false);
    };

    const run = async () => {
      try {
        await init();
      } catch (err) {
        console.error("Initialization failed:", err);
        if (!startTimeRef.current) {
          const startDate = new Date();
          startDate.setHours(6, 30, 0, 0);
          startTimeRef.current = startDate;
          setGameTime(startDate);
        }
        const fallbackDay = deriveDayFromDate(startTimeRef.current, startTimeRef.current || new Date());
        const fallbackProfile = generateProceduralProfile().profile;
        setGameState({
          history: [{
            id: 'init-error',
            role: 'system',
            text: 'Initialization failed. Please retry.',
            turnNumber: 0,
            day: fallbackDay,
            location: 'Damascus, Syria',
            entities: [],
            interactables: []
          }],
          day: fallbackDay,
          turnCount: 0,
          location: 'Damascus, Syria',
          health: 100,
          symptoms: [],
          humors: { blood: 50, phlegm: 50, yellowBile: 50, blackBile: 50 },
          worn: [],
          inventory: [],
          entities: [],
          interactables: [],
          containers: [],
          bio: fallbackProfile,
          status: 'alive',
          options: [{ id: 1, text: 'Retry initialization' }],
          localMapAscii: ' [ INIT FAILED ] ',
          itemKnowledge: {},
          entityKnowledge: {},
          dialogueTarget: null,
          debugTranscripts: []
        });
      } finally {
        setInitializing(false);
      }
    };

    run();
  }, [initSeed]);

  // Keyboard Movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (loading || initializing || !gameState || modalOpen || showAbout || containerModalOpen || document.activeElement === inputRef.current) return;

        // Handle spacebar for container interaction
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            const rows = gameState.localMapAscii.split('\n');
            let playerX = -1, playerY = -1;
            for(let y=0; y<rows.length; y++) {
                const x = rows[y].indexOf('@');
                if (x !== -1) { playerX = x; playerY = y; break; }
            }
            if (playerX !== -1 && playerY !== -1) {
                const container = gameState.containers.find(c => c.x === playerX && c.y === playerY);
                if (container) {
                    audioManager.playBlip();
                    setActiveContainer(container);
                    setContainerModalOpen(true);
                }
            }
            return;
        }

        // Only handle arrow keys
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

        e.preventDefault();

        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -1;
        if (e.key === 'ArrowDown') dy = 1;
        if (e.key === 'ArrowLeft') dx = -1;
        if (e.key === 'ArrowRight') dx = 1;

        attemptClientMove(dx, dy);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, loading, modalOpen, initializing, showAbout, containerModalOpen]);

  const attemptClientMove = (dx: number, dy: number) => {
      if (!gameState) return;
      initAudio(); // Ensure audio context is ready
      
      const rows = gameState.localMapAscii.split('\n');
      const findExitLabel = (x: number, y: number) => {
        const row = rows[y] || '';
        const after = row.slice(x);
        const before = row.slice(0, x);
        const matchAfter = after.match(/\[([^\]]+)\]/);
        if (matchAfter) return matchAfter[1];
        const matchBefore = before.match(/\[([^\]]+)\][^\[]*$/);
        return matchBefore ? matchBefore[1] : null;
      };
      // Find Player
      let playerY = -1;
      let playerX = -1;
      const entityPositionMap = buildEntityPositionMap(gameState.localMapAscii, gameState.entities);

      // First try to find '@'
      for(let y=0; y<rows.length; y++) {
          const x = rows[y].indexOf('@');
          if (x !== -1) {
              playerX = x;
              playerY = y;
              break;
          }
      }

      // Fallback: If '@' not found, try player's first initial (LLM mistake)
      if (playerX === -1 || playerY === -1) {
          const playerInitial = gameState.bio.name.charAt(0).toUpperCase();
          for(let y=0; y<rows.length; y++) {
              const x = rows[y].indexOf(playerInitial);
              if (x !== -1) {
                  // Found player by initial - fix the map
                  playerX = x;
                  playerY = y;
                  console.warn(`LLM used '${playerInitial}' instead of '@' for player. Auto-correcting.`);
                  break;
              }
          }
      }

      if (playerX === -1 || playerY === -1) return; // Player not found

      const targetX = playerX + dx;
      const targetY = playerY + dy;

      // Check Bounds
      if (targetY < 0 || targetY >= rows.length || targetX < 0 || targetX >= rows[targetY].length) {
          handleChoice("Leave the area"); // Edge of map transition
          return;
      }

      const targetChar = rows[targetY][targetX];

      // Logic for interactions
      // 1. NPC Interaction
      if (/[A-Z]/.test(targetChar) && !['[',']'].includes(targetChar)) { 
          const npc = entityPositionMap.get(`${targetX},${targetY}`);
          if (npc) {
              handleChoice(`Approach ${npc.name}`);
              return;
          }
      }

      // 2. Container Interaction
      if (['▪', '◎'].includes(targetChar)) {
          const container = gameState.containers.find(c => c.x === targetX && c.y === targetY);
          if (container) {
              audioManager.playBlip();
              setActiveContainer(container);
              setContainerModalOpen(true);
          }
          return;
      }

      // 3. Interactable Object
      if (['*', '$', '!', '?'].includes(targetChar)) {
          const key = `${targetX},${targetY}`;
          const itemMap = buildItemLocationMap(gameState.localMapAscii, gameState.interactables);
          const label = itemMap.get(key);
          handleChoice(`Inspect the ${label || 'object'}`);
          return;
      }

      // 4. Walls / Obstacles
      if (['#', '|', '-', '_', '=', '┌', '┐', '└', '┘', '─', '│', '├', '┤', '┬', '┴', '┼', '▓', '▒', '⌂', '●', '○', '◙'].includes(targetChar)) {
           audioManager.playBlip(); // Feedback for blocked
           setGameState(prev => {
                if(!prev) return null;
                return {
                    ...prev,
                    history: [...prev.history, { id: Date.now().toString(), role: 'system', text: "Blocked." }]
                };
            });
          return;
      }

      // 5. Exit arrows (all directions)
      if (['►', '◄', '▲', '▼', '⇨', '◀'].includes(targetChar)) {
          const exitLabel = findExitLabel(targetX, targetY);
          handleChoice(exitLabel ? `Go to ${exitLabel}` : "Leave the area");
          return;
      }

      // 6. Doors / Gateways
      if (['+'].includes(targetChar)) {
          handleChoice("Move through the doorway");
          return;
      }

      // -- EXECUTE CLIENT MOVE --
      audioManager.playTypewriter(); // Footstep/Action sound
      
      // Reconstruct map
      const newRows = [...rows];

      // Restore old char at player pos
      const oldRowChars = newRows[playerY].split('');
      oldRowChars[playerX] = underfootCharRef.current;
      newRows[playerY] = oldRowChars.join('');

      // Save new underfoot char (preserve terrain: floor/dirt/paths)
      // If target is a passable terrain symbol, save it; otherwise default to space
      const passableTerrain = [' ', '.', ',', '~', '≈', '≋', '░', '◊', '╱', '╲', '═', '║'];
      underfootCharRef.current = passableTerrain.includes(targetChar) ? targetChar : ' ';

      // Place player at new pos (always use '@')
      const newRowChars = newRows[targetY].split('');
      newRowChars[targetX] = '@';
      newRows[targetY] = newRowChars.join('');

      const newMapAscii = newRows.join('\n');

      // Generate narrative using modular utility
      const narrative = generateMovementNarrative(
        newRows,
        targetX,
        targetY,
        dx,
        dy,
        gameState.location,
        gameState.entities
      );

      // Update State locally
      setGameState(prev => {
          if (!prev) return null;
          
          return {
              ...prev,
              localMapAscii: newMapAscii,
              history: [...prev.history, { id: Date.now().toString(), role: 'system', text: narrative }]
          };
      });
  };

  // Click Handlers
  const handleItemClick = async (name: string) => {
    if (loading || loadingModal || !gameState) return;
    initAudio();
    audioManager.playBlip();
    setLoadingModal(true);

    // 1. Try Procedural Match first
    const procData = findItemMatch(name, gameState.bio.socialClass);
    
    if (procData) {
        setModalContent({ title: name, type: 'item', data: procData });
        setModalOpen(true);
        setLoadingModal(false);
        return;
    }

    // 2. Fallback to LLM if no match
    let data = gameState.itemKnowledge[name];
    if (!data) {
        data = await generateItemMetadata(name);
        setGameState(prev => prev ? ({
            ...prev,
            itemKnowledge: { ...prev.itemKnowledge, [name]: data }
        }) : null);
    }

    setModalContent({ title: name, type: 'item', data });
    setModalOpen(true);
    setLoadingModal(false);
  };

  const handleContainerClick = (x: number, y: number) => {
    if (!gameState) return;
    const container = gameState.containers.find(c => c.x === x && c.y === y);
    if (container) {
      initAudio();
      audioManager.playBlip();
      setActiveContainer(container);
      setContainerModalOpen(true);
    }
  };

  const handleTakeItem = (itemName: string) => {
    if (!activeContainer) return;
    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        inventory: [...prev.inventory, itemName],
        containers: prev.containers.map(c =>
          c.id === activeContainer.id
            ? { ...c, contents: c.contents.filter(i => i !== itemName), searched: true }
            : c
        )
      };
    });
    setActiveContainer(prev => prev ? {
      ...prev,
      contents: prev.contents.filter(i => i !== itemName),
      searched: true
    } : null);
  };

  const handleTakeAll = () => {
    if (!activeContainer) return;
    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        inventory: [...prev.inventory, ...activeContainer.contents],
        containers: prev.containers.map(c =>
          c.id === activeContainer.id
            ? { ...c, contents: [], searched: true }
            : c
        )
      };
    });
    setContainerModalOpen(false);
    setActiveContainer(null);
  };

  const handleEntityClick = async (name: string) => {
    if (loading || loadingModal || !gameState) return;
    initAudio();
    audioManager.playBlip();
    setLoadingModal(true);

    // 1. Try Procedural Generation based on existing tags and FAMILY knowledge
    const entityObj = gameState.entities.find(e => e.name === name);
    if (entityObj) {
        // Pass gameState.bio.family so procGen can resolve relationships even if role is missing
        const procData = generateProceduralEntity(entityObj, gameState.bio.socialClass, gameState.bio.family);
        setModalContent({ title: name, type: 'entity', data: procData });
        setModalOpen(true);
        setLoadingModal(false);
        return;
    }

    // 2. Fallback to LLM
    let data = gameState.entityKnowledge[name];
    if (!data) {
        data = await generateEntityMetadata(name);
        setGameState(prev => prev ? ({
            ...prev,
            entityKnowledge: { ...prev.entityKnowledge, [name]: data }
        }) : null);
    }

    setModalContent({ title: name, type: 'entity', data });
    setModalOpen(true);
    setLoadingModal(false);
  };

  // Action Handlers
  const handleChoice = async (choiceText: string, isDialogueInitiation = false) => {
    if (loading || !gameState || gameState.status !== 'alive') return;
    initAudio();
    audioManager.playTypewriter();
    setLoading(true);

    const plannedGameTime = addMinutes(gameTime, TURN_MINUTES);
    const plannedDay = deriveDayFromDate(startTimeRef.current, plannedGameTime);

    const playerEntryId = Date.now().toString();
    const systemEntryId = (Date.now() + 1).toString();

    setGameState(prev => prev ? ({
      ...prev,
      history: [
        ...prev.history,
        { id: playerEntryId, role: 'user', text: `> ${choiceText}` },
        { id: systemEntryId, role: 'system', text: '' } // Placeholder for streaming
      ]
    }) : null);

    const response = await generateTurn(gameState, choiceText, houseType, formatEraDate(eraDate), (streamedNarrative) => {
      // Update the placeholder entry with streamed narrative
      setGameState(prev => {
        if (!prev) return null;
        const updatedHistory = [...prev.history];
        const lastEntry = updatedHistory[updatedHistory.length - 1];
        if (lastEntry && lastEntry.id === systemEntryId) {
          lastEntry.text = streamedNarrative;
        }
        return { ...prev, history: updatedHistory };
      });
    });
    
    // Reset underfoot tracking on new turn
    underfootCharRef.current = ' '; // Default safety
    const normalizedMap = normalizeMapAscii(response.localMapAscii, gameState.localMapAscii);
    const validationWarnings: string[] = [];
    if (normalizedMap.warning) validationWarnings.push(normalizedMap.warning);

    let finalizedMap = normalizedMap.map;
    if (!finalizedMap.includes('@')) {
        validationWarnings.push('Map missing player marker; generated fallback.');
        finalizedMap = generateFallbackMap();
    }

    const mapRows = finalizedMap.split('\n');
    const mapHeight = mapRows.length;
    const mapWidth = mapRows.reduce((max, r) => Math.max(max, r.length), 0);

    const safeHumors = clampHumors(response.updatedHumors, gameState.humors);

    const allowedStatus = new Set(["healthy","sick","dead","active","idle","resting","missing","fled"]);
    const allowedRole = new Set(["spouse","child","servant","guard","merchant","neighbor","parent","sibling","stranger"]);
    const allowedCondition = new Set(["healthy","incubating","symptomatic","dying","corpse"]);
    const allowedActivity = new Set(["standing","praying","walking","working","resting","fleeing","trading"]);

    const sanitizedEntities = (response.presentEntities || [])
      .map((e) => {
        const cleanField = (value: string | undefined, allowed: Set<string>, fallback: string) => {
            if (!value) return fallback;
            const normalized = value.split(/[\/,(]/)[0].trim().toLowerCase();
            return allowed.has(normalized) ? normalized : fallback;
        };
        const name = (e.name || '').trim();
        const status = cleanField(e.status, allowedStatus, 'active');
        const role = cleanField(e.role, allowedRole, 'stranger');
        const condition = cleanField(e.condition, allowedCondition, 'healthy');
        const activity = cleanField(e.activity, allowedActivity, 'standing');
        return { ...e, name, status, role, condition, activity };
      })
      .filter(e => e.name);

    let safeOptions = response.options && response.options.length > 0 ? [...response.options] : [
        { id: 1, text: "Look around" },
        { id: 2, text: "Wait" },
        { id: 3, text: "Pray" }
    ];
    if (safeOptions.length < 3) {
        validationWarnings.push('Options list was incomplete; added defaults.');
        while (safeOptions.length < 3) {
            safeOptions.push({ id: safeOptions.length + 1, text: "Continue" });
        }
    }

    const filteredContainers = (response.presentContainers || [])
      .map(c => ({
        ...c,
        x: c.x - (normalizedMap.offsetX || 0),
        y: c.y - (normalizedMap.offsetY || 0)
      }))
      .filter(c => (
        c.x >= 0 && c.y >= 0 && c.y < mapHeight && c.x < mapWidth
      ));
    if ((response.presentContainers || []).length !== filteredContainers.length) {
        validationWarnings.push('Removed containers with invalid coordinates.');
    }
    const hasContainerUpdate = response.presentContainers !== undefined;

    setGameState(prev => {
        if (!prev) return null;
        const nextTurnNumber = prev.turnCount + 1;
        lastSyncTurnRef.current = nextTurnNumber;

        // Update family status if response contains updates
        let updatedFamily = [...prev.bio.family];
        if (response.updatedFamilyStatus && response.updatedFamilyStatus.length > 0) {
            updatedFamily = response.updatedFamilyStatus;
        }

        // Enforce Game Over if health <= 0
        const isDead = response.updatedHealth <= 0 || response.gameStatus === 'dead';

        // Heartbeat FX for low health
        if (response.updatedHealth < 30) {
            audioManager.playHeartbeat();
        }

        // Update the existing placeholder entry with final complete data
        const updatedHistory = [...prev.history];
        const lastEntry = updatedHistory[updatedHistory.length - 1];
        if (lastEntry && lastEntry.id === systemEntryId) {
            lastEntry.text = response.narrative;
            lastEntry.turnNumber = nextTurnNumber;
            lastEntry.day = plannedDay;
            lastEntry.location = response.newLocation;
            lastEntry.entities = response.presentEntities;
            lastEntry.interactables = response.presentInteractables;
        }

        const historyWithWarnings = [...updatedHistory];
        if (response.debugParseError) {
            historyWithWarnings.push({
              id: `turn-${nextTurnNumber}-parse-warning`,
              role: 'system',
              text: `AI turn data invalid: ${response.debugParseError}. Using fallback.`,
              turnNumber: nextTurnNumber,
              day: plannedDay,
              location: response.newLocation
            });
        }
        if (validationWarnings.length) {
            console.warn(`SYSTEM NOTICE: ${validationWarnings.join(' ')}`);
        }

        return {
            ...prev,
            history: historyWithWarnings,
            health: isDead ? 0 : response.updatedHealth,
            symptoms: response.updatedSymptoms,
            humors: safeHumors, // Update humors
            inventory: response.updatedInventory,
            worn: response.updatedWorn,
            entities: sanitizedEntities,
            interactables: response.presentInteractables,
            containers: hasContainerUpdate ? filteredContainers : prev.containers,
            bio: { ...prev.bio, family: updatedFamily },
            location: response.newLocation,
            localMapAscii: finalizedMap,
            status: isDead ? 'dead' : response.gameStatus,
            options: safeOptions,
            day: plannedDay,
            turnCount: nextTurnNumber,
            dialogueTarget: isDialogueInitiation ? modalContent?.title || null : prev.dialogueTarget,
            debugTranscripts: [
                ...prev.debugTranscripts.slice(-9),
                {
                    id: `turn-${nextTurnNumber}`,
                    type: 'turn',
                    turn: nextTurnNumber,
                    prompt: response.debugPromptUsed || '',
                    response: response.debugRawResponse || JSON.stringify(response, null, 2)
                }
            ]
        };
    });

    setGameTime(plannedGameTime);
    setCustomInput('');
    setLoading(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      handleChoice(customInput);
    }
  };

  const restartGame = () => {
    setGameState(null);
    setInitializing(true);
    // Reset Time
    const d = new Date();
    d.setHours(6, 30, 0, 0);
    setGameTime(d);
    startTimeRef.current = d;
    setLookImage(null);
    setLookAlt(null);
    setLookError(null);
    setActiveNarrativeTab('Narrative');
    setEraDate(null);
    setInitSeed(s => s + 1);
  };

  const handleGenerateLook = async () => {
    if (!gameState || lookLoading) return;
    setLookLoading(true);
    setLookError(null);
    setLookAlt(null);
    initAudio();
    try {
      const result = await generateLookImage(gameState);
      if (result.image) {
        setLookImage(result.image);
      } else if (result.alt) {
        setLookAlt(result.alt);
      } else {
        setLookError('Image generation failed. Try again.');
      }
    } catch (err) {
      setLookError((err as Error)?.message || 'Image generation failed.');
    } finally {
      setLookLoading(false);
    }
  };

  // Styles
  const btnBg = lightMode 
    ? "bg-[#5d4037]/5 border-[#5d4037]/30 hover:bg-[#5d4037]/10 text-[#3e2723]" 
    : "bg-green-900/10 border-green-700 hover:bg-green-700/30 text-green-400";
    
  const inputBg = lightMode 
    ? "bg-transparent border-[#5d4037] text-[#2c1810] placeholder-[#8d6e63]" 
    : "bg-black border-green-700 text-green-400 placeholder-green-900";
    
  const accentText = lightMode ? "text-[#b71c1c]" : "text-green-500";
  
  const executeBtn = lightMode 
    ? "bg-[#2c1810] text-[#fdf6e3] hover:opacity-80" 
    : "bg-green-700 text-black hover:bg-green-500";

  // Loading Screen
  if (initializing || !gameState) {
      return (
        <div className={`h-screen w-screen flex flex-col items-center justify-center font-mono p-4 overflow-hidden ${lightMode ? 'bg-[#f8f3e8] text-[#2c1810]' : 'bg-black text-green-500'}`} onClick={initAudio}>
            <div className={`text-4xl font-extrabold mb-2 ${lightMode ? 'bg-gradient-to-r from-[#0f5132] via-[#0b3d26] to-[#0f5132] bg-clip-text text-transparent drop-shadow-[0_4px_10px_rgba(16,81,50,0.35)]' : 'animate-pulse'} ${lightMode ? 'font-header' : ''}`}>PLAGUE SIMULATOR: 1348</div>
            <div className="text-sm border-t border-b border-current py-2 mb-4">AN EXPERIMENTAL EDUCATIONAL HISTORY GAME</div>

            <div className="w-full max-w-xl aspect-[3/2] mb-4 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center animate-pulse-slow">
                <div className={`rounded-full ${lightMode ? 'shadow-[0_0_40px_rgba(16,81,50,0.35)]' : ''}`}>
                  <Globe width={600} height={400} paused={false} zoom={1} />
                </div>
              </div>
              {!lightMode && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />}
            </div>
            
            <div className="w-64 space-y-2 text-xs opacity-70">
                <div className="flex justify-between">
                    <span>GENERATING SUBJECT...</span>
                    <span className="animate-pulse">DONE</span>
                </div>
                <div className="flex justify-between">
                    <span>CONSTRUCTING ARCHITECTURE...</span>
                    <span className="animate-pulse delay-100">DONE</span>
                </div>
                <div className="flex justify-between">
                    <span>SYNCHRONIZING HISTORY...</span>
                    <span className="animate-pulse delay-300">PROCESSING</span>
                </div>
            </div>
            
            <div className="mt-8 text-[10px] opacity-60 uppercase animate-bounce">
                Click anywhere to initialize system...
            </div>
        </div>
      );
  }

  const parseLocationParts = (loc: string) => {
    const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
    const immediate = parts[0] || '';
    const country = parts[parts.length - 1] || '';
    const middle = parts.slice(1, -1).join(', ');
    return {
      immediate,
      country,
      display: middle || loc
    };
  };

  const locParts = parseLocationParts(gameState.location);

  return (
    <div className={`h-screen max-h-screen w-screen overflow-hidden p-2 md:p-4  flex flex-col items-center font-mono ${lightMode ? 'text-[#2c1810]' : 'text-green-400'}`} onClick={() => audioManager.resume()}>
      
      {/* About Modal */}
      {showAbout && (
          <AboutModal onClose={() => setShowAbout(false)} lightMode={lightMode} />
      )}

      {/* Item/Entity Modal */}
      {modalOpen && modalContent && (
        <DetailModal 
            title={modalContent.title}
            type={modalContent.type}
            data={modalContent.data}
            lightMode={lightMode}
            onClose={() => setModalOpen(false)}
            onAction={
                modalContent.type === 'entity' 
                ? () => handleChoice(`Approach ${modalContent.title} to speak`, true)
                : undefined
            }
        />
      )}

      {/* Container Modal */}
      {containerModalOpen && activeContainer && (
        <ContainerModal
          container={activeContainer}
          lightMode={lightMode}
          onClose={() => setContainerModalOpen(false)}
          onTakeItem={handleTakeItem}
          onTakeAll={handleTakeAll}
        />
      )}

      {/* Global Loading Overlay */}
      {loadingModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-wait">
            <div className={`text-xl font-bold animate-pulse ${accentText}`}>
                ACCESSING ARCHIVES...
            </div>
        </div>
      )}

      <div className="shrink-0 w-full">
        <Header
            date={gameState.day}
            location={locParts.display}
            country={locParts.country}
            lightMode={lightMode}
            toggleTheme={() => setLightMode(!lightMode)}
            onRestart={restartGame}
            gameTime={gameTime}
            onOpenAbout={() => setShowAbout(true)}
            eraDate={formatEraDate(eraDate)}
        />
      </div>

      <div className="w-full max-w-7xl px-0 grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-100px)] pb-2 md:pb-4">
        
        {/* LEFT COLUMN */}
        <div className="md:col-span-5 lg:col-span-5 flex flex-col gap-4 h-full min-h-0 order-2 md:order-1 overflow-hidden">
          <div className="flex-shrink-0 h-[40%] min-h-[220px] max-h-[380px]">
            <MapContainer
              location={gameState.location}
              mapAscii={gameState.localMapAscii}
              entities={gameState.entities}
              interactables={gameState.interactables}
              lightMode={lightMode}
              onEntityClick={handleEntityClick}
              onObjectClick={handleItemClick}
              onExitClick={(label) => handleChoice(label ? `Go to ${label}` : "Leave the area")}
              onContainerClick={handleContainerClick}
              playerName={gameState.bio.name}
              debugTranscripts={gameState.debugTranscripts}
              immediateLocation={locParts.immediate}
            />
          </div>

          <div className="flex-1 min-h-0">
            <StatusPanel 
            health={gameState.health} 
            symptoms={gameState.symptoms} 
            humors={gameState.humors}
            inventory={gameState.inventory}
            worn={gameState.worn}
            bio={gameState.bio}
            day={gameState.day}
            location={gameState.location}
            lightMode={lightMode}
            onItemClick={handleItemClick}
            onFamilyClick={handleEntityClick}
          />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="md:col-span-7 lg:col-span-7 flex flex-col gap-4 h-full min-h-0 relative order-1 md:order-2 overflow-hidden">
          
          <TerminalPanel 
            title="NARRATIVE INTERFACE" 
            className="flex-1 min-h-0" 
            lightMode={lightMode}
            tabs={['Narrative', 'Look']}
            activeTab={activeNarrativeTab}
            onTabChange={(tab) => setActiveNarrativeTab(tab as 'Narrative' | 'Look')}
          >
            {activeNarrativeTab === 'Narrative' ? (
              <NarratorPanel 
                  history={gameState.history} 
                  onEntityClick={handleEntityClick}
                  onObjectClick={handleItemClick}
                  lightMode={lightMode}
                  loading={loading}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="text-sm opacity-80">
                  Generate a first-person view of your surroundings using Gemini Flash image. This may take a moment.
                </div>
                <button
                  onClick={handleGenerateLook}
                  disabled={lookLoading || loading}
                  className={`self-start px-4 py-2 text-sm font-bold border rounded transition-colors disabled:opacity-50 ${lightMode ? 'bg-[#5d4037]/10 text-[#3e2723] border-[#5d4037]' : 'bg-green-900/20 text-green-300 border-green-700 hover:bg-green-700/30'}`}
                >
                  {lookLoading ? 'Rendering...' : 'Generate View'}
                </button>
                {lookError && (
                  <div className={`text-xs border p-2 ${lightMode ? 'border-[#b71c1c] text-[#b71c1c]' : 'border-red-600 text-red-400'}`}>
                    {lookError}
                  </div>
                )}
                {lookImage && (
                  <div className="border border-dashed border-current/40 p-2 rounded-sm bg-black/40">
                    <img src={lookImage} alt="First-person view" className="w-full h-auto rounded-sm" />
                  </div>
                )}
                {!lookImage && lookAlt && (
                  <div className={`border border-dashed border-current/40 p-3 rounded-sm text-sm ${lightMode ? 'bg-[#f5f1e6]' : 'bg-black/40'}`}>
                    {lookAlt}
                  </div>
                )}
              </div>
            )}
          </TerminalPanel>

          <TerminalPanel 
            title={gameState.dialogueTarget ? "DIALOGUE INTERFACE" : "COMMAND INPUT"} 
            headerContent={
                gameState.dialogueTarget 
                ? `ENGAGED WITH: ${gameState.dialogueTarget.toUpperCase()}`
                : "CHOOSE YOUR PATH CAREFULLY."
            }
            className="shrink-0 h-auto min-h-[250px] max-h-[40%]" 
            lightMode={lightMode}
          >
            
            {gameState.status === 'alive' ? (
              <div className="flex flex-col gap-2 h-full justify-end">
                
                {gameState.dialogueTarget && (
                    <div className={`text-xs p-2 border border-dashed ${lightMode ? 'border-[#5d4037]/30 bg-[#5d4037]/5' : 'border-green-700 bg-green-900/20'} mb-1`}>
                        <span className="font-bold">ROLEPLAY INSTRUCTION:</span> Speak as {gameState.bio.name}. Be mindful of your station and the plague. 
                        Type your exact words below.
                    </div>
                )}

                {!gameState.dialogueTarget && (
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[200px]">
                    {gameState.options.map((opt) => (
                        <button
                        key={opt.id}
                        onClick={() => handleChoice(opt.text)}
                        disabled={loading}
                        className={`text-left border p-2 text-sm rounded transition-all duration-200 active:scale-95 disabled:opacity-50 ${btnBg}`}
                        onMouseEnter={() => audioManager.playBlip()}
                        >
                        <span className={`font-bold mr-2 ${accentText}`}>{opt.id}.</span>
                        {opt.text}
                        </button>
                    ))}
                    </div>
                )}

                <form onSubmit={handleCustomSubmit} className="mt-1 flex gap-2 shrink-0">
                   <div className="flex-grow relative group">
                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 font-bold text-sm ${accentText}`}>{'>'}</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={gameState.dialogueTarget ? `Say something to ${gameState.dialogueTarget}...` : "4. ENTER CUSTOM ACTION... [OR USE ARROW KEYS TO MOVE]"}
                      className={`w-full border p-2 pl-6 text-sm focus:outline-none focus:shadow-[0_0_10px_rgba(0,0,0,0.1)] font-mono ${inputBg} ${gameState.dialogueTarget ? 'border-2' : ''}`}
                      autoComplete="off"
                    />
                   </div>
                   <button 
                    type="submit" 
                    disabled={!customInput.trim() || loading}
                    className={`font-bold px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${executeBtn}`}
                   >
                     {gameState.dialogueTarget ? 'SPEAK' : 'EXEC'}
                   </button>
                </form>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                <h2 className={`text-4xl font-bold ${gameState.status === 'dead' ? 'text-red-600' : 'text-blue-500'} animate-pulse font-header`}>
                  {gameState.status === 'dead' ? 'YOU HAVE DIED' : 'SURVIVAL CONFIRMED'}
                </h2>
                <div className="text-sm opacity-70 mb-4 max-w-md mx-auto">
                    {gameState.status === 'dead' 
                        ? "The pestilence claims all eventually. Your story ends here." 
                        : "Against all odds, you have weathered the storm."}
                </div>
                <button
                  onClick={restartGame}
                  className={`px-8 py-2 font-bold transition-colors ${executeBtn}`}
                >
                  REBOOT SIMULATION
                </button>
              </div>
            )}
          </TerminalPanel>
        </div>
      </div>
    </div>
  );
};

export default App;
