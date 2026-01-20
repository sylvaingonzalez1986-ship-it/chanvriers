import React, { useState, useEffect } from 'react';
import { View, Pressable, Modal, Dimensions } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronRight, ChevronLeft, X, Check, Sparkles } from 'lucide-react-native';
import { useChanvrierStore } from '@/lib/chanvrier-store';

const { width, height } = Dimensions.get('window');

// Étapes du tutoriel
interface TutorialStep {
  id: number;
  title: string;
  text: string;
  emoji: string;
  highlight: 'tools' | 'seeds' | 'grid' | 'stats' | 'time' | 'shop' | null;
  action?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    title: "Bienvenue Chanvrier !",
    text: "Tu commences avec 500 pièces et 12 parcelles. Deviens le meilleur producteur de chanvre de Bretagne !",
    emoji: "👋",
    highlight: null,
  },
  {
    id: 1,
    title: "Choisis tes Graines",
    text: "Tape sur l'outil Graines 🌰 dans la barre d'outils en bas. Tu verras apparaître le sélecteur de variétés !",
    emoji: "🌰",
    highlight: 'tools',
    action: "Sélectionne l'outil Graines",
  },
  {
    id: 2,
    title: "4 Variétés de Chanvre",
    text: "Sativa (rapide), Indica (bon rendement), Hybride (équilibré), CBD Rich (meilleur prix). Choisis selon ta stratégie !",
    emoji: "🌿",
    highlight: 'seeds',
  },
  {
    id: 3,
    title: "Plante une Graine",
    text: "Avec l'outil Graines sélectionné, tape sur une parcelle vide (marron) pour planter. Chaque plantation coûte 1 graine et 3 énergie.",
    emoji: "🌱",
    highlight: 'grid',
    action: "Plante une graine",
  },
  {
    id: 4,
    title: "Arrose tes Plantes",
    text: "Sélectionne l'Arrosoir 🚿 et tape sur une plante pour l'arroser. L'eau diminue chaque jour - garde-la au-dessus de 40% !",
    emoji: "💧",
    highlight: 'tools',
    action: "Arrose une plante",
  },
  {
    id: 5,
    title: "La Croissance",
    text: "Tes plantes passent par 5 phases : Germination → Pousse → Végétative → Floraison → Mature. La barre verte montre la progression.",
    emoji: "📈",
    highlight: 'grid',
  },
  {
    id: 6,
    title: "Fertilise pour +Qualité",
    text: "L'outil Engrais 💩 augmente la qualité de +1★ (max 5★). Plus de qualité = plus de rendement à la récolte !",
    emoji: "⭐",
    highlight: 'tools',
  },
  {
    id: 7,
    title: "Récolte !",
    text: "Quand une plante brille en doré, elle est mature ! Sélectionne la Faucille 🔪 et tape dessus pour récolter et gagner des pièces.",
    emoji: "🎉",
    highlight: 'tools',
    action: "Récolte quand prêt",
  },
  {
    id: 8,
    title: "Météo et Saisons",
    text: "La météo change chaque jour : ☀️ accélère la croissance, 🌧️ arrose automatiquement. En hiver ❄️, tu ne peux pas planter !",
    emoji: "🌤️",
    highlight: 'time',
  },
  {
    id: 9,
    title: "La Boutique",
    text: "Tape sur 🛒 pour acheter des graines et de l'engrais. Gère bien ton argent pour agrandir ta ferme !",
    emoji: "🛒",
    highlight: 'shop',
  },
  {
    id: 10,
    title: "Énergie et Repos",
    text: "Chaque action consomme de l'énergie ⚡. Elle se régénère au début de chaque nouveau jour. Passe au jour suivant dans ⚙️ Paramètres.",
    emoji: "⚡",
    highlight: 'stats',
  },
  {
    id: 11,
    title: "Tu es prêt !",
    text: "Bonne chance, Chanvrier ! Cultive, récolte, et deviens le maître du chanvre breton ! 🌿💚",
    emoji: "🚀",
    highlight: null,
  },
];

