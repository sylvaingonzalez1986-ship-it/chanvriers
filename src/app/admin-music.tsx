/**
 * Admin Music Screen - Gestion de la bibliothèque musicale
 * Upload audio, modifier couvertures, renommer titres, réorganiser playlist
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Animated, {
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  Music,
  Plus,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Upload,
  GripVertical,
  Play,
  Pause,
  X,
  Check,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useAudio, Track } from '@/contexts/AudioContext';
import {
  fetchMusicTracks,
  addMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
  reorderMusicTracks,
  uploadAudioFile,
  uploadCoverImage,
  isMusicApiConfigured,
} from '@/lib/supabase-music';

// Default tracks for when no DB tracks exist
const DEFAULT_TRACKS: Track[] = [
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
    title: "Donne-moi l'Or",
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

interface EditableTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  position: number;
  isLocal: boolean; // True if from assets, false if from Supabase
  localSource?: any; // Local require() source
}

export default function AdminMusicScreen() {
  const insets = useSafeAreaInsets();
  const { currentTrack, isPlaying, playTrack: playContextTrack } = useAudio();

  const [tracks, setTracks] = useState<EditableTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<EditableTrack | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formAlbum, setFormAlbum] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [selectedAudioUri, setSelectedAudioUri] = useState<string | null>(null);
  const [selectedAudioName, setSelectedAudioName] = useState<string | null>(null);
  const [selectedCoverUri, setSelectedCoverUri] = useState<string | null>(null);

  const isConfigured = isMusicApiConfigured();

  // Load tracks
  const loadTracks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load default local tracks
      const localTracks: EditableTrack[] = DEFAULT_TRACKS.map((t, idx) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album || '',
        coverUrl: t.coverUrl || '',
        audioUrl: '',
        position: idx,
        isLocal: true,
        localSource: t.audioSource,
      }));

      if (isConfigured) {
        // Try to load from Supabase
        const dbTracks = await fetchMusicTracks();
        if (dbTracks.length > 0) {
          const supabaseTracks: EditableTrack[] = dbTracks.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: t.album || '',
            coverUrl: t.cover_url || '',
            audioUrl: t.audio_url,
            position: t.position,
            isLocal: false,
          }));
          setTracks(supabaseTracks);
        } else {
          // No DB tracks, use local defaults
          setTracks(localTracks);
        }
      } else {
        // No Supabase, use local defaults
        setTracks(localTracks);
      }
    } catch (err) {
      console.error('[AdminMusic] Error loading tracks:', err);
      setError('Erreur lors du chargement des pistes');
      // Fallback to local tracks
      const localTracks: EditableTrack[] = DEFAULT_TRACKS.map((t, idx) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album || '',
        coverUrl: t.coverUrl || '',
        audioUrl: '',
        position: idx,
        isLocal: true,
        localSource: t.audioSource,
      }));
      setTracks(localTracks);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  // Pick audio file
  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/mpeg', 'audio/mp3', 'audio/wav'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedAudioUri(result.assets[0].uri);
        setSelectedAudioName(result.assets[0].name);
      }
    } catch (err) {
      console.error('[AdminMusic] Error picking audio:', err);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier audio');
    }
  };

  // Pick cover image
  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedCoverUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('[AdminMusic] Error picking image:', err);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  // Open edit modal
  const openEditModal = (track: EditableTrack) => {
    setSelectedTrack(track);
    setFormTitle(track.title);
    setFormArtist(track.artist);
    setFormAlbum(track.album);
    setFormCoverUrl(track.coverUrl);
    setSelectedCoverUri(null);
    setEditModalVisible(true);
  };

  // Open add modal
  const openAddModal = () => {
    setFormTitle('');
    setFormArtist('Les Chanvriers Bretons');
    setFormAlbum('Album Chanvre');
    setFormCoverUrl('');
    setSelectedAudioUri(null);
    setSelectedAudioName(null);
    setSelectedCoverUri(null);
    setAddModalVisible(true);
  };

  // Save edit
  const saveEdit = async () => {
    if (!selectedTrack || !formTitle.trim()) return;

    setIsSaving(true);
    try {
      let newCoverUrl = formCoverUrl;

      // Upload new cover if selected
      if (selectedCoverUri && isConfigured) {
        newCoverUrl = await uploadCoverImage(selectedCoverUri, `cover_${selectedTrack.id}.jpg`);
      }

      if (selectedTrack.isLocal) {
        // Update local track in state only
        setTracks(prev => prev.map(t =>
          t.id === selectedTrack.id
            ? { ...t, title: formTitle, artist: formArtist, album: formAlbum, coverUrl: newCoverUrl }
            : t
        ));
      } else if (isConfigured) {
        // Update in Supabase
        await updateMusicTrack(selectedTrack.id, {
          title: formTitle.trim(),
          artist: formArtist.trim(),
          album: formAlbum.trim() || undefined,
          cover_url: newCoverUrl || undefined,
        });
        await loadTracks();
      }

      setEditModalVisible(false);
    } catch (err) {
      console.error('[AdminMusic] Error saving edit:', err);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } finally {
      setIsSaving(false);
    }
  };

  // Add new track
  const addNewTrack = async () => {
    if (!formTitle.trim() || !selectedAudioUri) {
      Alert.alert('Erreur', 'Veuillez remplir le titre et sélectionner un fichier audio');
      return;
    }

    setIsSaving(true);
    try {
      console.log('[AdminMusic] Starting add track for:', selectedAudioName);

      let addedToSupabase = false;

      if (isConfigured) {
        try {
          // Try to upload to Supabase
          console.log('[AdminMusic] Uploading to Supabase...');
          const audioUrl = await uploadAudioFile(selectedAudioUri, selectedAudioName || 'track.mp3');
          console.log('[AdminMusic] Audio uploaded:', audioUrl);

          let coverUrl = formCoverUrl;
          if (selectedCoverUri) {
            coverUrl = await uploadCoverImage(selectedCoverUri, `cover_${Date.now()}.jpg`);
            console.log('[AdminMusic] Cover uploaded:', coverUrl);
          }

          console.log('[AdminMusic] Adding to database...');
          await addMusicTrack({
            title: formTitle.trim(),
            artist: formArtist.trim() || 'Les Chanvriers Bretons',
            album: formAlbum.trim() || 'Album Chanvre',
            audio_url: audioUrl,
            cover_url: coverUrl || undefined,
            position: tracks.length,
          });

          console.log('[AdminMusic] Track added to Supabase successfully');
          await loadTracks();
          addedToSupabase = true;
        } catch (supabaseErr: any) {
          console.log('[AdminMusic] Supabase upload failed, adding locally:', supabaseErr?.message);
          // Continue to add locally if Supabase fails
        }
      }

      if (!addedToSupabase) {
        // Add locally (without Supabase or if Supabase failed)
        console.log('[AdminMusic] Adding track locally...');
        const newTrack: EditableTrack = {
          id: `local-${Date.now()}`,
          title: formTitle.trim(),
          artist: formArtist.trim() || 'Les Chanvriers Bretons',
          album: formAlbum.trim() || 'Album Chanvre',
          coverUrl: selectedCoverUri || formCoverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
          audioUrl: selectedAudioUri,
          position: tracks.length,
          isLocal: true,
        };
        setTracks(prev => [...prev, newTrack]);
        console.log('[AdminMusic] Track added locally:', newTrack.title);
      }

      setAddModalVisible(false);
      // Reset form
      setFormTitle('');
      setFormArtist('Les Chanvriers Bretons');
      setFormAlbum('Album Chanvre');
      setFormCoverUrl('');
      setSelectedAudioUri(null);
      setSelectedAudioName(null);
      setSelectedCoverUri(null);

      Alert.alert('Succès', 'Piste ajoutée avec succès !');
    } catch (err: any) {
      console.error('[AdminMusic] Error adding track:', err);
      const errorMessage = err?.message || 'Erreur inconnue';
      Alert.alert('Erreur', `Impossible d'ajouter la piste: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete track
  const deleteTrackHandler = async (track: EditableTrack) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${track.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (track.isLocal) {
              // Just remove from state
              setTracks(prev => prev.filter(t => t.id !== track.id));
            } else if (isConfigured) {
              try {
                await deleteMusicTrack(track.id);
                await loadTracks();
              } catch (err) {
                console.error('[AdminMusic] Error deleting track:', err);
                Alert.alert('Erreur', 'Impossible de supprimer la piste');
              }
            }
          },
        },
      ]
    );
  };

  // Move track up/down
  const moveTrack = async (track: EditableTrack, direction: 'up' | 'down') => {
    const idx = tracks.findIndex(t => t.id === track.id);
    if (idx === -1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= tracks.length) return;

    const newTracks = [...tracks];
    [newTracks[idx], newTracks[newIdx]] = [newTracks[newIdx], newTracks[idx]];

    // Update positions
    newTracks.forEach((t, i) => {
      t.position = i;
    });

    setTracks(newTracks);

    // Sync to Supabase if configured and has DB tracks
    if (isConfigured && !track.isLocal) {
      try {
        await reorderMusicTracks(newTracks.map(t => t.id));
      } catch (err) {
        console.error('[AdminMusic] Error reordering:', err);
      }
    }
  };

  // Check if track is currently playing
  const isTrackPlaying = (track: EditableTrack) => {
    return currentTrack?.id === track.id && isPlaying;
  };

  // Play preview
  const playPreview = (track: EditableTrack, index: number) => {
    playContextTrack(index);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.dark }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header */}
      <View
        className="px-5 pb-4"
        style={{
          paddingTop: insets.top + 10,
          backgroundColor: COLORS.background.charcoal,
          borderBottomWidth: 1,
          borderBottomColor: `${COLORS.primary.paleGold}20`,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/admin')}
            className="flex-row items-center"
          >
            <ArrowLeft size={24} color={COLORS.primary.gold} />
            <Text className="text-lg ml-2" style={{ color: COLORS.text.white }}>
              Retour
            </Text>
          </Pressable>

          <View className="flex-row items-center">
            <Music size={24} color={COLORS.primary.gold} />
            <Text className="text-xl font-bold ml-2" style={{ color: COLORS.text.white }}>
              Bibliothèque
            </Text>
          </View>

          <Pressable
            onPress={loadTracks}
            className="p-2"
          >
            <RefreshCw size={22} color={COLORS.primary.gold} />
          </Pressable>
        </View>

        {/* Status */}
        <View className="flex-row items-center mt-3">
          <View
            className="flex-row items-center px-3 py-1.5 rounded-full"
            style={{ backgroundColor: isConfigured ? `${COLORS.accent.hemp}20` : `${COLORS.primary.orange}20` }}
          >
            <Database size={14} color={isConfigured ? COLORS.accent.hemp : COLORS.primary.orange} />
            <Text className="text-xs ml-1.5" style={{ color: isConfigured ? COLORS.accent.hemp : COLORS.primary.orange }}>
              {isConfigured ? 'Supabase connecté' : 'Mode local uniquement'}
            </Text>
          </View>

          <Text className="text-sm ml-3" style={{ color: COLORS.text.muted }}>
            {tracks.length} piste{tracks.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary.gold} />
          <Text className="mt-3" style={{ color: COLORS.text.muted }}>
            Chargement...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={48} color={COLORS.primary.orange} />
          <Text className="text-center mt-3" style={{ color: COLORS.text.muted }}>
            {error}
          </Text>
          <Pressable
            onPress={loadTracks}
            className="mt-4 px-6 py-3 rounded-xl"
            style={{ backgroundColor: COLORS.primary.gold }}
          >
            <Text className="font-semibold" style={{ color: COLORS.background.dark }}>
              Réessayer
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Track List */}
          <View className="px-4 pt-4">
            {tracks.map((track, index) => (
              <Animated.View
                key={track.id}
                entering={FadeIn.delay(index * 50)}
                layout={Layout.springify()}
                className="mb-3"
              >
                <View
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: COLORS.background.charcoal }}
                >
                  <View className="flex-row items-center p-3">
                    {/* Position & Drag Handle */}
                    <View className="items-center mr-3">
                      <Text className="text-xs mb-1" style={{ color: COLORS.text.muted }}>
                        #{index + 1}
                      </Text>
                      <GripVertical size={20} color={COLORS.text.muted} />
                    </View>

                    {/* Cover */}
                    <Pressable
                      onPress={() => openEditModal(track)}
                      className="relative"
                    >
                      <Image
                        source={{ uri: track.coverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200' }}
                        className="w-16 h-16 rounded-xl"
                        style={{ backgroundColor: COLORS.background.mediumBlue }}
                      />
                      <View
                        className="absolute inset-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                      >
                        <ImageIcon size={20} color="white" />
                      </View>
                    </Pressable>

                    {/* Info */}
                    <View className="flex-1 ml-3">
                      <Text
                        className="font-semibold text-base"
                        style={{ color: COLORS.text.white }}
                        numberOfLines={1}
                      >
                        {track.title}
                      </Text>
                      <Text
                        className="text-sm mt-0.5"
                        style={{ color: COLORS.text.muted }}
                        numberOfLines={1}
                      >
                        {track.artist}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <View
                          className="px-2 py-0.5 rounded"
                          style={{ backgroundColor: track.isLocal ? `${COLORS.accent.sky}20` : `${COLORS.accent.hemp}20` }}
                        >
                          <Text
                            className="text-xs"
                            style={{ color: track.isLocal ? COLORS.accent.sky : COLORS.accent.hemp }}
                          >
                            {track.isLocal ? 'Local' : 'Cloud'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Actions */}
                    <View className="flex-row items-center">
                      {/* Play Preview */}
                      <Pressable
                        onPress={() => playPreview(track, index)}
                        className="p-2 mr-1"
                      >
                        {isTrackPlaying(track) ? (
                          <Pause size={22} color={COLORS.primary.gold} />
                        ) : (
                          <Play size={22} color={COLORS.primary.gold} />
                        )}
                      </Pressable>

                      {/* Edit */}
                      <Pressable
                        onPress={() => openEditModal(track)}
                        className="p-2"
                      >
                        <Edit3 size={20} color={COLORS.accent.sky} />
                      </Pressable>

                      {/* Delete */}
                      <Pressable
                        onPress={() => deleteTrackHandler(track)}
                        className="p-2"
                      >
                        <Trash2 size={20} color={COLORS.accent.red} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Move Buttons */}
                  <View
                    className="flex-row border-t"
                    style={{ borderTopColor: `${COLORS.primary.paleGold}10` }}
                  >
                    <Pressable
                      onPress={() => moveTrack(track, 'up')}
                      disabled={index === 0}
                      className="flex-1 flex-row items-center justify-center py-2"
                      style={{ opacity: index === 0 ? 0.3 : 1 }}
                    >
                      <Text className="text-sm" style={{ color: COLORS.text.muted }}>
                        ▲ Monter
                      </Text>
                    </Pressable>
                    <View style={{ width: 1, backgroundColor: `${COLORS.primary.paleGold}10` }} />
                    <Pressable
                      onPress={() => moveTrack(track, 'down')}
                      disabled={index === tracks.length - 1}
                      className="flex-1 flex-row items-center justify-center py-2"
                      style={{ opacity: index === tracks.length - 1 ? 0.3 : 1 }}
                    >
                      <Text className="text-sm" style={{ color: COLORS.text.muted }}>
                        ▼ Descendre
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Instructions */}
          {!isConfigured && (
            <View className="mx-4 mt-4 p-4 rounded-2xl" style={{ backgroundColor: `${COLORS.primary.orange}15` }}>
              <View className="flex-row items-start">
                <AlertCircle size={20} color={COLORS.primary.orange} />
                <View className="flex-1 ml-3">
                  <Text className="font-semibold" style={{ color: COLORS.primary.orange }}>
                    Configuration Supabase requise
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: COLORS.text.muted }}>
                    Pour ajouter de nouvelles pistes et modifier les couvertures, configurez les buckets Supabase Storage :
                  </Text>
                  <Text className="text-sm mt-2 font-mono" style={{ color: COLORS.text.white }}>
                    • music-audio (privé, 50MB)
                  </Text>
                  <Text className="text-sm font-mono" style={{ color: COLORS.text.white }}>
                    • music-covers (public, 5MB)
                  </Text>
                  <Text className="text-sm mt-2" style={{ color: COLORS.text.muted }}>
                    Créez aussi une table "music_tracks" dans Supabase.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Button */}
      <View
        className="absolute left-4 right-4"
        style={{ bottom: insets.bottom + 20 }}
      >
        <Pressable
          onPress={openAddModal}
          className="flex-row items-center justify-center py-4 rounded-2xl"
          style={{ backgroundColor: COLORS.primary.gold }}
        >
          <Plus size={24} color={COLORS.background.dark} />
          <Text className="text-lg font-bold ml-2" style={{ color: COLORS.background.dark }}>
            Ajouter une piste
          </Text>
        </Pressable>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <Pressable className="flex-1" onPress={() => setEditModalVisible(false)} />

          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: COLORS.background.charcoal, paddingBottom: insets.bottom + 20 }}
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-5 py-4"
              style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
            >
              <Text className="text-xl font-bold" style={{ color: COLORS.text.white }}>
                Modifier la piste
              </Text>
              <Pressable onPress={() => setEditModalVisible(false)} className="p-2">
                <X size={24} color={COLORS.text.white} />
              </Pressable>
            </View>

            <ScrollView className="px-5 pt-4" style={{ maxHeight: 500 }}>
              {/* Cover Preview */}
              <View className="items-center mb-4">
                <Image
                  source={{ uri: selectedCoverUri || selectedTrack?.coverUrl || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300' }}
                  className="w-32 h-32 rounded-2xl"
                  style={{ backgroundColor: COLORS.background.mediumBlue }}
                />
                <Pressable
                  onPress={pickCoverImage}
                  className="flex-row items-center mt-3 px-4 py-2 rounded-xl"
                  style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                >
                  <ImageIcon size={18} color={COLORS.primary.gold} />
                  <Text className="ml-2" style={{ color: COLORS.primary.gold }}>
                    Changer la couverture
                  </Text>
                </Pressable>
              </View>

              {/* Title */}
              <View className="mb-4">
                <Text className="text-sm mb-2" style={{ color: COLORS.text.muted }}>
                  Titre
                </Text>
                <TextInput
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Nom de la piste"
                  placeholderTextColor={COLORS.text.muted}
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: COLORS.background.mediumBlue,
                    color: COLORS.text.white,
                  }}
                />
              </View>

              {/* Artist */}
              <View className="mb-4">
                <Text className="text-sm mb-2" style={{ color: COLORS.text.muted }}>
                  Artiste
                </Text>
                <TextInput
                  value={formArtist}
                  onChangeText={setFormArtist}
                  placeholder="Nom de l'artiste"
                  placeholderTextColor={COLORS.text.muted}
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: COLORS.background.mediumBlue,
                    color: COLORS.text.white,
                  }}
                />
              </View>

              {/* Album */}
              <View className="mb-4">
                <Text className="text-sm mb-2" style={{ color: COLORS.text.muted }}>
                  Album
                </Text>
                <TextInput
                  value={formAlbum}
                  onChangeText={setFormAlbum}
                  placeholder="Nom de l'album"
                  placeholderTextColor={COLORS.text.muted}
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: COLORS.background.mediumBlue,
                    color: COLORS.text.white,
                  }}
                />
              </View>

              {/* Cover URL */}
              <View className="mb-6">
                <Text className="text-sm mb-2" style={{ color: COLORS.text.muted }}>
                  URL de couverture (optionnel)
                </Text>
                <TextInput
                  value={formCoverUrl}
                  onChangeText={setFormCoverUrl}
                  placeholder="https://..."
                  placeholderTextColor={COLORS.text.muted}
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: COLORS.background.mediumBlue,
                    color: COLORS.text.white,
                  }}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Save Button */}
              <Pressable
                onPress={saveEdit}
                disabled={isSaving || !formTitle.trim()}
                className="flex-row items-center justify-center py-4 rounded-xl mb-4"
                style={{
                  backgroundColor: formTitle.trim() ? COLORS.primary.gold : COLORS.background.mediumBlue,
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.background.dark} />
                ) : (
                  <>
                    <Check size={22} color={COLORS.background.dark} />
                    <Text className="font-bold ml-2" style={{ color: COLORS.background.dark }}>
                      Enregistrer
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <Pressable className="flex-1" onPress={() => setAddModalVisible(false)} />

          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: COLORS.background.charcoal, paddingBottom: insets.bottom + 20 }}
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-5 py-4"
              style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
            >
              <Text className="text-xl font-bold" style={{ color: COLORS.text.white }}>
                Nouvelle piste
              </Text>
              <Pressable onPress={() => setAddModalVisible(false)} className="p-2">
                <X size={24} color={COLORS.text.white} />
              </Pressable>
            </View>

            <ScrollView className="px-5 pt-4" style={{ maxHeight: 550 }}>
              {/* Audio File Selection */}
              <Pressable
                onPress={pickAudioFile}
                className="items-center py-6 rounded-2xl mb-4"
                style={{
                  backgroundColor: selectedAudioUri ? `${COLORS.accent.hemp}15` : COLORS.background.mediumBlue,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: selectedAudioUri ? COLORS.accent.hemp : `${COLORS.text.muted}30`,
                }}
              >
                <Upload size={32} color={selectedAudioUri ? COLORS.accent.hemp : COLORS.text.muted} />
                <Text className="mt-2 font-semibold" style={{ color: selectedAudioUri ? COLORS.accent.hemp : COLORS.text.muted }}>
                  {selectedAudioUri ? selectedAudioName : 'Sélectionner un fichier audio'}
                </Text>
                <Text className="text-xs mt-1" style={{ color: COLORS.text.muted }}>
                  MP3, WAV (max 50MB)
                </Text>
              </Pressable>

              {/* Cover Preview */}
              <View className="items-center mb-4">
                {selectedCoverUri ? (
                  <Image
                    source={{ uri: selectedCoverUri }}
                    className="w-24 h-24 rounded-xl"
                    style={{ backgroundColor: COLORS.background.mediumBlue }}
                  />
                ) : (
                  <View
                    className="w-24 h-24 rounded-xl items-center justify-center"
                    style={{ backgroundColor: COLORS.background.mediumBlue }}
                  >
                    <ImageIcon size={32} color={COLORS.text.muted} />
                  </View>
                )}
                <Pressable
                  onPress={pickCoverImage}
                  className="flex-row items-center mt-3 px-4 py-2 rounded-xl"
                  style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                >
                  <ImageIcon size={18} color={COLORS.primary.gold} />
                  <Text className="ml-2" style={{ color: COLORS.primary.gold }}>
                    {selectedCoverUri ? 'Changer' : 'Ajouter couverture'}
                  </Text>
                </Pressable>
              </View>

              {/* Title */}
              <View className="mb-4">
                <Text className="text-sm mb-2" style={{ color: COLORS.text.muted }}>
                  Titre *
                </Text>
                <TextInput
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Nom de la piste"
                  placeholderTextColor={COLORS.text.muted}
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: COLORS.background.mediumBlue,
                    color: COLORS.text.white,
                  }}
                />
              </View>

              {/* Artist */}
              <View className="mb-4">
                <Text className="text-sm mb-2" style={{ color: COLORS.text.muted }}>
                  Artiste
                </Text>
                <TextInput
                  value={formArtist}
                  onChangeText={setFormArtist}
                  placeholder="Les Chanvriers Bretons"
                  placeholderTextColor={COLORS.text.muted}
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: COLORS.background.mediumBlue,
                    color: COLORS.text.white,
                  }}
                />
              </View>

              {/* Album */}
              <View className="mb-6">
                <Text className="text-sm mb-2" style={{ color: COLORS.text.muted }}>
                  Album
                </Text>
                <TextInput
                  value={formAlbum}
                  onChangeText={setFormAlbum}
                  placeholder="Album Chanvre"
                  placeholderTextColor={COLORS.text.muted}
                  className="px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: COLORS.background.mediumBlue,
                    color: COLORS.text.white,
                  }}
                />
              </View>

              {/* Add Button */}
              <Pressable
                onPress={addNewTrack}
                disabled={isSaving || !formTitle.trim() || !selectedAudioUri}
                className="flex-row items-center justify-center py-4 rounded-xl mb-4"
                style={{
                  backgroundColor: (formTitle.trim() && selectedAudioUri) ? COLORS.primary.gold : COLORS.background.mediumBlue,
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.background.dark} />
                ) : (
                  <>
                    <Plus size={22} color={COLORS.background.dark} />
                    <Text className="font-bold ml-2" style={{ color: COLORS.background.dark }}>
                      Ajouter
                    </Text>
                  </>
                )}
              </Pressable>

              {!isConfigured && (
                <View className="p-3 rounded-xl mb-4" style={{ backgroundColor: `${COLORS.primary.orange}15` }}>
                  <Text className="text-sm text-center" style={{ color: COLORS.primary.orange }}>
                    Supabase Storage requis pour ajouter des pistes
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
