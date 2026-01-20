import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  MessageCircle,
  Users,
  Info,
  ArrowLeft,
  Shield,
  RefreshCw,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useProducerChatStore, useProducerStore } from '@/lib/store';
import { useAuth, usePermissions, useUserIdentity } from '@/lib/useAuth';
import { COLORS } from '@/lib/colors';
import {
  sendChatMessage,
  fetchChatMessages,
  subscribeToMessages,
  deleteChatMessage,
  getOnlineProducersCount,
  isSupabaseSyncConfigured,
  ChatMessage,
} from '@/lib/supabase-sync';
import {
  MessageBubble,
  DateSeparator,
  ChatInput,
  OnlineIndicator,
  TypingIndicator,
  ChatRules,
  MessageSkeleton,
} from '@/components/chat';

// Couleurs du chat
const CHAT_COLORS = {
  background: {
    primary: '#1a1d2e',
    secondary: '#0f172a',
  },
};

// Interface locale pour les messages (avec isNew pour animation)
interface LocalChatMessage extends ChatMessage {
  isNew?: boolean;
}

// Grouper les messages par jour
const groupMessagesByDay = (messages: LocalChatMessage[]) => {
  const groups: { date: string; timestamp: number; messages: LocalChatMessage[] }[] = [];
  let currentGroup: { date: string; timestamp: number; messages: LocalChatMessage[] } | null = null;

  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt).toDateString();

    if (!currentGroup || currentGroup.date !== messageDate) {
      currentGroup = {
        date: messageDate,
        timestamp: message.createdAt,
        messages: [message],
      };
      groups.push(currentGroup);
    } else {
      currentGroup.messages.push(message);
    }
  });

  return groups;
};

