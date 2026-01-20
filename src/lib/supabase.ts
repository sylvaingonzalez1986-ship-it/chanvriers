// Supabase client with fetch API for app_data table
// Uses centralized environment validation

import { getSupabaseConfig, isSupabaseConfigured } from './env-validation';

export interface AppDataItem {
  id: string;
  nom: string;
  description: string;
  valeur: string;
  created_at: string;
}

export interface AppDataInsert {
  nom: string;
  description: string;
  valeur: string;
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

// Fetch all data from app_data table
export async function fetchAppData(): Promise<AppDataItem[]> {
  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/app_data?select=*&order=created_at.desc`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur lors de la récupération des données: ${error}`);
  }

  return response.json();
}

// Add new item to app_data
export async function addAppData(item: AppDataInsert): Promise<AppDataItem> {
  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/app_data`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur lors de l'ajout: ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Update an item in app_data
export async function updateAppData(id: string, item: Partial<AppDataInsert>): Promise<AppDataItem> {
  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/app_data?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur lors de la mise à jour: ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Delete an item from app_data
export async function deleteAppData(id: string): Promise<void> {
  const { url } = getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/app_data?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur lors de la suppression: ${error}`);
  }
}

// Re-export isSupabaseConfigured for backward compatibility
export { isSupabaseConfigured };
