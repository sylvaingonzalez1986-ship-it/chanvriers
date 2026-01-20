/**
 * SecureStorage - Stockage sécurisé unifié pour React Native / Expo
 *
 * ARCHITECTURE:
 * - iOS/Android: Utilise expo-secure-store (chiffrement hardware Keychain/Keystore)
 * - Web: Utilise AsyncStorage avec chiffrement AES-256-GCM via Web Crypto API
 *
 * SÉCURITÉ:
 * - Chiffrement AES-256-GCM pour le web (standard NIST)
 * - Clé de chiffrement dérivée via PBKDF2 avec sel unique par installation
 * - IV (nonce) unique pour chaque opération de chiffrement
 * - Intégrité des données garantie par le tag GCM
 *
 * @module SecureStorage
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ============================================
// Configuration
// ============================================

const STORAGE_PREFIX = 'secure_v2_';
const SALT_KEY = '__secure_storage_salt__';
const KEY_CHECK_KEY = '__secure_storage_initialized__';
const RUNTIME_KEY_STORAGE_KEY = '__secure_storage_runtime_key__';

// Dérivation de clé
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes pour GCM
const RUNTIME_KEY_LENGTH = 48; // caractères pour clé générée

// ============================================
// Gestion sécurisée de la clé de chiffrement
// ============================================

/**
 * SÉCURITÉ : La clé de chiffrement est lue depuis la variable d'environnement
 * EXPO_PUBLIC_ENCRYPTION_KEY. Si non définie, une clé est générée dynamiquement
 * et stockée pour la session (persistée dans AsyncStorage pour cohérence).
 *
 * IMPORTANT : En production, TOUJOURS définir EXPO_PUBLIC_ENCRYPTION_KEY
 * dans le fichier .env avec une clé de 32+ caractères aléatoires.
 *
 * Génération d'une clé robuste :
 * node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * ou
 * openssl rand -base64 32
 */

// Variable pour stocker la clé runtime (générée si env non définie)
let runtimeGeneratedKey: string | null = null;

/**
 * Génère une clé aléatoire cryptographiquement sécurisée
 */
function generateSecureRandomKey(length: number = RUNTIME_KEY_LENGTH): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback moins sécurisé - seulement en dernier recours
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

/**
 * Récupère la clé de chiffrement de manière sécurisée
 * Priorité :
 * 1. Variable d'environnement EXPO_PUBLIC_ENCRYPTION_KEY (recommandé)
 * 2. Clé runtime générée et persistée (fallback pour dev/test)
 */
