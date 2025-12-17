
import { GoogleGenAI, Type } from "@google/genai";
import { getSystemInstruction } from "../constants";
import { GameState, TurnResponse, ItemMetadata, EntityMetadata, CharacterProfile } from "../types";
import { resolveWealthTier } from "../utils/locationWealth";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

const safeParseResponse = <T>(raw: string | undefined | null, fallbackFactory: (reason: string) => T): T => {
  if (!raw) return fallbackFactory("Empty response");
  const text = raw.toString();

  const attempt = (payload: string, reason: string) => {
    try {
      return JSON.parse(payload) as T;
    } catch {
      return undefined;
    }
  };

  const direct = attempt(text, "direct");
  if (direct) return direct;

  const lastBrace = text.lastIndexOf("}");
  if (lastBrace !== -1) {
    const trimmed = attempt(text.slice(0, lastBrace + 1), "trimmed");
    if (trimmed) return trimmed;
  }

  const firstBrace = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (firstBrace !== -1 && last !== -1 && last > firstBrace) {
    const sliced = attempt(text.slice(firstBrace, last + 1), "sliced");
    if (sliced) return sliced;
  }

  return fallbackFactory("Unknown parse error");
};

const turnResponseSchema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING },
    updatedHealth: { type: Type.NUMBER },
    updatedSymptoms: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    updatedHumors: {
      type: Type.OBJECT,
      properties: {
        blood: { type: Type.NUMBER },
        phlegm: { type: Type.NUMBER },
        yellowBile: { type: Type.NUMBER },
        blackBile: { type: Type.NUMBER },
      },
      required: ["blood", "phlegm", "yellowBile", "blackBile"]
    },
    updatedWorn: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    updatedInventory: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    presentEntities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["healthy","sick","dead","active","idle","resting","missing","fled"] },
          role: { type: Type.STRING, enum: ["spouse","child","servant","guard","merchant","neighbor","parent","sibling","stranger"] },
          condition: { type: Type.STRING, enum: ["healthy","incubating","symptomatic","dying","corpse"] },
          activity: { type: Type.STRING, enum: ["standing","praying","walking","working","resting","fleeing","trading"] }
        }
      }
    },
    presentInteractables: {
       type: Type.ARRAY,
       items: { type: Type.STRING }
    },
    presentContainers: {
       type: Type.ARRAY,
       items: {
         type: Type.OBJECT,
         properties: {
           id: { type: Type.STRING },
           name: { type: Type.STRING },
           type: { type: Type.STRING, enum: ["chest", "jar", "sack", "box"] },
           symbol: { type: Type.STRING, enum: ["▪", "◎"] },
           contents: { type: Type.ARRAY, items: { type: Type.STRING } },
           x: { type: Type.NUMBER },
           y: { type: Type.NUMBER },
           searched: { type: Type.BOOLEAN }
         }
       }
    },
    updatedFamilyStatus: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                status: { type: Type.STRING },
                note: { type: Type.STRING }
            }
        }
    },
    newLocation: { type: Type.STRING },
    locationWealth: { type: Type.STRING, enum: ["poor", "modest", "merchant", "elite"] },
    localMapAscii: { type: Type.STRING },
    isGameOver: { type: Type.BOOLEAN },
    gameStatus: { type: Type.STRING, enum: ["alive", "dead", "survived"] },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.NUMBER },
          text: { type: Type.STRING }
        }
      }
    }
  },
  required: ["narrative", "updatedHealth", "updatedSymptoms", "updatedHumors", "newLocation", "locationWealth", "isGameOver", "gameStatus", "options", "updatedInventory", "updatedWorn", "presentEntities", "presentInteractables", "localMapAscii"]
};

// --- Initialization ---

