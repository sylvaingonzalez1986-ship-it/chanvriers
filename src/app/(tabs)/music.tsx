/**
 * Music Screen - Lecteur style iPod Classic
 * Design inspiré de l'iPod Classic avec molette cliquable
 * Utilise le contexte audio global
 */

import React, { useState } from 'react';
import {
  View,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Music,
  Disc3,
  ListMusic,
  Settings,
  Radio,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS } from '@/lib/colors';
import { useAudio } from '@/contexts/AudioContext';
import { usePermissions } from '@/lib/useAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IPOD_WIDTH = Math.min(SCREEN_WIDTH - 40, 320);
const WHEEL_SIZE = IPOD_WIDTH * 0.65;
const CENTER_BUTTON_SIZE = WHEEL_SIZE * 0.35;

export default function MusicScreen() {
  const insets = useSafeAreaInsets();
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Check if user is admin
  const { isAdmin } = usePermissions();

  // Utiliser le contexte audio global
  const {
    currentTrack,
    currentTrackIndex,
    isPlaying,
    isMuted,
    position,
    duration,
    tracks,
    repeatMode,
    shuffleMode,
    isBackgroundMusicPlaying,
    isPlaylistActive,
    playTrack,
    playPause,
    nextTrack,
    previousTrack,
    toggleMute,
    setRepeatMode,
    toggleShuffle,
    stopPlaylistAndResumeBackground,
  } = useAudio();

  // Animations
  const discRotation = useSharedValue(0);
  const playButtonScale = useSharedValue(1);
  const wheelPressScale = useSharedValue(1);

  // Démarrer/arrêter l'animation du disque selon l'état de lecture
  React.useEffect(() => {
    if (isPlaying) {
      discRotation.value = withRepeat(
        withTiming(discRotation.value + 360, { duration: 3000 }),
        -1,
        false
      );
    }
  }, [isPlaying]);

  // Format time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle play/pause
  const handlePlayPause = async () => {
    playButtonScale.value = withSpring(0.9, {}, () => {
      playButtonScale.value = withSpring(1);
    });
    await playPause();
  };

  // Skip to next
  const handleNext = async () => {
    wheelPressScale.value = withSpring(0.95, {}, () => {
      wheelPressScale.value = withSpring(1);
    });
    await nextTrack();
  };

  // Skip to previous
  const handlePrevious = async () => {
    wheelPressScale.value = withSpring(0.95, {}, () => {
      wheelPressScale.value = withSpring(1);
    });
    await previousTrack();
  };

  // Toggle repeat mode
  const handleToggleRepeat = () => {
    const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  };

  // Select track from playlist
  const handleSelectTrack = async (index: number) => {
    await playTrack(index);
    setShowPlaylist(false);
  };

  // Animated styles
  const discAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${discRotation.value}deg` }],
  }));

  const playButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  const wheelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wheelPressScale.value }],
  }));

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky }}>
      {/* Background gradient */}
      <LinearGradient
        colors={[COLORS.background.nightSky, '#0a0a14', COLORS.background.nightSky]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} className="mb-4 w-full px-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Music size={24} color={COLORS.primary.gold} />
              <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold ml-2">
                Musique
              </Text>
            </View>
            {isAdmin && (
              <Pressable
                onPress={() => router.push('/admin-music')}
                className="flex-row items-center px-3 py-2 rounded-xl active:opacity-70"
                style={{ backgroundColor: `${COLORS.primary.gold}20`, borderWidth: 1, borderColor: `${COLORS.primary.gold}40` }}
              >
                <Settings size={18} color={COLORS.primary.gold} />
                <Text style={{ color: COLORS.primary.gold }} className="text-sm font-medium ml-1.5">
                  Gérer
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Audio Status Banner */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} className="w-full px-5 mb-4">
          <View
            style={{
              backgroundColor: isPlaylistActive ? `${COLORS.primary.gold}15` : `${COLORS.accent.forest}15`,
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: isPlaylistActive ? `${COLORS.primary.gold}30` : `${COLORS.accent.forest}30`,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Radio size={18} color={isPlaylistActive ? COLORS.primary.gold : COLORS.accent.forest} />
                <View className="ml-3 flex-1">
                  <Text style={{ color: COLORS.text.cream }} className="text-sm font-semibold">
                    {isPlaylistActive ? 'Playlist en cours' : 'Ambiance de fond'}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    {isPlaylistActive
                      ? `${currentTrack?.title || 'En lecture'}`
                      : isBackgroundMusicPlaying
                        ? 'Guinguette du Canal'
                        : 'En pause'
                    }
                  </Text>
                </View>
              </View>
              {isPlaylistActive && (
                <Pressable
                  onPress={stopPlaylistAndResumeBackground}
                  className="ml-2 p-2 rounded-full active:opacity-70"
                  style={{ backgroundColor: `${COLORS.text.muted}20` }}
                >
                  <X size={16} color={COLORS.text.muted} />
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>

        {/* iPod Container */}
        <Animated.View
          entering={FadeIn.duration(600)}
          style={{
            width: IPOD_WIDTH,
            backgroundColor: '#1a1a1a',
            borderRadius: 30,
            padding: 15,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 20,
            borderWidth: 1,
            borderColor: '#333',
          }}
        >
          {/* Screen */}
          <View
            style={{
              backgroundColor: '#111',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              borderWidth: 2,
              borderColor: '#222',
            }}
          >
            {/* Now Playing */}
            <View className="items-center">
              {/* Album Art / Disc */}
              <Animated.View
                style={[
                  {
                    width: IPOD_WIDTH - 80,
                    height: IPOD_WIDTH - 80,
                    borderRadius: (IPOD_WIDTH - 80) / 2,
                    overflow: 'hidden',
                    marginBottom: 12,
                  },
                  discAnimatedStyle,
                ]}
              >
                {currentTrack?.coverUrl ? (
                  <Image
                    source={{ uri: currentTrack.coverUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[COLORS.primary.gold, COLORS.accent.forest]}
                    style={{
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Disc3 size={60} color={COLORS.text.cream} />
                  </LinearGradient>
                )}
                {/* Vinyl hole effect */}
                <View
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 30,
                    height: 30,
                    marginLeft: -15,
                    marginTop: -15,
                    borderRadius: 15,
                    backgroundColor: '#1a1a1a',
                    borderWidth: 2,
                    borderColor: '#333',
                  }}
                />
              </Animated.View>

              {/* Track Info */}
              <Text
                style={{ color: COLORS.text.cream }}
                className="text-lg font-bold text-center"
                numberOfLines={1}
              >
                {currentTrack?.title || 'Aucune piste'}
              </Text>
              <Text
                style={{ color: COLORS.text.muted }}
                className="text-sm text-center"
                numberOfLines={1}
              >
                {currentTrack?.artist || 'Artiste inconnu'}
              </Text>

              {/* Progress bar */}
              <View className="w-full mt-4">
                <View
                  style={{
                    height: 4,
                    backgroundColor: '#333',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      backgroundColor: COLORS.primary.gold,
                      borderRadius: 2,
                    }}
                  />
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    {formatTime(position)}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    {formatTime(duration)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Click Wheel */}
          <Animated.View
            style={[
              {
                width: WHEEL_SIZE,
                height: WHEEL_SIZE,
                borderRadius: WHEEL_SIZE / 2,
                backgroundColor: '#222',
                alignSelf: 'center',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              },
              wheelAnimatedStyle,
            ]}
          >
            {/* Menu button (top) */}
            <Pressable
              onPress={() => setShowPlaylist(!showPlaylist)}
              style={{
                position: 'absolute',
                top: 15,
                padding: 10,
              }}
            >
              <Text style={{ color: COLORS.text.muted }} className="text-xs font-bold">
                MENU
              </Text>
            </Pressable>

            {/* Previous button (left) */}
            <Pressable
              onPress={handlePrevious}
              style={{
                position: 'absolute',
                left: 15,
                padding: 10,
              }}
            >
              <SkipBack size={20} color={COLORS.text.muted} fill={COLORS.text.muted} />
            </Pressable>

            {/* Next button (right) */}
            <Pressable
              onPress={handleNext}
              style={{
                position: 'absolute',
                right: 15,
                padding: 10,
              }}
            >
              <SkipForward size={20} color={COLORS.text.muted} fill={COLORS.text.muted} />
            </Pressable>

            {/* Play/Pause button (bottom) */}
            <Pressable
              onPress={handlePlayPause}
              style={{
                position: 'absolute',
                bottom: 15,
                padding: 10,
              }}
            >
              {isPlaying ? (
                <Pause size={20} color={COLORS.text.muted} fill={COLORS.text.muted} />
              ) : (
                <Play size={20} color={COLORS.text.muted} fill={COLORS.text.muted} />
              )}
            </Pressable>

            {/* Center button */}
            <Animated.View style={playButtonAnimatedStyle}>
              <Pressable
                onPress={handlePlayPause}
                style={{
                  width: CENTER_BUTTON_SIZE,
                  height: CENTER_BUTTON_SIZE,
                  borderRadius: CENTER_BUTTON_SIZE / 2,
                  backgroundColor: '#333',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#444',
                }}
              >
                {isPlaying ? (
                  <Pause size={30} color={COLORS.primary.gold} fill={COLORS.primary.gold} />
                ) : (
                  <Play size={30} color={COLORS.primary.gold} fill={COLORS.primary.gold} />
                )}
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* Controls bar */}
          <View className="flex-row justify-center items-center mt-4 gap-6">
            {/* Shuffle */}
            <Pressable onPress={toggleShuffle} className="p-2">
              <Shuffle
                size={18}
                color={shuffleMode ? COLORS.primary.gold : COLORS.text.muted}
              />
            </Pressable>

            {/* Repeat */}
            <Pressable onPress={handleToggleRepeat} className="p-2">
              {repeatMode === 'one' ? (
                <Repeat1 size={18} color={COLORS.primary.gold} />
              ) : (
                <Repeat
                  size={18}
                  color={repeatMode === 'all' ? COLORS.primary.gold : COLORS.text.muted}
                />
              )}
            </Pressable>

            {/* Volume */}
            <Pressable onPress={toggleMute} className="p-2">
              {isMuted ? (
                <VolumeX size={18} color={COLORS.text.muted} />
              ) : (
                <Volume2 size={18} color={COLORS.primary.gold} />
              )}
            </Pressable>

            {/* Playlist */}
            <Pressable onPress={() => setShowPlaylist(!showPlaylist)} className="p-2">
              <ListMusic
                size={18}
                color={showPlaylist ? COLORS.primary.gold : COLORS.text.muted}
              />
            </Pressable>
          </View>
        </Animated.View>

        {/* Playlist */}
        {showPlaylist && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{
              width: IPOD_WIDTH,
              marginTop: 20,
              backgroundColor: '#1a1a1a',
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              borderColor: '#333',
            }}
          >
            <View className="flex-row items-center mb-3">
              <ListMusic size={18} color={COLORS.primary.gold} />
              <Text style={{ color: COLORS.text.cream }} className="font-bold ml-2">
                Playlist ({tracks.length} titres)
              </Text>
            </View>

            {tracks.map((track, index) => (
              <Pressable
                key={track.id}
                onPress={() => handleSelectTrack(index)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: index === currentTrackIndex ? `${COLORS.primary.gold}20` : 'transparent',
                  marginBottom: 4,
                }}
              >
                {/* Track number or playing indicator */}
                <View style={{ width: 30 }}>
                  {index === currentTrackIndex && isPlaying ? (
                    <View className="flex-row items-end h-4">
                      <View
                        style={{
                          width: 3,
                          height: 12,
                          backgroundColor: COLORS.primary.gold,
                          marginRight: 2,
                          borderRadius: 1,
                        }}
                      />
                      <View
                        style={{
                          width: 3,
                          height: 16,
                          backgroundColor: COLORS.primary.gold,
                          marginRight: 2,
                          borderRadius: 1,
                        }}
                      />
                      <View
                        style={{
                          width: 3,
                          height: 8,
                          backgroundColor: COLORS.primary.gold,
                          borderRadius: 1,
                        }}
                      />
                    </View>
                  ) : (
                    <Text style={{ color: COLORS.text.muted }} className="text-sm">
                      {index + 1}
                    </Text>
                  )}
                </View>

                {/* Cover */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginRight: 10,
                    backgroundColor: '#333',
                  }}
                >
                  {track.coverUrl ? (
                    <Image
                      source={{ uri: track.coverUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Music size={20} color={COLORS.text.muted} />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View className="flex-1">
                  <Text
                    style={{
                      color: index === currentTrackIndex ? COLORS.primary.gold : COLORS.text.cream,
                    }}
                    className="font-semibold text-sm"
                    numberOfLines={1}
                  >
                    {track.title}
                  </Text>
                  <Text
                    style={{ color: COLORS.text.muted }}
                    className="text-xs"
                    numberOfLines={1}
                  >
                    {track.artist}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