export default function ChatProducteursScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Auth et permissions
  const { isAuthenticated, profile } = useAuth();
  const { isProducer, isAdmin } = usePermissions();
  const { email: authEmail, fullName } = useUserIdentity();

  // Accès au chat: producteurs ET admins
  const hasAccess = isProducer || isAdmin;

  // Chat store pour le compteur de non-lus (badge)
  const markAllAsRead = useProducerChatStore((s) => s.markAllAsRead);

  // Producteurs pour les stats
  const producers = useProducerStore((s) => s.producers);

  // ID utilisateur pour identifier ses propres messages
  const currentUserId = profile?.id || authEmail || 'anonymous';
  const currentUserName = fullName || profile?.full_name || 'Producteur';

  // Charger les messages depuis Supabase
  const loadMessages = useCallback(async (showLoader = true) => {
    if (!isSupabaseSyncConfigured()) {
      setIsLoading(false);
      return;
    }

    if (showLoader) setIsLoading(true);

    try {
      const fetchedMessages = await fetchChatMessages(50);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('[Chat] Erreur chargement messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadMessages(false);
    setIsRefreshing(false);
  }, [loadMessages]);

  // Charger le nombre de producteurs en ligne
  const loadOnlineCount = useCallback(async () => {
    if (!isSupabaseSyncConfigured()) {
      setOnlineCount(Math.max(1, Math.floor(producers.length * 0.3) + 1));
      return;
    }

    try {
      const count = await getOnlineProducersCount();
      setOnlineCount(count);
    } catch (error) {
      setOnlineCount(1);
    }
  }, [producers.length]);

  // Charger les messages et s'abonner aux nouveaux à l'ouverture
  useEffect(() => {
    if (!hasAccess) return;

    // Charger les messages initiaux
    loadMessages();
    loadOnlineCount();

    // Marquer comme lus
    markAllAsRead();

    // S'abonner aux nouveaux messages en temps réel
    const unsubscribe = subscribeToMessages((newMessage) => {
      console.log('[Chat] Nouveau message reçu via Realtime:', newMessage.senderName);

      // Ignorer les messages qu'on a envoyé nous-même (déjà ajoutés via optimistic UI)
      if (newMessage.senderId === currentUserId) {
        console.log('[Chat] Message ignoré (envoyé par nous-même)');
        return;
      }

      // Haptic feedback for new message from others
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setMessages((prev) => {
        // Vérifier si le message existe déjà
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        // Ajouter le message avec flag isNew pour animation
        return [...prev, { ...newMessage, isNew: true }];
      });

      // Tracker les nouveaux messages pour animation
      setNewMessageIds((prev) => new Set(prev).add(newMessage.id));

      // Remove from typing users
      setTypingUsers((prev) => prev.filter((name) => name !== newMessage.senderName));

      // Retirer le flag isNew après 2 secondes
      setTimeout(() => {
        setNewMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(newMessage.id);
          return newSet;
        });
      }, 2000);
    });

    // Rafraîchir le compte en ligne toutes les 30 secondes
    const onlineInterval = setInterval(loadOnlineCount, 30000);

    return () => {
      unsubscribe();
      clearInterval(onlineInterval);
    };
  }, [hasAccess, loadMessages, loadOnlineCount, markAllAsRead, currentUserId]);

  // Scroller vers le bas quand un nouveau message arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  // Envoyer un message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!hasAccess) return;

    setIsSending(true);

    // Créer un message optimiste local
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: LocalChatMessage = {
      id: optimisticId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: undefined,
      content: content,
      createdAt: Date.now(),
      isNew: true,
    };

    // Ajouter le message optimiste immédiatement
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessageIds((prev) => new Set(prev).add(optimisticId));

    try {
      // Envoyer à Supabase
      const sentMessage = await sendChatMessage(
        currentUserId,
        currentUserName,
        null,
        content
      );

      if (sentMessage) {
        // Remplacer le message optimiste par le vrai message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId ? { ...sentMessage, isNew: true } : m
          )
        );
        setNewMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(optimisticId);
          newSet.add(sentMessage.id);
          return newSet;
        });
      } else {
        // Si l'envoi a échoué (sentMessage est null), retirer le message optimiste
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setNewMessageIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(optimisticId);
          return newSet;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('[Chat] Erreur envoi message:', error);
      // En cas d'erreur, retirer le message optimiste et notifier l'utilisateur
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setNewMessageIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(optimisticId);
        return newSet;
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSending(false);
    }

    // Retirer le flag isNew après 2 secondes (seulement si le message existe encore)
    setTimeout(() => {
      setNewMessageIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(optimisticId);
        return newSet;
      });
    }, 2000);
  }, [currentUserId, currentUserName, hasAccess]);

  // Supprimer un message (admin uniquement)
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!isAdmin) return;

    console.log('[Chat] Suppression du message:', messageId);
    const success = await deleteChatMessage(messageId);

    if (success) {
      // Retirer le message de la liste locale
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isAdmin]);

  // Grouper les messages par jour
  const messageGroups = groupMessagesByDay(messages);

  // Si l'utilisateur n'est pas producteur ou admin, afficher un message d'accès refusé
  if (!isAuthenticated || !hasAccess) {
    return (
      <View className="flex-1" style={{ backgroundColor: CHAT_COLORS.background.primary }}>
        <LinearGradient
          colors={[CHAT_COLORS.background.primary, CHAT_COLORS.background.secondary]}
          style={{ flex: 1 }}
        >
          <View style={{ paddingTop: insets.top }} className="flex-1 items-center justify-center px-6">
            <Animated.View entering={FadeIn.duration(500)} className="items-center">
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Shield size={48} color="#EF4444" />
              </View>
              <Text className="text-white text-2xl font-bold text-center mb-3">
                Accès réservé
              </Text>
              <Text className="text-gray-400 text-center text-base mb-6">
                Le chat communautaire est réservé aux producteurs partenaires des Chanvriers Unis.
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="px-6 py-3 rounded-xl"
                style={{ backgroundColor: COLORS.primary.gold }}
              >
                <Text className="text-white font-bold">Retour</Text>
              </Pressable>
            </Animated.View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: CHAT_COLORS.background.primary }}>
      <LinearGradient
        colors={[CHAT_COLORS.background.primary, CHAT_COLORS.background.secondary]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top, borderBottomColor: 'rgba(212, 175, 55, 0.3)', borderBottomWidth: 1 }}
        >
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center flex-1">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
              >
                <ArrowLeft size={20} color={COLORS.primary.gold} />
              </Pressable>
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
              >
                <Users size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">Chat Producteurs</Text>
                <OnlineIndicator count={onlineCount} size="small" />
              </View>
            </View>
            <View className="flex-row items-center">
              <Pressable
                onPress={handleRefresh}
                className="w-10 h-10 rounded-full items-center justify-center mr-2"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
              >
                <RefreshCw size={18} color="#10B981" />
              </Pressable>
              <Pressable
                onPress={() => setShowInfoModal(true)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
              >
                <Info size={20} color={COLORS.primary.gold} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
          {isLoading ? (
            <MessageSkeleton count={6} />
          ) : (
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 px-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 16 }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#10B981"
                  colors={['#10B981']}
                />
              }
            >
              {messages.length === 0 ? (
                <View className="flex-1 items-center justify-center py-20">
                  <MessageCircle size={48} color="rgba(255,255,255,0.2)" />
                  <Text className="text-gray-500 text-center mt-4">
                    Aucun message pour le moment.{'\n'}Soyez le premier à écrire !
                  </Text>
                </View>
              ) : (
                messageGroups.map((group, groupIndex) => (
                  <View key={`${group.date}-${groupIndex}`}>
                    {/* Date separator */}
                    <DateSeparator timestamp={group.timestamp} />

                    {/* Messages du jour */}
                    {group.messages.map((message, messageIndex) => {
                      const isMyMessage = message.senderId === currentUserId;
                      const showAvatar =
                        !isMyMessage &&
                        (messageIndex === 0 ||
                          group.messages[messageIndex - 1].senderId !== message.senderId);
                      const isNew = newMessageIds.has(message.id);

                      return (
                        <MessageBubble
                          key={`${message.id}-${messageIndex}`}
                          message={message}
                          isMyMessage={isMyMessage}
                          showAvatar={showAvatar}
                          isNew={isNew}
                          currentUserId={currentUserId}
                          isAdmin={isAdmin}
                          onDelete={handleDeleteMessage}
                        />
                      );
                    })}
                  </View>
                ))
              )}

              {/* Typing indicator */}
              <TypingIndicator names={typingUsers} />
            </ScrollView>
          )}

          {/* Input de message */}
          <ChatInput
            onSend={handleSendMessage}
            isSending={isSending}
            bottomInset={insets.bottom}
          />
        </KeyboardAvoidingView>

        {/* Modal Info */}
        <ChatRules
          visible={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          producersCount={producers.length}
          onlineCount={onlineCount}
          messagesCount={messages.length}
        />
      </LinearGradient>
    </View>
  );
}
