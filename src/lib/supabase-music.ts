/**
 * Supabase Music Library Management
 * Handles music tracks stored in Supabase Storage and database
 */

import { isSupabaseConfigured, getSupabaseConfig } from './env-validation';

// Bucket names
export const MUSIC_AUDIO_BUCKET = 'music-audio';
export const MUSIC_COVERS_BUCKET = 'music-covers';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  audio_url: string;
  position: number; // Order in playlist
  duration_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface MusicTrackInsert {
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  audio_url: string;
  position: number;
  duration_ms?: number;
}

const getHeaders = () => {
  const { anonKey } = getSupabaseConfig();
  return {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
};

// Check if music API is configured
export function isMusicApiConfigured(): boolean {
  return isSupabaseConfigured();
}

// Fetch all music tracks ordered by position
export async function fetchMusicTracks(): Promise<MusicTrack[]> {
  if (!isMusicApiConfigured()) {
    console.log('[MusicAPI] Supabase not configured');
    return [];
  }

  const { url } = getSupabaseConfig();

  try {
    const response = await fetch(
      `${url}/rest/v1/music_tracks?select=*&order=position.asc`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      // Silently handle missing table - this is expected if not configured
      const errorText = await response.text();
      if (errorText.includes('music_tracks') || errorText.includes('PGRST')) {
        console.log('[MusicAPI] Table music_tracks not found - using local tracks');
        return [];
      }
      console.log('[MusicAPI] Error fetching tracks:', errorText);
      return [];
    }

    return response.json();
  } catch (error) {
    console.log('[MusicAPI] Network error:', error);
    return [];
  }
}

// Add a new music track
export async function addMusicTrack(track: MusicTrackInsert): Promise<MusicTrack | null> {
  if (!isMusicApiConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/music_tracks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...track,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur lors de l'ajout: ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Update a music track
export async function updateMusicTrack(
  id: string,
  updates: Partial<MusicTrackInsert>
): Promise<MusicTrack | null> {
  if (!isMusicApiConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/music_tracks?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      ...updates,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur lors de la mise à jour: ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Delete a music track
export async function deleteMusicTrack(id: string): Promise<void> {
  if (!isMusicApiConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/music_tracks?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur lors de la suppression: ${error}`);
  }
}

// Reorder tracks (update positions)
export async function reorderMusicTracks(
  trackIds: string[]
): Promise<void> {
  if (!isMusicApiConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Update each track's position in parallel
  const updates = trackIds.map((id, index) =>
    updateMusicTrack(id, { position: index })
  );

  await Promise.all(updates);
}

// Upload audio file to Supabase Storage
export async function uploadAudioFile(
  fileUri: string,
  fileName: string
): Promise<string> {
  if (!isMusicApiConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const { url, anonKey } = getSupabaseConfig();

  // Read the file as blob
  const response = await fetch(fileUri);
  const blob = await response.blob();

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const finalName = `${timestamp}_${sanitizedName}`;

  // Upload to Supabase Storage
  const uploadResponse = await fetch(
    `${url}/storage/v1/object/${MUSIC_AUDIO_BUCKET}/${finalName}`,
    {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': blob.type || 'audio/mpeg',
        'x-upsert': 'true',
      },
      body: blob,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Erreur upload audio: ${error}`);
  }

  // Return the public URL (or signed URL for private bucket)
  return `${url}/storage/v1/object/${MUSIC_AUDIO_BUCKET}/${finalName}`;
}

// Upload cover image to Supabase Storage
export async function uploadCoverImage(
  fileUri: string,
  fileName: string
): Promise<string> {
  if (!isMusicApiConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const { url, anonKey } = getSupabaseConfig();

  // Read the file as blob
  const response = await fetch(fileUri);
  const blob = await response.blob();

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const finalName = `${timestamp}_${sanitizedName}`;

  // Upload to Supabase Storage
  const uploadResponse = await fetch(
    `${url}/storage/v1/object/${MUSIC_COVERS_BUCKET}/${finalName}`,
    {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: blob,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Erreur upload cover: ${error}`);
  }

  // Return the public URL
  return `${url}/storage/v1/object/public/${MUSIC_COVERS_BUCKET}/${finalName}`;
}

// Delete file from storage
export async function deleteStorageFile(
  bucket: string,
  filePath: string
): Promise<void> {
  if (!isMusicApiConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const { url, anonKey } = getSupabaseConfig();

  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${filePath}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`[MusicAPI] Error deleting file: ${error}`);
  }
}

// Get signed URL for private audio files
export async function getSignedAudioUrl(filePath: string): Promise<string> {
  if (!isMusicApiConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const { url, anonKey } = getSupabaseConfig();

  const response = await fetch(
    `${url}/storage/v1/object/sign/${MUSIC_AUDIO_BUCKET}/${filePath}`,
    {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 3600 }), // 1 hour
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur signed URL: ${error}`);
  }

  const data = await response.json();
  return `${url}/storage/v1${data.signedURL}`;
}
