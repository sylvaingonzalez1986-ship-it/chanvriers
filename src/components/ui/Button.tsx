import React from 'react';
import { Pressable, PressableProps, ViewStyle, Platform, StyleSheet } from 'react-native';
import { Text } from './Text';
import { COLORS } from '@/lib/colors';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textClassName?: string;
}

/**
 * Button component optimized for both iOS and Android
 * Uses proper elevation on Android and shadows on iOS
 */
export function Button({
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textClassName,
  ...props
}: ButtonProps) {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? 'rgba(212, 168, 83, 0.5)' : COLORS.primary.gold,
          ...Platform.select({
            android: { elevation: disabled ? 0 : 4 },
            ios: {
              shadowColor: COLORS.primary.gold,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: disabled ? 0 : 0.3,
              shadowRadius: 4,
            },
          }),
        };
      case 'secondary':
        return {
          backgroundColor: disabled ? 'rgba(61, 122, 74, 0.5)' : COLORS.accent.forest,
          ...Platform.select({
            android: { elevation: disabled ? 0 : 3 },
            ios: {
              shadowColor: COLORS.accent.forest,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: disabled ? 0 : 0.25,
              shadowRadius: 4,
            },
          }),
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: disabled ? 'rgba(212, 168, 83, 0.4)' : COLORS.primary.gold,
        };
      case 'ghost':
        return {
          backgroundColor: Platform.OS === 'android'
            ? 'rgba(212, 168, 83, 0.15)' // More visible on Android
            : 'rgba(212, 168, 83, 0.1)',
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 };
      case 'md':
        return { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16 };
      default:
        return {};
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.text.muted;
    switch (variant) {
      case 'primary':
      case 'secondary':
        return COLORS.text.white;
      case 'outline':
      case 'ghost':
        return COLORS.primary.gold;
      default:
        return COLORS.text.white;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        getVariantStyles(),
        getSizeStyles(),
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...props}
    >
      <Text
        className={`font-bold ${getTextSize()} ${textClassName ?? ''}`}
        style={{ color: getTextColor() }}
      >
        {loading ? 'Chargement...' : title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
