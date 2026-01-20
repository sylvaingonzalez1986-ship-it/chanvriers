/**
 * Bouton qui se désactive automatiquement en mode offline
 * Affiche un feedback visuel (grisé + tooltip) quand l'app est hors ligne
 */
import React, { useState } from 'react';
import { Pressable, PressableProps, View, ViewStyle } from 'react-native';
import { Text } from '@/components/ui';
import { WifiOff } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withSequence,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useOfflineStatus } from '@/lib/network-context';

interface OfflineDisabledButtonProps extends Omit<PressableProps, 'onPress' | 'disabled' | 'style'> {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  className?: string;
  children: React.ReactNode;
  offlineMessage?: string;
  showOfflineIcon?: boolean;
}

export function OfflineDisabledButton({
  onPress,
  disabled = false,
  style,
  className,
  children,
  offlineMessage = 'Non disponible hors ligne',
  showOfflineIcon = true,
  ...props
}: OfflineDisabledButtonProps) {
  const { isOffline } = useOfflineStatus();
  const [showTooltip, setShowTooltip] = useState(false);
  const shakeX = useSharedValue(0);

  const isDisabled = disabled || isOffline;

  const handlePress = () => {
    if (isOffline) {
      // Feedback visuel et haptique pour action bloquée
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Animation de shake
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );

      // Afficher le tooltip
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <View>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          style={[
            style,
            isOffline && { opacity: 0.5 },
          ]}
          className={className}
          {...props}
        >
          <View className="flex-row items-center justify-center">
            {isOffline && showOfflineIcon && (
              <WifiOff size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
            )}
            {children}
          </View>
        </Pressable>
      </Animated.View>

      {/* Tooltip offline */}
      {showTooltip && (
        <View
          className="absolute -top-10 left-0 right-0 items-center"
          pointerEvents="none"
        >
          <View
            className="px-3 py-2 rounded-lg flex-row items-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}
          >
            <WifiOff size={12} color="#fff" />
            <Text className="text-white text-xs font-medium ml-1.5">
              {offlineMessage}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Wrapper pour griser une zone entière en mode offline
 */
interface OfflineDisabledZoneProps {
  children: React.ReactNode;
  style?: ViewStyle;
  message?: string;
  showOverlay?: boolean;
}

export function OfflineDisabledZone({
  children,
  style,
  message = 'Fonctionnalité non disponible hors ligne',
  showOverlay = true,
}: OfflineDisabledZoneProps) {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[style, { position: 'relative' }]}>
      <View style={{ opacity: 0.4 }} pointerEvents="none">
        {children}
      </View>

      {showOverlay && (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        >
          <View
            className="px-4 py-3 rounded-xl flex-row items-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}
          >
            <WifiOff size={16} color="#fff" />
            <Text className="text-white text-sm font-medium ml-2">
              {message}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
