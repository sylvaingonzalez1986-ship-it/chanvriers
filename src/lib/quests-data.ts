export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'harvest' | 'plant' | 'earn' | 'level' | 'unlock';
  target: number;
  reward: {
    coins?: number;
    xp?: number;
    unlock?: string; // ID d'item débloqué
  };
  emoji: string;
  prerequisite?: string; // ID quête prérequise
}

export const QUESTS: Quest[] = [
  {
    id: 'quest_1',
    title: 'Premier Semis',
    description: 'Plante ta première graine',
    type: 'plant',
    target: 1,
    reward: { coins: 50, xp: 100 },
    emoji: '🌱',
  },
  {
    id: 'quest_2',
    title: 'Jardinier Débutant',
    description: 'Plante 10 graines',
    type: 'plant',
    target: 10,
    reward: { coins: 200, xp: 300 },
    emoji: '👨‍🌾',
    prerequisite: 'quest_1',
  },
  {
    id: 'quest_3',
    title: 'Première Récolte',
    description: 'Récolte ta première plante mature',
    type: 'harvest',
    target: 1,
    reward: { coins: 100, xp: 200 },
    emoji: '✨',
  },
  {
    id: 'quest_4',
    title: 'Fermier Productif',
    description: 'Récolte 20 plantes',
    type: 'harvest',
    target: 20,
    reward: { coins: 500, xp: 800 },
    emoji: '🏆',
    prerequisite: 'quest_3',
  },
  {
    id: 'quest_5',
    title: 'Économe',
    description: 'Atteins 1000💰',
    type: 'earn',
    target: 1000,
    reward: { xp: 500 },
    emoji: '💰',
  },
  {
    id: 'quest_6',
    title: 'Riche Cultivateur',
    description: 'Atteins 5000💰',
    type: 'earn',
    target: 5000,
    reward: { coins: 1000, xp: 1000 },
    emoji: '💎',
    prerequisite: 'quest_5',
  },
  {
    id: 'quest_7',
    title: 'Expansion',
    description: 'Débloque 5 nouvelles parcelles',
    type: 'unlock',
    target: 5,
    reward: { coins: 300, xp: 400 },
    emoji: '📐',
  },
  {
    id: 'quest_8',
    title: 'Montée en Niveau',
    description: 'Atteins le niveau 5',
    type: 'level',
    target: 5,
    reward: { coins: 1000, xp: 2000 },
    emoji: '⭐',
  },
  {
    id: 'quest_9',
    title: 'Maître Chanvrier',
    description: 'Atteins le niveau 10',
    type: 'level',
    target: 10,
    reward: { coins: 2500, xp: 5000 },
    emoji: '👑',
    prerequisite: 'quest_8',
  },
  {
    id: 'quest_10',
    title: 'Grand Fermier',
    description: 'Récolte 100 plantes',
    type: 'harvest',
    target: 100,
    reward: { coins: 2000, xp: 3000 },
    emoji: '🌟',
    prerequisite: 'quest_4',
  },
];
