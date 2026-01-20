/**
 * Auth Layout - Les Chanvriers Unis
 * Stack navigation pour les écrans d'authentification
 */

import { Stack } from 'expo-router';
import { COLORS } from '@/lib/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background.nightSky },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
