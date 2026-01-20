/**
 * AudioContext - Contexte audio global pour l'app
 *
 * - Bande son de fond "Guinguette du canal" pour tous les utilisateurs (en boucle)
 * - Playlist des Chanvriers Bretons disponible dans l'onglet Musique
 * - Quand la playlist joue, la bande son de fond se mute automatiquement
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { fetchMusicTracks, isMusicApiConfigured } from '@/lib/supabase-music';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  audioSource: any; // require() ou { uri: string }
}

interface AudioContextType {
  // État de la playlist
  currentTrack: Track | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  position: number; // en ms
  duration: number; // en ms
  tracks: Track[];
  isLoading: boolean;
  repeatMode: 'off' | 'one' | 'all';
  shuffleMode: boolean;

  // État de la bande son de fond
  isBackgroundMusicPlaying: boolean;
  isPlaylistActive: boolean; // true quand la playlist joue (désactive la bande son de fond)

  // Actions playlist
  playTrack: (trackIndex: number) => Promise<void>;
  playPause: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  loadTracks: (tracks: Track[]) => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  toggleShuffle: () => void;
  refreshTracks: () => Promise<void>;

  // Actions pour la bande son de fond
  pauseBackgroundMusic: () => Promise<void>;
  resumeBackgroundMusic: () => Promise<void>;
  stopPlaylistAndResumeBackground: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);

// Variable globale pour éviter les réinitialisations multiples
let globalIsInitialized = false;

// Pistes de la playlist (disponibles dans l'onglet Musique)
const PLAYLIST_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Gloire aux Chanvriers Français',
    artist: 'Les Chanvriers Bretons',
    album: 'Album Chanvre',
    audioSource: require('../../assets/gloire-aux-chanvriers-francais.mp3'),
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
  },
  {
    id: 'track-2',
    title: 'Tranche de campagne',
    artist: 'Les Chanvriers Bretons',
    album: 'Album Chanvre',
    audioSource: require('../../assets/couplet-1.mp3'),
    coverUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
  },
  {
    id: 'track-3',
    title: 'Donne-moi l\'Or',
    artist: 'Les Chanvriers Bretons',
    album: 'Album Chanvre',
    audioSource: require('../../assets/les-chanvriers-bretons-donne-moi-lor.mp3'),
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
  },
  {
    id: 'track-4',
    title: 'En Feu',
    artist: 'Les Chanvriers Bretons',
    album: 'Album Chanvre',
    audioSource: require('../../assets/en-feu.mp3'),
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  },
];

// Bande sons de fond Guinguette (6 sons qui tournent en boucle, ordre aléatoire)
const BACKGROUND_TRACKS = [
  {
    id: 'background-1',
    title: 'Guinguette du Canal',
    artist: 'Ambiance',
    audioSource: require('../../assets/guinguette-du-canal-pro.mp3'),
  },
  {
    id: 'background-2',
    title: 'Guinguette du Canal 2',
    artist: 'Ambiance',
    audioSource: require('../../assets/guinguette-2.mp3'),
  },
  {
    id: 'background-3',
    title: 'Guinguette du Canal 3',
    artist: 'Ambiance',
    audioSource: require('../../assets/guinguette-3.mp3'),
  },
  {
    id: 'background-4',
    title: 'Guinguette du Canal 4',
    artist: 'Ambiance',
    audioSource: require('../../assets/guinguette-4.mp3'),
  },
  {
    id: 'background-5',
    title: 'Guinguette du Canal 5',
    artist: 'Ambiance',
    audioSource: require('../../assets/guinguette-5.mp3'),
  },
  {
    id: 'background-6',
    title: 'Guinguette du Canal 6',
    artist: 'Ambiance',
    audioSource: require('../../assets/guinguette-6.mp3'),
  },
];

// Fonction pour mélanger un tableau (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface AudioProviderProps {
  children: React.ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  // Refs pour les sons
  const backgroundSoundRef = useRef<Audio.Sound | null>(null);
  const playlistSoundRef = useRef<Audio.Sound | null>(null);

  // Refs pour la bande son de fond (3 sons en boucle, ordre aléatoire)
  const backgroundTracksRef = useRef<typeof BACKGROUND_TRACKS>(shuffleArray(BACKGROUND_TRACKS));
  const backgroundTrackIndexRef = useRef(0);

  // État de la bande son de fond
  const [isBackgroundMusicPlaying, setIsBackgroundMusicPlaying] = useState(false);

  // État de la playlist
  const [isPlaylistActive, setIsPlaylistActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(PLAYLIST_TRACKS);
  const [volume, setVolumeState] = useState(0.5);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('all');
  const [shuffleMode, setShuffleMode] = useState(false);

  const isMountedRef = useRef(true);
  const handleNextTrackRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const currentTrack = tracks[currentTrackIndex] || null;

  // Callback pour la progression de la playlist
  const onPlaylistStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!isMountedRef.current) return;

    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      // Passer au suivant quand fini
      if (status.didJustFinish) {
        if (repeatMode === 'one') {
          playlistSoundRef.current?.replayAsync();
        } else if (repeatMode === 'all' || shuffleMode) {
          handleNextTrackRef.current?.();
        } else {
          // Playlist terminée, reprendre la bande son de fond
          setIsPlaying(false);
          setIsPlaylistActive(false);
          resumeBackgroundMusicInternal();
        }
      }
    }
  }, [repeatMode, shuffleMode]);

  // Nettoyer un son
  const cleanupSound = async (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('[AudioContext] Error cleaning up sound:', e);
      }
      soundRef.current = null;
    }
  };

  // Démarrer la bande son de fond (joue les 3 sons en boucle, ordre aléatoire)
  const startBackgroundMusic = async () => {
    if (backgroundSoundRef.current) return; // Déjà en cours

    const playNextBackgroundTrack = async () => {
      if (!isMountedRef.current) return;

      const tracks = backgroundTracksRef.current;
      const currentIndex = backgroundTrackIndexRef.current;
      const track = tracks[currentIndex];

      try {
        console.log('[AudioContext] Playing background track:', track.title, '(' + (currentIndex + 1) + '/' + tracks.length + ')');

        const { sound } = await Audio.Sound.createAsync(
          track.audioSource,
          {
            shouldPlay: true,
            volume: 0.15, // Volume bas pour la bande son de fond
            isLooping: false, // On gère la boucle manuellement pour enchaîner les 3 sons
          }
        );

        if (!isMountedRef.current) {
          await sound.unloadAsync();
          return;
        }

        backgroundSoundRef.current = sound;
        setIsBackgroundMusicPlaying(true);

        // Écouter la fin du morceau pour passer au suivant
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            // Passer au morceau suivant
            backgroundTrackIndexRef.current = (backgroundTrackIndexRef.current + 1) % tracks.length;

            // Nettoyer l'ancien son
            sound.unloadAsync().then(() => {
              backgroundSoundRef.current = null;
              // Jouer le suivant
              playNextBackgroundTrack();
            });
          }
        });
      } catch (error) {
        console.error('[AudioContext] Error playing background track:', error);
      }
    };

    await playNextBackgroundTrack();
  };

  // Pauser la bande son de fond (interne)
  const pauseBackgroundMusicInternal = async () => {
    if (backgroundSoundRef.current) {
      try {
        await backgroundSoundRef.current.setVolumeAsync(0);
        setIsBackgroundMusicPlaying(false);
        console.log('[AudioContext] Background music muted');
      } catch (error) {
        console.log('[AudioContext] Error muting background music:', error);
      }
    }
  };

  // Reprendre la bande son de fond (interne)
  const resumeBackgroundMusicInternal = async () => {
    if (backgroundSoundRef.current) {
      try {
        await backgroundSoundRef.current.setVolumeAsync(0.15);
        setIsBackgroundMusicPlaying(true);
        console.log('[AudioContext] Background music resumed');
      } catch (error) {
        console.log('[AudioContext] Error resuming background music:', error);
      }
    }
  };

  // Jouer un morceau de la playlist
  const playTrackInternal = async (trackIndex: number, tracksToUse?: Track[]) => {
    if (!isMountedRef.current) return;

    const trackList = tracksToUse || tracks;
    const track = trackList[trackIndex];
    if (!track) {
      console.log('[AudioContext] No track found at index:', trackIndex);
      return;
    }

    setIsLoading(true);

    try {
      // Muter la bande son de fond
      await pauseBackgroundMusicInternal();

      // Arrêter le morceau actuel de la playlist si existe
      await cleanupSound(playlistSoundRef);

      console.log('[AudioContext] Loading playlist track:', track.title);

      // Charger le nouveau morceau
      const { sound: newSound } = await Audio.Sound.createAsync(
        track.audioSource,
        {
          shouldPlay: true,
          volume: isMuted ? 0 : volume,
          isLooping: repeatMode === 'one',
        },
        onPlaylistStatusUpdate
      );

      if (!isMountedRef.current) {
        await newSound.unloadAsync();
        return;
      }

      playlistSoundRef.current = newSound;
      setCurrentTrackIndex(trackIndex);
      setIsPlaying(true);
      setIsPlaylistActive(true);
    } catch (error) {
      console.error('[AudioContext] Error playing track:', error);
      // En cas d'erreur, reprendre la bande son de fond
      await resumeBackgroundMusicInternal();
    } finally {
      setIsLoading(false);
    }
  };

  // Initialiser l'audio
  useEffect(() => {
    if (globalIsInitialized) {
      console.log('[AudioContext] Already initialized globally, skipping');
      return;
    }
    globalIsInitialized = true;
    isMountedRef.current = true;

    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        // Charger les pistes Supabase si configuré
        let allTracks: Track[] = [...PLAYLIST_TRACKS];

        if (isMusicApiConfigured()) {
          try {
            console.log('[AudioContext] Loading tracks from Supabase...');
            const supabaseTracks = await fetchMusicTracks();

            if (supabaseTracks.length > 0) {
              const convertedTracks: Track[] = supabaseTracks.map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                album: track.album,
                coverUrl: track.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
                audioSource: { uri: track.audio_url },
              }));

              allTracks = [...PLAYLIST_TRACKS, ...convertedTracks];
              console.log('[AudioContext] Loaded', supabaseTracks.length, 'tracks from Supabase');
            }
          } catch (err) {
            console.log('[AudioContext] Error loading Supabase tracks:', err);
          }
        }

        if (isMountedRef.current) {
          setTracks(allTracks);
          console.log('[AudioContext] Initialized with', allTracks.length, 'playlist tracks');
        }

        // Démarrer la bande son de fond automatiquement
        await startBackgroundMusic();
      } catch (error) {
        console.log('[AudioContext] Error initializing audio:', error);
      }
    };

    initAudio();

    return () => {
      isMountedRef.current = false;
      cleanupSound(backgroundSoundRef);
      cleanupSound(playlistSoundRef);
    };
  }, []);

  // Morceau suivant
  const handleNextTrack = async () => {
    let nextIndex: number;
    if (shuffleMode) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = (currentTrackIndex + 1) % tracks.length;
    }
    await playTrackInternal(nextIndex);
  };

  handleNextTrackRef.current = handleNextTrack;

  // Actions exposées
  const playTrack = async (trackIndex: number) => {
    await playTrackInternal(trackIndex);
  };

  const playPause = async () => {
    if (!playlistSoundRef.current) {
      // Démarrer le premier morceau de la playlist
      if (tracks.length > 0) {
        await playTrackInternal(currentTrackIndex);
      }
      return;
    }

    try {
      if (isPlaying) {
        await playlistSoundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        // S'assurer que la bande son de fond est mutée
        await pauseBackgroundMusicInternal();
        await playlistSoundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.log('[AudioContext] Error toggling play/pause:', error);
    }
  };

  const nextTrack = async () => {
    await handleNextTrack();
  };

  const previousTrack = async () => {
    if (position > 3000 && playlistSoundRef.current) {
      await playlistSoundRef.current.setPositionAsync(0);
      return;
    }

    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    await playTrackInternal(prevIndex);
  };

  const setVolume = async (newVolume: number) => {
    setVolumeState(newVolume);
    if (playlistSoundRef.current && !isMuted) {
      await playlistSoundRef.current.setVolumeAsync(newVolume);
    }
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (playlistSoundRef.current) {
      await playlistSoundRef.current.setVolumeAsync(newMuted ? 0 : volume);
    }
  };

  const stop = async () => {
    await cleanupSound(playlistSoundRef);
    setIsPlaying(false);
    setIsPlaylistActive(false);
    setPosition(0);
    // Reprendre la bande son de fond
    await resumeBackgroundMusicInternal();
  };

  const seekTo = async (positionMs: number) => {
    if (playlistSoundRef.current) {
      await playlistSoundRef.current.setPositionAsync(positionMs);
    }
  };

  const loadTracks = (newTracks: Track[]) => {
    setTracks(newTracks);
  };

  const toggleShuffle = () => {
    setShuffleMode(!shuffleMode);
  };

  const refreshTracks = async () => {
    try {
      let allTracks: Track[] = [...PLAYLIST_TRACKS];

      if (isMusicApiConfigured()) {
        console.log('[AudioContext] Refreshing tracks from Supabase...');
        const supabaseTracks = await fetchMusicTracks();

        if (supabaseTracks.length > 0) {
          const convertedTracks: Track[] = supabaseTracks.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            coverUrl: track.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
            audioSource: { uri: track.audio_url },
          }));

          allTracks = [...PLAYLIST_TRACKS, ...convertedTracks];
          console.log('[AudioContext] Refreshed', supabaseTracks.length, 'tracks from Supabase');
        }
      }

      setTracks(allTracks);
    } catch (err) {
      console.log('[AudioContext] Error refreshing tracks:', err);
    }
  };

  // Actions pour la bande son de fond (exposées)
  const pauseBackgroundMusic = async () => {
    await pauseBackgroundMusicInternal();
  };

  const resumeBackgroundMusic = async () => {
    // Ne reprendre que si la playlist n'est pas active
    if (!isPlaylistActive) {
      await resumeBackgroundMusicInternal();
    }
  };

  const stopPlaylistAndResumeBackground = async () => {
    await stop();
  };

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        currentTrackIndex,
        isPlaying,
        isMuted,
        volume,
        position,
        duration,
        tracks,
        isLoading,
        repeatMode,
        shuffleMode,
        isBackgroundMusicPlaying,
        isPlaylistActive,
        playTrack,
        playPause,
        nextTrack,
        previousTrack,
        setVolume,
        toggleMute,
        stop,
        seekTo,
        loadTracks,
        setRepeatMode,
        toggleShuffle,
        refreshTracks,
        pauseBackgroundMusic,
        resumeBackgroundMusic,
        stopPlaylistAndResumeBackground,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

// Hook pour utiliser le contexte
export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