interface TutorialProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function Tutorial({ visible, onComplete, onSkip }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];

  const emojiScale = useSharedValue(1);
  const cardY = useSharedValue(0);

  // Animation emoji
  useEffect(() => {
    emojiScale.value = withSequence(
      withTiming(1.3, { duration: 300 }),
      withSpring(1, { damping: 8 })
    );
  }, [currentStep]);

  // Animation de flottement
  useEffect(() => {
    cardY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
  }));

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onSkip();
  };

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        {/* Skip button */}
        <Pressable
          onPress={handleSkip}
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.1)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 12, marginRight: 4 }}>
            Passer
          </Text>
          <X size={16} color="#9CA3AF" />
        </Pressable>

        {/* Progress dots */}
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            marginBottom: 20,
          }}
        >
          {TUTORIAL_STEPS.map((_, index) => (
            <View
              key={index}
              style={{
                width: index === currentStep ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: index === currentStep ? '#4ADE80' : index < currentStep ? '#22C55E' : '#374151',
              }}
            />
          ))}
        </View>

        {/* Tutorial Card */}
        <Animated.View style={cardStyle}>
          <View
            style={{
              backgroundColor: '#1F2937',
              borderRadius: 24,
              padding: 24,
              width: width - 40,
              borderWidth: 3,
              borderColor: '#4ADE80',
              shadowColor: '#4ADE80',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
            }}
          >
            {/* Emoji */}
            <Animated.View
              style={[
                {
                  alignSelf: 'center',
                  marginBottom: 16,
                },
                emojiStyle,
              ]}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#374151',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#4ADE80',
                }}
              >
                <Text style={{ fontSize: 40 }}>{step.emoji}</Text>
              </View>
            </Animated.View>

            {/* Step counter */}
            <Text
              style={{
                color: '#4ADE80',
                fontSize: 12,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Étape {currentStep + 1} / {TUTORIAL_STEPS.length}
            </Text>

            {/* Title */}
            <Text
              style={{
                color: 'white',
                fontSize: 22,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {step.title}
            </Text>

            {/* Text */}
            <Text
              style={{
                color: '#D1D5DB',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              {step.text}
            </Text>

            {/* Action hint */}
            {step.action && (
              <View
                style={{
                  backgroundColor: '#4ADE8020',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Sparkles size={16} color="#4ADE80" />
                <Text style={{ color: '#4ADE80', fontWeight: 'bold', fontSize: 13 }}>
                  {step.action}
                </Text>
              </View>
            )}

            {/* Highlight indicator */}
            {step.highlight && (
              <View
                style={{
                  backgroundColor: '#FBBF2420',
                  borderRadius: 8,
                  padding: 8,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#FBBF24', fontSize: 11, textAlign: 'center' }}>
                  💡 Regarde {
                    step.highlight === 'tools' ? 'la barre d\'outils en bas' :
                    step.highlight === 'seeds' ? 'le sélecteur de graines' :
                    step.highlight === 'grid' ? 'les parcelles de culture' :
                    step.highlight === 'stats' ? 'tes statistiques en haut' :
                    step.highlight === 'time' ? 'l\'horloge et la météo' :
                    step.highlight === 'shop' ? 'le bouton boutique 🛒' :
                    ''
                  }
                </Text>
              </View>
            )}

            {/* Navigation buttons */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                marginTop: 8,
              }}
            >
              {/* Previous */}
              <Pressable
                onPress={handlePrev}
                disabled={isFirstStep}
                style={{
                  flex: 1,
                  backgroundColor: isFirstStep ? '#374151' : '#4B5563',
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  opacity: isFirstStep ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={20} color={isFirstStep ? '#6B7280' : 'white'} />
                <Text style={{ color: isFirstStep ? '#6B7280' : 'white', fontWeight: 'bold' }}>
                  Précédent
                </Text>
              </Pressable>

              {/* Next / Complete */}
              <Pressable
                onPress={handleNext}
                style={{
                  flex: 1,
                  backgroundColor: isLastStep ? '#22C55E' : '#4ADE80',
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ color: '#000', fontWeight: 'bold' }}>
                  {isLastStep ? 'Commencer !' : 'Suivant'}
                </Text>
                {isLastStep ? (
                  <Check size={20} color="#000" />
                ) : (
                  <ChevronRight size={20} color="#000" />
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Decorative elements */}
        <View
          style={{
            position: 'absolute',
            top: height * 0.15,
            left: 30,
          }}
        >
          <Text style={{ fontSize: 24, opacity: 0.3 }}>🌿</Text>
        </View>
        <View
          style={{
            position: 'absolute',
            top: height * 0.2,
            right: 40,
          }}
        >
          <Text style={{ fontSize: 20, opacity: 0.3 }}>🌱</Text>
        </View>
        <View
          style={{
            position: 'absolute',
            bottom: height * 0.15,
            left: 50,
          }}
        >
          <Text style={{ fontSize: 28, opacity: 0.3 }}>💚</Text>
        </View>
        <View
          style={{
            position: 'absolute',
            bottom: height * 0.2,
            right: 30,
          }}
        >
          <Text style={{ fontSize: 22, opacity: 0.3 }}>🌿</Text>
        </View>
      </View>
    </Modal>
  );
}

// Composant d'aide contextuelle (tooltip)
interface TooltipProps {
  text: string;
  visible: boolean;
  position: { x: number; y: number };
}

export function Tooltip({ text, visible, position }: TooltipProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{
        position: 'absolute',
        top: position.y,
        left: position.x,
        backgroundColor: '#1F2937',
        borderRadius: 8,
        padding: 12,
        maxWidth: 200,
        borderWidth: 2,
        borderColor: '#4ADE80',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }}
    >
      <Text style={{ color: 'white', fontSize: 12 }}>{text}</Text>
      {/* Arrow */}
      <View
        style={{
          position: 'absolute',
          bottom: -8,
          left: 20,
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: '#4ADE80',
        }}
      />
    </Animated.View>
  );
}

// Hook pour gérer l'état du tutoriel
export function useTutorialState() {
  const tutorialCompleted = useChanvrierStore((s) => s.player.tutorialCompleted);
  const setTutorialCompleted = useChanvrierStore((s) => s.setTutorialCompleted);
  const [showTutorial, setShowTutorial] = useState(false);

  // Afficher le tutoriel si pas encore complété
  useEffect(() => {
    if (!tutorialCompleted) {
      // Afficher le tutoriel après un court délai
      setTimeout(() => setShowTutorial(true), 500);
    }
  }, [tutorialCompleted]);

  const completeTutorial = () => {
    setTutorialCompleted(true);
    setShowTutorial(false);
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  const restartTutorial = () => {
    setShowTutorial(true);
  };

  return {
    hasSeenTutorial: tutorialCompleted,
    showTutorial,
    completeTutorial,
    skipTutorial,
    restartTutorial,
  };
}
