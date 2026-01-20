import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { Circle } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface OnlineIndicatorProps {
  count: number;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function OnlineIndicator({
  count,
  showLabel = true,
  size = 'medium',
}: OnlineIndicatorProps) {
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    // Pulse animation for the online dot
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const dotSize = size === 'small' ? 6 : size === 'medium' ? 8 : 10;
  const textSize = size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base';

  return (
    <View className="flex-row items-center">
      <Animated.View style={pulseStyle}>
        <Circle size={dotSize} color="#10B981" fill="#10B981" />
      </Animated.View>
      {showLabel && (
        <Text className={`text-emerald-400 ${textSize} ml-1.5`}>
          {count} en ligne
        </Text>
      )}
    </View>
  );
}

// Typing indicator component
interface TypingIndicatorProps {
  names?: string[];
}

export function TypingIndicator({ names = [] }: TypingIndicatorProps) {
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    // Staggered animation for typing dots
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );

    dot2Opacity.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      )
    );

    dot3Opacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      )
    );
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1Opacity.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  if (names.length === 0) return null;

  const typingText =
    names.length === 1
      ? `${names[0]} écrit`
      : names.length === 2
      ? `${names[0]} et ${names[1]} écrivent`
      : `${names[0]} et ${names.length - 1} autres écrivent`;

  return (
    <View className="flex-row items-center px-4 py-2">
      <View className="flex-row items-center mr-2">
        <Animated.View
          style={[dot1Style, { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 3 }]}
        />
        <Animated.View
          style={[dot2Style, { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 3 }]}
        />
        <Animated.View
          style={[dot3Style, { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }]}
        />
      </View>
      <Text className="text-gray-400 text-xs italic">{typingText}...</Text>
    </View>
  );
}
