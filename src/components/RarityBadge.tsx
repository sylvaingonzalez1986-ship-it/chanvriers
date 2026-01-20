import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { Award } from 'lucide-react-native';
import { Rarity, RARITY_CONFIG } from '@/lib/types';

interface RarityBadgeProps {
  rarity: Rarity;
  size?: 'sm' | 'md' | 'lg';
}

export function RarityBadge({ rarity, size = 'md' }: RarityBadgeProps) {
  const config = RARITY_CONFIG[rarity];

  const sizeStyles = {
    sm: { padding: 4, iconSize: 12, fontSize: 10 },
    md: { padding: 6, iconSize: 14, fontSize: 12 },
    lg: { padding: 8, iconSize: 18, fontSize: 14 },
  };

  const styles = sizeStyles[size];

  return (
    <View
      style={{
        backgroundColor: config.bgColor,
        borderWidth: 1,
        borderColor: config.borderColor,
        borderRadius: 8,
        paddingHorizontal: styles.padding * 1.5,
        paddingVertical: styles.padding,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Award size={styles.iconSize} color={config.color} />
      <Text
        style={{
          color: config.color,
          fontSize: styles.fontSize,
          fontWeight: '600',
          marginLeft: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
