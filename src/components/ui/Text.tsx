import React from 'react';
import { Text as RNText, TextProps, StyleSheet, Platform } from 'react-native';

/**
 * Custom Text component
 * - Sur iOS: utilise Wallpoet pour un look stylisé
 * - Sur Android: utilise la police système pour un meilleur rendu
 */
export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[styles.text, style]} />;
}

const styles = StyleSheet.create({
  text: {
    // Wallpoet a des problèmes de rendu sur Android (texte coupé, chevauchement)
    // On utilise la police système sur Android pour une meilleure lisibilité
    fontFamily: Platform.OS === 'ios' ? 'Wallpoet_400Regular' : undefined,
  },
});
