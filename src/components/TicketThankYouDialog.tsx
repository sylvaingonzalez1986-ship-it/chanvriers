/**
 * TicketThankYouDialog - Les Chanvriers Unis
 * Dialog de remerciement après envoi d'email de commande réussi
 */

import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { CheckCircle, ArrowRight } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

interface TicketThankYouDialogProps {
  visible: boolean;
  onNext: () => void;
  onClose: () => void;
}

export function TicketThankYouDialog({
  visible,
  onNext,
  onClose,
}: TicketThankYouDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 items-center justify-center px-6">
        <Animated.View
          entering={FadeInUp.duration(400)}
          className="w-full max-w-sm rounded-3xl p-6"
          style={{
            backgroundColor: COLORS.background.charcoal,
            borderWidth: 2,
            borderColor: COLORS.accent.hemp,
          }}
        >
          {/* Icône de succès */}
          <Animated.View
            entering={FadeIn.duration(600).delay(200)}
            className="items-center mb-6"
          >
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${COLORS.accent.hemp}30` }}
            >
              <CheckCircle size={56} color={COLORS.accent.hemp} />
            </View>
            <Text
              style={{ color: COLORS.text.cream }}
              className="text-3xl font-bold text-center"
            >
              Merci !
            </Text>
          </Animated.View>

          {/* Message de confirmation */}
          <Animated.View entering={FadeIn.duration(400).delay(300)}>
            <Text
              style={{ color: COLORS.text.lightGray }}
              className="text-center text-base mb-6 leading-6"
            >
              Votre email de commande a bien été envoyé. Vous allez recevoir un
              lien de paiement dans les plus brefs délais.
            </Text>
          </Animated.View>

          {/* Bouton Suivant */}
          <Animated.View entering={FadeIn.duration(400).delay(400)}>
            <Pressable
              onPress={onNext}
              className="rounded-xl py-4 items-center flex-row justify-center"
              style={{ backgroundColor: COLORS.accent.forest }}
            >
              <Text
                style={{ color: COLORS.text.white }}
                className="font-bold text-lg mr-2"
              >
                Suivant
              </Text>
              <ArrowRight size={20} color={COLORS.text.white} />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
