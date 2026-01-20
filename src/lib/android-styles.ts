/**
 * Android-specific style helpers
 * Fixes common styling issues on Android
 */
import { Platform, ViewStyle } from 'react-native';

/**
 * Creates shadow styles that work on both iOS and Android
 * iOS uses shadow* properties, Android uses elevation
 */
export function createShadow(
  elevation: number = 4,
  color: string = '#000000',
  opacity: number = 0.25
): ViewStyle {
  if (Platform.OS === 'android') {
    return {
      elevation,
    };
  }

  // iOS shadow
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: elevation / 2 },
    shadowOpacity: opacity,
    shadowRadius: elevation,
  };
}

/**
 * Creates a button style that's visible on both platforms
 * Android needs explicit background and elevation for buttons to show
 */
export function createButtonStyle(
  backgroundColor: string,
  elevation: number = 2
): ViewStyle {
  const baseStyle: ViewStyle = {
    backgroundColor,
  };

  if (Platform.OS === 'android') {
    return {
      ...baseStyle,
      elevation,
    };
  }

  return {
    ...baseStyle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  };
}

/**
 * Converts hex color with alpha to rgba for better Android support
 * Android has issues with 8-character hex colors (#RRGGBBAA)
 */
export function hexToRgba(hex: string, alpha?: number): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Handle 8-char hex (with alpha)
  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = alpha !== undefined ? alpha : parseInt(hex.slice(6, 8), 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }

  // Handle 6-char hex
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha ?? 1})`;
  }

  // Handle 3-char hex
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha ?? 1})`;
  }

  return hex;
}

/**
 * Platform-specific opacity - Android may need stronger values
 */
export function getOpacity(iosValue: number, androidMultiplier: number = 1.2): number {
  if (Platform.OS === 'android') {
    return Math.min(1, iosValue * androidMultiplier);
  }
  return iosValue;
}

/**
 * Check if we're on Android
 */
export const isAndroid = Platform.OS === 'android';

/**
 * Check if we're on iOS
 */
export const isIOS = Platform.OS === 'ios';
