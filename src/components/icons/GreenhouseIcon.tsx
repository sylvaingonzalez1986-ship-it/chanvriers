/**
 * GreenhouseIcon - Icône Serre pour culture sous serre
 * Style Pokémon avec glow vert émeraude
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

interface GreenhouseIconProps {
  size?: number;
  color?: string;
}

export function GreenhouseIcon({ size = 24, color = '#10B981' }: GreenhouseIconProps) {
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
          <LinearGradient id="greenhouseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#059669" stopOpacity="0.7" />
          </LinearGradient>
        </Defs>

        {/* Toit de la serre (forme triangulaire) */}
        <Path
          d="M12 2L3 10h18L12 2z"
          fill="url(#greenhouseGrad)"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Corps de la serre */}
        <Rect
          x="4"
          y="10"
          width="16"
          height="11"
          fill="url(#greenhouseGrad)"
          stroke={color}
          strokeWidth="1.5"
          rx="1"
        />

        {/* Lignes verticales (vitres) */}
        <Line x1="8" y1="10" x2="8" y2="21" stroke={color} strokeWidth="1" opacity="0.6" />
        <Line x1="12" y1="10" x2="12" y2="21" stroke={color} strokeWidth="1" opacity="0.6" />
        <Line x1="16" y1="10" x2="16" y2="21" stroke={color} strokeWidth="1" opacity="0.6" />

        {/* Ligne horizontale centrale */}
        <Line x1="4" y1="15" x2="20" y2="15" stroke={color} strokeWidth="1" opacity="0.6" />

        {/* Porte */}
        <Rect
          x="10"
          y="16"
          width="4"
          height="5"
          fill="#059669"
          stroke={color}
          strokeWidth="1"
          rx="0.5"
        />
      </Svg>
    </View>
  );
}
