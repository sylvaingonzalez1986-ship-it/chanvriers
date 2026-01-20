import { useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { useChanvrierStore } from '@/lib/chanvrier-store';

// Types de sons disponibles
export type SoundType =
  | 'plant'      // Planter une graine
  | 'water'      // Arroser
  | 'harvest'    // Récolter
  | 'coins'      // Gagner des pièces
  | 'levelUp'    // Monter de niveau
  | 'error'      // Erreur/action impossible
  | 'click'      // Clic UI
  | 'success'    // Action réussie
  | 'rain'       // Pluie (ambiance)
  | 'birds'      // Oiseaux (ambiance jour)
  | 'night';     // Nuit (ambiance)

// URLs des sons (sons gratuits de freesound.org convertis en base64 ou URLs)
// Note: Dans un vrai projet, ces sons seraient dans le dossier assets
// Pour l'instant, on utilise des sons générés programmatiquement

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

// Configuration des sons synthétiques
const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  plant: { frequency: 440, duration: 150, type: 'sine', volume: 0.3 },
  water: { frequency: 600, duration: 200, type: 'sine', volume: 0.2 },
  harvest: { frequency: 880, duration: 300, type: 'triangle', volume: 0.4 },
  coins: { frequency: 1200, duration: 100, type: 'square', volume: 0.2 },
  levelUp: { frequency: 660, duration: 500, type: 'sine', volume: 0.4 },
  error: { frequency: 200, duration: 200, type: 'sawtooth', volume: 0.3 },
  click: { frequency: 800, duration: 50, type: 'sine', volume: 0.1 },
  success: { frequency: 520, duration: 150, type: 'sine', volume: 0.3 },
  rain: { frequency: 100, duration: 1000, type: 'sine', volume: 0.1 },
  birds: { frequency: 2000, duration: 500, type: 'sine', volume: 0.1 },
  night: { frequency: 150, duration: 2000, type: 'sine', volume: 0.05 },
};

// Store pour les paramètres audio
interface AudioState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
}

// État audio par défaut
const defaultAudioState: AudioState = {
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5,
};

// Hook principal pour les sons du jeu
export function useGameSounds() {
  const soundsRef = useRef<Map<SoundType, Audio.Sound>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMuted = useChanvrierStore((s) => s.isMuted);

  // Charger la configuration audio
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.log('[GameSounds] Audio setup error:', error);
      }
    };
    setupAudio();

    return () => {
      // Cleanup sounds
      soundsRef.current.forEach((sound) => {
        sound.unloadAsync();
      });
    };
  }, []);

  // Jouer un son simple avec Web Audio API (fonctionne sur web et natif via polyfill)
  const playTone = useCallback((config: SoundConfig) => {
    // Check mute state from store
    if (useChanvrierStore.getState().isMuted) return;

    try {
      // Créer un contexte audio si nécessaire
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        const AudioCtx = AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = config.frequency;
        oscillator.type = config.type;

        gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration / 1000);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + config.duration / 1000);
      }
    } catch (error) {
      // Silently fail on platforms without Web Audio API
      console.log('[GameSounds] Tone error:', error);
    }
  }, []);

  // Jouer un son par type
  const playSound = useCallback((type: SoundType) => {
    const config = SOUND_CONFIGS[type];
    if (config) {
      // Modifier la fréquence pour créer des sons plus distinctifs
      switch (type) {
        case 'plant':
          // Son de plantation: deux notes ascendantes
          playTone({ ...config, frequency: 330 });
          setTimeout(() => playTone({ ...config, frequency: 440 }), 100);
          break;

        case 'water':
          // Son d'eau: trois notes descendantes
          playTone({ ...config, frequency: 600 });
          setTimeout(() => playTone({ ...config, frequency: 500 }), 70);
          setTimeout(() => playTone({ ...config, frequency: 400 }), 140);
          break;

        case 'harvest':
          // Son de récolte: fanfare joyeuse
          playTone({ ...config, frequency: 523 }); // C
          setTimeout(() => playTone({ ...config, frequency: 659 }), 100); // E
          setTimeout(() => playTone({ ...config, frequency: 784 }), 200); // G
          setTimeout(() => playTone({ ...config, frequency: 1047 }), 300); // C octave
          break;

        case 'coins':
          // Son de pièces: tintement
          playTone({ ...config, frequency: 1500 });
          setTimeout(() => playTone({ ...config, frequency: 2000 }), 50);
          break;

        case 'levelUp':
          // Son de level up: gamme ascendante
          [523, 587, 659, 784, 880, 1047].forEach((freq, i) => {
            setTimeout(() => playTone({ ...config, frequency: freq }), i * 80);
          });
          break;

        case 'error':
          // Son d'erreur: deux notes basses
          playTone({ ...config, frequency: 200 });
          setTimeout(() => playTone({ ...config, frequency: 150 }), 100);
          break;

        case 'click':
          playTone(config);
          break;

        case 'success':
          // Son de succès: deux notes joyeuses
          playTone({ ...config, frequency: 440 });
          setTimeout(() => playTone({ ...config, frequency: 660 }), 100);
          break;

        default:
          playTone(config);
      }
    }
  }, [playTone]);

  // Sons spécifiques aux actions du jeu
  const sounds = {
    // Actions de culture
    plant: () => playSound('plant'),
    water: () => playSound('water'),
    harvest: () => playSound('harvest'),
    fertilize: () => playSound('success'),

    // Économie
    coins: () => playSound('coins'),
    buy: () => playSound('click'),
    sell: () => playSound('coins'),

    // Progression
    levelUp: () => playSound('levelUp'),
    xpGain: () => playSound('success'),

    // UI
    click: () => playSound('click'),
    error: () => playSound('error'),
    success: () => playSound('success'),

    // Navigation
    openMenu: () => playSound('click'),
    closeMenu: () => playSound('click'),
    selectTool: () => playSound('click'),
  };

  return {
    playSound,
    sounds,
  };
}

// Hook pour la musique d'ambiance
export function useAmbientMusic() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlaying = useRef(false);

  const startAmbient = useCallback(async () => {
    // Pour l'instant, pas de musique d'ambiance
    // On pourrait ajouter des fichiers audio plus tard
    console.log('[AmbientMusic] Ambient music not implemented yet');
  }, []);

  const stopAmbient = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      isPlaying.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return {
    startAmbient,
    stopAmbient,
    isPlaying: isPlaying.current,
  };
}