async function getEncryptionSecret(): Promise<string> {
  // 1. Vérifier la variable d'environnement (source principale)
  const envKey = process.env.EXPO_PUBLIC_ENCRYPTION_KEY;

  if (envKey && envKey.trim().length >= 16) {
    return envKey.trim();
  }

  // 2. Avertissement si clé env non définie ou trop courte
  if (Platform.OS === 'web') {
    if (!envKey) {
      console.warn(
        '[SecureStorage] ⚠️ EXPO_PUBLIC_ENCRYPTION_KEY non définie.\n' +
        'Une clé temporaire sera générée. En production, définissez cette variable dans .env\n' +
        'Générez une clé avec: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      );
    } else if (envKey.trim().length < 16) {
      console.warn(
        '[SecureStorage] ⚠️ EXPO_PUBLIC_ENCRYPTION_KEY trop courte (< 16 caractères).\n' +
        'Utilisez une clé d\'au moins 32 caractères pour une sécurité optimale.'
      );
    }
  }

  // 3. Utiliser la clé runtime en mémoire si déjà générée
  if (runtimeGeneratedKey) {
    return runtimeGeneratedKey;
  }

  // 4. Essayer de récupérer une clé runtime précédemment stockée
  try {
    const storedRuntimeKey = await AsyncStorage.getItem(RUNTIME_KEY_STORAGE_KEY);
    if (storedRuntimeKey && storedRuntimeKey.length >= 32) {
      runtimeGeneratedKey = storedRuntimeKey;
      return runtimeGeneratedKey;
    }
  } catch {
    // Ignorer les erreurs de lecture
  }

  // 5. Générer une nouvelle clé runtime et la persister
  runtimeGeneratedKey = generateSecureRandomKey(RUNTIME_KEY_LENGTH);

  try {
    await AsyncStorage.setItem(RUNTIME_KEY_STORAGE_KEY, runtimeGeneratedKey);
    console.log('[SecureStorage] Clé runtime générée et persistée pour cette installation');
  } catch {
    console.warn('[SecureStorage] Impossible de persister la clé runtime');
  }

  return runtimeGeneratedKey;
}

// ============================================
// Types
// ============================================

export interface SecureStorageOptions {
  /** Niveau de sécurité pour SecureStore (iOS uniquement) */
  keychainAccessible?: SecureStore.KeychainAccessibilityConstant;
}

interface EncryptedData {
  /** Données chiffrées en base64 */
  ciphertext: string;
  /** IV utilisé en base64 */
  iv: string;
  /** Version du format de chiffrement */
  version: number;
}

// ============================================
// Utilitaires de conversion
// ============================================

/**
 * Convertit un Uint8Array en chaîne base64
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convertit une chaîne base64 en Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convertit une chaîne en Uint8Array (UTF-8)
 */
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convertit un Uint8Array en chaîne (UTF-8)
 */
function uint8ArrayToString(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Génère des bytes aléatoires cryptographiquement sécurisés
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback pour environnements sans Web Crypto
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

// ============================================
// Gestion de la clé de chiffrement (Web)
// ============================================

let cachedKey: CryptoKey | null = null;
let cachedSalt: Uint8Array | null = null;

/**
 * Récupère ou génère le sel unique pour cette installation
 */
async function getOrCreateSalt(): Promise<Uint8Array> {
  if (cachedSalt) return cachedSalt;

  try {
    const storedSalt = await AsyncStorage.getItem(SALT_KEY);
    if (storedSalt) {
      cachedSalt = base64ToUint8Array(storedSalt);
      return cachedSalt;
    }
  } catch {
    // Ignorer les erreurs de lecture
  }

  // Générer un nouveau sel
  cachedSalt = getRandomBytes(SALT_LENGTH);
  await AsyncStorage.setItem(SALT_KEY, uint8ArrayToBase64(cachedSalt));
  return cachedSalt;
}

/**
 * Dérive une clé de chiffrement AES-256 à partir du secret et du sel
 * Utilise PBKDF2 pour le key stretching
 */
async function deriveEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  // Vérifier si Web Crypto API est disponible
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('[SecureStorage] Web Crypto API non disponible');
  }

  const salt = await getOrCreateSalt();
  const secret = await getEncryptionSecret();
  const secretBytes = stringToUint8Array(secret);

  // Cast explicite pour satisfaire TypeScript strict mode
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    secretBytes.buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );

  return cachedKey;
}

// ============================================
// Chiffrement/Déchiffrement (Web)
// ============================================

/**
 * Chiffre une valeur avec AES-256-GCM
 */
async function encryptValue(value: string): Promise<string> {
  const key = await deriveEncryptionKey();
  const iv = getRandomBytes(IV_LENGTH);
  const plaintext = stringToUint8Array(value);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext.buffer as ArrayBuffer
  );

  const encryptedData: EncryptedData = {
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertext)),
    iv: uint8ArrayToBase64(iv),
    version: 1,
  };

  return JSON.stringify(encryptedData);
}

/**
 * Déchiffre une valeur chiffrée avec AES-256-GCM
 */
async function decryptValue(encryptedString: string): Promise<string> {
  const key = await deriveEncryptionKey();

  let encryptedData: EncryptedData;
  try {
    encryptedData = JSON.parse(encryptedString);
  } catch {
    throw new Error('[SecureStorage] Données chiffrées invalides');
  }

  if (encryptedData.version !== 1) {
    throw new Error(`[SecureStorage] Version de chiffrement non supportée: ${encryptedData.version}`);
  }

  const ciphertext = base64ToUint8Array(encryptedData.ciphertext);
  const iv = base64ToUint8Array(encryptedData.iv);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  return uint8ArrayToString(new Uint8Array(plaintext));
}

