
import { ITEM_REGISTRY } from '../data/items';
import { SocialClass, ItemMetadata, EntityMetadata, Entity, FamilyMember } from '../types';

// --- ITEM MATCHING ENGINE ---

/**
 * fuzzyMatchItem:
 * Takes a raw string from the LLM (e.g. "Rusty Iron Dagger") and tries to find
 * the best corresponding entry in our Item Registry based on keyword overlap.
 */
export const findItemMatch = (
    rawText: string, 
    socialClass: SocialClass
): ItemMetadata | null => {
    const normalizedText = rawText.toLowerCase();
    
    let bestMatch = null;
    let maxScore = 0;

    for (const item of ITEM_REGISTRY) {
        let score = 0;
        
        // Check for direct keyword hits
        for (const keyword of item.keywords) {
            // Regex to ensure we match whole words (e.g. "pot" matches "clay pot" but not "potato")
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(normalizedText)) {
                score += keyword.length; // Longer keywords weigh more
            }
        }

        // Boost score if the base name is also present
        if (normalizedText.includes(item.baseName.toLowerCase())) {
            score += 5;
        }

        if (score > maxScore) {
            maxScore = score;
            bestMatch = item;
        }
    }

    // Threshold: Need at least a partial match
    if (bestMatch && maxScore > 0) {
        console.log(`[ProcGen] Item Matched: "${rawText}" -> ${bestMatch.id}`);
        return {
            description: bestMatch.tieredDescription[socialClass],
            isWearable: bestMatch.isWearable,
            value: bestMatch.baseValue,
            weight: bestMatch.weight,
            emoji: bestMatch.emoji,
            craftable: false,
            iconPath: bestMatch.iconPath ? `/items/${bestMatch.iconPath}` : undefined
        };
    }

    console.log(`[ProcGen] Item No Match: "${rawText}"`);
    return null; // Fallback to LLM if no match
};

// --- ENTITY DESCRIPTION ENGINE ---

/**
 * generateProceduralEntity:
 * Creates a rich description for an NPC based on their simple tags (Name, Role, Condition).
 * Uses Mad-Libs style templates to avoid LLM calls for every click.
 */
export const generateProceduralEntity = (
    entity: Entity, 
    playerClass: SocialClass,
    knownFamily: FamilyMember[] = []
): EntityMetadata => {
    console.log(`[ProcGen] Generating Entity for:`, entity);

    const name = entity.name;
    let role = entity.role;
    const condition = entity.condition || entity.status || "Unknown";
    const activity = entity.activity || "Idling";

    // 1. Cross-reference with Known Family if role is missing or generic
    if (!role || role === "Stranger") {
        const familyMatch = knownFamily.find(f => 
            name.toLowerCase().includes(f.name.toLowerCase()) || 
            f.name.toLowerCase().includes(name.toLowerCase())
        );
        
        if (familyMatch) {
            role = familyMatch.status;
            console.log(`[ProcGen] Identified Family Member: ${name} is ${role}`);
        } else {
            role = "Stranger";
        }
    }

    // Infer attributes based on name (rough heuristic) and role
    const isFemale = ["Wife", "Daughter", "Mother", "Sister", "Fatima", "Aisha", "Layla", "Mariam", "Zainab", "Huda", "Salma"].some(k => 
        (role && role.includes(k)) || name.includes(k)
    );
    
    const pronouns = isFemale ? { sub: 'She', obj: 'Her', poss: 'Her' } : { sub: 'He', obj: 'Him', poss: 'His' };
    
    // Templates
    let descTemplate = "";
    let temperament = "Neutral";
    let profession = "Unknown";
    let relationship = "Stranger";

    // 1. FAMILY
    if (["Wife", "Husband", "Son", "Daughter", "Brother", "Sister", "Mother", "Father", "Servant"].some(r => role && role.includes(r))) {
        relationship = "Family";
        temperament = "Loyal";
        descTemplate = `${name} is your ${role.toLowerCase()}. ${pronouns.sub} looks ${condition.toLowerCase()}. ${pronouns.sub} is currently ${activity.toLowerCase()}. The stress of the plague is visible in ${pronouns.poss.toLowerCase()} eyes.`;
    }
    // 2. AUTHORITY
    else if (["Guard", "Soldier", "Mamluk", "Official", "Amir"].some(r => role && role.includes(r))) {
        relationship = "Authority";
        temperament = "Suspicious";
        profession = "Soldier";
        descTemplate = `A ${role} of the city. ${pronouns.sub} wears armor and carries a weapon. ${pronouns.sub} watches you warily, checking for signs of sickness.`;
    }
    // 3. MEDICAL
    else if (["Physician", "Doctor", "Healer", "Hakim"].some(r => role && role.includes(r))) {
        relationship = "Neutral";
        temperament = "Professional";
        profession = "Physician";
        descTemplate = `A learned ${role}. ${pronouns.sub} wears a mask or holds a cloth to ${pronouns.poss.toLowerCase()} face. ${pronouns.sub} smells strongly of vinegar and herbs.`;
    }
    // 4. COMMONERS / STRANGERS
    else {
        descTemplate = `A ${role} you encounter in the area. ${pronouns.sub} appears ${condition.toLowerCase()} and looks at you with caution.`;
    }

    // Add health context
    if (condition.toLowerCase().includes("sick") || condition.toLowerCase().includes("cough")) {
        descTemplate += ` ${pronouns.sub} is clearly unwell, sweating and pale.`;
    }

    return {
        description: descTemplate,
        emoji: isFemale ? "🧕" : "👳",
        temperament,
        age: "Unknown", 
        gender: isFemale ? "Female" : "Male",
        profession: profession !== "Unknown" ? profession : (role === "Stranger" ? "Unknown" : role),
        relationship
    };
};
