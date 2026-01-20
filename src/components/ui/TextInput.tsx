import React from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet, Platform } from 'react-native';

/**
 * Custom TextInput component
 * - Sur iOS: utilise Wallpoet pour un look stylisé
 * - Sur Android: utilise la police système pour un meilleur rendu
 */
export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput {...props} style={[styles.input, style]} />;
}

const styles = StyleSheet.create({
  input: {
    // Wallpoet a des problèmes de rendu sur Android (texte coupé, chevauchement)
    // On utilise la police système sur Android pour une meilleure lisibilité
    fontFamily: Platform.OS === 'ios' ? 'Wallpoet_400Regular' : undefined,
  },
});
