import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QUESTS, Quest } from './quests-data';

// ============================================
// MA VIE DE CHANVRIER - Game Store
// Simulation agricole pixel art 8-bit
// ============================================

// Types de terrain
export type TerrainType = 'grass' | 'soil' | 'water' | 'path' | 'field';

// Phases de croissance du chanvre
export type GrowthPhase =
  | 'empty'           // Parcelle vide
  | 'seeded'          // Graine plantée
  | 'germination'     // Germination (jour 1-7)
  | 'seedling'        // Jeune pousse (jour 8-21)
  | 'vegetative'      // Phase végétative (jour 22-60)
  | 'flowering'       // Floraison (jour 61-90)
  | 'mature'          // Mature - prêt à récolter
  | 'harvested';      // Récolté

// Variétés de chanvre
export type HempVariety = 'sativa' | 'indica' | 'hybrid' | 'cbd_rich';

export const HEMP_VARIETIES: Record<HempVariety, {
  name: string;
  icon: string;
  growthDays: number;
  baseYield: number;
  waterNeed: number;
  price: number;
  color: string;
}> = {
  sativa: {
    name: 'Sativa',
    icon: '🌿',
    growthDays: 120,
    baseYield: 150,
    waterNeed: 60,
    price: 10,
    color: '#4ADE80',
  },
  indica: {
    name: 'Indica',
    icon: '🍃',
    growthDays: 90,
    baseYield: 200,
    waterNeed: 70,
    price: 15,
    color: '#22C55E',
  },
  hybrid: {
    name: 'Hybride',
    icon: '🌱',
    growthDays: 100,
    baseYield: 175,
    waterNeed: 65,
    price: 12,
    color: '#10B981',
  },
  cbd_rich: {
    name: 'CBD Rich',
    icon: '💚',
    growthDays: 110,
    baseYield: 120,
    waterNeed: 55,
    price: 25,
    color: '#059669',
  },
};

// Météo
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy';

export const WEATHER_CONFIG: Record<WeatherType, {
  name: string;
  icon: string;
  growthModifier: number;
  waterModifier: number;
  probability: number;
}> = {
  sunny: { name: 'Ensoleillé', icon: '☀️', growthModifier: 1.2, waterModifier: -10, probability: 0.35 },
  cloudy: { name: 'Nuageux', icon: '☁️', growthModifier: 1.0, waterModifier: 0, probability: 0.25 },
  rainy: { name: 'Pluvieux', icon: '🌧️', growthModifier: 0.9, waterModifier: 30, probability: 0.25 },
  stormy: { name: 'Orageux', icon: '⛈️', growthModifier: 0.7, waterModifier: 50, probability: 0.10 },
  foggy: { name: 'Brumeux', icon: '🌫️', growthModifier: 0.8, waterModifier: 10, probability: 0.05 },
};

// Saisons
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASON_CONFIG: Record<Season, {
  name: string;
  icon: string;
  canPlant: boolean;
  growthModifier: number;
  colors: string[];
}> = {
  spring: { name: 'Printemps', icon: '🌸', canPlant: true, growthModifier: 1.1, colors: ['#86EFAC', '#4ADE80'] },
  summer: { name: 'Été', icon: '☀️', canPlant: true, growthModifier: 1.3, colors: ['#FDE047', '#FACC15'] },
  autumn: { name: 'Automne', icon: '🍂', canPlant: true, growthModifier: 0.9, colors: ['#FB923C', '#F97316'] },
  winter: { name: 'Hiver', icon: '❄️', canPlant: false, growthModifier: 0.3, colors: ['#E0F2FE', '#BAE6FD'] },
};

// Parcelle de culture
export interface FarmPlot {
  id: string;
  x: number;
  y: number;
  variety: HempVariety | null;
  phase: GrowthPhase;
  plantedAt: number | null;      // Timestamp
  waterLevel: number;            // 0-100
  health: number;                // 0-100
  daysSincePlanting: number;
  lastWatered: number | null;
  fertilized: boolean;
  quality: number;               // 1-5 étoiles
}

