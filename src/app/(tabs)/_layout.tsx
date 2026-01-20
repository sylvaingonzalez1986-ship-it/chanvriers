import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Gift, Map, Settings, User, ShoppingCart, Sprout, Package, Percent, Database, Briefcase, Store, Music, TrendingUp, Globe, MessageCircle, Warehouse, FlaskConical } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useCartStore, useTabVisibilityStore, useProducerChatStore, TabRole } from '@/lib/store';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { usePermissions } from '@/lib/useAuth';

export default function TabLayout() {
  const itemCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const isTabVisibleForRole = useTabVisibilityStore((s) => s.isTabVisibleForRole);
  const chatUnreadCount = useProducerChatStore((s) => s.unreadCount);

  // Permissions Supabase Auth - isAdmin est maintenant la seule source de vérité
  const { isPro: isProUser, isAdmin, isProducer } = usePermissions();

  // Déterminer le rôle effectif de l'utilisateur pour la visibilité des tabs
  const getUserRole = (): TabRole | null => {
    if (isProducer) return 'producer';
    if (isProUser) return 'pro';
    return 'client';
  };

  const userRole = getUserRole();

  // Helper to check tab visibility based on admin config per role
  const shouldShowTab = (tabId: 'map' | 'packs' | 'promo' | 'produits' | 'cart' | 'farming' | 'tirage' | 'profile' | 'music' | 'bourse' | 'regions' | 'ma-boutique' | 'chat-producteurs' | 'marche-local') => {
    // Admin voit tout
    if (isAdmin) return true;

    // Utiliser la configuration par rôle définie dans l'admin
    return isTabVisibleForRole(tabId, userRole);
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background.nightSky,
          borderTopColor: COLORS.primary.gold,
          borderTopWidth: 2,
          height: Platform.OS === 'android' ? 70 : 90,
          paddingBottom: Platform.OS === 'android' ? 10 : 28,
          paddingTop: 8,
          shadowColor: COLORS.primary.gold,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarActiveTintColor: COLORS.primary.brightYellow,
        tabBarInactiveTintColor: COLORS.text.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          // Utiliser la police système sur Android pour éviter les problèmes
          fontFamily: Platform.OS === 'ios' ? 'Wallpoet_400Regular' : undefined,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          href: shouldShowTab('map') ? '/(tabs)/map' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.forest}30` : 'transparent',
            }}>
              <Map size={size} color={focused ? COLORS.accent.hemp : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: 'Musique',
          href: shouldShowTab('music') ? '/(tabs)/music' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.primary.gold}25` : 'transparent',
            }}>
              <Music size={size} color={focused ? COLORS.primary.gold : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="packs"
        options={{
          title: 'Packs',
          href: shouldShowTab('packs') ? '/(tabs)/packs' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.primary.orange}25` : 'transparent',
            }}>
              <Package size={size} color={focused ? COLORS.primary.orange : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="promo"
        options={{
          title: 'Promo',
          href: shouldShowTab('promo') ? '/(tabs)/promo' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.red}25` : 'transparent',
            }}>
              <Percent size={size} color={focused ? COLORS.accent.red : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pro"
        options={{
          title: 'Pro',
          href: (isProUser || isAdmin) ? '/(tabs)/pro' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.teal}25` : 'transparent',
            }}>
              <Briefcase size={size} color={focused ? COLORS.accent.teal : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bourse"
        options={{
          title: 'Bourse',
          href: shouldShowTab('bourse') ? '/(tabs)/bourse' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.hemp}25` : 'transparent',
            }}>
              <TrendingUp size={size} color={focused ? COLORS.accent.hemp : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="regions"
        options={{
          title: 'Régions',
          href: shouldShowTab('regions') ? '/(tabs)/regions' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.primary.gold}25` : 'transparent',
            }}>
              <Globe size={size} color={focused ? COLORS.primary.gold : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="produits"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="ma-boutique"
        options={{
          title: 'Boutique',
          href: shouldShowTab('ma-boutique') ? '/(tabs)/ma-boutique' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.hemp}25` : 'transparent',
            }}>
              <Store size={size} color={focused ? COLORS.accent.hemp : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat-producteurs"
        options={{
          title: 'Chat',
          href: shouldShowTab('chat-producteurs') ? '/(tabs)/chat-producteurs' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
            }}>
              <MessageCircle size={size} color={focused ? '#10B981' : color} strokeWidth={focused ? 2.5 : 2} />
              {chatUnreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: -4,
                    backgroundColor: '#10B981',
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: COLORS.background.nightSky,
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                  }}
                >
                  <Text style={{ color: COLORS.text.white, fontSize: 10, fontWeight: 'bold' }}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="marche-local"
        options={{
          title: 'Marché',
          href: shouldShowTab('marche-local') ? '/(tabs)/marche-local' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.hemp}25` : 'transparent',
            }}>
              <Warehouse size={size} color={focused ? COLORS.accent.hemp : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Panier',
          href: shouldShowTab('cart') ? '/(tabs)/cart' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.primary.coral}25` : 'transparent',
            }}>
              <ShoppingCart size={size} color={focused ? COLORS.primary.coral : color} strokeWidth={focused ? 2.5 : 2} />
              {itemCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: -4,
                    backgroundColor: COLORS.accent.red,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: COLORS.background.nightSky,
                    shadowColor: COLORS.accent.red,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4,
                  }}
                >
                  <Text style={{ color: COLORS.text.white, fontSize: 10, fontWeight: 'bold' }}>
                    {itemCount > 99 ? '99+' : itemCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="farming"
        options={{
          title: 'Farm',
          href: shouldShowTab('farming') ? '/(tabs)/farming' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.hemp}30` : 'transparent',
            }}>
              <Sprout size={size} color={focused ? COLORS.accent.hemp : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tirage"
        options={{
          title: 'Tirage',
          href: shouldShowTab('tirage') ? '/(tabs)/tirage' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.primary.gold}25` : 'transparent',
            }}>
              <Gift size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.teal}25` : 'transparent',
            }}>
              <Settings size={size} color={focused ? COLORS.accent.teal : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
          href: isAdmin ? '/(tabs)/admin' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          href: shouldShowTab('profile') ? '/(tabs)/profile' : null,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.sky}25` : 'transparent',
            }}>
              <User size={size} color={focused ? COLORS.accent.sky : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="odds"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="donnees-partagees"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="marche-catalogue"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="test-api"
        options={{
          title: 'Test API',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? `${COLORS.accent.redOrange}25` : 'transparent',
            }}>
              <FlaskConical size={size} color={focused ? COLORS.accent.redOrange : color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
          href: isAdmin ? '/(tabs)/test-api' : null,
        }}
      />
    </Tabs>
  );
}
