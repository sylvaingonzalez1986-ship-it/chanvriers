-- =============================================================================
-- SUPABASE AUTH SETUP - Les Chanvriers Unis
-- Migration progressive vers Supabase Auth avec gestion des rôles
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: Création des types ENUM
-- =============================================================================

-- Type pour les rôles utilisateur
CREATE TYPE user_role AS ENUM ('client', 'pro', 'producer', 'admin');

-- Type pour les catégories professionnelles
CREATE TYPE user_category AS ENUM (
  'restaurateur',
  'epicerie',
  'grossiste',
  'producteur_maraicher',
  'autre'
);

-- =============================================================================
-- ÉTAPE 2: Création de la table profiles
-- =============================================================================

CREATE TABLE profiles (
  -- Clé primaire liée à auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rôle de l'utilisateur (défaut: client)
  role user_role NOT NULL DEFAULT 'client',

  -- Catégorie professionnelle (uniquement pour les pros)
  category user_category NULL,

  -- Informations personnelles
  full_name TEXT NULL,
  email TEXT NULL,
  phone TEXT NULL,

  -- Informations professionnelles (pour les pros)
  siret TEXT NULL,
  tva_number TEXT NULL,
  company_name TEXT NULL,

  -- Lien avec l'ancien système de codes locaux (migration progressive)
  user_code TEXT NULL UNIQUE,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par user_code (migration)
CREATE INDEX idx_profiles_user_code ON profiles(user_code) WHERE user_code IS NOT NULL;

-- Index pour recherche par rôle
CREATE INDEX idx_profiles_role ON profiles(role);

-- =============================================================================
-- ÉTAPE 3: Trigger pour mise à jour automatique de updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- =============================================================================
-- ÉTAPE 4: Trigger pour création automatique du profil à l'inscription
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users pour auto-créer le profil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- ÉTAPE 5: Activation du Row Level Security (RLS)
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ÉTAPE 6: Policies RLS
-- =============================================================================

-- Policy 1: Un utilisateur peut voir son propre profil
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Un utilisateur peut modifier son propre profil
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Les admins peuvent voir tous les profils
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 4: Les admins peuvent modifier tous les profils
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 5: Les admins peuvent insérer des profils (pour création manuelle)
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 6: Les admins peuvent supprimer des profils
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =============================================================================
-- ÉTAPE 7: Fonction utilitaire pour vérifier le rôle admin
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ÉTAPE 8: Fonction pour lier un user_code existant à un nouveau compte
-- =============================================================================

CREATE OR REPLACE FUNCTION link_user_code(p_user_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_existing_profile_id UUID;
BEGIN
  -- Vérifier si le user_code est déjà lié à un autre compte
  SELECT id INTO v_existing_profile_id
  FROM profiles
  WHERE user_code = p_user_code
  AND id != auth.uid();

  IF v_existing_profile_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ce code utilisateur est déjà lié à un autre compte';
  END IF;

  -- Lier le user_code au profil actuel
  UPDATE profiles
  SET user_code = p_user_code
  WHERE id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ÉTAPE 9: Fonction pour obtenir le profil complet d'un utilisateur
-- =============================================================================

CREATE OR REPLACE FUNCTION get_current_profile()
RETURNS TABLE (
  id UUID,
  role user_role,
  category user_category,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  siret TEXT,
  tva_number TEXT,
  company_name TEXT,
  user_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.role,
    p.category,
    p.full_name,
    p.email,
    p.phone,
    p.siret,
    p.tva_number,
    p.company_name,
    p.user_code,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- NOTES IMPORTANTES
-- =============================================================================
--
-- 1. Exécuter ce script dans le SQL Editor de Supabase Dashboard
--
-- 2. Dans Authentication > Settings, activer:
--    - Email/Password sign-in
--    - (Optionnel) Magic Link sign-in
--
-- 3. Migration progressive:
--    - Les anciens utilisateurs continuent d'utiliser user_code local
--    - Nouveaux utilisateurs créent un compte Supabase Auth
--    - Fonction link_user_code() permet de lier l'ancien code au nouveau compte
--
-- 4. Pour créer le premier admin:
--    - Créer un compte normal
--    - Exécuter: UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
--
-- =============================================================================