// Outils disponibles
export type ToolType = 'hand' | 'hoe' | 'watering_can' | 'seeds' | 'sickle' | 'fertilizer';

export const TOOLS: Record<ToolType, {
  name: string;
  icon: string;
  description: string;
}> = {
  hand: { name: 'Main', icon: '✋', description: 'Interagir avec le monde' },
  hoe: { name: 'Houe', icon: '⛏️', description: 'Préparer le sol' },
  watering_can: { name: 'Arrosoir', icon: '🚿', description: 'Arroser les plantes' },
  seeds: { name: 'Graines', icon: '🌰', description: 'Planter des graines' },
  sickle: { name: 'Faucille', icon: '🔪', description: 'Récolter les plantes' },
  fertilizer: { name: 'Engrais', icon: '💩', description: 'Fertiliser le sol' },
};

// État du joueur
export interface PlayerState {
  name: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  coins: number;
  energy: number;
  maxEnergy: number;
  inventory: Record<string, number>;
  selectedTool: ToolType;
  selectedVariety: HempVariety;
  tutorialCompleted: boolean;
}

// État du temps
export interface TimeState {
  day: number;
  hour: number;          // 0-23
  minute: number;        // 0-59
  season: Season;
  year: number;
  weather: WeatherType;
  isNight: boolean;
  lastUpdate: number;    // Timestamp pour calculer le temps écoulé
}

// État de la ferme
export interface FarmState {
  plots: FarmPlot[];
  unlockedPlots: number;
  totalHarvests: number;
  totalPlanted: number;
  totalEarnings: number;
  reputation: number;    // 0-100
}

// État des quêtes
export interface QuestProgressItem {
  questId: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}

export interface QuestState {
  progress: QuestProgressItem[];
  availableQuests: string[];
}

// Configuration du temps de jeu
// 1 minute réelle = 1 heure de jeu (mode accéléré pour le test)
// 1 jour de jeu = 24 minutes réelles
const GAME_SPEED = {
  normal: 60 * 1000,     // 1 min réelle = 1h jeu
  fast: 10 * 1000,       // 10 sec réelle = 1h jeu (pour les tests)
};

// Grille de la ferme (8x6 parcelles)
const FARM_WIDTH = 8;
const FARM_HEIGHT = 6;

const createInitialPlots = (): FarmPlot[] => {
  const plots: FarmPlot[] = [];
  for (let y = 0; y < FARM_HEIGHT; y++) {
    for (let x = 0; x < FARM_WIDTH; x++) {
      const index = y * FARM_WIDTH + x;
      plots.push({
        id: `plot-${x}-${y}`,
        x,
        y,
        variety: null,
        phase: 'empty',
        plantedAt: null,
        waterLevel: 50,
        health: 100,
        daysSincePlanting: 0,
        lastWatered: null,
        fertilized: false,
        quality: 1,
      });
    }
  }
  return plots;
};

const getRandomWeather = (currentSeason: Season): WeatherType => {
  const rand = Math.random();
  let cumulative = 0;

  // Modifier les probabilités selon la saison
  const weatherTypes = Object.entries(WEATHER_CONFIG) as [WeatherType, typeof WEATHER_CONFIG[WeatherType]][];

  for (const [type, config] of weatherTypes) {
    let prob = config.probability;

    // Ajustements saisonniers
    if (currentSeason === 'winter') {
      if (type === 'sunny') prob *= 0.5;
      if (type === 'foggy') prob *= 2;
    } else if (currentSeason === 'summer') {
      if (type === 'sunny') prob *= 1.5;
      if (type === 'rainy') prob *= 0.7;
    } else if (currentSeason === 'autumn') {
      if (type === 'foggy') prob *= 1.5;
      if (type === 'rainy') prob *= 1.2;
    }

    cumulative += prob;
    if (rand < cumulative) return type;
  }

  return 'cloudy';
};

