import { Audio } from 'expo-av';
import { useSoundStore } from '@/lib/store';

// ============================================
// MA VIE DE CHANVRIER - Sound System
// Sons du jeu avec expo-av
// ============================================

// Types de sons
export type GameSoundType =
  | 'plant'        // Planter une graine
  | 'water'        // Arroser
  | 'harvest'      // Récolter
  | 'fertilize'    // Fertiliser
  | 'coins'        // Gagner des pièces
  | 'levelUp'      // Monter de niveau
  | 'toolSelect'   // Sélectionner un outil
  | 'error'        // Action impossible
  | 'success'      // Action réussie
  | 'rain'         // Pluie
  | 'thunder'      // Tonnerre
  | 'morning'      // Matin (coq/oiseaux)
  | 'night'        // Nuit (grillons)
  | 'purchase';    // Achat en boutique

// URLs des sons (utilisant des sons libres de droits)
// Note: Dans un vrai projet, ces sons seraient dans /assets/sounds/
const SOUND_URLS: Record<GameSoundType, string> = {
  plant: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  water: 'https://assets.mixkit.co/active_storage/sfx/2526/2526-preview.mp3',
  harvest: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  fertilize: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  coins: 'https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3',
  levelUp: 'https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3',
  toolSelect: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  rain: 'https://assets.mixkit.co/active_storage/sfx/1256/1256-preview.mp3',
  thunder: 'https://assets.mixkit.co/active_storage/sfx/1282/1282-preview.mp3',
  morning: 'https://assets.mixkit.co/active_storage/sfx/2462/2462-preview.mp3',
  night: 'https://assets.mixkit.co/active_storage/sfx/2437/2437-preview.mp3',
  purchase: 'https://assets.mixkit.co/active_storage/sfx/2058/2058-preview.mp3',
};

// Cache des sons chargés avec limite LRU
const MAX_CACHE_SIZE = 10; // Limite maximale de sons en cache
const soundCache: Map<GameSoundType, Audio.Sound> = new Map();
const cacheAccessOrder: GameSoundType[] = []; // Pour suivre l'ordre d'accès LRU

// Fonction pour mettre à jour l'ordre LRU
function updateLRUOrder(type: GameSoundType): void {
  const index = cacheAccessOrder.indexOf(type);
  if (index > -1) {
    cacheAccessOrder.splice(index, 1);
  }
  cacheAccessOrder.push(type);
}

// Fonction pour évacuer le son le moins récemment utilisé
async function evictLRU(): Promise<void> {
  if (soundCache.size >= MAX_CACHE_SIZE && cacheAccessOrder.length > 0) {
    const oldest = cacheAccessOrder.shift();
    if (oldest && soundCache.has(oldest)) {
      try {
        const sound = soundCache.get(oldest);
        await sound?.unloadAsync();
        soundCache.delete(oldest);
        console.log(`[GameSounds] Evicted LRU sound: ${oldest}`);
      } catch (error) {
        console.log(`[GameSounds] Error evicting ${oldest}:`, error);
      }
    }
  }
}

// Configuration audio
let audioConfigured = false;

async function configureAudio() {
  if (audioConfigured) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioConfigured = true;
  } catch (error) {
    console.log('[GameSounds] Audio config error:', error);
  }
}

// Charger un son
async function loadSound(type: GameSoundType): Promise<Audio.Sound | null> {
  // Vérifier le cache et mettre à jour l'ordre LRU
  if (soundCache.has(type)) {
    updateLRUOrder(type);
    return soundCache.get(type)!;
  }

  try {
    await configureAudio();

    // Évacuer le son LRU si le cache est plein
    await evictLRU();

    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUND_URLS[type] },
      { shouldPlay: false, volume: 0.5 }
    );

    soundCache.set(type, sound);
    updateLRUOrder(type);
    return sound;
  } catch (error) {
    console.log(`[GameSounds] Error loading ${type}:`, error);
    return null;
  }
}

