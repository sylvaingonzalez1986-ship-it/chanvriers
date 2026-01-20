/**
 * Bannière affichant l'état réseau (hors ligne / reconnexion)
 */
import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NetworkBannerProps {
  isOnline: boolean;
  isRetrying?: boolean;
  message?: string;
  onRetry?: () => void;
  showSuccess?: boolean; // Afficher brièvement "Reconnecté"
}

export function NetworkBanner({
  isOnline,
  isRetrying = false,
  message,
  onRetry,
  showSuccess = false,
}: NetworkBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  // Afficher/masquer la bannière
  useEffect(() => {
    if (!isOnline || showSuccess) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isOnline, showSuccess, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Animation de rotation pour l'icône de retry
  const rotateValue = useSharedValue(0);

  useEffect(() => {
    if (isRetrying) {
      const interval = setInterval(() => {
        rotateValue.value = withTiming(rotateValue.value + 360, { duration: 1000 });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRetrying, rotateValue]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  // Ne rien afficher si en ligne et pas de message de succès
  if (isOnline && !showSuccess) {
    return null;
  }

  // Déterminer le contenu
  const isSuccess = showSuccess && isOnline;
  const backgroundColor = isSuccess ? '#10B981' : isRetrying ? '#F59E0B' : '#EF4444';
  const displayMessage = isSuccess
    ? 'Connexion rétablie'
    : message || 'Connexion internet indisponible. Certaines fonctionnalités sont limitées.';

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          paddingTop: insets.top,
          backgroundColor,
        },
        animatedStyle,
      ]}
    >
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center flex-1">
          {isSuccess ? (
            <CheckCircle size={20} color="#fff" />
          ) : isRetrying ? (
            <Animated.View style={rotateStyle}>
              <RefreshCw size={20} color="#fff" />
            </Animated.View>
          ) : (
            <WifiOff size={20} color="#fff" />
          )}
          <Text className="text-white font-medium ml-3 flex-1" numberOfLines={2}>
            {displayMessage}
          </Text>
        </View>

        {!isOnline && !isRetrying && onRetry && (
          <Pressable
            onPress={onRetry}
            className="bg-white/20 rounded-lg px-3 py-2 ml-3 active:opacity-70"
          >
            <Text className="text-white font-semibold text-sm">Réessayer</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

// Bannière plus petite pour les sections spécifiques
interface InlineBannerProps {
  type: 'warning' | 'error' | 'info';
  message: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function InlineBanner({ type, message, onAction, actionLabel }: InlineBannerProps) {
  const colors = {
    warning: { bg: 'bg-amber-900/30', border: 'border-amber-700/50', text: 'text-amber-400' },
    error: { bg: 'bg-red-900/30', border: 'border-red-700/50', text: 'text-red-400' },
    info: { bg: 'bg-blue-900/30', border: 'border-blue-700/50', text: 'text-blue-400' },
  };

  const icons = {
    warning: <AlertTriangle size={18} color="#F59E0B" />,
    error: <WifiOff size={18} color="#EF4444" />,
    info: <RefreshCw size={18} color="#3B82F6" />,
  };

  const { bg, border, text } = colors[type];

  return (
    <View className={`${bg} ${border} border rounded-xl p-3 flex-row items-center`}>
      {icons[type]}
      <Text className={`${text} text-sm flex-1 ml-2`}>{message}</Text>
      {onAction && actionLabel && (
        <Pressable
          onPress={onAction}
          className="bg-white/10 rounded-lg px-3 py-1.5 ml-2 active:opacity-70"
        >
          <Text className={`${text} text-sm font-medium`}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
