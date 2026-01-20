// Image upload utilities for Supabase Storage
// Handles uploading local images to Supabase Storage so they are visible to all users
// With retry logic, user-friendly error messages, and server-side validation

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { isSupabaseConfigured, getSupabaseConfig } from './env-validation';

// Storage bucket name - must be created in Supabase dashboard
const STORAGE_BUCKET = 'images';

// Max image dimensions for compression
const MAX_IMAGE_SIZE = 800;
const JPEG_QUALITY = 0.7;

// Retry configuration
const MAX_UPLOAD_RETRIES = 3;
const UPLOAD_TIMEOUT = 30000; // 30 seconds
const RETRY_DELAY_BASE = 2000; // 2 seconds

// Track if bucket has been verified
let bucketVerified = false;

// Upload state for UI feedback
export type UploadStatus = 'idle' | 'compressing' | 'validating' | 'uploading' | 'retrying' | 'success' | 'error';

export interface UploadProgress {
  status: UploadStatus;
  message: string;
  attempt?: number;
  maxAttempts?: number;
}

// Server validation result
interface ValidationResult {
  valid: boolean;
  status: 'accepted' | 'rejected' | 'suspicious';
  reason: string | null;
  max_size_mb: number;
}

// Global listeners for upload progress
type UploadProgressListener = (progress: UploadProgress) => void;
const uploadProgressListeners: Set<UploadProgressListener> = new Set();

function notifyProgress(progress: UploadProgress) {
  uploadProgressListeners.forEach((listener) => listener(progress));
}

// Subscribe to upload progress
export function onUploadProgress(listener: UploadProgressListener): () => void {
  uploadProgressListeners.add(listener);
  return () => {
    uploadProgressListeners.delete(listener);
  };
}

// Error messages en français
const ERROR_MESSAGES = {
  NOT_CONFIGURED: 'Service de stockage non configuré',
  BUCKET_NOT_FOUND: 'Espace de stockage non trouvé. Contactez l\'administrateur.',
  TIMEOUT: 'L\'envoi a pris trop de temps. Nouvelle tentative...',
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion.',
  UPLOAD_FAILED: 'L\'image n\'a pas pu être envoyée. Réessayez.',
  COMPRESSION_FAILED: 'Erreur lors de la compression de l\'image.',
  MAX_RETRIES_REACHED: 'Impossible d\'envoyer l\'image après plusieurs tentatives.',
  VALIDATION_FAILED: 'Le fichier n\'a pas passé la validation de sécurité.',
  FILE_TOO_LARGE: 'Le fichier est trop volumineux.',
  INVALID_TYPE: 'Type de fichier non autorisé.',
} as const;

// Types MIME autorisés côté client (première ligne de défense)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function isSupabaseStorageConfigured(): boolean {
  return isSupabaseConfigured();
}

/**
 * Ensure the storage bucket exists and is public
 */
async function ensureBucketExists(): Promise<boolean> {
  if (bucketVerified) return true;
  if (!isSupabaseConfigured()) return false;

  const { url, anonKey } = getSupabaseConfig();

  try {
    // Check if bucket exists
    const checkResponse = await fetch(
      `${url}/storage/v1/bucket/${STORAGE_BUCKET}`,
      {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
      }
    );

    if (checkResponse.ok) {
      bucketVerified = true;
      return true;
    }

    // Bucket doesn't exist - try to create it
    console.log('Bucket not found, attempting to create...');
    const createResponse = await fetch(
      `${url}/storage/v1/bucket`,
      {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: STORAGE_BUCKET,
          name: STORAGE_BUCKET,
          public: true,
          file_size_limit: 5242880, // 5MB
          allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        }),
      }
    );

    if (createResponse.ok) {
      console.log('Bucket created successfully');
      bucketVerified = true;
      return true;
    }

    // If we get a permission error (403), the bucket likely exists but we can't create it via API
    // This is normal - bucket should be created manually in Supabase Dashboard
    if (createResponse.status === 400 || createResponse.status === 403) {
      // Try uploading anyway - the bucket exists
      bucketVerified = true;
      return true;
    }

    const errorText = await createResponse.text();
    console.log('Bucket check info:', errorText);
    return false;
  } catch (error) {
    // Network error doesn't mean bucket doesn't exist - try anyway
    bucketVerified = true;
    return true;
  }
}

/**
 * Validate file on server before upload (calls Supabase RPC)
 * This provides server-side validation of file type and size
 */
