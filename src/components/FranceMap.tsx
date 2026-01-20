import React from 'react';
import { Image, View, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FranceMapProps {
  width?: number;
  height?: number;
  fullScreen?: boolean;
}

export const FranceMap = ({ width, height, fullScreen = false }: FranceMapProps) => {
  // Format 9:16 pour smartphone
  const mapWidth = fullScreen ? SCREEN_WIDTH : (width ?? SCREEN_WIDTH);
  const mapHeight = fullScreen ? SCREEN_HEIGHT : (height ?? (mapWidth * 16) / 9);

  return (
    <View style={{ width: mapWidth, height: mapHeight, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
      <Image
        source={require('../../assets/image-1767811691.jpeg')}
        style={{ width: mapWidth, height: mapHeight }}
        resizeMode="contain"
      />
    </View>
  );
};
