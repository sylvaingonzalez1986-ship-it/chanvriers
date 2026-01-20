/**
 * Composant affichant l'état de connexion du chat
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react-native';
import {
  ChatConnectionStatus,
  onChatConnectionStateChange,
  forceReconnectChat,
} from '@/lib/supabase-sync';

interface ChatConnectionBannerProps {
  onStatusChange?: (status: ChatConnectionStatus) => void;
}

export function ChatConnectionBanner({ onStatusChange }: ChatConnectionBannerProps) {
  const [status, setStatus] = useState<ChatConnectionStatus>('disconnected');
  const [message, setMessage] = useState<string | undefined>();
  const [showSuccess, setShowSuccess] = useState(false);

  // Animation for reconnecting indicator
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (status === 'reconnecting' || status === 'connecting') {
      rotation.value = withRepeat(
        withSequence(
          withTiming(360, { duration: 1000 }),
          withTiming(0, { duration: 0 })
        ),
        -1
      );
    } else {
      rotation.value = 0;
    }
  }, [status, rotation]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    const unsubscribe = onChatConnectionStateChange((newStatus, newMessage) => {
      // Show success briefly when reconnected
      if (status === 'reconnecting' && newStatus === 'connected') {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }

      setStatus(newStatus);
      setMessage(newMessage);
      onStatusChange?.(newStatus);
    });

    return unsubscribe;
  }, [status, onStatusChange]);

  // Don't show anything if connected and not showing success
  if (status === 'connected' && !showSuccess) {
    return null;
  }

  // Don't show for initial connecting state
  if (status === 'connecting') {
    return null;
  }

  const getStatusConfig = () => {
    if (showSuccess) {
      return {
        bg: 'bg-emerald-900/80',
        icon: <CheckCircle size={16} color="#10B981" />,
        text: 'Chat reconnecté',
        textColor: 'text-emerald-400',
      };
    }

    switch (status) {
      case 'reconnecting':
        return {
          bg: 'bg-amber-900/80',
          icon: (
            <Animated.View style={rotateStyle}>
              <RefreshCw size={16} color="#F59E0B" />
            </Animated.View>
          ),
          text: message || 'Connexion au chat perdue. Reconnexion en cours...',
          textColor: 'text-amber-400',
        };
      case 'error':
        return {
          bg: 'bg-red-900/80',
          icon: <WifiOff size={16} color="#EF4444" />,
          text: message || 'Impossible de se connecter au chat',
          textColor: 'text-red-400',
          showRetry: true,
        };
      case 'disconnected':
        return {
          bg: 'bg-gray-800/80',
          icon: <WifiOff size={16} color="#6B7280" />,
          text: 'Chat déconnecté',
          textColor: 'text-gray-400',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <View className={`${config.bg} rounded-lg px-3 py-2 mx-4 mb-2 flex-row items-center`}>
      {config.icon}
      <Text className={`${config.textColor} text-sm flex-1 ml-2`} numberOfLines={1}>
        {config.text}
      </Text>
      {config.showRetry && (
        <Pressable
          onPress={forceReconnectChat}
          className="bg-white/10 rounded px-2 py-1 ml-2 active:opacity-70"
        >
          <Text className="text-red-400 text-xs font-medium">Réessayer</Text>
        </Pressable>
      )}
    </View>
  );
}

// Hook pour utiliser l'état de connexion
export function useChatConnectionStatus() {
  const [status, setStatus] = useState<ChatConnectionStatus>('disconnected');

  useEffect(() => {
    const unsubscribe = onChatConnectionStateChange((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  return status;
}
