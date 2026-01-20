/**
 * RegionMap - Carte de France interactive
 * Les Chanvriers Unis - Espace Professionnel
 */

import React, { useCallback } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FRANCE_REGIONS, FranceRegion, RegionProducerCount } from '@/types/regions';
import { COLORS } from '@/lib/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - 40;
const MAP_HEIGHT = MAP_WIDTH * 1.15;

interface RegionMapProps {
  producerCounts: RegionProducerCount[];
  selectedRegion: string | null;
  onRegionPress: (region: FranceRegion) => void;
}

interface RegionItemProps {
  region: FranceRegion;
  producerCount: number;
  isSelected: boolean;
  onPress: () => void;
  mapWidth: number;
  mapHeight: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RegionItem({
  region,
  producerCount,
  isSelected,
  onPress,
  mapWidth,
  mapHeight,
}: RegionItemProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const width = (region.size.width / 100) * mapWidth;
  const height = (region.size.height / 100) * mapHeight;
  const left = (region.position.x / 100) * mapWidth;
  const top = (region.position.y / 100) * mapHeight;

  // Couleur basée sur le nombre de producteurs
  const getColors = (): readonly [string, string] => {
    if (producerCount === 0) return ['#374151', '#1f2937'] as const;
    if (producerCount < 3) return ['#166534', '#14532d'] as const;
    if (producerCount < 5) return ['#15803d', '#166534'] as const;
    return ['#22c55e', '#16a34a'] as const;
  };

  const borderColor = isSelected
    ? COLORS.primary.gold
    : producerCount > 0
      ? '#4ade80'
      : '#4b5563';

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        animatedStyle,
        {
          position: 'absolute',
          left,
          top,
          width,
          height,
          zIndex: isSelected ? 100 : producerCount > 0 ? 10 : 1,
        },
      ]}
    >
      <LinearGradient
        colors={getColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          borderRadius: 10,
          borderWidth: isSelected ? 2.5 : 1.5,
          borderColor,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          // Effet d'ombre pour effet 3D
          shadowColor: isSelected ? COLORS.primary.gold : '#4ade80',
          shadowOffset: { width: 0, height: isSelected ? 6 : 3 },
          shadowOpacity: isSelected ? 0.5 : 0.3,
          shadowRadius: isSelected ? 10 : 6,
          elevation: isSelected ? 12 : 6,
        }}
      >
        {/* Effet de brillance en haut */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '40%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderTopLeftRadius: 9,
            borderTopRightRadius: 9,
          }}
        />

        {/* Code de la région */}
        <Text
          numberOfLines={1}
          style={{
            color: '#fff',
            fontSize: Math.max(width > 60 ? 11 : 9, 8),
            fontWeight: '700',
            textAlign: 'center',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {region.code}
        </Text>

        {/* Badge nombre de producteurs */}
        {producerCount > 0 && (
          <View
            style={{
              backgroundColor: COLORS.primary.gold,
              borderRadius: 10,
              paddingHorizontal: 5,
              paddingVertical: 2,
              marginTop: 3,
              minWidth: 18,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#1a1d2e',
                fontSize: 9,
                fontWeight: 'bold',
              }}
            >
              {producerCount}
            </Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

export function RegionMap({ producerCounts, selectedRegion, onRegionPress }: RegionMapProps) {
  const getProducerCount = useCallback(
    (regionId: string) => {
      return producerCounts.find((pc) => pc.regionId === regionId)?.count || 0;
    },
    [producerCounts]
  );

  return (
    <View
      style={{
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        alignSelf: 'center',
        marginVertical: 20,
      }}
    >
      {/* Fond de la carte */}
      <LinearGradient
        colors={['#1e293b', '#0f172a', '#020617']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: 24,
          borderWidth: 2,
          borderColor: 'rgba(212, 175, 55, 0.4)',
        }}
      >
        {/* Grille subtile */}
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0.08,
          }}
        >
          {[...Array(8)].map((_, i) => (
            <View
              key={`h-${i}`}
              style={{
                position: 'absolute',
                top: `${(i + 1) * 12}%`,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: COLORS.primary.gold,
              }}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <View
              key={`v-${i}`}
              style={{
                position: 'absolute',
                left: `${(i + 1) * 12}%`,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: COLORS.primary.gold,
              }}
            />
          ))}
        </View>

        {/* Glow central */}
        <View
          style={{
            position: 'absolute',
            top: '25%',
            left: '25%',
            width: '50%',
            height: '50%',
            backgroundColor: 'rgba(74, 222, 128, 0.06)',
            borderRadius: 100,
          }}
        />
      </LinearGradient>

      {/* Régions */}
      <View style={{ flex: 1 }} pointerEvents="box-none">
        {FRANCE_REGIONS.map((region) => (
          <RegionItem
            key={region.id}
            region={region}
            producerCount={getProducerCount(region.id)}
            isSelected={selectedRegion === region.id}
            onPress={() => onRegionPress(region)}
            mapWidth={MAP_WIDTH}
            mapHeight={MAP_HEIGHT}
          />
        ))}
      </View>

      {/* Titre de la carte */}
      <View
        style={{
          position: 'absolute',
          bottom: 12,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
        pointerEvents="none"
      >
        <Text
          style={{
            color: COLORS.text.muted,
            fontSize: 11,
            fontStyle: 'italic',
          }}
        >
          {"Appuyez sur une région pour voir les producteurs"}
        </Text>
      </View>
    </View>
  );
}
