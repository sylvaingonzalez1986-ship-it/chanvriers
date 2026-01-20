import React, { useState } from 'react';
import { View, Pressable, Linking, Alert } from 'react-native';
import { Text } from '@/components/ui';
import { Trash2 } from 'lucide-react-native';
import Animated, {
  SlideInRight,
  SlideInLeft,
  FadeInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChatMessage } from '@/lib/supabase-sync';

// Couleurs du chat
const CHAT_COLORS = {
  bubble: {
    other: '#2d3748',
    mine: '#d4af37',
  },
  text: {
    other: '#ffffff',
    mine: '#1a1d2e',
  },
};

// Générer une couleur d'avatar basée sur le nom
const getAvatarColor = (name: string) => {
  const colors = [
    '#10B981', // emerald
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#F59E0B', // amber
    '#06B6D4', // cyan
    '#EF4444', // red
    '#84CC16', // lime
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Obtenir les initiales d'un nom
const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Formater l'heure d'un message
const formatMessageTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Détecter et rendre les liens cliquables
const renderMessageContent = (content: string, textColor: string) => {
  // Regex pour détecter les URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);

  if (parts.length === 1) {
    return (
      <Text style={{ color: textColor }} className="text-base">
        {content}
      </Text>
    );
  }

  return (
    <Text style={{ color: textColor }} className="text-base">
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          // Reset regex lastIndex
          urlRegex.lastIndex = 0;
          return (
            <Text
              key={index}
              style={{ color: '#60A5FA', textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(part)}
            >
              {part}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

interface MessageBubbleProps {
  message: ChatMessage & { isNew?: boolean };
  isMyMessage: boolean;
  showAvatar: boolean;
  isNew: boolean;
  currentUserId: string;
  isAdmin?: boolean;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isMyMessage,
  showAvatar,
  isNew,
  isAdmin = false,
  onDelete,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const isRecent = Date.now() - message.createdAt < 60000; // < 1 minute

  // Animation différente selon si c'est mon message ou celui d'un autre
  const enteringAnimation = isNew
    ? isMyMessage
      ? SlideInRight.duration(300).springify()
      : SlideInLeft.duration(300).springify()
    : FadeInUp.duration(200);

  const textColor = isMyMessage ? CHAT_COLORS.text.mine : CHAT_COLORS.text.other;

  const handleLongPress = () => {
    if (isAdmin && onDelete) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowActions(!showActions);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le message',
      'Voulez-vous vraiment supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel', onPress: () => setShowActions(false) },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete?.(message.id);
            setShowActions(false);
          },
        },
      ]
    );
  };

  return (
    <Animated.View
      entering={enteringAnimation}
      className={`flex-row mb-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar (autres messages) */}
      {!isMyMessage && (
        <View className="w-8 mr-2">
          {showAvatar ? (
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: getAvatarColor(message.senderName) }}
            >
              <Text className="text-white text-xs font-bold">
                {getInitials(message.senderName)}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Delete button for admin (left side for other's messages) */}
      {isAdmin && showActions && !isMyMessage && (
        <Pressable
          onPress={handleDelete}
          className="w-8 h-8 rounded-full items-center justify-center mr-2 self-center"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
        >
          <Trash2 size={16} color="#EF4444" />
        </Pressable>
      )}

      {/* Bulle de message */}
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={500}
        className="max-w-[75%] rounded-2xl px-4 py-2.5"
        style={{
          backgroundColor: isMyMessage
            ? CHAT_COLORS.bubble.mine
            : CHAT_COLORS.bubble.other,
          borderTopLeftRadius: !isMyMessage && showAvatar ? 4 : 16,
          borderTopRightRadius: isMyMessage ? 4 : 16,
          // Glow effect pour les nouveaux messages
          shadowColor: isNew || isRecent ? CHAT_COLORS.bubble.mine : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isNew ? 0.8 : isRecent && isMyMessage ? 0.5 : 0,
          shadowRadius: isNew ? 12 : isRecent ? 8 : 0,
          // Border rouge si actions visibles
          borderWidth: showActions ? 1 : 0,
          borderColor: showActions ? '#EF4444' : 'transparent',
        }}
      >
        {/* Nom de l'expéditeur (autres messages) */}
        {!isMyMessage && showAvatar && (
          <Text
            className="text-xs font-bold mb-1"
            style={{ color: getAvatarColor(message.senderName) }}
          >
            {message.senderName}
          </Text>
        )}

        {/* Contenu du message avec liens cliquables */}
        {renderMessageContent(message.content, textColor)}

        {/* Horodatage */}
        <Text
          className="text-xs mt-1 text-right"
          style={{
            color: isMyMessage
              ? 'rgba(26, 29, 46, 0.6)'
              : 'rgba(255,255,255,0.5)',
          }}
        >
          {formatMessageTime(message.createdAt)}
        </Text>
      </Pressable>

      {/* Delete button for admin (right side for my messages) */}
      {isAdmin && showActions && isMyMessage && (
        <Pressable
          onPress={handleDelete}
          className="w-8 h-8 rounded-full items-center justify-center ml-2 self-center"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
        >
          <Trash2 size={16} color="#EF4444" />
        </Pressable>
      )}
    </Animated.View>
  );
}

export { getAvatarColor, getInitials };
