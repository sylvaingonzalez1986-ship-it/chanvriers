import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gift, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface MysteryBoxProps {
  onOpen: () => void;
  isSpinning: boolean;
  price: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MysteryBox({ onOpen, isSpinning, price }: MysteryBoxProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0.3);

  React.useEffect(() => {
    // Idle breathing animation
    glow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  React.useEffect(() => {
    if (isSpinning) {
      // Shake animation when spinning
      rotation.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 100 }),
          withTiming(-8, { duration: 100 }),
          withTiming(0, { duration: 50 })
        ),
        6,
        false
      );
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 100 })
      );
    }
  }, [isSpinning]);

  const handlePress = () => {
    if (isSpinning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );
    onOpen();
  };

  const boxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View className="items-center">
      {/* Glow effect behind the box */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: '#D4AF37',
          },
          glowAnimatedStyle,
        ]}
      />

      <AnimatedPressable
        onPress={handlePress}
        disabled={isSpinning}
        style={boxAnimatedStyle}
      >
        <LinearGradient
          colors={['#2D5A3D', '#1A472A', '#0F2D1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 220,
            height: 220,
            borderRadius: 32,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: '#D4AF37',
            shadowColor: '#D4AF37',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Inner glow */}
          <View
            style={{
              position: 'absolute',
              width: 180,
              height: 180,
              borderRadius: 24,
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
            }}
          />

          {/* Question mark / Gift icon */}
          <View className="items-center">
            <Gift size={80} color="#D4AF37" strokeWidth={1.5} />
            <View className="flex-row items-center mt-4">
              <Sparkles size={16} color="#D4AF37" />
              <Text className="text-accent text-lg font-semibold mx-2">MYSTERY BOX</Text>
              <Sparkles size={16} color="#D4AF37" />
            </View>
          </View>

          {/* Decorative corners */}
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              width: 24,
              height: 24,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: '#D4AF37',
              borderTopLeftRadius: 8,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 24,
              height: 24,
              borderTopWidth: 2,
              borderRightWidth: 2,
              borderColor: '#D4AF37',
              borderTopRightRadius: 8,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              width: 24,
              height: 24,
              borderBottomWidth: 2,
              borderLeftWidth: 2,
              borderColor: '#D4AF37',
              borderBottomLeftRadius: 8,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              width: 24,
              height: 24,
              borderBottomWidth: 2,
              borderRightWidth: 2,
              borderColor: '#D4AF37',
              borderBottomRightRadius: 8,
            }}
          />
        </LinearGradient>
      </AnimatedPressable>

      {/* Price badge */}
      <View className="mt-6 bg-accent/20 px-6 py-3 rounded-full border border-accent/40">
        <Text className="text-accent text-xl font-bold">{price}€ / Tirage</Text>
      </View>

      {/* Tap instruction */}
      {!isSpinning && (
        <Text className="text-gray-400 text-sm mt-4">Appuyez pour ouvrir</Text>
      )}
      {isSpinning && (
        <Text className="text-accent text-sm mt-4">Ouverture en cours...</Text>
      )}
    </View>
  );
}
