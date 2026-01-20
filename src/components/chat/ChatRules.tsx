import React from 'react';
import { View, Pressable, Modal } from 'react-native';
import { Text } from '@/components/ui';
import { Users, X, Circle, MessageCircle, Shield, Heart, Ban, Lightbulb } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

// Couleurs du chat
const CHAT_COLORS = {
  background: {
    primary: '#1a1d2e',
  },
};

interface ChatRulesProps {
  visible: boolean;
  onClose: () => void;
  producersCount: number;
  onlineCount: number;
  messagesCount: number;
}

export function ChatRules({
  visible,
  onClose,
  producersCount,
  onlineCount,
  messagesCount,
}: ChatRulesProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 items-center justify-center px-6">
        <Animated.View
          entering={SlideInUp.duration(300).springify()}
          className="w-full max-w-sm rounded-3xl p-6"
          style={{
            backgroundColor: CHAT_COLORS.background.primary,
            borderWidth: 2,
            borderColor: COLORS.primary.gold,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <Users size={24} color="#10B981" />
              <Text className="text-white text-xl font-bold ml-3">
                Chat Producteurs
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-white/10 items-center justify-center"
            >
              <X size={18} color="#fff" />
            </Pressable>
          </View>

          {/* Règles du chat */}
          <View className="mb-6">
            <Text className="text-emerald-400 font-bold mb-3">Règles du chat</Text>
            <View className="bg-white/5 rounded-xl p-4" style={{ gap: 12 }}>
              <View className="flex-row items-start">
                <View className="w-6 h-6 rounded-full bg-emerald-500/20 items-center justify-center mr-3 mt-0.5">
                  <Heart size={12} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-300 text-sm">
                    Respectez les autres producteurs
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-6 h-6 rounded-full bg-emerald-500/20 items-center justify-center mr-3 mt-0.5">
                  <Lightbulb size={12} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-300 text-sm">
                    Partagez vos conseils et expériences
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-6 h-6 rounded-full bg-red-500/20 items-center justify-center mr-3 mt-0.5">
                  <Ban size={12} color="#EF4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-300 text-sm">
                    Pas de publicité ou spam
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-6 h-6 rounded-full bg-emerald-500/20 items-center justify-center mr-3 mt-0.5">
                  <Shield size={12} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-300 text-sm">
                    Entraide et bienveillance
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Statistiques */}
          <View className="mb-6">
            <Text className="text-emerald-400 font-bold mb-3">Communauté</Text>
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1 bg-white/5 rounded-xl p-3 items-center">
                <Users size={20} color="#10B981" />
                <Text className="text-emerald-400 text-2xl font-bold mt-1">
                  {producersCount || 1}
                </Text>
                <Text className="text-gray-400 text-xs">Producteurs</Text>
              </View>
              <View className="flex-1 bg-white/5 rounded-xl p-3 items-center">
                <Circle size={20} color="#10B981" fill="#10B981" />
                <Text className="text-emerald-400 text-2xl font-bold mt-1">
                  {onlineCount}
                </Text>
                <Text className="text-gray-400 text-xs">En ligne</Text>
              </View>
              <View className="flex-1 bg-white/5 rounded-xl p-3 items-center">
                <MessageCircle size={20} color="#10B981" />
                <Text className="text-emerald-400 text-2xl font-bold mt-1">
                  {messagesCount}
                </Text>
                <Text className="text-gray-400 text-xs">Messages</Text>
              </View>
            </View>
          </View>

          {/* Info Realtime */}
          <View className="bg-emerald-900/30 rounded-xl p-3 mb-6">
            <View className="flex-row items-center">
              <Circle size={8} color="#10B981" fill="#10B981" />
              <Text className="text-emerald-400 text-xs ml-2">
                Messages en temps réel activés
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: COLORS.primary.gold }}
          >
            <Text className="text-white font-bold">Compris !</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
