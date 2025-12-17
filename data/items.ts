
import { SocialClass } from '../types';

export interface ItemDefinition {
    id: string;
    baseName: string;
    keywords: string[]; // Synonyms to match against LLM text
    tieredDescription: Record<SocialClass, string>; // Description changes based on class
    baseValue: number;
    weight: number;
    isWearable: boolean;
    emoji: string;
    iconPath?: string; // Placeholder for future assets
}

// Helper for single description
const singleDesc = (desc: string): Record<SocialClass, string> => ({
    Destitute: desc, Commoner: desc, Merchant: desc, Notable: desc, Elite: desc
});

export const ITEM_REGISTRY: ItemDefinition[] = [
    // --- CURRENCY & TRADE ---
    {
        id: 'dinar',
        baseName: 'Gold Dinar',
        keywords: ['dinar', 'gold', 'coin', 'purse', 'money'],
        tieredDescription: singleDesc("A heavy gold coin of the Mamluk Sultanate. It bears the calligraphy of the Sultan."),
        baseValue: 10,
        weight: 0.1,
        isWearable: false,
        emoji: '🪙'
    },
    {
        id: 'dirham',
        baseName: 'Silver Dirham',
        keywords: ['dirham', 'silver', 'change', 'coins'],
        tieredDescription: singleDesc("Standard silver currency used for daily trade in the souk."),
        baseValue: 1,
        weight: 0.1,
        isWearable: false,
        emoji: '🥈'
    },
    
    // --- FURNITURE & FIXTURES ---
    {
        id: 'bed',
        baseName: 'Bedding',
        keywords: ['bed', 'mat', 'mattress', 'sleeping', 'pallet', 'divan', 'cushion'],
        tieredDescription: {
            Destitute: "A pile of filthy straw and rags on the cold floor.",
            Commoner: "A woven palm mat with a rough wool blanket.",
            Merchant: "A raised wooden frame with a stuffed cotton mattress.",
            Notable: "A wide divan with embroidered cushions and wool blankets.",
            Elite: "A silk-canopied bed raised on carved cedar legs."
        },
        baseValue: 0,
        weight: 10,
        isWearable: false,
        emoji: '🛏️'
    },
    {
        id: 'writing_desk',
        baseName: 'Writing Surface',
        keywords: ['desk', 'table', 'writing', 'stand'],
        tieredDescription: {
            Destitute: "A flat stone used to prop up scraps of parchment.",
            Commoner: "A simple low wooden table, stained with ink.",
            Merchant: "A sturdy oak desk with compartments for ledgers.",
            Notable: "A finely carved walnut desk with mother-of-pearl inlay.",
            Elite: "A masterwork desk of ebony and ivory."
        },
        baseValue: 5,
        weight: 5,
        isWearable: false,
        emoji: '🪑'
    },
    {
        id: 'lamp',
        baseName: 'Oil Lamp',
        keywords: ['lamp', 'light', 'lantern', 'candle', 'torch'],
        tieredDescription: {
            Destitute: "A cracked clay saucer with a floating wick.",
            Commoner: "A simple glazed clay lamp.",
            Merchant: "A brass lamp with a glass wind-shield.",
            Notable: "A hanging mosque lamp of enameled glass.",
            Elite: "A silver candelabra with beeswax candles."
        },
        baseValue: 1,
        weight: 1,
        isWearable: false,
        emoji: '🪔'
    },
    {
        id: 'window',
        baseName: 'Window',
        keywords: ['window', 'lattice', 'mashrabiya', 'opening', 'shutter'],
        tieredDescription: {
            Destitute: "A hole in the mud-brick wall, stuffed with rags.",
            Commoner: "A small wooden shutter, unglazed.",
            Merchant: "A mashrabiya lattice that allows air but blocks gaze.",
            Notable: "Intricate geometric woodwork shielding the interior.",
            Elite: "Stained glass set into stone tracery."
        },
        baseValue: 0,
        weight: 0,
        isWearable: false,
        emoji: '🪟'
    },

    // --- MEDICINE ---
    {
        id: 'vinegar',
        baseName: 'Vinegar (Sakanjabin)',
        keywords: ['vinegar', 'bottle', 'sour', 'acid', 'cleaning'],
        tieredDescription: singleDesc("Strong vinegar. The physicians say washing with it repels the miasma."),
        baseValue: 2,
        weight: 1,
        isWearable: false,
        emoji: '🏺'
    },
    {
        id: 'theriac',
        baseName: 'Theriac Pot',
        keywords: ['theriac', 'medicine', 'cure', 'antidote', 'drug', 'paste'],
        tieredDescription: singleDesc("A black, viscous paste made of opium and viper flesh. The legendary cure for all poisons."),
        baseValue: 50,
        weight: 0.5,
        isWearable: false,
        emoji: '🧪'
    },
    {
        id: 'garlic',
        baseName: 'Garlic & Onions',
        keywords: ['garlic', 'onion', 'bulb', 'cloves'],
        tieredDescription: singleDesc("Pungent bulbs. Poor men hang them to ward off sickness."),
        baseValue: 0.5,
        weight: 0.5,
        isWearable: false,
        emoji: '🧄'
    },

    // --- WEAPONS ---
    {
        id: 'knife',
        baseName: 'Knife',
        keywords: ['knife', 'dagger', 'blade', 'shiv', 'steel'],
        tieredDescription: {
            Destitute: "A rusty iron shiv wrapped in rag.",
            Commoner: "A utility knife with a wooden handle.",
            Merchant: "A sharp steel dagger for self-defense.",
            Notable: "A curved dagger (Jambiya) with a silver sheath.",
            Elite: "A Damascus steel dagger with gold calligraphy on the blade."
        },
        baseValue: 5,
        weight: 1,
        isWearable: true,
        emoji: '🗡️'
    },
    {
        id: 'staff',
        baseName: 'Staff',
        keywords: ['staff', 'stick', 'pole', 'cane', 'wood'],
        tieredDescription: singleDesc("A sturdy length of wood. Good for walking and keeping the infected at bay."),
        baseValue: 0,
        weight: 2,
        isWearable: true,
        emoji: '🦯'
    },

    // --- CLOTHING ---
    {
        id: 'robes',
        baseName: 'Robes',
        keywords: ['robe', 'tunic', 'clothes', 'garb', 'vestment', 'caftan'],
        tieredDescription: {
            Destitute: "Tattered rough-spun wool, stained and patched.",
            Commoner: "Simple linen tunic, dyed indigo or brown.",
            Merchant: "A layered caftan of decent cotton with a sash.",
            Notable: "Fine wool robes with embroidered edging.",
            Elite: "Silk brocade robes imported from the East."
        },
        baseValue: 5,
        weight: 2,
        isWearable: true,
        emoji: '👘'
    },
    {
        id: 'cloak',
        baseName: 'Cloak',
        keywords: ['cloak', 'mantle', 'wrap', 'blanket'],
        tieredDescription: {
            Destitute: "A scratchy goat-hair blanket.",
            Commoner: "A heavy wool cloak for the desert night.",
            Merchant: "A fine wool mantle.",
            Notable: "A cloak lined with squirrel fur.",
            Elite: "A ceremonial mantle of velvet."
        },
        baseValue: 5,
        weight: 2,
        isWearable: true,
        emoji: '🧥'
    },
    
    // --- HOUSEHOLD ---
    {
        id: 'mirror',
        baseName: 'Mirror',
        keywords: ['mirror', 'reflection', 'glass', 'looking'],
        tieredDescription: {
            Destitute: "A shard of polished tin.",
            Commoner: "A small, scuffed copper disc.",
            Merchant: "A polished bronze hand mirror.",
            Notable: "A clear silver-backed mirror.",
            Elite: "A Venetian glass mirror with silver filigree."
        },
        baseValue: 10,
        weight: 1,
        isWearable: false,
        emoji: '🪞'
    },
    {
        id: 'rug',
        baseName: 'Prayer Rug',
        keywords: ['rug', 'carpet', 'mat', 'tapestry', 'prayer'],
        tieredDescription: {
            Destitute: "A scrap of woven reed.",
            Commoner: "A simple wool kilim.",
            Merchant: "A knotted wool rug with geometric patterns.",
            Notable: "A fine prayer rug from Anatolia.",
            Elite: "A silk Persian masterpiece."
        },
        baseValue: 15,
        weight: 3,
        isWearable: false,
        emoji: '🛐'
    },
    {
        id: 'pot',
        baseName: 'Clay Pot',
        keywords: ['pot', 'jug', 'jar', 'vessel', 'amphora', 'bowl', 'pitcher'],
        tieredDescription: {
            Destitute: "A chipped, unglazed clay bowl.",
            Commoner: "A sturdy fired clay water jug.",
            Merchant: "A glazed green pottery vessel.",
            Notable: "Blue and white fritware from the kilns.",
            Elite: "Translucent porcelain imported from China."
        },
        baseValue: 2,
        weight: 2,
        isWearable: false,
        emoji: '🏺'
    },
    
    // --- FOOD ---
    {
        id: 'bread',
        baseName: 'Flatbread (Khubz)',
        keywords: ['bread', 'loaf', 'food', 'khubz', 'crust'],
        tieredDescription: singleDesc("A round loaf of unleavened bread. The staff of life."),
        baseValue: 0.1,
        weight: 0.2,
        isWearable: false,
        emoji: '🍞'
    },
    {
        id: 'dates',
        baseName: 'Dried Dates',
        keywords: ['dates', 'fruit', 'snack', 'food'],
        tieredDescription: singleDesc("Sweet, sticky dried fruits. High energy and good for the constitution."),
        baseValue: 1,
        weight: 0.5,
        isWearable: false,
        emoji: '🥥'
    }
];
