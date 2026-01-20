import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TimeState,
  Season,
  WeatherType,
  SEASON_CONFIG,
  WEATHER_CONFIG,
} from '@/lib/chanvrier-store';

interface SkyBackgroundProps {
  time: TimeState;
  children: React.ReactNode;
}

// Couleurs du ciel selon l'heure
const getSkyColors = (hour: number, weather: WeatherType): [string, string] => {
  // Couleurs de base selon l'heure
  let colors: [string, string];

  if (hour >= 5 && hour < 7) {
    // Aube
    colors = ['#FF7E5F', '#FEB47B'];
  } else if (hour >= 7 && hour < 17) {
    // Journée
    colors = ['#87CEEB', '#E0F7FA'];
  } else if (hour >= 17 && hour < 20) {
    // Crépuscule
    colors = ['#FF6B6B', '#FFE66D'];
  } else {
    // Nuit
    colors = ['#0F0F23', '#1a1a3e'];
  }

  // Modifier selon la météo
  switch (weather) {
    case 'cloudy':
      colors = colors.map(c => blendColors(c, '#9CA3AF', 0.3)) as [string, string];
      break;
    case 'rainy':
    case 'stormy':
      colors = colors.map(c => blendColors(c, '#4B5563', 0.5)) as [string, string];
      break;
    case 'foggy':
      colors = colors.map(c => blendColors(c, '#D1D5DB', 0.4)) as [string, string];
      break;
  }

  return colors;
};

// Utilitaire pour mélanger les couleurs
const blendColors = (color1: string, color2: string, ratio: number): string => {
  const hex = (c: string) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));

  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

function SkyBackgroundComponent({ time, children }: SkyBackgroundProps) {
  const colors = getSkyColors(time.hour, time.weather);

  return (
    <LinearGradient colors={colors} style={{ flex: 1 }}>
      {/* Étoiles la nuit */}
      {time.isNight && <Stars />}

      {/* Effets météo */}
      {time.weather === 'rainy' && <RainEffect />}
      {time.weather === 'stormy' && <StormEffect />}
      {time.weather === 'foggy' && <FogEffect />}

      {/* Soleil ou Lune */}
      <CelestialBody hour={time.hour} isNight={time.isNight} />

      {/* Nuages */}
      {(time.weather === 'cloudy' || time.weather === 'rainy') && <Clouds />}

      {children}
    </LinearGradient>
  );
}

export const SkyBackground = memo(SkyBackgroundComponent);

// Étoiles
function Stars() {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150 }}>
      {[...Array(20)].map((_, i) => (
        <StarComponent
          key={i}
          style={{
            position: 'absolute',
            top: Math.random() * 120,
            left: Math.random() * 100 + '%',
          }}
        />
      ))}
    </View>
  );
}

function StarComponent({ style }: { style: object }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 + Math.random() * 1000 }),
        withTiming(0.3, { duration: 1000 + Math.random() * 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      <Text style={{ fontSize: 8, color: '#FBBF24' }}>✦</Text>
    </Animated.View>
  );
}

// Corps céleste (Soleil/Lune)
function CelestialBody({ hour, isNight }: { hour: number; isNight: boolean }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Position horizontale selon l'heure (6h = gauche, 12h = centre, 18h = droite)
  const position = ((hour - 6) / 12) * 80 + 10; // 10% à 90%

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 30,
          left: `${Math.max(10, Math.min(90, position))}%`,
        },
        animStyle,
      ]}
    >
      <Text style={{ fontSize: 32 }}>{isNight ? '🌙' : '☀️'}</Text>
    </Animated.View>
  );
}

// Nuages
function Clouds() {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(50, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ position: 'absolute', top: 20, left: 0, right: 0 }}>
      <Animated.View style={[{ flexDirection: 'row', gap: 30 }, animStyle]}>
        <Text style={{ fontSize: 24, opacity: 0.8 }}>☁️</Text>
        <Text style={{ fontSize: 32, opacity: 0.7 }}>☁️</Text>
        <Text style={{ fontSize: 20, opacity: 0.9 }}>☁️</Text>
        <Text style={{ fontSize: 28, opacity: 0.6 }}>☁️</Text>
      </Animated.View>
    </View>
  );
}

// Effet de pluie
function RainEffect() {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {[...Array(30)].map((_, i) => (
        <RainDrop
          key={i}
          delay={Math.random() * 1000}
          leftPercent={Math.random() * 100}
        />
      ))}
    </View>
  );
}

function RainDrop({ delay, leftPercent }: { delay: number; leftPercent: number }) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const start = () => {
      translateY.value = -20;
      opacity.value = 1;
      translateY.value = withTiming(500, { duration: 1000, easing: Easing.linear });
      opacity.value = withTiming(0, { duration: 1000, easing: Easing.linear });
    };

    const timeout = setTimeout(() => {
      start();
      const interval = setInterval(start, 1200);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${leftPercent}%`,
          top: 0,
          width: 2,
          height: 15,
          backgroundColor: '#93C5FD',
          borderRadius: 1,
        } as const,
        animStyle,
      ]}
    />
  );
}

// Effet d'orage
function StormEffect() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const flash = () => {
      opacity.value = withSequence(
        withTiming(0.8, { duration: 50 }),
        withTiming(0, { duration: 100 }),
        withTiming(0.5, { duration: 50 }),
        withTiming(0, { duration: 200 })
      );
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.7) flash();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <>
      <RainEffect />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
          },
          animStyle,
        ]}
      />
    </>
  );
}

// Effet de brouillard
function FogEffect() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 3000 }),
        withTiming(0.3, { duration: 3000 })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#E5E7EB',
        },
        animStyle,
      ]}
    />
  );
}

// HUD du temps
interface TimeHUDProps {
  time: TimeState;
}

export function TimeHUD({ time }: TimeHUDProps) {
  const seasonConfig = SEASON_CONFIG[time.season];
  const weatherConfig = WEATHER_CONFIG[time.weather];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
      }}
    >
      {/* Saison */}
      <Text style={{ fontSize: 16 }}>{seasonConfig.icon}</Text>

      {/* Date */}
      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
        Jour {time.day}
      </Text>

      {/* Séparateur */}
      <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)' }} />

      {/* Heure */}
      <Text style={{ color: 'white', fontSize: 12, fontFamily: 'monospace' }}>
        {time.hour.toString().padStart(2, '0')}:{time.minute.toString().padStart(2, '0')}
      </Text>

      {/* Météo */}
      <Text style={{ fontSize: 16 }}>{weatherConfig.icon}</Text>

      {/* Année */}
      <Text style={{ color: '#9CA3AF', fontSize: 10 }}>
        An {time.year}
      </Text>
    </View>
  );
}