export const initializeGameStory = async (profile: CharacterProfile, houseType: string, eraDate: string): Promise<TurnResponse> => {
    const systemPrompt = getSystemInstruction(profile, houseType);
    
    // Create the initial prompt to kickstart the game
  const initPrompt = `
      INITIALIZE NEW GAME.
      Character: ${profile.name}
      Setting: ${houseType} in Damascus.
      Calendar Date: ${eraDate} (between July and December 1348).
      Day: 1.
      Situation: Waking up. Rumors of plague.
      Map constraint: Do NOT exceed 30 columns wide or 14 rows tall. Enforce within those limits.
      Render '@' for the player, and ensure '@' is present. Total lines <= 14, max width <= 30 characters on any line.
      IMPORTANT: localMapAscii must be a single plain string with \\n line breaks. DO NOT use '+' concatenation or split strings; return one literal string.
      
      Generate the initial state, narrative, and the first map of the ${houseType}.
      Ensure the inventory reflects a ${profile.profession}.
      Ensure the family members (${profile.family.map(f => f.name).join(', ')}) are present or accounted for.
      Initialize humors to a relatively balanced state (40-60 range).
      Set "newLocation" to the specific room name where the player starts (e.g. "Bedroom" or "Sleeping Quarters").
      Set "locationWealth" based on the immediate setting (poor/modest/merchant/elite).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: initPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: turnResponseSchema,
                temperature: 0.6, // Lower to reduce reasoning artifacts
            }
        });

        const parsed = safeParseResponse<TurnResponse>(response.text, (reason) => {
          return {
            narrative: "You wake up. The air is still. (Fallback: invalid AI init response)",
            updatedHealth: 100,
            updatedSymptoms: [],
            updatedHumors: { blood: 50, phlegm: 50, yellowBile: 50, blackBile: 50 },
            updatedInventory: ["Dinars"],
            updatedWorn: ["Robes"],
            presentEntities: [],
            presentInteractables: [],
            presentContainers: [],
            updatedFamilyStatus: [],
            newLocation: "Bedroom, Damascus, Syria",
            locationWealth: resolveWealthTier(undefined, houseType, profile.socialClass, "Bedroom, Damascus, Syria"),
            localMapAscii: " [ INIT MAP ERROR ] ",
            isGameOver: false,
            gameStatus: 'alive',
            options: [{id: 1, text: "Look around"}],
            debugParseError: reason
          };
        });
        parsed.debugPromptUsed = initPrompt;
        parsed.debugRawResponse = response.text || '';
        return parsed;

    } catch (e) {
        console.error("Init Error", e);
        // Fallback
        const fallback = {
            narrative: "You wake up. The air is still.",
            updatedHealth: 100,
            updatedSymptoms: [],
            updatedHumors: { blood: 50, phlegm: 50, yellowBile: 50, blackBile: 50 },
            updatedInventory: ["Dinars"],
            updatedWorn: ["Robes"],
            presentEntities: [],
            presentInteractables: [],
            updatedFamilyStatus: [],
            newLocation: "Bedroom",
            locationWealth: resolveWealthTier(undefined, houseType, profile.socialClass, "Bedroom"),
            localMapAscii: " [ ERROR ] ",
            isGameOver: false,
            gameStatus: 'alive',
            options: [{id: 1, text: "Look around"}]
        };
        fallback.debugPromptUsed = initPrompt;
        fallback.debugRawResponse = JSON.stringify(fallback);
        fallback.debugParseError = (e as Error)?.message || 'Init error';
        return fallback;
    }
};

// --- Turn Generation ---

export const generateTurn = async (
  currentGameState: GameState,
  playerAction: string,
  houseType: string,
  eraDate: string,
  onStreamChunk?: (narrative: string) => void // Callback for streaming narrative
): Promise<TurnResponse> => {
  
  const systemPrompt = getSystemInstruction(currentGameState.bio, houseType);
  const recentHistory = currentGameState.history.slice(-6).map(h => `${h.role}: ${h.text}`).join('\n');

  const prompt = `
    Previous Context:
    ${recentHistory}

    Current Status:
    - Location: ${currentGameState.location}
    - Health: ${currentGameState.health}
    - Humors: Blood ${currentGameState.humors.blood}, Phlegm ${currentGameState.humors.phlegm}, Yellow Bile ${currentGameState.humors.yellowBile}, Black Bile ${currentGameState.humors.blackBile}
    - Symptoms: ${currentGameState.symptoms?.join(", ") || "None"}
    - Inventory (Carried): ${currentGameState.inventory?.join(", ") || "None"}
    - Inventory (Worn/Equipped): ${currentGameState.worn?.join(", ") || "None"}
    - Day: ${currentGameState.day}
    - Calendar Date: ${eraDate}
    - Map size: You MUST keep the map within 30 columns wide and 14 rows tall. If your draft is larger, redesign it smaller before returning JSON.
    - Map rules: Always include '@' for the player. No line longer than 30 chars. Max 14 lines.
    - Entity format: presentEntities must use enum values only (no slashes/parentheticals). 
      status in ["healthy","sick","dead","active","idle","resting","missing","fled"]; 
      role in ["spouse","child","servant","guard","merchant","neighbor","parent","sibling","stranger"]; 
      condition in ["healthy","incubating","symptomatic","dying","corpse"]; 
      activity in ["standing","praying","walking","working","resting","fleeing","trading"].
    - Map string format: localMapAscii must be one plain string with \\n line breaks; do NOT use '+' or concatenation.
    - DO NOT pad maps with long runs of commas/spaces. Redesign tighter if needed. Ensure exactly one '@'.
    - Set locationWealth each turn: "poor" | "modest" | "merchant" | "elite", based on the immediate setting.

    Player Action: ${playerAction}
    
    ${currentGameState.dialogueTarget ? `NOTE: The player is currently engaging in dialogue with ${currentGameState.dialogueTarget}. The narrative should reflect a conversation.` : ''}

    Generate the next turn result in JSON. 
    IMPORTANT: 
    1. Generate a new 'localMapAscii'. 
    2. Maintain family consistency.
    3. Update Humoral Balance based on actions and sickness.
    4. Sort items between 'updatedInventory' (carried) and 'updatedWorn' (equipped/clothing).
    5. Update "newLocation" to the specific room/area name on the map where the '@' is located (e.g., "Kitchen", "Courtyard", "Alley").
  `;

  const runOnce = async () => {
    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: turnResponseSchema,
        temperature: 0.6,
      }
    });

    let fullText = '';
    let streamedNarrative = '';

    const tryParsePartial = (text: string) => {
      try {
        return JSON.parse(text);
      } catch (err) {
        const lastBrace = text.lastIndexOf('}');
        if (lastBrace !== -1) {
          try {
            return JSON.parse(text.slice(0, lastBrace + 1));
          } catch {
            return null;
          }
        }
      }
      return null;
    };

    for await (const chunk of streamResponse) {
      const chunkText = chunk.text || '';
      fullText += chunkText;

      if (onStreamChunk) {
        const parsedPartial = tryParsePartial(fullText);
        if (parsedPartial && typeof (parsedPartial as any).narrative === 'string') {
          const candidate = (parsedPartial as any).narrative;
          if (candidate !== streamedNarrative) {
            streamedNarrative = candidate;
            onStreamChunk(streamedNarrative);
          }
        }
      }
    }

    if (!fullText) throw new Error("No response from AI");
    if (onStreamChunk && !streamedNarrative && fullText.trim()) {
      onStreamChunk(fullText.trim());
    }

    const parsed = safeParseResponse<TurnResponse>(fullText, (reason) => ({
      narrative: "The simulation glitched. (Fallback: invalid AI turn response)",
      updatedHealth: currentGameState.health,
      updatedSymptoms: currentGameState.symptoms || [],
      updatedHumors: currentGameState.humors,
      updatedWorn: currentGameState.worn || [],
      updatedInventory: currentGameState.inventory || [],
      presentEntities: currentGameState.entities || [],
      presentInteractables: currentGameState.interactables || [],
      presentContainers: currentGameState.containers || [],
      updatedFamilyStatus: currentGameState.bio.family || [],
      newLocation: currentGameState.location,
      locationWealth: currentGameState.locationWealth,
      localMapAscii: " [ MAP DATA CORRUPTED ] ",
      isGameOver: false,
      gameStatus: 'alive',
      options: [
        { id: 1, text: "Try again" },
        { id: 2, text: "Wait" },
        { id: 3, text: "Pray" }
      ],
      debugParseError: reason
    }));
    parsed.debugPromptUsed = prompt;
    parsed.debugRawResponse = fullText;
    return parsed;
  };

  try {
    return await runOnce();
  } catch (error) {
    console.warn("Gemini turn retry after error:", error);
    try {
      return await runOnce();
    } catch (error2) {
      console.error("Gemini API Error after retry:", error2);
      const fallback = {
        narrative: "Your vision dims and darkness closes in. When you awaken, time has passed, and the city feels different.",
        updatedHealth: Math.max(0, currentGameState.health - 5),
        updatedSymptoms: currentGameState.symptoms || [],
        updatedHumors: currentGameState.humors,
        updatedWorn: currentGameState.worn || [],
        updatedInventory: currentGameState.inventory || [],
        presentEntities: [],
        presentInteractables: [],
        updatedFamilyStatus: [],
        newLocation: currentGameState.location,
        locationWealth: currentGameState.locationWealth,
        localMapAscii: generateFallbackMap(),
        isGameOver: false,
        gameStatus: 'alive',
        options: [
          { id: 1, text: "Steady yourself and look around." },
          { id: 2, text: "Call out to see who else is nearby." },
          { id: 3, text: "Check your belongings." }
        ]
      };
      (fallback as any).debugPromptUsed = prompt;
      (fallback as any).debugRawResponse = JSON.stringify(fallback);
      (fallback as any).debugParseError = (error2 as Error)?.message || 'Turn error';
      return fallback as TurnResponse;
    }
  }
};

// --- Metadata Generators (Unchanged) ---

export const generateItemMetadata = async (itemName: string): Promise<ItemMetadata> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Generate metadata for a historical item named "${itemName}" in 1348 Damascus.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        isWearable: { type: Type.BOOLEAN },
                        value: { type: Type.NUMBER },
                        weight: { type: Type.NUMBER },
                        emoji: { type: Type.STRING },
                        craftable: { type: Type.BOOLEAN }
                    },
                    required: ["description", "isWearable", "value", "weight", "emoji", "craftable"]
                }
            }
        });
        
        return JSON.parse(response.text || "{}") as ItemMetadata;
    } catch (e) {
        console.error("Item Gen Error", e);
        return {
            description: "A mundane object of little note.",
            isWearable: false,
            value: 0,
            weight: 1,
            emoji: "📦",
            craftable: false
        };
    }
};

export const generateEntityMetadata = async (entityName: string): Promise<EntityMetadata> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Generate metadata for a historical NPC named "${entityName}" in 1348 Damascus.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        temperament: { type: Type.STRING },
                        age: { type: Type.STRING },
                        gender: { type: Type.STRING },
                        profession: { type: Type.STRING },
                        relationship: { type: Type.STRING }
                    },
                    required: ["description", "emoji", "temperament", "age", "gender", "profession", "relationship"]
                }
            }
        });
        
        return JSON.parse(response.text || "{}") as EntityMetadata;
    } catch (e) {
        console.error("Entity Gen Error", e);
        return {
            description: "A stranger in these dark times.",
            emoji: "👤",
            temperament: "Neutral",
            age: "Unknown",
            gender: "Unknown",
            profession: "Unknown",
            relationship: "Stranger"
        };
    }
};

// --- Image Generation (Look) ---
export const generateLookImage = async (gameState: GameState, viewDescription?: string): Promise<{ image?: string; alt?: string }> => {
    const loc = gameState.location;
    const time = gameState.turnCount > 0 ? `Turn ${gameState.turnCount}, Day ${gameState.day}` : 'Dawn';
    const actors = gameState.entities.map(e => `${e.name} (${e.status || 'unknown'})`).join(', ') || 'no one visible';
    const items = gameState.interactables.join(', ') || 'few props';

    const prompt = `First-person POV view from inside historically accurate Damascus during the Black Death plague, year 1348. You are ${gameState.bio.name}, a ${gameState.bio.profession} of ${gameState.bio.socialClass} class. Current location: ${loc}. Time: ${time}. Nearby people: ${actors}. Visible objects: ${items}. Style: realistic medieval Middle Eastern architecture, accurate historical details, documentary realism, natural lighting, dusty atmosphere. Show exactly what the character sees at eye-level. ${viewDescription || ''}`;

    try {
        // Use Imagen API for image generation
        // imagen-4.0-generate-001 is the latest Imagen model ($0.04/image)
        // Alternative: imagen-3.0-generate-002 (may be cheaper)
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
            }
        });

        // The response contains generated images
        if (response.generatedImages && response.generatedImages.length > 0) {
            const imageData = response.generatedImages[0];

            // Check if the image was filtered by RAI
            if (imageData.raiFilteredReason) {
                return { alt: `Image generation blocked: ${imageData.raiFilteredReason}. Try a different scene description.` };
            }

            // Access the image bytes from the response
            if (imageData.image?.imageBytes) {
                const imageBase64 = imageData.image.imageBytes;
                const mimeType = imageData.image.mimeType || 'image/png';
                const imageUrl = `data:${mimeType};base64,${imageBase64}`;
                return { image: imageUrl, alt: imageData.enhancedPrompt || prompt };
            }

            // Handle GCS URI if imageBytes is not available
            if (imageData.image?.gcsUri) {
                return { alt: `Image generated at ${imageData.image.gcsUri}. Direct download required.` };
            }
        }

        return { alt: 'Image generated but could not be displayed. Try again.' };
    } catch (e) {
        console.error("Look image generation failed:", e);
        const errorMessage = (e as Error)?.message || 'Unknown error';
        return { alt: `Image generation failed: ${errorMessage}. Please check your API key has image generation permissions.` };
    }
};
