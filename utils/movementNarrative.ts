import { Entity } from '../types';

// Movement flavor templates
const INDOOR_MOVEMENTS = [
  "You step {direction} in the {room}",
  "You move {direction} across the {room}",
  "You tread {direction} through the {room}",
  "You walk {direction} in the {room}",
  "Carefully, you move {direction} in the {room}",
];

const OUTDOOR_MOVEMENTS = [
  "You head {direction} through the {room}",
  "You walk {direction} in the {room}",
  "You move {direction} across the {room}",
  "You proceed {direction} in the {room}",
  "You make your way {direction} through the {room}",
];

// Determine if location is indoor or outdoor
function isOutdoorLocation(location: string): boolean {
  const outdoorKeywords = ['street', 'alley', 'market', 'courtyard', 'square', 'gate', 'road', 'path', 'garden'];
  return outdoorKeywords.some(keyword => location.toLowerCase().includes(keyword));
}

// Get random movement template
function getMovementTemplate(location: string): string {
  const templates = isOutdoorLocation(location) ? OUTDOOR_MOVEMENTS : INDOOR_MOVEMENTS;
  return templates[Math.floor(Math.random() * templates.length)];
}

// Direction names
const DIRECTION_NAMES: Record<string, string> = {
  '0,-1': 'north',
  '0,1': 'south',
  '-1,0': 'west',
  '1,0': 'east',
};

// Check proximity to walls
function checkWallProximity(rows: string[], x: number, y: number, dx: number, dy: number): string | null {
  const wallChars = ['#', '|', '-', '_', '=', '┌', '┐', '└', '┘', '─', '│', '├', '┤', '┬', '┴', '┼', '▓', '▒', '⌂'];

  // Check in direction of movement
  const checkX = x + dx;
  const checkY = y + dy;

  if (checkY >= 0 && checkY < rows.length && checkX >= 0 && checkX < rows[checkY].length) {
    const nextChar = rows[checkY][checkX];
    if (wallChars.includes(nextChar)) {
      if (dy === -1) return 'the northern wall';
      if (dy === 1) return 'the southern wall';
      if (dx === -1) return 'the western wall';
      if (dx === 1) return 'the eastern wall';
    }
  }

  // Check adjacent cells for nearby walls
  const adjacent = [
    { x: x + 1, y: y, dir: 'east' },
    { x: x - 1, y: y, dir: 'west' },
    { x: x, y: y + 1, dir: 'south' },
    { x: x, y: y - 1, dir: 'north' },
  ];

  for (const adj of adjacent) {
    if (adj.y >= 0 && adj.y < rows.length && adj.x >= 0 && adj.x < rows[adj.y].length) {
      if (wallChars.includes(rows[adj.y][adj.x])) {
        return `the ${adj.dir}ern wall`;
      }
    }
  }

  return null;
}

// Check proximity to NPCs
function checkNPCProximity(rows: string[], x: number, y: number, entities: Entity[]): string | null {
  const adjacent = [
    { x: x + 1, y: y },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x, y: y - 1 },
  ];

  for (const adj of adjacent) {
    if (adj.y >= 0 && adj.y < rows.length && adj.x >= 0 && adj.x < rows[adj.y].length) {
      const char = rows[adj.y][adj.x];
      if (/[A-Z]/.test(char) && !['[', ']'].includes(char)) {
        const npc = entities.find(e => e.name.toUpperCase().startsWith(char));
        if (npc) return npc.name;
      }
    }
  }

  return null;
}

// Check proximity to objects/containers
function checkObjectProximity(rows: string[], x: number, y: number): string | null {
  const adjacent = [
    { x: x + 1, y: y },
    { x: x - 1, y: y },
    { x: x, y: y + 1 },
    { x: x, y: y - 1 },
  ];

  const objectMap: Record<string, string> = {
    '*': 'something of interest',
    '$': 'valuables',
    '!': 'something dangerous',
    '?': 'something curious',
    '▪': 'a chest',
    '◎': 'a jar',
    '►': 'an exit',
    '◄': 'an exit',
    '▲': 'an exit',
    '▼': 'an exit',
    '+': 'a doorway',
    '◙': 'a fountain',
    '○': 'a well',
    '●': 'a tree',
    '†': 'a religious site',
  };

  for (const adj of adjacent) {
    if (adj.y >= 0 && adj.y < rows.length && adj.x >= 0 && adj.x < rows[adj.y].length) {
      const char = rows[adj.y][adj.x];
      if (objectMap[char]) return objectMap[char];
    }
  }

  // Check current position
  const currentChar = rows[y]?.[x];
  if (currentChar && objectMap[currentChar]) {
    return `on ${objectMap[currentChar]}`;
  }

  return null;
}

// Extract room name from location string
function extractRoomName(location: string): string {
  // Format: "Specific Room, Structure Name, Neighborhood/Quarter, Damascus, Syria"
  const parts = location.split(',');
  return parts[0]?.trim() || 'the area';
}

// Generate complete movement narrative
export function generateMovementNarrative(
  rows: string[],
  newX: number,
  newY: number,
  dx: number,
  dy: number,
  location: string,
  entities: Entity[]
): string {
  const direction = DIRECTION_NAMES[`${dx},${dy}`] || 'forward';
  const room = extractRoomName(location);

  // Base movement text
  const template = getMovementTemplate(location);
  let narrative = template
    .replace('{direction}', direction)
    .replace('{room}', room);

  // Add proximity details
  const proximityParts: string[] = [];

  // Check for walls
  const nearWall = checkWallProximity(rows, newX, newY, dx, dy);
  if (nearWall) {
    proximityParts.push(`approaching ${nearWall}`);
  }

  // Check for NPCs
  const nearNPC = checkNPCProximity(rows, newX, newY, entities);
  if (nearNPC) {
    proximityParts.push(`near ${nearNPC}`);
  }

  // Check for objects
  const nearObject = checkObjectProximity(rows, newX, newY);
  if (nearObject) {
    if (nearObject.startsWith('on ')) {
      proximityParts.push(`standing ${nearObject}`);
    } else {
      proximityParts.push(`approaching ${nearObject}`);
    }
  }

  // Combine narrative with proximity
  if (proximityParts.length > 0) {
    // Prioritize: show most important proximity only
    narrative += `. You are now ${proximityParts[0]}`;
  }

  return narrative + '.';
}