// Jouer un son
export async function playGameSound(type: GameSoundType, volume: number = 0.5): Promise<void> {
  // Vérifier si le son est muté
  const isMuted = useSoundStore.getState().isMuted;
  if (isMuted) return;

  try {
    const sound = await loadSound(type);
    if (!sound) return;

    // Remettre au début si déjà joué
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(volume);
    await sound.playAsync();
  } catch (error) {
    console.log(`[GameSounds] Error playing ${type}:`, error);
  }
}

// Jouer un son en boucle (pour ambiance)
export async function playLoopingSound(
  type: GameSoundType,
  volume: number = 0.3
): Promise<Audio.Sound | null> {
  const isMuted = useSoundStore.getState().isMuted;
  if (isMuted) return null;

  try {
    await configureAudio();

    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUND_URLS[type] },
      {
        shouldPlay: true,
        volume,
        isLooping: true,
      }
    );

    return sound;
  } catch (error) {
    console.log(`[GameSounds] Error playing looping ${type}:`, error);
    return null;
  }
}

// Arrêter un son en boucle
export async function stopLoopingSound(sound: Audio.Sound | null): Promise<void> {
  if (!sound) return;

  try {
    await sound.stopAsync();
    await sound.unloadAsync();
  } catch (error) {
    console.log('[GameSounds] Error stopping looping sound:', error);
  }
}

// Précharger les sons fréquemment utilisés
export async function preloadGameSounds(): Promise<void> {
  const frequentSounds: GameSoundType[] = [
    'plant',
    'water',
    'harvest',
    'coins',
    'toolSelect',
    'error',
    'success',
  ];

  console.log('[GameSounds] Preloading sounds...');

  await Promise.all(frequentSounds.map(loadSound));

  console.log('[GameSounds] Sounds preloaded');
}

// Nettoyer tous les sons (à appeler quand on quitte le jeu)
export async function unloadAllSounds(): Promise<void> {
  for (const [type, sound] of soundCache) {
    try {
      await sound.unloadAsync();
    } catch (error) {
      console.log(`[GameSounds] Error unloading ${type}:`, error);
    }
  }
  soundCache.clear();
  cacheAccessOrder.length = 0; // Vider l'ordre LRU
}

// Hook personnalisé pour les sons du jeu
import { useCallback, useEffect, useRef } from 'react';

export function useGameSounds() {
  const ambientSoundRef = useRef<Audio.Sound | null>(null);

  // Précharger les sons au montage
  useEffect(() => {
    preloadGameSounds();

    return () => {
      // Nettoyer le son ambiant
      if (ambientSoundRef.current) {
        stopLoopingSound(ambientSoundRef.current);
      }
    };
  }, []);

  // Sons d'actions
  const playPlant = useCallback(() => playGameSound('plant', 0.6), []);
  const playWater = useCallback(() => playGameSound('water', 0.5), []);
  const playHarvest = useCallback(() => playGameSound('harvest', 0.7), []);
  const playFertilize = useCallback(() => playGameSound('fertilize', 0.5), []);
  const playCoins = useCallback(() => playGameSound('coins', 0.6), []);
  const playLevelUp = useCallback(() => playGameSound('levelUp', 0.8), []);
  const playToolSelect = useCallback(() => playGameSound('toolSelect', 0.3), []);
  const playError = useCallback(() => playGameSound('error', 0.4), []);
  const playSuccess = useCallback(() => playGameSound('success', 0.5), []);
  const playPurchase = useCallback(() => playGameSound('purchase', 0.6), []);

  // Sons météo
  const startRain = useCallback(async () => {
    if (ambientSoundRef.current) {
      await stopLoopingSound(ambientSoundRef.current);
    }
    ambientSoundRef.current = await playLoopingSound('rain', 0.2);
  }, []);

  const stopAmbient = useCallback(async () => {
    if (ambientSoundRef.current) {
      await stopLoopingSound(ambientSoundRef.current);
      ambientSoundRef.current = null;
    }
  }, []);

  const playThunder = useCallback(() => playGameSound('thunder', 0.7), []);

  return {
    // Actions
    playPlant,
    playWater,
    playHarvest,
    playFertilize,
    playCoins,
    playLevelUp,
    playToolSelect,
    playError,
    playSuccess,
    playPurchase,
    // Météo
    startRain,
    stopAmbient,
    playThunder,
  };
}
