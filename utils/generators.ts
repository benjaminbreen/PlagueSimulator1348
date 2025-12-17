
import { CharacterProfile, VisualTraits, FamilyMember, SocialClass } from '../types';

// Data Banks for 1348 Damascus
const MALE_NAMES = ["Yusuf", "Ahmed", "Ibrahim", "Khalid", "Omar", "Hassan", "Bilal", "Zayd", "Faris", "Nasir", "Tariq", "Saladin", "Baybars"];
const FEMALE_NAMES = ["Fatima", "Aisha", "Layla", "Mariam", "Zainab", "Huda", "Samira", "Noor", "Rana", "Salma", "Khadija"];
const SURNAMES = ["ibn Ahmad", "al-Dimashqi", "al-Farra", "al-Attar", "ibn Khalid", "al-Halabi", "al-Khatib", "al-Kurdi", "al-Masri"];

// Profession to Class Mapping
const PROFESSION_MAP: Record<string, SocialClass> = {
    "Beggar": "Destitute",
    "Gravedigger": "Destitute",
    "Water Carrier": "Destitute",
    "Porter": "Commoner",
    "Potter": "Commoner",
    "Baker": "Commoner",
    "Soldier": "Commoner",
    "Weaver": "Commoner",
    "Cloth Merchant": "Merchant",
    "Spice Trader": "Merchant",
    "Blacksmith": "Merchant",
    "Perfumer": "Merchant",
    "Scribe": "Notable",
    "Scholar": "Notable",
    "Imam": "Notable",
    "Physician": "Notable",
    "Mamluk Officer": "Elite",
    "Silk Magnate": "Elite",
    "Amir": "Elite"
};

const HOUSE_TYPES = [
    "Small Courtyard House (Modest)",
    "Large Merchant Estate (Sprawling)",
    "Cramped Apartment near the Souk (Noisy)",
    "Garden Villa in Salihiyya (Open)",
    "Room in a Khan (Busy)"
];

const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateVisualTraits = (sex: 'male' | 'female'): VisualTraits => {
    const build = getRandom(['thin', 'average', 'average', 'heavy']);
    const height = getRandom(['short', 'medium', 'medium', 'tall', 'very_tall']);
    
    // Approximate weight calculation (kg)
    let baseWeight = 65;
    if (sex === 'female') baseWeight -= 10;
    if (height === 'short') baseWeight -= 10;
    if (height === 'tall') baseWeight += 10;
    if (height === 'very_tall') baseWeight += 20;
    if (build === 'thin') baseWeight *= 0.8;
    if (build === 'heavy') baseWeight *= 1.3;

    return {
        sex,
        height: height as any,
        build: build as any,
        weight: Math.floor(baseWeight + (Math.random() * 5)),
        hairStyle: sex === 'male' 
            ? getRandom(['bald', 'short', 'turban', 'turban', 'turban']) 
            : getRandom(['hijab', 'hijab', 'long']),
        facialHair: sex === 'male' ? Math.random() > 0.1 : false, // 90% chance of beard for men
        missingLimbs: {
            leftArm: Math.random() < 0.05,
            rightArm: false,
            leftLeg: Math.random() < 0.05,
            rightLeg: false,
            leftEye: Math.random() < 0.05,
            rightEye: false
        }
    };
};

export const generateFamily = (sex: 'male' | 'female', age: number): FamilyMember[] => {
    const family: FamilyMember[] = [];
    
    // Spouse
    if (age > 20) {
        family.push({
            name: sex === 'male' ? getRandom(FEMALE_NAMES) : getRandom(MALE_NAMES),
            status: sex === 'male' ? "Wife" : "Husband"
        });
    }

    // Children
    if (age > 25) {
        const numKids = Math.floor(Math.random() * 4);
        for(let i=0; i<numKids; i++) {
            const isSon = Math.random() > 0.5;
            family.push({
                name: isSon ? getRandom(MALE_NAMES) : getRandom(FEMALE_NAMES),
                status: isSon ? "Son" : "Daughter",
                note: "Young"
            });
        }
    }

    // Servant
    if (Math.random() > 0.3) {
        family.push({
            name: getRandom(MALE_NAMES),
            status: "Servant",
            note: "Loyal"
        });
    }

    return family;
};

const randomEraDate = () => {
    // July 1 1348 to Dec 31 1348
    const start = new Date(Date.UTC(1348, 6, 1));
    const end = new Date(Date.UTC(1348, 11, 31));
    const diff = end.getTime() - start.getTime();
    const offset = Math.floor(Math.random() * diff);
    const date = new Date(start.getTime() + offset);
    return date;
};

const formatEraDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const generateProceduralProfile = (): { profile: CharacterProfile, houseType: string, eraDate: Date } => {
    const sex = Math.random() > 0.7 ? 'female' : 'male'; 
    const name = `${sex === 'male' ? getRandom(MALE_NAMES) : getRandom(FEMALE_NAMES)} ${getRandom(SURNAMES)}`;
    const age = 20 + Math.floor(Math.random() * 40);
    
    const profession = getRandom(Object.keys(PROFESSION_MAP));
    const socialClass = PROFESSION_MAP[profession];
    
    const visuals = generateVisualTraits(sex);
    const family = generateFamily(sex, age);
    const houseType = getRandom(HOUSE_TYPES);
    const eraDate = randomEraDate();

    const history = `Born in Damascus. ${name} has lived a life defined by the ${profession} trade. 
    ${visuals.missingLimbs.leftEye ? "Lost an eye in a childhood accident." : ""} 
    ${visuals.missingLimbs.leftLeg ? "Moves with a limp due to an old injury." : ""}
    Known for being ${Math.random() > 0.5 ? "pious" : "skeptical"} and ${Math.random() > 0.5 ? "generous" : "frugal"}.`;

    const overview = `${name}, ${age}. A ${profession} of the ${socialClass} class, residing in a ${houseType}.`;

    return {
        profile: {
            name,
            age,
            profession,
            socialClass,
            overview,
            family,
            history,
            visuals,
            historyDate: formatEraDate(eraDate)
        },
        houseType,
        eraDate
    };
};
