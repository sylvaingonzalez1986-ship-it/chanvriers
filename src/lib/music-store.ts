/**
 * Music Store - Gestion de la musique de l'app
 * Lecteur style iPod Classic
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, AVPlaybackStatus } from 'expo-av';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  audioSource: any; // require() ou URL
  coverImage?: string;
  durationSeconds?: number;
  orderIndex: number;
  isActive: boolean;
}

// Pistes par défaut (locales)
export const DEFAULT_TRACKS: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Gloire aux Chanvriers Français',
    artist: 'Les Chanvriers Bretons',
    album: 'Album Chanvre',
    audioSource: require('../../assets/gloire-aux-chanvriers-francais.mp3'),
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    orderIndex: 0,
    isActive: true,
  },
  {
    id: 'track-2',
    title: 'Couplet 1',
    artist: 'Les Chanvriers Bretons',
    album: 'Album Chanvre',
    audioSource: require('../../assets/couplet-1.mp3'),
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
    orderIndex: 1,
    isActive: true,
  },
  {
    id: 'track-3',
    title: 'Donne-moi l\'Or',
    artist: 'Les Chanvriers Bretons',
    album: 'Album Chanvre',
    audioSource: require('../../assets/les-chanvriers-bretons-donne-moi-lor.mp3'),
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
    orderIndex: 2,
    isActive: true,
  },
  {
    id: 'track-4',
    title: 'En Feu',
    artist: 'Les Chanvriers Bretons',
    album: 'Album Chanvre',
    audioSource: require('../../assets/en-feu.mp3'),
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
    orderIndex: 3,
    isActive: true,
  },
];

interface MusicState {
  // Pistes
  tracks: MusicTrack[];

  // État du lecteur
  currentTrackIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentPosition: number; // en secondes
  duration: number; // en secondes
  isLoading: boolean;
  repeatMode: 'off' | 'one' | 'all';
  shuffleMode: boolean;

  // Référence au son (non persisté)
  soundRef: Audio.Sound | null;

  // Actions
  setTracks: (tracks: MusicTrack[]) => void;
  addTrack: (track: MusicTrack) => void;
  updateTrack: (id: string, updates: Partial<MusicTrack>) => void;
  removeTrack: (id: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  // Contrôles du lecteur
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setCurrentPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setIsLoading: (loading: boolean) => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  toggleShuffleMode: () => void;
  setSoundRef: (sound: Audio.Sound | null) => void;

  // Actions de navigation
  nextTrack: () => number;
  previousTrack: () => number;

  // Getters
  getCurrentTrack: () => MusicTrack | null;
  getActiveTracks: () => MusicTrack[];
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      tracks: DEFAULT_TRACKS,
      currentTrackIndex: 0,
      isPlaying: false,
      isMuted: false,
      volume: 0.5,
      currentPosition: 0,
      duration: 0,
      isLoading: false,
      repeatMode: 'all',
      shuffleMode: false,
      soundRef: null,

      setTracks: (tracks) => set({ tracks }),

      addTrack: (track) => set((state) => ({
        tracks: [...state.tracks, track],
      })),

      updateTrack: (id, updates) => set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),

      removeTrack: (id) => set((state) => ({
        tracks: state.tracks.filter((t) => t.id !== id),
      })),

      reorderTracks: (fromIndex, toIndex) => set((state) => {
        const newTracks = [...state.tracks];
        const [removed] = newTracks.splice(fromIndex, 1);
        newTracks.splice(toIndex, 0, removed);
        // Mettre à jour les orderIndex
        return {
          tracks: newTracks.map((t, i) => ({ ...t, orderIndex: i })),
        };
      }),

      setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMuted: (muted) => set({ isMuted: muted }),
      setVolume: (volume) => set({ volume }),
      setCurrentPosition: (position) => set({ currentPosition: position }),
      setDuration: (duration) => set({ duration }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setRepeatMode: (mode) => set({ repeatMode: mode }),
      toggleShuffleMode: () => set((state) => ({ shuffleMode: !state.shuffleMode })),
      setSoundRef: (sound) => set({ soundRef: sound }),

      nextTrack: () => {
        const state = get();
        const activeTracks = state.tracks.filter((t) => t.isActive);
        if (activeTracks.length === 0) return 0;

        let nextIndex: number;
        if (state.shuffleMode) {
          nextIndex = Math.floor(Math.random() * activeTracks.length);
        } else {
          nextIndex = (state.currentTrackIndex + 1) % activeTracks.length;
        }

        set({ currentTrackIndex: nextIndex });
        return nextIndex;
      },

      previousTrack: () => {
        const state = get();
        const activeTracks = state.tracks.filter((t) => t.isActive);
        if (activeTracks.length === 0) return 0;

        const prevIndex = state.currentTrackIndex === 0
          ? activeTracks.length - 1
          : state.currentTrackIndex - 1;

        set({ currentTrackIndex: prevIndex });
        return prevIndex;
      },

      getCurrentTrack: () => {
        const state = get();
        const activeTracks = state.tracks.filter((t) => t.isActive);
        return activeTracks[state.currentTrackIndex] || null;
      },

      getActiveTracks: () => {
        return get().tracks.filter((t) => t.isActive).sort((a, b) => a.orderIndex - b.orderIndex);
      },
    }),
    {
      name: 'music-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tracks: state.tracks,
        currentTrackIndex: state.currentTrackIndex,
        volume: state.volume,
        isMuted: state.isMuted,
        repeatMode: state.repeatMode,
        shuffleMode: state.shuffleMode,
      }),
    }
  )
);
