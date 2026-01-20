import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface MessageSkeletonProps {
  count?: number;
}

function SingleSkeleton({ isRight, delay }: { isRight: boolean; delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        false
      );
    }, delay);

    return () => clearTimeout(timeout);
  }, [opacity, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const bubbleWidth = Math.random() * 30 + 45; // 45-75%

  return (
    <View className={`flex-row mb-3 ${isRight ? 'justify-end' : 'justify-start'}`}>
      {!isRight && (
        <Animated.View
          style={[
            animatedStyle,
            {
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.1)',
              marginRight: 8,
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          animatedStyle,
          {
            width: `${bubbleWidth}%`,
            height: Math.random() * 30 + 50, // 50-80px
            borderRadius: 16,
            backgroundColor: isRight ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.1)',
          },
        ]}
      />
    </View>
  );
}

export function MessageSkeleton({ count = 5 }: MessageSkeletonProps) {
  return (
    <View className="px-4 py-4">
      {Array.from({ length: count }).map((_, index) => (
        <SingleSkeleton
          key={index}
          isRight={index % 3 === 0}
          delay={index * 100}
        />
      ))}
    </View>
  );
}
