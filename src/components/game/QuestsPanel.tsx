import React, { useMemo } from 'react';
import { View, Pressable, ScrollView, Modal } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, Check, Lock, Gift, ChevronRight } from 'lucide-react-native';
import { useChanvrierStore } from '@/lib/chanvrier-store';
import { QUESTS, Quest } from '@/lib/quests-data';
import { audioManager } from '@/lib/audio-manager';

interface QuestsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function QuestsPanel({ visible, onClose }: QuestsPanelProps) {
  const player = useChanvrierStore((s) => s.player);
  const farm = useChanvrierStore((s) => s.farm);
  const quests = useChanvrierStore((s) => s.quests);
  const claimQuestReward = useChanvrierStore((s) => s.claimQuestReward);

  // Calculer la progression de chaque quête
  const questsWithProgress = useMemo(() => {
    // Fallback si quests.progress n'existe pas encore (migration)
    const progress = quests?.progress ?? [];

    return QUESTS.map((quest) => {
      // Trouver la progression stockée
      const storedProgress = progress.find((p) => p.questId === quest.id);

      let current = 0;
      switch (quest.type) {
        case 'plant':
          current = farm.totalPlanted ?? 0;
          break;
        case 'harvest':
          current = farm.totalHarvests ?? 0;
          break;
        case 'earn':
          current = player.coins ?? 0;
          break;
        case 'level':
          current = player.level ?? 1;
          break;
        case 'unlock':
          current = Math.max(0, (farm.unlockedPlots ?? 12) - 12);
          break;
      }

      const isCompleted = current >= quest.target;
      const isClaimed = storedProgress?.claimed ?? false;

      // Vérifier si la quête prérequise est complétée et réclamée
      const isLocked = quest.prerequisite
        ? !progress.find((p) => p.questId === quest.prerequisite)?.claimed
        : false;

      return {
        ...quest,
        current: Math.min(current, quest.target),
        isCompleted,
        isClaimed,
        isLocked,
        progress: Math.min((current / quest.target) * 100, 100),
      };
    });
  }, [farm, player, quests]);

  const handleClaimReward = (quest: Quest & { isCompleted: boolean; isClaimed: boolean }) => {
    if (!quest.isCompleted || quest.isClaimed) return;

    if (claimQuestReward(quest.id)) {
      audioManager.play('coin', 0.8);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Compter les quêtes à réclamer
  const claimableCount = questsWithProgress.filter(
    (q) => q.isCompleted && !q.isClaimed && !q.isLocked
  ).length;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/60">
        <Animated.View
          entering={SlideInRight.duration(300)}
          style={{
            backgroundColor: '#1F2937',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
          }}
        >
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottomWidth: 1, borderBottomColor: '#374151' }}
          >
            <View className="flex-row items-center gap-3">
              <Text style={{ fontSize: 24 }}>🎯</Text>
              <View>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                  Quêtes
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                  {questsWithProgress.filter((q) => q.isClaimed).length}/{QUESTS.length} complétées
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              {claimableCount > 0 && (
                <View
                  style={{
                    backgroundColor: '#22C55E',
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                    {claimableCount} à réclamer
                  </Text>
                </View>
              )}
              <Pressable onPress={onClose}>
                <X size={24} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* Quest List */}
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {questsWithProgress.map((quest, index) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onClaim={() => handleClaimReward(quest)}
                delay={index * 50}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface QuestCardProps {
  quest: Quest & {
    current: number;
    isCompleted: boolean;
    isClaimed: boolean;
    isLocked: boolean;
    progress: number;
  };
  onClaim: () => void;
  delay: number;
}

function QuestCard({ quest, onClaim, delay }: QuestCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (quest.isCompleted && !quest.isClaimed && !quest.isLocked) {
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1)
      );
      onClaim();
    }
  };

  const getStatusColor = () => {
    if (quest.isLocked) return '#4B5563';
    if (quest.isClaimed) return '#22C55E';
    if (quest.isCompleted) return '#FBBF24';
    return '#3B82F6';
  };

  const getStatusIcon = () => {
    if (quest.isLocked) return <Lock size={16} color="#6B7280" />;
    if (quest.isClaimed) return <Check size={16} color="#22C55E" />;
    if (quest.isCompleted) return <Gift size={16} color="#FBBF24" />;
    return <ChevronRight size={16} color="#3B82F6" />;
  };

  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(300)}
      style={animatedStyle}
    >
      <Pressable
        onPress={handlePress}
        disabled={quest.isLocked || quest.isClaimed || !quest.isCompleted}
        style={{
          backgroundColor: quest.isLocked ? '#1F2937' : '#374151',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 2,
          borderColor: getStatusColor(),
          opacity: quest.isLocked ? 0.5 : 1,
        }}
      >
        <View className="flex-row items-start">
          {/* Emoji */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: `${getStatusColor()}20`,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 24 }}>{quest.emoji}</Text>
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View className="flex-row items-center justify-between">
              <Text
                style={{
                  color: quest.isLocked ? '#6B7280' : 'white',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                {quest.title}
              </Text>
              {getStatusIcon()}
            </View>

            <Text
              style={{
                color: quest.isLocked ? '#4B5563' : '#9CA3AF',
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {quest.description}
            </Text>

            {/* Progress bar */}
            {!quest.isClaimed && (
              <View style={{ marginTop: 10 }}>
                <View
                  style={{
                    height: 6,
                    backgroundColor: '#1F2937',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${quest.progress}%`,
                      backgroundColor: getStatusColor(),
                      borderRadius: 3,
                    }}
                  />
                </View>
                <Text
                  style={{
                    color: '#6B7280',
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {quest.current}/{quest.target}
                </Text>
              </View>
            )}

            {/* Rewards */}
            <View className="flex-row items-center gap-3 mt-2">
              {quest.reward.coins && (
                <View className="flex-row items-center gap-1">
                  <Text style={{ fontSize: 12 }}>💰</Text>
                  <Text style={{ color: '#FBBF24', fontSize: 12, fontWeight: 'bold' }}>
                    +{quest.reward.coins}
                  </Text>
                </View>
              )}
              {quest.reward.xp && (
                <View className="flex-row items-center gap-1">
                  <Text style={{ fontSize: 12 }}>⭐</Text>
                  <Text style={{ color: '#A855F7', fontSize: 12, fontWeight: 'bold' }}>
                    +{quest.reward.xp} XP
                  </Text>
                </View>
              )}
            </View>

            {/* Claim button */}
            {quest.isCompleted && !quest.isClaimed && !quest.isLocked && (
              <View
                style={{
                  backgroundColor: '#22C55E',
                  borderRadius: 8,
                  paddingVertical: 8,
                  marginTop: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                  🎁 Réclamer la récompense
                </Text>
              </View>
            )}

            {/* Completed badge */}
            {quest.isClaimed && (
              <View
                style={{
                  backgroundColor: '#22C55E20',
                  borderRadius: 8,
                  paddingVertical: 6,
                  marginTop: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Check size={14} color="#22C55E" />
                <Text style={{ color: '#22C55E', fontWeight: 'bold', fontSize: 12 }}>
                  Complétée
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