interface ChanvrierStore {
  // États
  player: PlayerState;
  time: TimeState;
  farm: FarmState;
  quests: QuestState;
  isGamePaused: boolean;
  gameSpeed: 'normal' | 'fast';
  isMuted: boolean;

  // Actions joueur
  setPlayerName: (name: string) => void;
  selectTool: (tool: ToolType) => void;
  selectVariety: (variety: HempVariety) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addExperience: (amount: number) => void;
  useEnergy: (amount: number) => boolean;
  restoreEnergy: () => void;
  addToInventory: (item: string, quantity: number) => void;
  removeFromInventory: (item: string, quantity: number) => boolean;
  setTutorialCompleted: (completed: boolean) => void;

  // Actions ferme
  preparePlot: (plotId: string) => boolean;
  plantSeed: (plotId: string) => boolean;
  waterPlot: (plotId: string) => boolean;
  fertilizePlot: (plotId: string) => boolean;
  harvestPlot: (plotId: string) => { success: boolean; yield: number; quality: number } | null;
  unlockPlot: (plotId: string) => boolean;

  // Temps et mise à jour
  updateGameTime: () => void;
  advanceDay: () => void;
  updatePlotGrowth: () => void;
  setGameSpeed: (speed: 'normal' | 'fast') => void;
  pauseGame: () => void;
  resumeGame: () => void;

  // Quêtes
  updateQuestProgress: (type: Quest['type'], value: number) => void;
  claimQuestReward: (questId: string) => boolean;

  // Audio
  toggleMute: () => void;

  // Sauvegarde
  resetGame: () => void;
}

const createInitialPlayer = (): PlayerState => ({
  name: 'Chanvrier',
  level: 1,
  experience: 0,
  experienceToNextLevel: 100,
  coins: 500,
  energy: 100,
  maxEnergy: 100,
  inventory: {
    sativa_seeds: 10,
    indica_seeds: 5,
    hybrid_seeds: 5,
    cbd_rich_seeds: 3,
    fertilizer: 5,
  },
  selectedTool: 'hand',
  selectedVariety: 'sativa',
  tutorialCompleted: false,
});

const createInitialTime = (): TimeState => ({
  day: 1,
  hour: 6,
  minute: 0,
  season: 'spring',
  year: 1,
  weather: 'sunny',
  isNight: false,
  lastUpdate: Date.now(),
});

const createInitialFarm = (): FarmState => ({
  plots: createInitialPlots(),
  unlockedPlots: 12, // 12 premières parcelles débloquées
  totalHarvests: 0,
  totalPlanted: 0,
  totalEarnings: 0,
  reputation: 0,
});

const createInitialQuests = (): QuestState => ({
  progress: QUESTS.map((q) => ({
    questId: q.id,
    current: 0,
    completed: false,
    claimed: false,
  })),
  availableQuests: QUESTS.filter((q) => !q.prerequisite).map((q) => q.id),
});