// ============================================
// Vérification de la disponibilité
// ============================================

/**
 * Vérifie si le stockage sécurisé est disponible sur cette plateforme
 */
export async function isSecureStorageAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Vérifier Web Crypto API
    return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
  }

  // iOS/Android - Vérifier SecureStore
  try {
    await SecureStore.getItemAsync('__test_availability__');
    return true;
  } catch {
    return false;
  }
}

/**
 * Vérifie si le stockage sécurisé a été initialisé correctement
 */
export async function isSecureStorageInitialized(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const check = await AsyncStorage.getItem(STORAGE_PREFIX + KEY_CHECK_KEY);
      return check === 'initialized';
    }
    return true; // SecureStore n'a pas besoin d'initialisation
  } catch {
    return false;
  }
}

/**
 * Initialise le stockage sécurisé (nécessaire pour le web)
 */
export async function initializeSecureStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    // Vérifier que Web Crypto est disponible
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      console.warn('[SecureStorage] Web Crypto API non disponible - Fallback vers stockage non chiffré');
      return;
    }

    // Initialiser le sel et tester le chiffrement
    try {
      await getOrCreateSalt();
      await deriveEncryptionKey();
      await AsyncStorage.setItem(STORAGE_PREFIX + KEY_CHECK_KEY, 'initialized');
      console.log('[SecureStorage] Initialisé avec succès (Web + AES-256-GCM)');
    } catch (error) {
      console.error('[SecureStorage] Erreur initialisation:', error);
      throw error;
    }
  } else {
    console.log(`[SecureStorage] Utilisation de SecureStore (${Platform.OS})`);
  }
}

// ============================================
// API Principale
// ============================================

/**
 * Stocke une valeur de manière sécurisée
 *
 * @param key - Clé unique pour identifier la valeur
 * @param value - Valeur à stocker (sera chiffrée sur web)
 * @param options - Options supplémentaires (accessibilité Keychain pour iOS)
 *
 * @example
 * ```typescript
 * await SecureStorage.setItem('access_token', 'jwt_token_here');
 * ```
 */
export async function setItem(
  key: string,
  value: string,
  options?: SecureStorageOptions
): Promise<void> {
  const prefixedKey = STORAGE_PREFIX + key;

  if (Platform.OS === 'web') {
    try {
      // Vérifier si Web Crypto est disponible
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encryptedValue = await encryptValue(value);
        await AsyncStorage.setItem(prefixedKey, encryptedValue);
      } else {
        // Fallback non chiffré (avec avertissement)
        console.warn('[SecureStorage] Stockage non chiffré (Web Crypto indisponible)');
        await AsyncStorage.setItem(prefixedKey, value);
      }
    } catch (error) {
      console.error('[SecureStorage] Erreur setItem:', error);
      // Fallback non chiffré en cas d'erreur
      await AsyncStorage.setItem(prefixedKey, value);
    }
    return;
  }

  // iOS/Android - Utiliser SecureStore
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: options?.keychainAccessible ?? SecureStore.WHEN_UNLOCKED,
    });
  } catch (error) {
    console.warn('[SecureStorage] SecureStore indisponible, fallback AsyncStorage');
    await AsyncStorage.setItem(prefixedKey, value);
  }
}

/**
 * Récupère une valeur stockée de manière sécurisée
 *
 * @param key - Clé de la valeur à récupérer
 * @returns La valeur déchiffrée ou null si non trouvée
 *
 * @example
 * ```typescript
 * const token = await SecureStorage.getItem('access_token');
 * ```
 */
