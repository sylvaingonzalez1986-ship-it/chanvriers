/**
 * Supabase Users Management API
 * Fonctions pour gérer les utilisateurs (profiles) et lier les producteurs
 */

import { getValidSession, AuthSession } from './supabase-auth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Get headers with a valid (non-expired) token - use this for API calls
const getValidHeaders = (session: AuthSession) => {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
};

export function isUsersApiConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Types
export type UserRole = 'client' | 'pro' | 'producer' | 'admin';
export type UserCategory = 'restaurateur' | 'epicerie' | 'grossiste' | 'producteur_maraicher' | 'autre' | null;
export type ProStatus = 'pending' | 'approved' | 'rejected' | null;

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  role: UserRole;
  category: UserCategory;
  pro_status: ProStatus; // Status de validation du compte pro
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  company_name: string | null;
  business_name: string | null;
  siret: string | null;
  tva_number: string | null;
  user_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProducerWithProfile {
  id: string;
  name: string;
  profile_id: string | null;
  siret: string | null;
  tva_number: string | null;
  region: string | null;
}

// User role labels
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  client: 'Client',
  pro: 'Professionnel',
  producer: 'Producteur',
  admin: 'Administrateur',
};

export const USER_ROLE_COLORS: Record<UserRole, string> = {
  client: '#6BB5D9', // Sky Blue
  pro: '#4A9B9B', // Teal
  producer: '#5A9E5A', // Hemp Green
  admin: '#D4A853', // Gold
};

// Pro status labels and colors
export const PRO_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuve',
  rejected: 'Refuse',
};

export const PRO_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', // Orange/Amber
  approved: '#22C55E', // Green
  rejected: '#EF4444', // Red
};

// User category labels
export const USER_CATEGORY_LABELS: Record<string, string> = {
  restaurateur: 'Restaurateur',
  epicerie: 'Épicerie',
  grossiste: 'Grossiste',
  producteur_maraicher: 'Producteur Maraîcher',
  autre: 'Autre',
};

/**
 * Fetch all user profiles with optional filters
 */