export const useChanvrierStore = create<ChanvrierStore>()(
  persist(
    (set, get) => ({
      player: createInitialPlayer(),
      time: createInitialTime(),
      farm: createInitialFarm(),
      quests: createInitialQuests(),
      isGamePaused: false,
      gameSpeed: 'fast', // Mode rapide par défaut pour les tests
      isMuted: false,

      // Actions joueur
      setPlayerName: (name) => set((state) => ({
        player: { ...state.player, name },
      })),

      selectTool: (tool) => set((state) => ({
        player: { ...state.player, selectedTool: tool },
      })),

      selectVariety: (variety) => set((state) => ({
        player: { ...state.player, selectedVariety: variety },
      })),

      addCoins: (amount) => {
        set((state) => ({
          player: { ...state.player, coins: state.player.coins + amount },
          farm: { ...state.farm, totalEarnings: state.farm.totalEarnings + amount },
        }));

        // Mettre à jour la progression des quêtes de gains
        const newState = get();
        newState.updateQuestProgress('earn', newState.farm.totalEarnings);
      },

      spendCoins: (amount) => {
        const state = get();
        if (state.player.coins < amount) return false;
        set((s) => ({
          player: { ...s.player, coins: s.player.coins - amount },
        }));
        return true;
      },

      addExperience: (amount) => {
        const state = get();
        let newExp = state.player.experience + amount;
        let newLevel = state.player.level;
        let expToNext = state.player.experienceToNextLevel;
        const previousLevel = state.player.level;

        while (newExp >= expToNext) {
          newExp -= expToNext;
          newLevel++;
          expToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1));
        }

        set({
          player: {
            ...state.player,
            experience: newExp,
            level: newLevel,
            experienceToNextLevel: expToNext,
            maxEnergy: 100 + (newLevel - 1) * 10,
          },
        });

        // Mettre à jour la progression des quêtes de niveau si level up
        if (newLevel > previousLevel) {
          get().updateQuestProgress('level', newLevel);
        }
      },

      useEnergy: (amount) => {
        const state = get();
        if (state.player.energy < amount) return false;
        set((s) => ({
          player: { ...s.player, energy: s.player.energy - amount },
        }));
        return true;
      },

      restoreEnergy: () => set((state) => ({
        player: { ...state.player, energy: state.player.maxEnergy },
      })),

      addToInventory: (item, quantity) => set((state) => ({
        player: {
          ...state.player,
          inventory: {
            ...state.player.inventory,
            [item]: (state.player.inventory[item] || 0) + quantity,
          },
        },
      })),

      removeFromInventory: (item, quantity) => {
        const state = get();
        const current = state.player.inventory[item] || 0;
        if (current < quantity) return false;
        set((s) => ({
          player: {
            ...s.player,
            inventory: {
              ...s.player.inventory,
              [item]: current - quantity,
            },
          },
        }));
        return true;
      },

      setTutorialCompleted: (completed) => set((state) => ({
        player: { ...state.player, tutorialCompleted: completed },
      })),

      // Actions ferme
      preparePlot: (plotId) => {
        const state = get();
        if (!state.farm?.plots) return false;

        const plotIndex = state.farm.plots.findIndex((p) => p.id === plotId);
        if (plotIndex === -1) return false;

        const plot = state.farm.plots[plotIndex];
        if (plot.phase !== 'empty') return false;
        if (!state.useEnergy(5)) return false;

        set((s) => ({
          farm: {
            ...s.farm,
            plots: (s.farm?.plots ?? []).map((p) =>
              p.id === plotId ? { ...p, phase: 'empty', waterLevel: 60 } : p
            ),
          },
        }));
        return true;
      },

      plantSeed: (plotId) => {
        const state = get();
        if (!state.farm?.plots) return false;

        const plotIndex = state.farm.plots.findIndex((p) => p.id === plotId);
        if (plotIndex === -1) return false;

        const plot = state.farm.plots[plotIndex];
        if (plot.phase !== 'empty') return false;

        // Vérifier la saison
        if (!SEASON_CONFIG[state.time.season].canPlant) return false;

        // Vérifier l'inventaire
        const seedKey = `${state.player.selectedVariety}_seeds`;
        if (!state.removeFromInventory(seedKey, 1)) return false;
        if (!state.useEnergy(3)) return false;

        set((s) => ({
          farm: {
            ...s.farm,
            totalPlanted: (s.farm?.totalPlanted ?? 0) + 1,
            plots: (s.farm?.plots ?? []).map((p) =>
              p.id === plotId
                ? {
                    ...p,
                    variety: s.player.selectedVariety,
                    phase: 'seeded',
                    plantedAt: Date.now(),
                    daysSincePlanting: 0,
                    health: 100,
                    quality: 1,
                  }
                : p
            ),
          },
        }));

        // Mettre à jour la progression des quêtes
        const newState = get();
        newState.updateQuestProgress('plant', newState.farm.totalPlanted);

        state.addExperience(5);
        return true;
      },

      waterPlot: (plotId) => {
        const state = get();
        if (!state.farm?.plots) return false;

        const plotIndex = state.farm.plots.findIndex((p) => p.id === plotId);
        if (plotIndex === -1) return false;

        const plot = state.farm.plots[plotIndex];
        if (plot.phase === 'empty' || plot.phase === 'harvested') return false;
        if (plot.waterLevel >= 100) return false;
        if (!state.useEnergy(2)) return false;

        set((s) => ({
          farm: {
            ...s.farm,
            plots: (s.farm?.plots ?? []).map((p) =>
              p.id === plotId
                ? {
                    ...p,
                    waterLevel: Math.min(100, p.waterLevel + 30),
                    lastWatered: Date.now(),
                  }
                : p
            ),
          },
        }));
        return true;
      },

      fertilizePlot: (plotId) => {
        const state = get();
        if (!state.farm?.plots) return false;

        const plotIndex = state.farm.plots.findIndex((p) => p.id === plotId);
        if (plotIndex === -1) return false;

        const plot = state.farm.plots[plotIndex];
        if (plot.phase === 'empty' || plot.phase === 'harvested') return false;
        if (plot.fertilized) return false;
        if (!state.removeFromInventory('fertilizer', 1)) return false;
        if (!state.useEnergy(3)) return false;

        set((s) => ({
          farm: {
            ...s.farm,
            plots: (s.farm?.plots ?? []).map((p) =>
              p.id === plotId
                ? { ...p, fertilized: true, quality: Math.min(5, p.quality + 1) }
                : p
            ),
          },
        }));

        state.addExperience(10);
        return true;
      },

      harvestPlot: (plotId) => {
        const state = get();
        // Fallback si farm ou plots n'existe pas (migration)
        if (!state.farm?.plots) return null;

        const plotIndex = state.farm.plots.findIndex((p) => p.id === plotId);
        if (plotIndex === -1) return null;

        const plot = state.farm.plots[plotIndex];
        if (plot.phase !== 'mature' || !plot.variety) return null;
        if (!state.useEnergy(5)) return null;

        const variety = HEMP_VARIETIES[plot.variety];

        // Calculer le rendement
        let yieldAmount = variety.baseYield;

        // Bonus qualité
        yieldAmount *= (1 + (plot.quality - 1) * 0.2);

        // Bonus santé
        yieldAmount *= (plot.health / 100);

        // Bonus fertilisé
        if (plot.fertilized) yieldAmount *= 1.3;

        // Bonus saison
        yieldAmount *= SEASON_CONFIG[state.time.season].growthModifier;

        yieldAmount = Math.floor(yieldAmount);

        // Calculer les gains
        const earnings = yieldAmount * variety.price * 0.1;

        set((s) => ({
          farm: {
            ...s.farm,
            plots: (s.farm?.plots ?? []).map((p) =>
              p.id === plotId
                ? {
                    ...p,
                    phase: 'empty' as GrowthPhase,
                    variety: null,
                    plantedAt: null,
                    daysSincePlanting: 0,
                    fertilized: false,
                    quality: 1,
                    waterLevel: 50,
                  }
                : p
            ),
            totalHarvests: s.farm.totalHarvests + 1,
          },
        }));

        state.addCoins(Math.floor(earnings));
        state.addExperience(25 + plot.quality * 5);
        state.addToInventory(`${plot.variety}_harvest`, yieldAmount);

        // Mettre à jour la progression des quêtes de récolte
        const newState = get();
        newState.updateQuestProgress('harvest', newState.farm.totalHarvests);

        return { success: true, yield: yieldAmount, quality: plot.quality };
      },

      unlockPlot: (plotId) => {
        const state = get();
        const cost = 100 + state.farm.unlockedPlots * 50;
        if (!state.spendCoins(cost)) return false;

        set((s) => ({
          farm: { ...s.farm, unlockedPlots: s.farm.unlockedPlots + 1 },
        }));

        // Mettre à jour la progression des quêtes
        const newState = get();
        newState.updateQuestProgress('unlock', newState.farm.unlockedPlots - 12);

        return true;
      },

      // Temps et mise à jour
      updateGameTime: () => {
        const state = get();
        if (state.isGamePaused) return;

        const now = Date.now();
        const elapsed = now - state.time.lastUpdate;
        const speed = state.gameSpeed === 'fast' ? GAME_SPEED.fast : GAME_SPEED.normal;

        // Calculer les heures passées
        const hoursElapsed = Math.floor(elapsed / speed);
        if (hoursElapsed === 0) return;

        let newHour = state.time.hour + hoursElapsed;
        let newDay = state.time.day;
        let newSeason = state.time.season;
        let newYear = state.time.year;
        let newWeather = state.time.weather;

        // Avancer les jours si nécessaire
        while (newHour >= 24) {
          newHour -= 24;
          newDay++;
          newWeather = getRandomWeather(newSeason);

          // Restaurer l'énergie au début de chaque jour
          get().restoreEnergy();
        }

        // Avancer les saisons (28 jours par saison)
        const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
        while (newDay > 28) {
          newDay -= 28;
          const currentSeasonIndex = seasons.indexOf(newSeason);
          const nextSeasonIndex = (currentSeasonIndex + 1) % 4;
          newSeason = seasons[nextSeasonIndex];

          if (nextSeasonIndex === 0) {
            newYear++;
          }
        }

        const isNight = newHour >= 20 || newHour < 6;

        set((s) => ({
          time: {
            ...s.time,
            hour: newHour,
            day: newDay,
            season: newSeason,
            year: newYear,
            weather: newWeather,
            isNight,
            lastUpdate: now,
          },
        }));

        // Mettre à jour la croissance des plantes
        if (hoursElapsed > 0) {
          get().updatePlotGrowth();
        }
      },

      advanceDay: () => {
        const state = get();
        let newDay = state.time.day + 1;
        let newSeason = state.time.season;
        let newYear = state.time.year;

        const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

        if (newDay > 28) {
          newDay = 1;
          const currentSeasonIndex = seasons.indexOf(newSeason);
          const nextSeasonIndex = (currentSeasonIndex + 1) % 4;
          newSeason = seasons[nextSeasonIndex];

          if (nextSeasonIndex === 0) {
            newYear++;
          }
        }

        const newWeather = getRandomWeather(newSeason);

        set((s) => ({
          time: {
            ...s.time,
            day: newDay,
            hour: 6,
            minute: 0,
            season: newSeason,
            year: newYear,
            weather: newWeather,
            isNight: false,
            lastUpdate: Date.now(),
          },
          player: {
            ...s.player,
            energy: s.player.maxEnergy,
          },
        }));

        get().updatePlotGrowth();
      },

      updatePlotGrowth: () => {
        const state = get();
        // Fallback si farm ou plots n'existe pas (migration)
        if (!state.farm?.plots) return;

        const weatherConfig = WEATHER_CONFIG[state.time.weather];
        const seasonConfig = SEASON_CONFIG[state.time.season];

        set((s) => ({
          farm: {
            ...s.farm,
            plots: (s.farm?.plots ?? []).map((plot) => {
              if (!plot.variety || plot.phase === 'empty' || plot.phase === 'harvested' || plot.phase === 'mature') {
                return plot;
              }

              const varietyConfig = HEMP_VARIETIES[plot.variety];
              let newDays = plot.daysSincePlanting + 1;

              // Calculer la progression avec les modificateurs
              const growthRate = seasonConfig.growthModifier * weatherConfig.growthModifier;
              newDays = Math.floor(newDays * growthRate);

              // Déterminer la phase
              let newPhase: GrowthPhase = plot.phase;
              const progress = newDays / varietyConfig.growthDays;

              if (progress < 0.1) newPhase = 'germination';
              else if (progress < 0.25) newPhase = 'seedling';
              else if (progress < 0.6) newPhase = 'vegetative';
              else if (progress < 0.9) newPhase = 'flowering';
              else newPhase = 'mature';

              // Eau: diminue chaque jour, modifiée par météo
              let newWater = plot.waterLevel - 15 + weatherConfig.waterModifier;
              newWater = Math.max(0, Math.min(100, newWater));

              // Santé: affectée par l'eau
              let newHealth = plot.health;
              if (newWater < 20) newHealth = Math.max(0, newHealth - 10);
              else if (newWater < 40) newHealth = Math.max(0, newHealth - 3);
              else if (newWater > 50) newHealth = Math.min(100, newHealth + 2);

              // Qualité augmente si bien entretenu
              let newQuality = plot.quality;
              if (newHealth > 80 && newWater > 60) {
                newQuality = Math.min(5, newQuality + 0.1);
              }

              return {
                ...plot,
                daysSincePlanting: newDays,
                phase: newPhase,
                waterLevel: newWater,
                health: newHealth,
                quality: Math.floor(newQuality),
              };
            }),
          },
        }));
      },

      setGameSpeed: (speed) => set({ gameSpeed: speed }),

      pauseGame: () => set({ isGamePaused: true }),

      resumeGame: () => set((s) => ({
        isGamePaused: false,
        time: { ...s.time, lastUpdate: Date.now() },
      })),

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      // Quêtes
      updateQuestProgress: (type, value) => {
        set((state) => {
          // Fallback si quests n'existe pas encore (migration)
          const currentProgress = state.quests?.progress ?? [];
          const currentAvailable = state.quests?.availableQuests ?? [];

          if (currentProgress.length === 0) {
            // Initialiser les quêtes si elles n'existent pas
            return {
              quests: createInitialQuests(),
            };
          }

          const updatedProgress = currentProgress.map((progress) => {
            if (progress.completed) return progress;

            const quest = QUESTS.find((q) => q.id === progress.questId);
            if (!quest || quest.type !== type) return progress;

            // Mise à jour progression
            const newCurrent = value;
            const isCompleted = newCurrent >= quest.target;

            return {
              ...progress,
              current: newCurrent,
              completed: isCompleted,
            };
          });

          // Débloquer nouvelles quêtes
          const newlyCompleted = updatedProgress
            .filter((p, idx) => p.completed && !currentProgress[idx]?.completed)
            .map((p) => p.questId);

          const newAvailable = [...currentAvailable];
          newlyCompleted.forEach((completedId) => {
            QUESTS.forEach((quest) => {
              if (quest.prerequisite === completedId && !newAvailable.includes(quest.id)) {
                newAvailable.push(quest.id);
              }
            });
          });

          return {
            quests: {
              progress: updatedProgress,
              availableQuests: newAvailable,
            },
          };
        });
      },

      claimQuestReward: (questId: string) => {
        const state = get();
        const progress = state.quests.progress.find((p) => p.questId === questId);
        if (!progress || !progress.completed || progress.claimed) return false;

        const quest = QUESTS.find((q) => q.id === questId);
        if (!quest) return false;

        // Appliquer récompenses
        if (quest.reward.coins) {
          state.addCoins(quest.reward.coins);
        }
        if (quest.reward.xp) {
          state.addExperience(quest.reward.xp);
        }

        set((s) => ({
          quests: {
            ...s.quests,
            progress: s.quests.progress.map((p) =>
              p.questId === questId ? { ...p, claimed: true } : p
            ),
          },
        }));
        return true;
      },

      resetGame: () => set({
        player: createInitialPlayer(),
        time: createInitialTime(),
        farm: createInitialFarm(),
        quests: createInitialQuests(),
        isGamePaused: false,
        gameSpeed: 'fast',
        isMuted: false,
      }),
    }),
    {
      name: 'chanvrier-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
