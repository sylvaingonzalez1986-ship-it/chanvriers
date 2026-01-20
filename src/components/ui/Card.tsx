import React from 'react';
import { View, ViewProps, ViewStyle, Platform, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/colors';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Card component optimized for both iOS and Android
 * Uses proper elevation on Android and shadows on iOS
 */
export function Card({
  variant = 'default',
  padding = 'md',
  style,
  children,
  ...props
}: CardProps) {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: COLORS.background.charcoal,
          ...Platform.select({
            android: { elevation: 8 },
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
            },
          }),
        };
      case 'outlined':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(212, 168, 83, 0.3)',
        };
      case 'default':
      default:
        return {
          // Use rgba instead of hex with alpha for Android compatibility
          backgroundColor: Platform.OS === 'android'
            ? 'rgba(255, 255, 255, 0.08)'
            : `${COLORS.text.white}08`,
          ...Platform.select({
            android: { elevation: 2 },
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            },
          }),
        };
    }
  };

  const getPaddingStyles = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return {};
      case 'sm':
        return { padding: 8 };
      case 'md':
        return { padding: 16 };
      case 'lg':
        return { padding: 24 };
      default:
        return { padding: 16 };
    }
  };

  return (
    <View
      style={[
        styles.base,
        getVariantStyles(),
        getPaddingStyles(),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
