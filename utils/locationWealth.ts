import { SocialClass, WealthTier } from '../types';

const WEALTH_VALUES = new Set<WealthTier>(['poor', 'modest', 'merchant', 'elite']);

export const normalizeWealthTier = (value?: string | null): WealthTier | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (WEALTH_VALUES.has(normalized as WealthTier)) {
    return normalized as WealthTier;
  }
  return null;
};

export const resolveWealthTier = (
  locationWealth?: string | null,
  houseType?: string,
  socialClass?: SocialClass,
  location?: string
): WealthTier => {
  const direct = normalizeWealthTier(locationWealth);
  if (direct) return direct;

  const house = (houseType || '').toLowerCase();
  if (house.includes('merchant')) return 'merchant';
  if (house.includes('garden villa')) return 'elite';
  if (house.includes('cramped') || house.includes('room in a khan')) return 'poor';
  if (house.includes('small courtyard')) return 'modest';

  const loc = (location || '').toLowerCase();
  if (loc.includes('souk') || loc.includes('market') || loc.includes('khan')) return 'merchant';
  if (loc.includes('mosque') || loc.includes('quarter')) return 'modest';
  if (loc.includes('gate') || loc.includes('alley')) return 'poor';

  switch (socialClass) {
    case 'Elite':
      return 'elite';
    case 'Notable':
      return 'merchant';
    case 'Merchant':
      return 'merchant';
    case 'Commoner':
      return 'modest';
    case 'Destitute':
      return 'poor';
    default:
      return 'modest';
  }
};

export const isOutdoorLocation = (location?: string): boolean => {
  const outdoorKeywords = ['street', 'alley', 'market', 'courtyard', 'square', 'gate', 'road', 'path', 'garden', 'souk'];
  return outdoorKeywords.some(keyword => (location || '').toLowerCase().includes(keyword));
};
