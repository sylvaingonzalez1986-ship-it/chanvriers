/**
 * RGPDSection - Composant pour la gestion des données RGPD
 *
 * Fonctionnalités:
 * - Export des données personnelles (Article 15 RGPD)
 * - Suppression du compte (Article 17 RGPD - Droit à l'oubli)
 * - Confirmation en 2 étapes pour la suppression
 */

import React, { useState } from 'react';
import {
  View,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import {
  Download,
  Trash2,
  Shield,
  AlertTriangle,
  Check,
  X,
  FileText,
} from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/lib/colors';
import { SUPABASE_URL, SUPABASE_ANON_KEY, signOut, getSession } from '@/lib/supabase-auth';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Types
interface ExportData {
  export_info: {
    generated_at: string;
    request_id: string;
    user_email: string;
    data_controller: string;
    contact: string;
  };
  profile: Record<string, unknown>;
  orders: unknown[];
  products_created: unknown[];
  lots_won: unknown[];
  activity_log: unknown[];
}

interface DeletionPreview {
  email: string;
  is_producer: boolean;
  data_to_delete: {
    profile: boolean;
    orders_to_anonymize: number;
    products_to_delete: number;
    lots_to_delete: number;
  };
  warning: string;
  confirmation_required: string;
}

interface DeletionResult {
  success: boolean;
  message?: string;
  error?: string;
  request_id?: string;
  details?: {
    orders_anonymized: number;
    products_deleted: number;
    note: string;
  };
}

interface RGPDSectionProps {
  onAccountDeleted?: () => void;
}

export function RGPDSection({ onAccountDeleted }: RGPDSectionProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'preview' | 'confirm'>('preview');
  const [deletionPreview, setDeletionPreview] = useState<DeletionPreview | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /**
   * Récupère le token d'accès pour les requêtes API
   */
  const getAccessToken = async (): Promise<string> => {
    const session = getSession();
    return session?.access_token || SUPABASE_ANON_KEY;
  };

  /**
   * Export des données utilisateur
   */
  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/export_user_data`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export des données');
      }

      const data: ExportData = await response.json();

      if ('error' in data) {
        throw new Error(String(data.error));
      }

      // Formater les données en JSON lisible
      const jsonContent = JSON.stringify(data, null, 2);
      const fileName = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        // Sur web, télécharger directement
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Sur mobile, sauvegarder et partager
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, jsonContent);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: 'Exporter mes données',
          });
        } else {
          // Fallback: partager via Share API
          await Share.share({
            title: 'Mes données personnelles',
            message: jsonContent.substring(0, 1000) + '...',
          });
        }
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('[RGPD] Erreur export:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'exporter vos données. Veuillez réessayer.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Ouvre le modal de suppression et charge l'aperçu
   */
  const handleOpenDeleteModal = async () => {
    setShowDeleteModal(true);
    setDeleteStep('preview');
    setConfirmationText('');
    setDeleteError(null);
    setDeletionPreview(null);

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/preview_account_deletion`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data: DeletionPreview = await response.json();

      if ('error' in data) {
        throw new Error(String(data.error));
      }

      setDeletionPreview(data);
    } catch (error) {
      console.error('[RGPD] Erreur preview:', error);
      setDeleteError('Impossible de charger les informations. Veuillez réessayer.');
    }
  };

  /**
   * Exécute la suppression du compte
   */
  const handleDeleteAccount = async () => {
    if (confirmationText !== 'SUPPRIMER MON COMPTE') {
      setDeleteError('Veuillez saisir exactement: SUPPRIMER MON COMPTE');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/delete_user_account`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_confirmation_text: confirmationText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      const result: DeletionResult = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      // Succès - déconnecter l'utilisateur
      setShowDeleteModal(false);

      Alert.alert(
        'Compte supprimé',
        'Votre compte a été supprimé avec succès. Vous allez être déconnecté.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await signOut();
              onAccountDeleted?.();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[RGPD] Erreur suppression:', error);
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la suppression. Veuillez réessayer.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View className="mb-6">
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <Shield size={20} color={COLORS.accent.teal} />
        <Text style={{ color: COLORS.accent.teal }} className="text-lg font-bold ml-2">
          Données personnelles (RGPD)
        </Text>
      </View>

      {/* Export Data Button */}
      <Pressable
        onPress={handleExportData}
        disabled={isExporting}
        className="p-4 rounded-xl mb-3 flex-row items-center"
        style={{
          backgroundColor: COLORS.background.charcoal,
          borderWidth: 1.5,
          borderColor: `${COLORS.accent.teal}40`,
          opacity: isExporting ? 0.7 : 1,
        }}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color={COLORS.accent.teal} />
        ) : exportSuccess ? (
          <Check size={22} color={COLORS.accent.hemp} />
        ) : (
          <Download size={22} color={COLORS.accent.teal} />
        )}
        <View className="flex-1 ml-3">
          <Text style={{ color: COLORS.text.cream }} className="font-semibold">
            {exportSuccess ? 'Export réussi !' : 'Exporter mes données'}
          </Text>
          <Text style={{ color: COLORS.text.muted }} className="text-sm mt-0.5">
            Téléchargez toutes vos données personnelles
          </Text>
        </View>
        <FileText size={18} color={COLORS.text.muted} />
      </Pressable>

      {/* Delete Account Button */}
      <Pressable
        onPress={handleOpenDeleteModal}
        className="p-4 rounded-xl flex-row items-center"
        style={{
          backgroundColor: `${COLORS.accent.red}10`,
          borderWidth: 1.5,
          borderColor: `${COLORS.accent.red}40`,
        }}
      >
        <Trash2 size={22} color={COLORS.accent.red} />
        <View className="flex-1 ml-3">
          <Text style={{ color: COLORS.accent.red }} className="font-semibold">
            Supprimer mon compte
          </Text>
          <Text style={{ color: COLORS.text.muted }} className="text-sm mt-0.5">
            Supprime définitivement toutes vos données
          </Text>
        </View>
      </Pressable>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View
          className="flex-1 justify-center items-center px-5"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            className="w-full max-w-md rounded-2xl p-5"
            style={{ backgroundColor: COLORS.background.charcoal }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <AlertTriangle size={24} color={COLORS.accent.red} />
                <Text style={{ color: COLORS.accent.red }} className="text-lg font-bold ml-2">
                  Supprimer le compte
                </Text>
              </View>
              <Pressable onPress={() => setShowDeleteModal(false)}>
                <X size={24} color={COLORS.text.muted} />
              </Pressable>
            </View>

            {deleteStep === 'preview' ? (
              <>
                {/* Preview Step */}
                {!deletionPreview ? (
                  <View className="items-center py-8">
                    <ActivityIndicator size="large" color={COLORS.accent.red} />
                    <Text style={{ color: COLORS.text.muted }} className="mt-3">
                      Chargement...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={{ color: COLORS.text.lightGray }} className="mb-4">
                      Vous êtes sur le point de supprimer votre compte{' '}
                      <Text style={{ color: COLORS.text.cream }} className="font-bold">
                        {deletionPreview.email}
                      </Text>
                    </Text>

                    {/* Data Summary */}
                    <View
                      className="p-4 rounded-xl mb-4"
                      style={{ backgroundColor: `${COLORS.accent.red}15` }}
                    >
                      <Text style={{ color: COLORS.text.cream }} className="font-semibold mb-2">
                        Données concernées :
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-sm">
                        • Profil personnel : supprimé
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-sm">
                        • Commandes ({deletionPreview.data_to_delete.orders_to_anonymize}) : anonymisées
                      </Text>
                      {deletionPreview.data_to_delete.products_to_delete > 0 && (
                        <Text style={{ color: COLORS.text.muted }} className="text-sm">
                          • Produits ({deletionPreview.data_to_delete.products_to_delete}) : supprimés
                        </Text>
                      )}
                      {deletionPreview.data_to_delete.lots_to_delete > 0 && (
                        <Text style={{ color: COLORS.text.muted }} className="text-sm">
                          • Lots gagnés ({deletionPreview.data_to_delete.lots_to_delete}) : supprimés
                        </Text>
                      )}
                    </View>

                    {/* Warning */}
                    <View
                      className="p-3 rounded-xl mb-4 flex-row items-start"
                      style={{ backgroundColor: `${COLORS.primary.brightYellow}20` }}
                    >
                      <AlertTriangle size={18} color={COLORS.primary.brightYellow} />
                      <Text
                        style={{ color: COLORS.primary.brightYellow }}
                        className="text-sm ml-2 flex-1"
                      >
                        {deletionPreview.warning}
                      </Text>
                    </View>

                    {/* Continue Button */}
                    <Pressable
                      onPress={() => setDeleteStep('confirm')}
                      className="py-3 rounded-xl items-center"
                      style={{ backgroundColor: COLORS.accent.red }}
                    >
                      <Text style={{ color: COLORS.text.white }} className="font-bold">
                        Continuer vers la confirmation
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Confirmation Step */}
                <Text style={{ color: COLORS.text.lightGray }} className="mb-4">
                  Pour confirmer la suppression définitive de votre compte, saisissez :
                </Text>

                <View
                  className="p-3 rounded-xl mb-4 items-center"
                  style={{ backgroundColor: `${COLORS.accent.red}20` }}
                >
                  <Text style={{ color: COLORS.accent.red }} className="font-mono font-bold">
                    SUPPRIMER MON COMPTE
                  </Text>
                </View>

                <TextInput
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  placeholder="Saisissez le texte ci-dessus"
                  placeholderTextColor={COLORS.text.muted}
                  autoCapitalize="characters"
                  className="rounded-xl px-4 py-3 mb-4"
                  style={{
                    backgroundColor: COLORS.background.nightSky,
                    borderWidth: 1.5,
                    borderColor:
                      confirmationText === 'SUPPRIMER MON COMPTE'
                        ? COLORS.accent.red
                        : `${COLORS.text.muted}40`,
                    color: COLORS.text.cream,
                  }}
                />

                {deleteError && (
                  <Animated.View entering={FadeIn.duration(200)} className="mb-4">
                    <Text style={{ color: COLORS.accent.red }} className="text-sm text-center">
                      {deleteError}
                    </Text>
                  </Animated.View>
                )}

                <View className="flex-row">
                  <Pressable
                    onPress={() => setDeleteStep('preview')}
                    className="flex-1 py-3 rounded-xl items-center mr-2"
                    style={{
                      backgroundColor: `${COLORS.text.muted}20`,
                      borderWidth: 1,
                      borderColor: `${COLORS.text.muted}40`,
                    }}
                  >
                    <Text style={{ color: COLORS.text.muted }} className="font-semibold">
                      Retour
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDeleteAccount}
                    disabled={isDeleting || confirmationText !== 'SUPPRIMER MON COMPTE'}
                    className="flex-1 py-3 rounded-xl items-center ml-2"
                    style={{
                      backgroundColor:
                        confirmationText === 'SUPPRIMER MON COMPTE'
                          ? COLORS.accent.red
                          : `${COLORS.accent.red}40`,
                    }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={COLORS.text.white} />
                    ) : (
                      <Text style={{ color: COLORS.text.white }} className="font-bold">
                        Supprimer définitivement
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}

            {/* Cancel link */}
            <Pressable
              onPress={() => setShowDeleteModal(false)}
              className="mt-4 items-center"
            >
              <Text style={{ color: COLORS.text.muted }} className="text-sm">
                Annuler
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

export default RGPDSection;
