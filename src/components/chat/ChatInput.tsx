import React, { useState, useCallback } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { Send, WifiOff } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import * as Haptics from 'expo-haptics';
import { useOfflineStatus } from '@/lib/network-context';

const MAX_CHARS = 500;

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  isSending: boolean;
  bottomInset: number;
}

export function ChatInput({ onSend, isSending, bottomInset }: ChatInputProps) {
  const [messageText, setMessageText] = useState('');
  const { isOffline } = useOfflineStatus();
  const charCount = messageText.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = messageText.trim().length > 0 && !isOverLimit && !isSending && !isOffline;

  const handleSend = useCallback(async () => {
    if (isOffline) {
      // Feedback pour action bloquée offline
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!canSend) return;

    const content = messageText.trim();
    setMessageText('');

    // Haptic feedback on send
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await onSend(content);
  }, [canSend, isOffline, messageText, onSend]);

  const handleChangeText = useCallback((text: string) => {
    setMessageText(text);

    // Light haptic when approaching limit
    if (text.length === MAX_CHARS - 50) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Warning haptic when at limit
    if (text.length === MAX_CHARS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  return (
    <View
      className="px-4 py-3"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderTopColor: 'rgba(212, 175, 55, 0.2)',
        borderTopWidth: 1,
        paddingBottom: bottomInset + 8,
      }}
    >
      {/* Offline indicator */}
      {isOffline && (
        <View
          className="flex-row items-center justify-center mb-2 py-2 px-3 rounded-lg"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
        >
          <WifiOff size={14} color="#EF4444" />
          <Text className="text-xs font-medium ml-2" style={{ color: '#EF4444' }}>
            Mode hors ligne - Envoi désactivé
          </Text>
        </View>
      )}

      {/* Character counter */}
      {charCount > MAX_CHARS - 100 && (
        <View className="flex-row justify-end mb-1 px-1">
          <Text
            className="text-xs"
            style={{
              color: isOverLimit
                ? '#EF4444'
                : charCount > MAX_CHARS - 50
                ? '#F59E0B'
                : 'rgba(255,255,255,0.5)',
            }}
          >
            {charCount}/{MAX_CHARS}
          </Text>
        </View>
      )}

      <View className="flex-row items-end" style={{ opacity: isOffline ? 0.5 : 1 }}>
        <View
          className="flex-1 rounded-2xl px-4 py-3 mr-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            borderColor: isOverLimit
              ? 'rgba(239, 68, 68, 0.5)'
              : isOffline
              ? 'rgba(239, 68, 68, 0.3)'
              : 'rgba(212, 175, 55, 0.2)',
            maxHeight: 120,
          }}
        >
          <TextInput
            value={messageText}
            onChangeText={handleChangeText}
            placeholder={isOffline ? 'Connexion requise pour envoyer...' : 'Écrire un message...'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            className="text-white text-base"
            style={{ maxHeight: 100 }}
            editable={!isSending && !isOffline}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{
            backgroundColor: canSend
              ? COLORS.primary.gold
              : isOffline
              ? 'rgba(239, 68, 68, 0.3)'
              : 'rgba(212, 175, 55, 0.3)',
          }}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#1a1d2e" />
          ) : isOffline ? (
            <WifiOff size={18} color="rgba(239, 68, 68, 0.7)" />
          ) : (
            <Send
              size={20}
              color={canSend ? '#1a1d2e' : 'rgba(255,255,255,0.4)'}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
