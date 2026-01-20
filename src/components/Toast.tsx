/**
 * Toast Component - Les Chanvriers Unis
 * Composant de notification temporaire réutilisable
 */

import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CheckCircle,
  AlertCircle,
  Info,
  X,
  AlertTriangle,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
  position?: 'top' | 'bottom';
}

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    backgroundColor: `${COLORS.accent.hemp}20`,
    borderColor: COLORS.accent.hemp,
    iconColor: COLORS.accent.hemp,
    textColor: COLORS.accent.hemp,
  },
  error: {
    icon: AlertCircle,
    backgroundColor: `${COLORS.accent.red}20`,
    borderColor: COLORS.accent.red,
    iconColor: COLORS.accent.red,
    textColor: COLORS.accent.red,
  },
  warning: {
    icon: AlertTriangle,
    backgroundColor: '#F59E0B20',
    borderColor: '#F59E0B',
    iconColor: '#F59E0B',
    textColor: '#F59E0B',
  },
  info: {
    icon: Info,
    backgroundColor: `${COLORS.accent.teal}20`,
    borderColor: COLORS.accent.teal,
    iconColor: COLORS.accent.teal,
    textColor: COLORS.accent.teal,
  },
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
  position = 'top',
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(position === 'top' ? -100 : 100);
  const opacity = useSharedValue(0);

  const config = TOAST_CONFIG[type];
  const IconComponent = config.icon;

  useEffect(() => {
    if (visible) {
      // Animate in
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto-hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    translateY.value = withTiming(position === 'top' ? -100 : 100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(onHide)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          zIndex: 9999,
          ...(position === 'top'
            ? { top: insets.top + 16 }
            : { bottom: insets.bottom + 16 }),
        },
        animatedStyle,
      ]}
    >
      <View
        className="flex-row items-center rounded-2xl px-4 py-3"
        style={{
          backgroundColor: config.backgroundColor,
          borderWidth: 1.5,
          borderColor: config.borderColor,
          shadowColor: config.borderColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <IconComponent size={22} color={config.iconColor} />
        <Text
          className="flex-1 ml-3 font-medium"
          style={{ color: config.textColor }}
          numberOfLines={2}
        >
          {message}
        </Text>
        <Pressable
          onPress={hideToast}
          className="ml-2 p-1 rounded-full"
          style={{ backgroundColor: `${config.borderColor}20` }}
        >
          <X size={16} color={config.iconColor} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

// Hook pour gérer facilement les toasts
import { useState, useCallback } from 'react';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
};