export async function getItem(key: string): Promise<string | null> {
  const prefixedKey = STORAGE_PREFIX + key;

  if (Platform.OS === 'web') {
    try {
      const storedValue = await AsyncStorage.getItem(prefixedKey);
      if (!storedValue) return null;

      // Essayer de déchiffrer
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
          return await decryptValue(storedValue);
        } catch {
          // Peut être une ancienne valeur non chiffrée
          // Vérifier si c'est du JSON valide (format chiffré)
          try {
            JSON.parse(storedValue);
            // C'est du JSON mais déchiffrement échoué - données corrompues
            console.warn('[SecureStorage] Données corrompues pour:', key);
            return null;
          } catch {
            // Pas du JSON = ancienne valeur non chiffrée
            return storedValue;
          }
        }
      }
      return storedValue;
    } catch (error) {
      console.error('[SecureStorage] Erreur getItem:', error);
      return null;
    }
  }

  // iOS/Android - Utiliser SecureStore
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // Fallback vers AsyncStorage
    return AsyncStorage.getItem(prefixedKey);
  }
}

/**
 * Supprime une valeur stockée
 *
 * @param key - Clé de la valeur à supprimer
 *
 * @example
 * ```typescript
 * await SecureStorage.deleteItem('access_token');
 * ```
 */
export async function deleteItem(key: string): Promise<void> {
  const prefixedKey = STORAGE_PREFIX + key;

  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(prefixedKey);
    return;
  }

  // iOS/Android
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignorer les erreurs
  }
  // Nettoyer aussi AsyncStorage (ancien fallback)
  await AsyncStorage.removeItem(prefixedKey);
}

/**
 * Vérifie si une clé existe dans le stockage sécurisé
 *
 * @param key - Clé à vérifier
 * @returns true si la clé existe, false sinon
 */
export async function hasItem(key: string): Promise<boolean> {
  const value = await getItem(key);
  return value !== null;
}

/**
 * Efface toutes les données du stockage sécurisé
 * ATTENTION: Cette opération est irréversible
 */
export async function clearAll(): Promise<void> {
  if (Platform.OS === 'web') {
    // Récupérer toutes les clés avec notre préfixe
    const allKeys = await AsyncStorage.getAllKeys();
    const secureKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
    await AsyncStorage.multiRemove(secureKeys);

    // Réinitialiser le cache
    cachedKey = null;
    cachedSalt = null;
    return;
  }

  // Pour iOS/Android, on ne peut pas lister les clés SecureStore
  // Il faut supprimer les clés connues individuellement
  console.warn('[SecureStorage] clearAll() ne supprime que les clés connues sur iOS/Android');
}

// ============================================
// Migration depuis l'ancien système
// ============================================

/**
 * Migre les données de l'ancien système de stockage vers le nouveau
 * À appeler une seule fois au démarrage de l'application
 */
export async function migrateFromLegacyStorage(legacyKeys: string[]): Promise<void> {
  console.log('[SecureStorage] Début de la migration...');

  for (const key of legacyKeys) {
    try {
      // Essayer de lire depuis l'ancien système (préfixe 'secure_')
      const oldKey = `secure_${key}`;
      const oldValue = await AsyncStorage.getItem(oldKey);

      if (oldValue && oldValue !== '***SECURE***') {
        // Migrer vers le nouveau système
        await setItem(key, oldValue);
        // Supprimer l'ancienne valeur
        await AsyncStorage.removeItem(oldKey);
        console.log(`[SecureStorage] Migré: ${key}`);
      }
    } catch (error) {
      console.warn(`[SecureStorage] Erreur migration ${key}:`, error);
    }
  }

  console.log('[SecureStorage] Migration terminée');
}

// ============================================
// Export par défaut
// ============================================

const SecureStorage = {
  setItem,
  getItem,
  deleteItem,
  hasItem,
  clearAll,
  isAvailable: isSecureStorageAvailable,
  isInitialized: isSecureStorageInitialized,
  initialize: initializeSecureStorage,
  migrateFromLegacy: migrateFromLegacyStorage,
};

export default SecureStorage;
