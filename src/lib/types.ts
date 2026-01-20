// Product types and data for Les Chanvriers Unis

export type Rarity = 'common' | 'rare' | 'epic' | 'platinum' | 'legendary';

export interface CBDProduct {
  id: string;
  name: string;
  description: string;
  producer: string;
  region: string;
  rarity: Rarity;
  thcPercent: number;
  cbdPercent: number;
  image: string;
  value: number; // Value in euros
}

export interface CollectionItem {
  product: CBDProduct;
  obtainedAt: Date;
  id: string;
  // For using items in orders
  used?: boolean;
  usedAt?: Date;
  // Original lot info if from a lot
  lotId?: string;
  lotType?: 'product' | 'discount';
  discountPercent?: number;
  discountAmount?: number;
  minOrderAmount?: number;
}

export const RARITY_CONFIG: Record<Rarity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  probability: number;
  odds: string;
}> = {
  common: {
    label: 'Commun',
    color: '#9CA3AF',
    bgColor: 'rgba(156, 163, 175, 0.15)',
    borderColor: 'rgba(156, 163, 175, 0.4)',
    glowColor: 'rgba(156, 163, 175, 0.3)',
    probability: 0.8957, // ~89.57% (reste après les autres)
    odds: '~1/1',
  },
  rare: {
    label: 'Rare',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    probability: 0.0133, // 1/75 = ~1.33%
    odds: '1/75',
  },
  epic: {
    label: 'Épique',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    glowColor: 'rgba(139, 92, 246, 0.5)',
    probability: 0.005, // 1/200 = 0.5%
    odds: '1/200',
  },
  platinum: {
    label: 'Platinum',
    color: '#E5E4E2',
    bgColor: 'rgba(229, 228, 226, 0.15)',
    borderColor: 'rgba(229, 228, 226, 0.5)',
    glowColor: 'rgba(229, 228, 226, 0.6)',
    probability: 0.002, // 1/500 = 0.2%
    odds: '1/500',
  },
  legendary: {
    label: 'Légendaire',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    probability: 0.001, // 1/1000 = 0.1%
    odds: '1/1000',
  },
};
