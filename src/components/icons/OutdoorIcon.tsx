/**
 * OutdoorIcon - Icône Soleil pour culture en plein air
 * Style Pokémon avec glow doré
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

interface OutdoorIconProps {
  size?: number;
  color?: string;
}

export function OutdoorIcon({ size = 24, color = '#FFD700' }: OutdoorIconProps) {
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
          <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="70%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#FFA500" stopOpacity="0.6" />
          </RadialGradient>
        </Defs>

        {/* Rayons du soleil */}
        <Path
          d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Centre du soleil */}
        <Circle
          cx="12"
          cy="12"
          r="5"
          fill="url(#sunGlow)"
          stroke={color}
          strokeWidth="1"
        />
      </Svg>
    </View>
  );
}
