import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import Animated, { ZoomIn } from 'react-native-reanimated';

// Formater la date pour les séparateurs
const formatDateSeparator = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }
};

interface DateSeparatorProps {
  timestamp: number;
}

export function DateSeparator({ timestamp }: DateSeparatorProps) {
  return (
    <View className="items-center my-4">
      <Animated.View
        entering={ZoomIn.duration(300)}
        className="px-4 py-1.5 rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      >
        <Text className="text-gray-400 text-xs font-medium">
          {formatDateSeparator(timestamp)}
        </Text>
      </Animated.View>
    </View>
  );
}

export { formatDateSeparator };
