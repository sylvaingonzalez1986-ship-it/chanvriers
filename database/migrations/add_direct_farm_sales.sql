-- Migration: Add direct farm sales fields to profiles table
-- Date: 2026-01-14

-- Add columns for direct farm sales
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vente_directe_ferme BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS adresse_retrait TEXT,
ADD COLUMN IF NOT EXISTS horaires_retrait TEXT,
ADD COLUMN IF NOT EXISTS instructions_retrait TEXT;

-- Create index for filtering profiles with direct sales
CREATE INDEX IF NOT EXISTS idx_profiles_vente_directe_ferme ON profiles(vente_directe_ferme) WHERE vente_directe_ferme = true;

-- Update RLS policies to allow producers to update their own direct sales settings
-- The existing RLS on profiles should already cover this since producers can update their own profile

-- Verification query
-- SELECT id, full_name, role, vente_directe_ferme, adresse_retrait
-- FROM profiles
-- WHERE vente_directe_ferme = true;
