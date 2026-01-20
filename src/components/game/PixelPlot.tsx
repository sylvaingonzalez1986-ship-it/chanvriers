import React, { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Droplets, Sparkles, AlertTriangle } from 'lucide-react-native';
import {
  FarmPlot,
  GrowthPhase,
  HEMP_VARIETIES,
  HempVariety,
} from '@/lib/chanvrier-store';

// Configuration des sprites pixel art pour chaque phase
const PHASE_SPRITES: Record<GrowthPhase, { icon: string; color: string; scale: number }> = {
  empty: { icon: '⬜', color: '#8B7355', scale: 0.8 },
  seeded: { icon: '🌰', color: '#654321', scale: 0.6 },
  germination: { icon: '🌱', color: '#90EE90', scale: 0.7 },
  seedling: { icon: '🌿', color: '#32CD32', scale: 0.8 },
  vegetative: { icon: '🪴', color: '#228B22', scale: 1.0 },
  flowering: { icon: '🌸', color: '#FFB6C1', scale: 1.1 },
  mature: { icon: '🌿', color: '#FFD700', scale: 1.2 },
  harvested: { icon: '⬜', color: '#8B7355', scale: 0.8 },
};

// Couleurs pixel art pour le terrain
const SOIL_COLORS = {
  dry: '#8B7355',
  moist: '#654321',
  wet: '#3D2914',
};

interface PixelPlotProps {
  plot: FarmPlot;
  size: number;
  onPress: () => void;
  isSelected: boolean;
  isUnlocked: boolean;
}

function PixelPlotComponent({ plot, size, onPress, isSelected, isUnlocked }: PixelPlotProps) {
  const scaleAnim = useSharedValue(1);
  const bounceAnim = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // Animation au tap
  const handlePress = () => {
    scaleAnim.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );
    onPress();
  };

  // Animation de rebond pour les plantes matures
  React.useEffect(() => {
    if (plot.phase === 'mature') {
      bounceAnim.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      bounceAnim.value = withTiming(0, { duration: 200 });
    }
  }, [plot.phase]);

  // Animation pulse et glow pour plantes prêtes à récolter
  React.useEffect(() => {
    if (plot.phase === 'mature') {
      // Animation pulse
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.15, { damping: 2 }),
          withSpring(1, { damping: 2 })
        ),
        -1,
        false
      );

      // Animation glow (lueur dorée)
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withSpring(1);
      glowOpacity.value = withTiming(0);
    }
  }, [plot.phase]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnim.value },
      { translateY: bounceAnim.value },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Déterminer la couleur du sol selon l'eau
  const getSoilColor = () => {
    if (plot.waterLevel > 70) return SOIL_COLORS.wet;
    if (plot.waterLevel > 40) return SOIL_COLORS.moist;
    return SOIL_COLORS.dry;
  };

  // Sprite de la plante
  const sprite = PHASE_SPRITES[plot.phase];
  const varietyConfig = plot.variety ? HEMP_VARIETIES[plot.variety] : null;

  // Calcul de la progression
  const getProgressPercent = () => {
    if (!plot.variety || plot.phase === 'empty' || plot.phase === 'harvested') return 0;
    const totalDays = HEMP_VARIETIES[plot.variety].growthDays;
    return Math.min(100, (plot.daysSincePlanting / totalDays) * 100);
  };

  if (!isUnlocked) {
    return (
      <Pressable onPress={handlePress}>
        <View
          style={{
            width: size,
            height: size,
            backgroundColor: '#1a1a2e',
            borderWidth: 2,
            borderColor: '#333',
            borderStyle: 'dashed',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: size * 0.4, opacity: 0.5 }}>🔒</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress}>
        <View
          style={{
            width: size,
            height: size,
            backgroundColor: getSoilColor(),
            borderWidth: isSelected ? 3 : 2,
            borderColor: isSelected ? '#FFD700' : '#5D4E37',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Grille pixel art effect */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              backgroundColor: 'transparent',
            }}
          >
            {[0, 1, 2, 3].map((row) => (
              <View key={row} style={{ flexDirection: 'row', flex: 1 }}>
                {[0, 1, 2, 3].map((col) => (
                  <View
                    key={col}
                    style={{
                      flex: 1,
                      borderWidth: 0.5,
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Plante */}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Plant emoji avec pulse si mature */}
            <Animated.View style={plot.phase === 'mature' ? pulseStyle : undefined}>
              <Text
                style={{
                  fontSize: size * 0.5 * sprite.scale,
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 1,
                }}
              >
                {plot.phase === 'mature' ? varietyConfig?.icon || sprite.icon : sprite.icon}
              </Text>
            </Animated.View>
          </View>

          {/* Glow effect pour plantes matures */}
          {plot.phase === 'mature' && (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: -4,
                  right: -4,
                },
                glowStyle,
              ]}
            >
              <Text style={{ fontSize: 14 }}>✨</Text>
            </Animated.View>
          )}

          {/* Indicateurs */}
          {plot.phase !== 'empty' && plot.phase !== 'harvested' && (
            <>
              {/* Barre de progression */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 2,
                  left: 2,
                  right: 2,
                  height: 4,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 2,
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${getProgressPercent()}%`,
                    backgroundColor: plot.phase === 'mature' ? '#FFD700' : '#4ADE80',
                    borderRadius: 2,
                  }}
                />
              </View>

              {/* Indicateur d'eau */}
              {plot.waterLevel < 40 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                  }}
                >
                  <Droplets
                    size={12}
                    color={plot.waterLevel < 20 ? '#EF4444' : '#FBBF24'}
                  />
                </View>
              )}

              {/* Indicateur de santé faible */}
              {plot.health < 50 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: 2,
                  }}
                >
                  <AlertTriangle size={12} color="#EF4444" />
                </View>
              )}

              {/* Indicateur fertilisé */}
              {plot.fertilized && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: plot.health < 50 ? 16 : 2,
                  }}
                >
                  <Sparkles size={10} color="#A855F7" />
                </View>
              )}

              {/* Étoiles de qualité */}
              {plot.quality > 1 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    backgroundColor: '#FFD700',
                    borderRadius: 8,
                    width: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 8, color: '#000' }}>★{plot.quality}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const PixelPlot = memo(PixelPlotComponent);
