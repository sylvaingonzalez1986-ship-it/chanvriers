-- ============================================================================
-- CORRECTION: Permettre aux nouveaux utilisateurs de créer leur profil
-- ============================================================================
-- Date: 2026-01-15
-- Problème: "Database error saving new user" sur Expo Go Android
-- Cause: La policy INSERT sur profiles n'autorise que service_role
-- Solution: Permettre aux utilisateurs authentifiés de créer leur propre profil
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Supprimer l'ancienne policy INSERT restrictive
-- ============================================================================
DROP POLICY IF EXISTS "Only service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create own profile" ON profiles;

-- ============================================================================
-- ÉTAPE 2 : Créer la nouvelle policy INSERT permissive
-- ============================================================================
-- Cette policy permet aux utilisateurs authentifiés de créer leur propre profil
-- La condition auth.uid() = id garantit qu'un utilisateur ne peut créer
-- qu'un profil avec son propre ID (pas d'usurpation possible)

CREATE POLICY "Users can insert their own profile during signup"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- L'utilisateur ne peut créer qu'un profil avec son propre auth.uid()
  auth.uid() = id
);

-- ============================================================================
-- ÉTAPE 3 : S'assurer que la policy UPDATE existe et fonctionne
-- ============================================================================
-- Vérifier que les utilisateurs peuvent modifier leur profil après création
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- ÉTAPE 4 : Créer ou mettre à jour le trigger de création automatique
-- ============================================================================
-- Ce trigger crée automatiquement un profil quand un utilisateur s'inscrit
-- C'est une sécurité supplémentaire au cas où l'app ne crée pas le profil

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'client',  -- Rôle par défaut
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur mais ne bloque pas l'inscription
    RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger sur la table auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ÉTAPE 5 : Vérifier que RLS est activé sur profiles
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 6 : Vérification - Lister les policies actuelles (pour debug)
-- ============================================================================
-- Exécutez cette requête séparément pour vérifier :
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies WHERE tablename = 'profiles';

-- ============================================================================
-- RÉSUMÉ DES CHANGEMENTS
-- ============================================================================
-- ✅ Policy INSERT: Permet aux utilisateurs authentifiés de créer leur propre profil
-- ✅ Policy UPDATE: Permet aux utilisateurs de modifier leur propre profil
-- ✅ Trigger: Crée automatiquement un profil à l'inscription (backup)
-- ✅ RLS: Activé sur la table profiles
-- ============================================================================