export async function fetchUsers(filters?: {
  role?: UserRole;
  category?: UserCategory;
  search?: string;
}): Promise<{ users: UserProfile[]; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { users: [], error: new Error('Supabase not configured') };
  }

  // Get a valid (non-expired) session
  const session = await getValidSession();

  if (!session?.access_token) {
    return { users: [], error: new Error('Vous devez être connecté pour voir les utilisateurs') };
  }

  try {
    let url = `${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`;

    if (filters?.role) {
      url += `&role=eq.${filters.role}`;
    }

    if (filters?.category) {
      url += `&category=eq.${filters.category}`;
    }

    if (filters?.search) {
      url += `&or=(full_name.ilike.*${encodeURIComponent(filters.search)}*,email.ilike.*${encodeURIComponent(filters.search)}*)`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getValidHeaders(session),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { users: data as UserProfile[], error: null };
  } catch (error) {
    console.warn('[Admin Users] Error fetching users:', error);
    return { users: [], error: error as Error };
  }
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { success: false, error: new Error('Non authentifié') };
  }

  try {
    // Get the current user's profile to check admin role
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=role`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!checkResponse.ok) {
      return { success: false, error: new Error('Erreur vérification permissions') };
    }

    const adminData = await checkResponse.json();
    if (!Array.isArray(adminData) || adminData.length === 0 || adminData[0].role !== 'admin') {
      return { success: false, error: new Error('Non autorisé - accès administrateur requis') };
    }

    // Admin check passed, proceed with update
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: getValidHeaders(session),
        body: JSON.stringify({
          role: newRole,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.warn('Error updating user role:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Update a user's pro status (admin only)
 * Used to approve or reject pro account requests
 */
export async function updateProStatus(
  userId: string,
  status: ProStatus
): Promise<{ success: boolean; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { success: false, error: new Error('Non authentifié') };
  }

  try {
    // Get the current user's profile to check admin role
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=role`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!checkResponse.ok) {
      return { success: false, error: new Error('Erreur vérification permissions') };
    }

    const adminData = await checkResponse.json();
    if (!Array.isArray(adminData) || adminData.length === 0 || adminData[0].role !== 'admin') {
      return { success: false, error: new Error('Non autorisé - accès administrateur requis') };
    }

    // Admin check passed, proceed with update
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: getValidHeaders(session),
        body: JSON.stringify({
          pro_status: status,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.warn('Error updating pro status:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Update a user's category
 */
export async function updateUserCategory(
  userId: string,
  category: UserCategory
): Promise<{ success: boolean; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { success: false, error: new Error('Non authentifié') };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: getValidHeaders(session),
        body: JSON.stringify({
          category,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.warn('Error updating user category:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Update user's SIRET and TVA number
 */
export async function updateUserBusinessInfo(
  userId: string,
  updates: { siret?: string | null; tva_number?: string | null }
): Promise<{ success: boolean; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { success: false, error: new Error('Non authentifié') };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: getValidHeaders(session),
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.warn('Error updating user business info:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Update multiple user fields at once
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'role' | 'category' | 'siret' | 'tva_number' | 'full_name'>>
): Promise<{ success: boolean; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { success: false, error: new Error('Non authentifié') };
  }

  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    console.log('[updateUserProfile] Updating user:', userId);
    console.log('[updateUserProfile] Data:', JSON.stringify(updateData));

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: getValidHeaders(session),
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[updateUserProfile] Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    console.log('[updateUserProfile] Success');
    return { success: true, error: null };
  } catch (error) {
    console.warn('[updateUserProfile] Error:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Fetch producers with their profile_id (for linking)
 */
export async function fetchProducersWithProfiles(): Promise<{
  producers: ProducerWithProfile[];
  error: Error | null;
}> {
  if (!isUsersApiConfigured()) {
    return { producers: [], error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { producers: [], error: new Error('Non authentifié') };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/producers?select=id,name,profile_id,siret,tva_number,region&order=name`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { producers: data as ProducerWithProfile[], error: null };
  } catch (error) {
    console.warn('Error fetching producers with profiles:', error);
    return { producers: [], error: error as Error };
  }
}

/**
 * Fetch users with role = 'producer' (for linking to a producer)
 */
export async function fetchProducerUsers(): Promise<{
  users: UserProfile[];
  error: Error | null;
}> {
  if (!isUsersApiConfigured()) {
    return { users: [], error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { users: [], error: new Error('Non authentifié') };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?role=eq.producer&select=*&order=full_name`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { users: data as UserProfile[], error: null };
  } catch (error) {
    console.warn('Error fetching producer users:', error);
    return { users: [], error: error as Error };
  }
}

/**
 * Link a producer to a profile
 * If the producer doesn't exist in Supabase, it will be created first
 */
export async function linkProducerToProfile(
  producerId: string,
  profileId: string | null,
  producerData?: { name: string; region?: string; siret?: string; tva_number?: string }
): Promise<{ success: boolean; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { success: false, error: new Error('Non authentifié') };
  }

  try {
    // First, check if the producer exists in Supabase
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/producers?id=eq.${producerId}&select=id`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!checkResponse.ok) {
      throw new Error(`Erreur lors de la vérification du producteur: ${checkResponse.status}`);
    }

    const existing = await checkResponse.json();

    // If producer doesn't exist in Supabase, create it first
    if (!existing || existing.length === 0) {
      if (!producerData) {
        return {
          success: false,
          error: new Error('Le producteur n\'existe pas dans Supabase. Veuillez d\'abord synchroniser les données.')
        };
      }

      // Create the producer in Supabase
      const createResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/producers`,
        {
          method: 'POST',
          headers: getValidHeaders(session),
          body: JSON.stringify({
            id: producerId,
            name: producerData.name,
            region: producerData.region || null,
            siret: producerData.siret || null,
            tva_number: producerData.tva_number || null,
            profile_id: profileId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Erreur lors de la création du producteur: ${createResponse.status} - ${errorText}`);
      }

      console.log('[linkProducerToProfile] Producer created and linked successfully');
      return { success: true, error: null };
    }

    // Producer exists, update it with the profile_id
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/producers?id=eq.${producerId}`,
      {
        method: 'PATCH',
        headers: getValidHeaders(session),
        body: JSON.stringify({
          profile_id: profileId,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('[linkProducerToProfile] Producer linked successfully');
    return { success: true, error: null };
  } catch (error) {
    console.warn('Error linking producer to profile:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get a single user by ID
 */
export async function fetchUserById(userId: string): Promise<{
  user: UserProfile | null;
  error: Error | null;
}> {
  if (!isUsersApiConfigured()) {
    return { user: null, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { user: null, error: new Error('Non authentifié') };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { user: data[0] as UserProfile || null, error: null };
  } catch (error) {
    console.warn('Error fetching user by ID:', error);
    return { user: null, error: error as Error };
  }
}

/**
 * Count users by role
 */
export async function countUsersByRole(): Promise<{
  counts: Record<UserRole, number>;
  error: Error | null;
}> {
  if (!isUsersApiConfigured()) {
    return { counts: { client: 0, pro: 0, producer: 0, admin: 0 }, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { counts: { client: 0, pro: 0, producer: 0, admin: 0 }, error: new Error('Non authentifié') };
  }

  try {
    const counts: Record<UserRole, number> = {
      client: 0,
      pro: 0,
      producer: 0,
      admin: 0,
    };

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=role`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    (data || []).forEach((user: { role: UserRole }) => {
      if (user.role in counts) {
        counts[user.role]++;
      }
    });

    return { counts, error: null };
  } catch (error) {
    console.warn('Error counting users by role:', error);
    return { counts: { client: 0, pro: 0, producer: 0, admin: 0 }, error: error as Error };
  }
}

/**
 * Pre-register a user role/category for when they sign up
 * Stores pending invitations that get applied when user creates their account
 */
export interface PendingInvite {
  email: string;
  full_name?: string;
  role: UserRole;
  category?: UserCategory;
  invited_at: string;
  invited_by: string;
}

// Store pending invites in a separate table or localStorage
// For now, we'll update existing profiles only

/**
 * Update an existing user's role and info (for users who have already signed up)
 * To add a new user: they must first sign up, then admin can update their role
 */
export async function inviteUser(data: {
  email: string;
  full_name?: string;
  role?: UserRole;
  category?: UserCategory;
}): Promise<{ user: UserProfile | null; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { user: null, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { user: null, error: new Error('Vous devez être connecté pour gérer les utilisateurs') };
  }

  if (!data.email) {
    return { user: null, error: new Error('L\'email est requis') };
  }

  const email = data.email.toLowerCase().trim();

  try {
    // Check if user already has a profile (meaning they signed up via auth)
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=*`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!checkResponse.ok) {
      throw new Error('Erreur lors de la vérification de l\'utilisateur');
    }

    const existing = await checkResponse.json();

    if (existing && existing.length > 0) {
      // User exists - update their profile
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.role) updateData.role = data.role;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.full_name) updateData.full_name = data.full_name;

      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${existing[0].id}`,
        {
          method: 'PATCH',
          headers: getValidHeaders(session),
          body: JSON.stringify(updateData),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Erreur lors de la mise à jour: ${updateResponse.status}`);
      }

      const result = await updateResponse.json();
      return { user: Array.isArray(result) ? result[0] : result, error: null };
    } else {
      // User doesn't exist - they need to sign up first
      return {
        user: null,
        error: new Error(
          `L'utilisateur n'a pas encore de compte. ` +
          `Demandez-lui de s'inscrire d'abord, puis vous pourrez modifier son rôle.`
        )
      };
    }
  } catch (error) {
    console.warn('Error processing user invitation:', error);
    return { user: null, error: error as Error };
  }
}

/**
 * Delete a user from the database (admin only)
 * This will delete the profile from the profiles table
 * Note: This does NOT delete the user from Supabase Auth - that requires admin API access
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error: Error | null }> {
  if (!isUsersApiConfigured()) {
    return { success: false, error: new Error('Supabase not configured') };
  }

  const session = await getValidSession();
  if (!session?.access_token) {
    return { success: false, error: new Error('Non authentifié') };
  }

  try {
    // Get the current user's profile to check admin role
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=role`,
      {
        method: 'GET',
        headers: getValidHeaders(session),
      }
    );

    if (!checkResponse.ok) {
      return { success: false, error: new Error('Erreur vérification permissions') };
    }

    const adminData = await checkResponse.json();
    if (!Array.isArray(adminData) || adminData.length === 0 || adminData[0].role !== 'admin') {
      return { success: false, error: new Error('Non autorisé - accès administrateur requis') };
    }

    // Admin check passed, proceed with deletion
    // First, unlink any producers that reference this profile
    const unlinkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/producers?profile_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: getValidHeaders(session),
        body: JSON.stringify({
          profile_id: null,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!unlinkResponse.ok) {
      const errorText = await unlinkResponse.text();
      console.warn('Warning: Could not unlink producers:', errorText);
      // Continue anyway - the user might not have linked producers
    }

    // Now delete the profile from the profiles table
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'DELETE',
        headers: getValidHeaders(session),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur lors de la suppression: ${response.status} - ${errorText}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.warn('Error deleting user:', error);
    return { success: false, error: error as Error };
  }
}