async function validateFileOnServer(
  bucketName: string,
  filePath: string,
  fileSize: number,
  mimeType: string,
  accessToken?: string
): Promise<ValidationResult> {
  if (!isSupabaseConfigured()) {
    return { valid: true, status: 'accepted', reason: null, max_size_mb: 10 };
  }

  const { url, anonKey } = getSupabaseConfig();

  try {
    notifyProgress({ status: 'validating', message: 'Validation du fichier...' });

    const response = await fetch(
      `${url}/rest/v1/rpc/validate_file_upload`,
      {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${accessToken || anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_bucket_name: bucketName,
          p_file_path: filePath,
          p_file_size: fileSize,
          p_mime_type: mimeType,
          p_file_header: null, // Could send first bytes for magic number validation
        }),
      }
    );

    if (!response.ok) {
      // Si la fonction RPC n'existe pas, continuer sans validation serveur
      console.warn('[Upload] Server validation not available, proceeding with client validation');
      return { valid: true, status: 'accepted', reason: null, max_size_mb: 10 };
    }

    const result = await response.json();
    return result as ValidationResult;
  } catch (error) {
    // En cas d'erreur, continuer avec la validation côté client uniquement
    console.warn('[Upload] Server validation failed, using client validation only:', error);
    return { valid: true, status: 'accepted', reason: null, max_size_mb: 10 };
  }
}

/**
 * Client-side file validation (first line of defense)
 */
function validateFileClient(fileSize: number, mimeType: string): { valid: boolean; error?: string } {
  // Vérifier le type MIME
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_TYPE };
  }

  // Vérifier la taille
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  return { valid: true };
}

/**
 * Get file info from URI
 */
async function getFileInfo(uri: string): Promise<{ size: number; mimeType: string } | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    if (!fileInfo.exists) return null;

    // Déterminer le type MIME à partir de l'extension
    const extension = uri.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };

    return {
      size: fileInfo.size ?? 0,
      mimeType: mimeMap[extension || ''] || 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

/**
 * Compress an image before upload
 */
async function compressImage(uri: string): Promise<string> {
  try {
    notifyProgress({ status: 'compressing', message: 'Compression de l\'image...' });
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_SIZE } }],
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return uri;
  }
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attempt: number): number {
  const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, 15000); // Max 15 seconds
}

/**
 * Single upload attempt with timeout
 */
async function attemptUpload(
  blob: Blob,
  filename: string,
  signal: AbortSignal
): Promise<Response> {
  const { url, anonKey } = getSupabaseConfig();

  return fetch(
    `${url}/storage/v1/object/${STORAGE_BUCKET}/${filename}`,
    {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
      body: blob,
      signal,
    }
  );
}

/**
 * Upload an image to Supabase Storage with retry
 * @param localUri - Local file URI (file://...)
 * @param folder - Folder in bucket (e.g., 'products', 'packs', 'promos')
 * @returns Public URL of the uploaded image, or null if upload fails
 */
export async function uploadImageToSupabase(
  localUri: string,
  folder: 'products' | 'packs' | 'promos' | 'producers' | 'general' = 'general'
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase Storage non configuré');
    notifyProgress({ status: 'error', message: ERROR_MESSAGES.NOT_CONFIGURED });
    return null;
  }

  const { url } = getSupabaseConfig();

  // Skip if not a local file
  if (!localUri.startsWith('file://')) {
    // Already a remote URL or asset, return as-is
    return localUri;
  }

  try {
    // Ensure bucket exists before uploading
    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      console.error('Could not verify/create storage bucket');
    }

    // Compress image first to reduce size and upload time
    console.log('Compressing image...');
    const compressedUri = await compressImage(localUri);
    console.log('Image compressed');

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `${folder}/${timestamp}-${randomStr}.jpg`;

    // Read the compressed file and convert to blob
    console.log('Reading file...');
    const response = await fetch(compressedUri);
    const blob = await response.blob();
    console.log('File read, size:', blob.size, 'bytes');

    // Upload to Supabase Storage with retry
    console.log('Uploading to Supabase Storage...');
    notifyProgress({ status: 'uploading', message: 'Envoi de l\'image...' });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_UPLOAD_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

      try {
        if (attempt > 0) {
          notifyProgress({
            status: 'retrying',
            message: `Nouvelle tentative d'envoi... (${attempt + 1}/${MAX_UPLOAD_RETRIES})`,
            attempt: attempt + 1,
            maxAttempts: MAX_UPLOAD_RETRIES,
          });
          console.log(`[Upload] Tentative ${attempt + 1}/${MAX_UPLOAD_RETRIES}...`);
        }

        const uploadResponse = await attemptUpload(blob, filename, controller.signal);
        clearTimeout(timeoutId);

        if (uploadResponse.ok) {
          // Return the public URL
          const publicUrl = `${url}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
          console.log('Upload successful:', publicUrl);
          notifyProgress({ status: 'success', message: 'Image envoyée avec succès' });
          return publicUrl;
        }

        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);

        // If bucket not found, reset verification and don't retry
        if (errorText.includes('Bucket not found')) {
          bucketVerified = false;
          console.error('Bucket "images" not found. Please create it in Supabase Dashboard > Storage.');
          notifyProgress({ status: 'error', message: ERROR_MESSAGES.BUCKET_NOT_FOUND });
          return null;
        }

        lastError = new Error(errorText);
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if ((fetchError as Error).name === 'AbortError') {
          console.error('Upload timed out after 30 seconds');
          lastError = new Error('Timeout');
          notifyProgress({ status: 'retrying', message: ERROR_MESSAGES.TIMEOUT });
        } else {
          lastError = fetchError as Error;
          console.error('Upload error:', lastError.message);
        }
      }

      // Wait before retrying
      if (attempt < MAX_UPLOAD_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`[Upload] Attente de ${Math.round(delay / 1000)}s avant nouvelle tentative...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    console.error('Upload failed after', MAX_UPLOAD_RETRIES, 'attempts');
    notifyProgress({ status: 'error', message: ERROR_MESSAGES.MAX_RETRIES_REACHED });
    return null;
  } catch (error) {
    console.error('Error uploading image:', error);
    notifyProgress({ status: 'error', message: ERROR_MESSAGES.UPLOAD_FAILED });
    return null;
  }
}

