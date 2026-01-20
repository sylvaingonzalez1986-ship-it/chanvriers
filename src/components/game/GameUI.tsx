import React, { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import {
  ToolType,
  TOOLS,
  HempVariety,
  HEMP_VARIETIES,
} from '@/lib/chanvrier-store';

interface ToolButtonProps {
  tool: ToolType;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

function ToolButtonComponent({ tool, isSelected, onPress, disabled }: ToolButtonProps) {
  const scaleAnim = useSharedValue(1);
  const config = TOOLS[tool];

  const handlePress = () => {
    if (disabled) return;
    scaleAnim.value = withSequence(
      withSpring(0.85, { damping: 15 }),
      withSpring(1, { damping: 10 })
    );
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress} disabled={disabled}>
        <View
          style={{
            width: 48,
            height: 48,
            backgroundColor: isSelected ? '#22C55E' : '#374151',
            borderWidth: 3,
            borderColor: isSelected ? '#4ADE80' : '#4B5563',
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: disabled ? 0.5 : 1,
            // Effet pixel art
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 0,
          }}
        >
          <Text style={{ fontSize: 24 }}>{config.icon}</Text>
        </View>
        <Text
          style={{
            fontSize: 8,
            color: isSelected ? '#4ADE80' : '#9CA3AF',
            textAlign: 'center',
            marginTop: 2,
          }}
        >
          {config.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export const ToolButton = memo(ToolButtonComponent);

interface SeedSelectorProps {
  selectedVariety: HempVariety;
  onSelect: (variety: HempVariety) => void;
  inventory: Record<string, number>;
}

function SeedSelectorComponent({ selectedVariety, onSelect, inventory }: SeedSelectorProps) {
  const varieties = Object.entries(HEMP_VARIETIES) as [HempVariety, typeof HEMP_VARIETIES[HempVariety]][];

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {varieties.map(([key, config]) => {
        const seedCount = inventory[`${key}_seeds`] || 0;
        const isSelected = selectedVariety === key;

        return (
          <Pressable key={key} onPress={() => onSelect(key)}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: isSelected ? config.color + '40' : '#1F2937',
                borderWidth: 2,
                borderColor: isSelected ? config.color : '#374151',
                borderRadius: 8,
                alignItems: 'center',
                opacity: seedCount === 0 ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 20 }}>{config.icon}</Text>
              <Text
                style={{
                  fontSize: 10,
                  color: isSelected ? config.color : '#9CA3AF',
                  marginTop: 2,
                }}
              >
                {config.name}
              </Text>
              <View
                style={{
                  backgroundColor: seedCount > 0 ? '#22C55E' : '#EF4444',
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  marginTop: 2,
                }}
              >
                <Text style={{ fontSize: 9, color: 'white', fontWeight: 'bold' }}>
                  x{seedCount}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export const SeedSelector = memo(SeedSelectorComponent);

interface StatBarProps {
  value: number;
  maxValue: number;
  color: string;
  icon: string;
  label: string;
  showValue?: boolean;
}

function StatBarComponent({ value, maxValue, color, icon, label, showValue = true }: StatBarProps) {
  const percent = (value / maxValue) * 100;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 12,
            backgroundColor: '#1F2937',
            borderRadius: 6,
            borderWidth: 2,
            borderColor: '#374151',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${percent}%`,
              backgroundColor: color,
              borderRadius: 4,
            }}
          />
        </View>
        {showValue && (
          <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>
            {label}: {value}/{maxValue}
          </Text>
        )}
      </View>
    </View>
  );
}

export const StatBar = memo(StatBarComponent);
