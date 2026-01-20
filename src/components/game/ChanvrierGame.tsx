import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { Text } from '@/components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Coins,
  Zap,
  Star,
  ChevronRight,
  Settings,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  ShoppingBag,
  X,
  Check,
  HelpCircle,
  Target,
  Scissors,
} from 'lucide-react-native';

import { PixelPlot } from '@/components/game/PixelPlot';
import { ToolButton, SeedSelector, StatBar } from '@/components/game/GameUI';
import { SkyBackground, TimeHUD } from '@/components/game/Weather';
import { Tutorial, useTutorialState } from '@/components/game/Tutorial';
import { useGameSounds } from '@/components/game/GameSounds';
import { QuestsPanel } from '@/components/game/QuestsPanel';
import { audioManager } from '@/lib/audio-manager';
import {
  useChanvrierStore,
  ToolType,
  TOOLS,
  HEMP_VARIETIES,
  HempVariety,
  FarmPlot,
  SEASON_CONFIG,
} from '@/lib/chanvrier-store';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const PLOT_GAP = 4;
const GRID_WIDTH = 8;
const PLOT_SIZE = (width - GRID_PADDING * 2 - PLOT_GAP * (GRID_WIDTH - 1)) / GRID_WIDTH;

export default function ChanvrierGameScreen() {
  // Store selectors
  const player = useChanvrierStore((s) => s.player);
  const time = useChanvrierStore((s) => s.time);
  const farm = useChanvrierStore((s) => s.farm);
  const isGamePaused = useChanvrierStore((s) => s.isGamePaused);
  const gameSpeed = useChanvrierStore((s) => s.gameSpeed);
  const isMuted = useChanvrierStore((s) => s.isMuted);
  const quests = useChanvrierStore((s) => s.quests);

  // Compter les quêtes non réclamées
  const unclaimedQuests = useMemo(() => {
    const progress = quests?.progress ?? [];
    return progress.filter((p) => p.completed && !p.claimed).length;
  }, [quests]);

  // Compter les plantes prêtes à récolter
  const readyToHarvest = useMemo(() => {
    return farm.plots.filter((p) => p.phase === 'mature').length;
  }, [farm.plots]);

  // Actions
  const selectTool = useChanvrierStore((s) => s.selectTool);
  const selectVariety = useChanvrierStore((s) => s.selectVariety);
  const plantSeed = useChanvrierStore((s) => s.plantSeed);
  const waterPlot = useChanvrierStore((s) => s.waterPlot);
  const fertilizePlot = useChanvrierStore((s) => s.fertilizePlot);
  const harvestPlot = useChanvrierStore((s) => s.harvestPlot);
  const updateGameTime = useChanvrierStore((s) => s.updateGameTime);
  const advanceDay = useChanvrierStore((s) => s.advanceDay);
  const pauseGame = useChanvrierStore((s) => s.pauseGame);
  const resumeGame = useChanvrierStore((s) => s.resumeGame);
  const setGameSpeed = useChanvrierStore((s) => s.setGameSpeed);
  const resetGame = useChanvrierStore((s) => s.resetGame);

  // Tutorial state
  const { showTutorial, completeTutorial, skipTutorial, restartTutorial } = useTutorialState();

  // Sound effects
  const { sounds } = useGameSounds();

  // Initialize audio manager and sync mute state
  useEffect(() => {
    audioManager.init();
    // Sync mute state from store to audioManager
    audioManager.setMuted(isMuted);

    return () => {
      audioManager.cleanup();
    };
  }, []);

  // Keep audioManager in sync with store's isMuted state
  useEffect(() => {
    audioManager.setMuted(isMuted);
  }, [isMuted]);

  // Detect level up and play sound
  const prevLevelRef = useRef(player.level);
  useEffect(() => {
    if (player.level > prevLevelRef.current) {
      audioManager.play('levelup', 1.0);
      sounds.levelUp();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevLevelRef.current = player.level;
  }, [player.level, sounds]);

  // Local state
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [actionResult, setActionResult] = useState<{
    type: 'success' | 'error' | 'harvest';
    message: string;
    data?: { yield: number; quality: number };
  } | null>(null);

  // Track previous ready count for notifications
  const prevReadyCountRef = useRef(readyToHarvest);

  // Game loop
  useEffect(() => {
    if (isGamePaused) return;

    const interval = setInterval(() => {
      updateGameTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [isGamePaused, updateGameTime]);

  // Notification when new plants are ready to harvest
  useEffect(() => {
    if (readyToHarvest > prevReadyCountRef.current) {
      // Nouvelle plante mature !
      audioManager.play('levelup', 0.5);
      sounds.harvest();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevReadyCountRef.current = readyToHarvest;
  }, [readyToHarvest, sounds]);

  // Handle plot press
  const handlePlotPress = useCallback((plot: FarmPlot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlotId(plot.id);

    const tool = player.selectedTool;

    // Actions selon l'outil sélectionné
    switch (tool) {
      case 'seeds':
        if (plot.phase === 'empty') {
          const success = plantSeed(plot.id);
          if (success) {
            setActionResult({ type: 'success', message: `${HEMP_VARIETIES[player.selectedVariety].name} planté!` });
            sounds.plant();
            audioManager.play('plant', 0.7);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            setActionResult({ type: 'error', message: 'Impossible de planter ici' });
            sounds.error();
            audioManager.play('error', 0.5);
          }
        }
        break;

      case 'watering_can':
        if (plot.phase !== 'empty' && plot.phase !== 'harvested') {
          const success = waterPlot(plot.id);
          if (success) {
            setActionResult({ type: 'success', message: 'Plante arrosée!' });
            sounds.water();
            audioManager.play('water', 0.6);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            setActionResult({ type: 'error', message: 'Déjà bien arrosé' });
            sounds.error();
            audioManager.play('error', 0.5);
          }
        }
        break;

      case 'fertilizer':
        if (plot.phase !== 'empty' && plot.phase !== 'harvested' && !plot.fertilized) {
          const success = fertilizePlot(plot.id);
          if (success) {
            setActionResult({ type: 'success', message: 'Engrais appliqué! +1★' });
            sounds.fertilize();
            audioManager.play('plant', 0.5);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            setActionResult({ type: 'error', message: "Pas d'engrais" });
            sounds.error();
            audioManager.play('error', 0.5);
          }
        }
        break;

      case 'sickle':
        if (plot.phase === 'mature') {
          const result = harvestPlot(plot.id);
          if (result) {
            setActionResult({
              type: 'harvest',
              message: 'Récolte réussie!',
              data: { yield: result.yield, quality: result.quality },
            });
            sounds.harvest();
            audioManager.play('harvest', 0.8);
            setTimeout(() => {
              sounds.coins();
              audioManager.play('coin', 0.5);
            }, 200);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } else if (plot.phase !== 'empty') {
          setActionResult({ type: 'error', message: 'Pas encore mûr' });
          sounds.error();
          audioManager.play('error', 0.5);
        }
        break;

      default:
        // Info sur la parcelle
        break;
    }

    // Clear action result after delay
    setTimeout(() => setActionResult(null), 2000);
  }, [player.selectedTool, player.selectedVariety, plantSeed, waterPlot, fertilizePlot, harvestPlot, sounds]);

  // Selected plot info
  const selectedPlot = useMemo(() => {
    return farm.plots.find((p) => p.id === selectedPlotId);
  }, [farm.plots, selectedPlotId]);

  // Tools list
  const tools: ToolType[] = ['hand', 'hoe', 'watering_can', 'seeds', 'sickle', 'fertilizer'];

  return (
    <SkyBackground time={time}>
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-4 pt-2">
          {/* Top row: Time + Settings */}
          <View className="flex-row justify-between items-center mb-2">
            <TimeHUD time={time} />

            <View className="flex-row gap-2">
              {/* Game speed toggle */}
              <Pressable
                onPress={() => setGameSpeed(gameSpeed === 'fast' ? 'normal' : 'fast')}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                <FastForward
                  size={20}
                  color={gameSpeed === 'fast' ? '#FBBF24' : 'white'}
                />
              </Pressable>

              {/* Pause/Play */}
              <Pressable
                onPress={() => (isGamePaused ? resumeGame() : pauseGame())}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                {isGamePaused ? (
                  <Play size={20} color="#4ADE80" />
                ) : (
                  <Pause size={20} color="white" />
                )}
              </Pressable>

              {/* Settings */}
              <Pressable
                onPress={() => setShowSettings(true)}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                <Settings size={20} color="white" />
              </Pressable>

              {/* Quests */}
              <Pressable
                onPress={() => setShowQuests(true)}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 20,
                  padding: 8,
                  position: 'relative',
                }}
              >
                <Target size={20} color="#FBBF24" />
                {unclaimedQuests > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      backgroundColor: '#EF4444',
                      borderRadius: 10,
                      minWidth: 18,
                      height: 18,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                      {unclaimedQuests}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Stats row */}
          <View
            className="flex-row gap-4 p-3 rounded-xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          >
            {/* Coins */}
            <View className="flex-row items-center gap-1">
              <Coins size={18} color="#FBBF24" />
              <Text style={{ color: '#FBBF24', fontWeight: 'bold', fontSize: 14 }}>
                {player.coins}
              </Text>
            </View>

            {/* Energy */}
            <View className="flex-1">
              <StatBar
                value={player.energy}
                maxValue={player.maxEnergy}
                color="#22C55E"
                icon="⚡"
                label="Énergie"
              />
            </View>

            {/* Level */}
            <View className="flex-row items-center gap-1">
              <Star size={16} color="#A855F7" />
              <Text style={{ color: '#A855F7', fontWeight: 'bold', fontSize: 12 }}>
                Niv.{player.level}
              </Text>
            </View>

            {/* Ready to harvest indicator */}
            {readyToHarvest > 0 && (
              <View
                className="flex-row items-center gap-1"
                style={{
                  backgroundColor: '#FFD70040',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Scissors size={14} color="#FFD700" />
                <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 12 }}>
                  {readyToHarvest}
                </Text>
              </View>
            )}

            {/* Shop */}
            <Pressable
              onPress={() => setShowShop(true)}
              style={{
                backgroundColor: '#3B82F6',
                borderRadius: 8,
                padding: 6,
              }}
            >
              <ShoppingBag size={18} color="white" />
            </Pressable>
          </View>
        </View>

        {/* Floating Harvest All Button */}
        {readyToHarvest > 0 && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={{
              position: 'absolute',
              top: 140,
              right: 16,
              zIndex: 100,
            }}
          >
            <Pressable
              onPress={() => {
                const maturePlots = farm.plots.filter((p) => p.phase === 'mature');
                let totalYield = 0;
                let harvestCount = 0;

                maturePlots.forEach((plot) => {
                  const result = harvestPlot(plot.id);
                  if (result) {
                    totalYield += result.yield;
                    harvestCount++;
                  }
                });

                if (harvestCount > 0) {
                  setActionResult({
                    type: 'harvest',
                    message: `${harvestCount} plantes recoltees!`,
                    data: { yield: totalYield, quality: 3 },
                  });

                  audioManager.play('harvest', 0.8);
                  setTimeout(() => {
                    audioManager.play('coin', 0.6);
                    sounds.coins();
                  }, 200);
                  sounds.harvest();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                  setTimeout(() => setActionResult(null), 2500);
                }
              }}
              style={{
                backgroundColor: '#ffd54f',
                borderRadius: 20,
                paddingVertical: 10,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 2,
                borderColor: '#f57f17',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Text style={{ fontSize: 18 }}>🌿✨</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2d5016' }}>
                Recolter ({readyToHarvest})
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Farm Grid */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: GRID_PADDING,
            paddingVertical: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text
            style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 12,
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            🌿 Ma vie de chanvrier 🌿
          </Text>

          {/* Season indicator */}
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: SEASON_CONFIG[time.season].colors[0] + '40',
              paddingHorizontal: 16,
              paddingVertical: 4,
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>
              {SEASON_CONFIG[time.season].icon} {SEASON_CONFIG[time.season].name} - Année {time.year}
            </Text>
          </View>

          {/* Grid */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: PLOT_GAP,
              justifyContent: 'center',
            }}
          >
            {farm.plots.map((plot, index) => (
              <PixelPlot
                key={plot.id}
                plot={plot}
                size={PLOT_SIZE}
                onPress={() => handlePlotPress(plot)}
                isSelected={selectedPlotId === plot.id}
                isUnlocked={index < farm.unlockedPlots}
              />
            ))}
          </View>

          {/* Selected plot info */}
          {selectedPlot && selectedPlot.variety && (
            <Animated.View
              entering={SlideInUp.duration(300)}
              style={{
                marginTop: 16,
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text style={{ fontSize: 24 }}>
                    {HEMP_VARIETIES[selectedPlot.variety].icon}
                  </Text>
                  <View>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>
                      {HEMP_VARIETIES[selectedPlot.variety].name}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
                      Jour {selectedPlot.daysSincePlanting} / {HEMP_VARIETIES[selectedPlot.variety].growthDays}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center gap-1">
                    <Text style={{ color: '#3B82F6', fontSize: 12 }}>💧 {Math.round(selectedPlot.waterLevel)}%</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>❤️ {Math.round(selectedPlot.health)}%</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Action Result Toast */}
          {actionResult && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: [{ translateX: -100 }],
                width: 200,
                backgroundColor:
                  actionResult.type === 'error'
                    ? '#EF4444'
                    : actionResult.type === 'harvest'
                    ? '#8B5CF6'
                    : '#22C55E',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              {actionResult.type === 'harvest' && actionResult.data && (
                <>
                  <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
                    {actionResult.data.yield}g
                  </Text>
                  <Text style={{ color: 'white', fontSize: 12 }}>
                    Qualité: {'★'.repeat(actionResult.data.quality)}
                  </Text>
                </>
              )}
              <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                {actionResult.message}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom Toolbar */}
        <View
          style={{
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderTopWidth: 2,
            borderTopColor: '#374151',
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        >
          {/* Seed selector (visible when seeds tool is selected) */}
          {player.selectedTool === 'seeds' && (
            <View style={{ marginBottom: 12 }}>
              <SeedSelector
                selectedVariety={player.selectedVariety}
                onSelect={selectVariety}
                inventory={player.inventory}
              />
            </View>
          )}

          {/* Tools */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}
          >
            {tools.map((tool) => (
              <ToolButton
                key={tool}
                tool={tool}
                isSelected={player.selectedTool === tool}
                onPress={() => {
                  selectTool(tool);
                  sounds.selectTool();
                  audioManager.play('click', 0.4);
                }}
              />
            ))}
          </View>
        </View>

        {/* Settings Modal */}
        <Modal visible={showSettings} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/70 px-6">
            <View
              className="w-full rounded-3xl p-6"
              style={{ backgroundColor: '#1F2937' }}
            >
              <View className="flex-row justify-between items-center mb-6">
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                  ⚙️ Paramètres
                </Text>
                <Pressable onPress={() => setShowSettings(false)}>
                  <X size={24} color="#9CA3AF" />
                </Pressable>
              </View>

              {/* Advance Day button */}
              <Pressable
                onPress={() => {
                  advanceDay();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={{
                  backgroundColor: '#3B82F6',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <ChevronRight size={20} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  Passer au jour suivant
                </Text>
              </Pressable>

              {/* Sound Toggle */}
              <Pressable
                onPress={() => {
                  useChanvrierStore.getState().toggleMute();
                  audioManager.setMuted(!isMuted);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{
                  backgroundColor: isMuted ? '#6B7280' : '#22C55E',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 20 }}>{isMuted ? '🔇' : '🔊'}</Text>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  Son: {isMuted ? 'OFF' : 'ON'}
                </Text>
              </Pressable>

              {/* Reset Game */}
              <Pressable
                onPress={() => {
                  resetGame();
                  setShowSettings(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                }}
                style={{
                  backgroundColor: '#EF4444',
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <RotateCcw size={20} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  Recommencer la partie
                </Text>
              </Pressable>

              {/* Replay Tutorial */}
              <Pressable
                onPress={() => {
                  useChanvrierStore.setState(state => ({
                    player: {
                      ...state.player,
                      tutorialCompleted: false,
                    },
                  }));
                  setShowSettings(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={{
                  backgroundColor: '#8B5CF6',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <HelpCircle size={20} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  Revoir le tutoriel
                </Text>
              </Pressable>

              {/* Stats */}
              <View
                style={{
                  marginTop: 20,
                  backgroundColor: '#374151',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>
                  Statistiques
                </Text>
                <Text style={{ color: 'white', fontSize: 12 }}>
                  🌿 Récoltes totales: {farm.totalHarvests}
                </Text>
                <Text style={{ color: 'white', fontSize: 12 }}>
                  💰 Gains totaux: {farm.totalEarnings} pièces
                </Text>
                <Text style={{ color: 'white', fontSize: 12 }}>
                  ⭐ Expérience: {player.experience}/{player.experienceToNextLevel}
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Shop Modal */}
        <ShopModal
          visible={showShop}
          onClose={() => setShowShop(false)}
          coins={player.coins}
          inventory={player.inventory}
          sounds={sounds}
        />

        {/* Quests Panel */}
        <QuestsPanel
          visible={showQuests}
          onClose={() => setShowQuests(false)}
        />

        {/* Tutorial */}
        <Tutorial
          visible={showTutorial}
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      </SafeAreaView>
    </SkyBackground>
  );
}

// Shop Modal Component
function ShopModal({
  visible,
  onClose,
  coins,
  inventory,
  sounds,
}: {
  visible: boolean;
  onClose: () => void;
  coins: number;
  inventory: Record<string, number>;
  sounds: ReturnType<typeof useGameSounds>['sounds'];
}) {
  const addToInventory = useChanvrierStore((s) => s.addToInventory);
  const spendCoins = useChanvrierStore((s) => s.spendCoins);

  const shopItems = [
    { id: 'sativa_seeds', name: 'Graines Sativa', icon: '🌿', price: 10, quantity: 5 },
    { id: 'indica_seeds', name: 'Graines Indica', icon: '🍃', price: 15, quantity: 5 },
    { id: 'hybrid_seeds', name: 'Graines Hybride', icon: '🌱', price: 12, quantity: 5 },
    { id: 'cbd_rich_seeds', name: 'Graines CBD Rich', icon: '💚', price: 25, quantity: 3 },
    { id: 'fertilizer', name: 'Engrais', icon: '💩', price: 20, quantity: 5 },
  ];

  const handleBuy = (item: typeof shopItems[0]) => {
    if (spendCoins(item.price)) {
      addToInventory(item.id, item.quantity);
      sounds.buy();
      sounds.coins();
      audioManager.play('coin', 0.6);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      sounds.error();
      audioManager.play('error', 0.5);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View
          style={{
            backgroundColor: '#1F2937',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '70%',
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
              🛒 Boutique
            </Text>
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1">
                <Coins size={18} color="#FBBF24" />
                <Text style={{ color: '#FBBF24', fontWeight: 'bold' }}>{coins}</Text>
              </View>
              <Pressable onPress={onClose}>
                <X size={24} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {shopItems.map((item) => {
              const canAfford = coins >= item.price;
              const currentStock = inventory[item.id] || 0;

              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#374151',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 28, marginRight: 12 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{item.name}</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                      x{item.quantity} | En stock: {currentStock}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleBuy(item)}
                    disabled={!canAfford}
                    style={{
                      backgroundColor: canAfford ? '#22C55E' : '#4B5563',
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Coins size={14} color={canAfford ? 'white' : '#9CA3AF'} />
                    <Text
                      style={{
                        color: canAfford ? 'white' : '#9CA3AF',
                        fontWeight: 'bold',
                      }}
                    >
                      {item.price}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