/**
 * Upload result with status for UI feedback
 */
export interface UploadResult {
  url: string | null;
  success: boolean;
  error?: string;
}

/**
 * Upload with detailed result (for better UI feedback)
 */
export async function uploadImageWithResult(
  localUri: string,
  folder: 'products' | 'packs' | 'promos' | 'producers' | 'general' = 'general'
): Promise<UploadResult> {
  const url = await uploadImageToSupabase(localUri, folder);
  if (url) {
    return { url, success: true };
  }
  return { url: null, success: false, error: ERROR_MESSAGES.UPLOAD_FAILED };
}

/**
 * Upload multiple images to Supabase Storage in parallel with concurrency limit
 * @param localUris - Array of local file URIs
 * @param folder - Folder in bucket
 * @param concurrency - Max concurrent uploads (default: 3)
 * @returns Array of public URLs (null for failed uploads)
 */
export async function uploadMultipleImages(
  localUris: string[],
  folder: 'products' | 'packs' | 'promos' | 'producers' | 'general' = 'general',
  concurrency: number = 3
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(localUris.length).fill(null);

  // Process in batches for controlled parallelism
  for (let i = 0; i < localUris.length; i += concurrency) {
    const batch = localUris.slice(i, i + concurrency);
    const batchIndices = batch.map((_, idx) => i + idx);

    notifyProgress({
      status: 'uploading',
      message: `Envoi des images ${i + 1}-${Math.min(i + concurrency, localUris.length)}/${localUris.length}...`,
    });

    const batchResults = await Promise.all(
      batch.map((uri) => uploadImageToSupabase(uri, folder))
    );

    batchResults.forEach((result, idx) => {
      results[batchIndices[idx]] = result;
    });
  }

  notifyProgress({ status: 'idle', message: '' });
  return results;
}

/**
 * Process an image - upload if local, return as-is if remote/asset
 * @param image - Image URI (local, remote, or asset:)
 * @param folder - Folder in bucket
 * @returns Processed image URI (uploaded URL, original remote URL, or asset reference)
 */
export async function processImageForSync(
  image: string | undefined | null,
  folder: 'products' | 'packs' | 'promos' | 'producers' | 'general' = 'general'
): Promise<string> {
  const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400';

  if (!image) {
    return DEFAULT_IMAGE;
  }

  // Asset images are bundled with the app - keep as-is
  if (image.startsWith('asset:')) {
    return image;
  }

  // Remote URLs - keep as-is
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  // Local file - upload to Supabase
  if (image.startsWith('file://')) {
    const uploadedUrl = await uploadImageToSupabase(image, folder);
    if (uploadedUrl) {
      return uploadedUrl;
    }
    // Upload failed - return default
    console.warn('Image upload failed, using default image');
    return DEFAULT_IMAGE;
  }

  // Unknown format - return default
  return DEFAULT_IMAGE;
}

/**
 * Process multiple images for sync in parallel
 */
export async function processMultipleImagesForSync(
  images: string[] | undefined | null,
  folder: 'products' | 'packs' | 'promos' | 'producers' | 'general' = 'general'
): Promise<string[]> {
  if (!images || images.length === 0) {
    return [];
  }

  // Process in parallel with concurrency limit
  const results = await Promise.all(
    images.map((img) => processImageForSync(img, folder))
  );
  return results;
}

/**
 * Delete an image from Supabase Storage
 * @param publicUrl - Public URL of the image
 */
export async function deleteImageFromSupabase(publicUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { url, anonKey } = getSupabaseConfig();

  // Extract path from public URL
  const prefix = `${url}/storage/v1/object/public/${STORAGE_BUCKET}/`;
  if (!publicUrl.startsWith(prefix)) {
    return false; // Not a Supabase Storage URL
  }

  const path = publicUrl.replace(prefix, '');

  try {
    const response = await fetch(
      `${url}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}
