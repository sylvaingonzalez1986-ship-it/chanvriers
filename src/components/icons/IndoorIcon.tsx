/**
 * IndoorIcon - Icône Ampoule LED pour culture indoor
 * Style Pokémon avec glow bleu électrique
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';

interface IndoorIconProps {
  size?: number;
  color?: string;
}

export function IndoorIcon({ size = 24, color = '#3B82F6' }: IndoorIconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <RadialGradient id="bulbGlow" cx="50%" cy="30%" r="60%">
            <Stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
            <Stop offset="50%" stopColor={color} stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.7" />
          </RadialGradient>
        </Defs>

        {/* Rayons lumineux */}
        <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <Line x1="4" y1="6" x2="5.5" y2="7.5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <Line x1="20" y1="6" x2="18.5" y2="7.5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />

        {/* Ampoule (partie haute) */}
        <Path
          d="M9 18c0-3-2-5-2-8a5 5 0 0 1 10 0c0 3-2 5-2 8"
          fill="url(#bulbGlow)"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Culot de l'ampoule */}
        <Path
          d="M9 18h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2z"
          fill={color}
          stroke={color}
          strokeWidth="1"
        />

        {/* Lignes du culot */}
        <Line x1="9" y1="19" x2="15" y2="19" stroke="#1D4ED8" strokeWidth="1" />

        {/* Filament lumineux */}
        <Path
          d="M10 12c0 0 1 1 2 1s2-1 2-1"
          stroke="#60A5FA"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
