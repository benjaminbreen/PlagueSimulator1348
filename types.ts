
export interface Option {
  id: number;
  text: string;
}

export interface Entity {
  name: string;
  status: string; // e.g. "Coughing", "Haggling", "Dead"
  role?: string; // New: "Wife", "Guard"
  condition?: string; // New: "Sick", "Healthy"
  activity?: string; // New: "Praying"
}

export interface LogEntry {
  id: string;
  role: 'system' | 'user';
  text: string;
  turnNumber?: number;
  day?: number;
  location?: string;
  entities?: Entity[];
  interactables?: string[];
}

export interface ItemMetadata {
  description: string;
  isWearable: boolean;
  value: number; // in dinars
  weight: number; // 1-10 scale
  emoji: string;
  iconPath?: string; // New: Path to local asset
  craftable: boolean;
}

export interface EntityMetadata {
  description: string;
  emoji: string;
  temperament: string; // e.g. "Friendly", "Hostile"
  age?: string;
  gender?: string;
  profession?: string;
  relationship?: string;
}

export interface FamilyMember {
  name: string;
  status: string;
  note?: string;
}

export interface VisualTraits {
  sex: 'male' | 'female';
  height: 'short' | 'medium' | 'tall' | 'very_tall';
  weight: number; // in kg
  build: 'thin' | 'average' | 'heavy';
  hairStyle: 'bald' | 'short' | 'long' | 'turban' | 'hijab';
  facialHair: boolean; // Beard/Mustache
  missingLimbs: {
    leftArm: boolean;
    rightArm: boolean;
    leftLeg: boolean;
    rightLeg: boolean;
    leftEye: boolean;
    rightEye: boolean;
  };
}

export type SocialClass = 'Destitute' | 'Commoner' | 'Merchant' | 'Notable' | 'Elite';

export interface CharacterProfile {
  name: string;
  age: number;
  profession: string;
  socialClass: SocialClass; // New field
  overview: string;
  family: FamilyMember[];
  history: string;
  visuals: VisualTraits;
  historyDate?: string; // Calendar context (e.g., Nov 1348)
}

export interface HumoralBalance {
  blood: number;       // Sanguine (Air/Hot+Moist) - Vitality/Pulse
  phlegm: number;      // Phlegmatic (Water/Cold+Moist) - Lungs/Congestion
  yellowBile: number;  // Choleric (Fire/Hot+Dry) - Fever/Aggression
  blackBile: number;   // Melancholic (Earth/Cold+Dry) - Necrosis/Depression
}

export interface Container {
  id: string;
  name: string; // "Wooden Chest", "Clay Jar", "Sack"
  type: 'chest' | 'jar' | 'sack' | 'box';
  symbol: '▪' | '◎';
  contents: string[];
  x: number; // Map position
  y: number;
  searched: boolean;
}

export interface GameState {
  history: LogEntry[];
  day: number;
  turnCount: number;
  location: string;
  health: number; // 0-100
  symptoms: string[];
  humors: HumoralBalance; // New field
  worn: string[];
  inventory: string[];
  entities: Entity[];
  interactables: string[];
  containers: Container[]; // New field
  bio: CharacterProfile;
  status: 'alive' | 'dead' | 'survived';
  options: Option[];
  localMapAscii: string;

  // Knowledge Base
  itemKnowledge: Record<string, ItemMetadata>;
  entityKnowledge: Record<string, EntityMetadata>;

  // Interaction State
  dialogueTarget: string | null;
  debugTranscripts: LlmTranscript[];
}

export interface LlmTranscript {
  id: string;
  type: 'init' | 'turn';
  turn: number;
  prompt: string;
  response: string;
}

export interface TurnResponse {
  narrative: string;
  updatedHealth: number;
  updatedSymptoms: string[];
  updatedHumors: HumoralBalance; // New field
  updatedWorn: string[];
  updatedInventory: string[];
  presentEntities: Entity[];
  presentInteractables: string[];
  presentContainers?: Container[]; // New field
  updatedFamilyStatus?: FamilyMember[];
  newLocation: string;
  isGameOver: boolean;
  gameStatus: 'alive' | 'dead' | 'survived';
  options: Option[];
  localMapAscii: string;
  debugPromptUsed?: string;
  debugRawResponse?: string;
  debugParseError?: string;
}
