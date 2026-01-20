/**
 * CultureTypeIcons - Affiche les icônes de type de culture (Outdoor, Greenhouse, Indoor)
 * Style premium avec animation de pulsation et effets glow
 */

import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { OutdoorIcon } from './icons/OutdoorIcon';
import { GreenhouseIcon } from './icons/GreenhouseIcon';
import { IndoorIcon } from './icons/IndoorIcon';
import { COLORS } from '@/lib/colors';

interface CultureTypeIconsProps {
  outdoor?: boolean;
  greenhouse?: boolean;
  indoor?: boolean;
  size?: number;
  showLabels?: boolean;
  animated?: boolean;
  onPress?: (type: 'outdoor' | 'greenhouse' | 'indoor') => void;
}

// Composant pour un seul badge d'icône
const IconBadge = ({
  children,
  color,
  animated = true,
  onPress,
  label,
  showLabel = false,
}: {
  children: React.ReactNode;
  color: string;
  animated?: boolean;
  onPress?: () => void;
  label?: string;
  showLabel?: boolean;
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (animated) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite
        false
      );
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const content = (
    <Animated.View
      style={[
        {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: `${COLORS.background.nightSky}99`,
          borderWidth: 1.5,
          borderColor: COLORS.primary.gold,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 6,
        },
        animated ? animatedStyle : {},
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={handlePress} style={{ alignItems: 'center' }}>
        {content}
        {showLabel && label && (
          <Animated.Text
            style={{
              color: COLORS.text.muted,
              fontSize: 9,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            {label}
          </Animated.Text>
        )}
      </Pressable>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      {content}
      {showLabel && label && (
        <Animated.Text
          style={{
            color: COLORS.text.muted,
            fontSize: 9,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {label}
        </Animated.Text>
      )}
    </View>
  );
};

export function CultureTypeIcons({
  outdoor = false,
  greenhouse = false,
  indoor = false,
  size = 24,
  showLabels = false,
  animated = true,
  onPress,
}: CultureTypeIconsProps) {
  // Ne rien afficher si aucun type n'est sélectionné
  if (!outdoor && !greenhouse && !indoor) {
    return null;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {outdoor && (
        <IconBadge
          color="#FFD700"
          animated={animated}
          onPress={onPress ? () => onPress('outdoor') : undefined}
          label="Outdoor"
          showLabel={showLabels}
        >
          <OutdoorIcon size={size} />
        </IconBadge>
      )}
      {greenhouse && (
        <IconBadge
          color="#10B981"
          animated={animated}
          onPress={onPress ? () => onPress('greenhouse') : undefined}
          label="Serre"
          showLabel={showLabels}
        >
          <GreenhouseIcon size={size} />
        </IconBadge>
      )}
      {indoor && (
        <IconBadge
          color="#3B82F6"
          animated={animated}
          onPress={onPress ? () => onPress('indoor') : undefined}
          label="Indoor"
          showLabel={showLabels}
        >
          <IndoorIcon size={size} />
        </IconBadge>
      )}
    </View>
  );
}

// Export des icônes individuelles pour réutilisation
export { OutdoorIcon } from './icons/OutdoorIcon';
export { GreenhouseIcon } from './icons/GreenhouseIcon';
export { IndoorIcon } from './icons/IndoorIcon';

// Couleurs des types de culture
export const CULTURE_TYPE_COLORS = {
  outdoor: '#FFD700',
  greenhouse: '#10B981',
  indoor: '#3B82F6',
} as const;

// Labels des types de culture
export const CULTURE_TYPE_LABELS = {
  outdoor: 'Outdoor (Plein air)',
  greenhouse: 'Greenhouse (Serre)',
  indoor: 'Indoor (Intérieur)',
} as const;
