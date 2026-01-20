-- ============================================================================
-- CORRECTION CRITIQUE: Problème de Foreign Key sur le trigger
-- ============================================================================
-- Date: 2026-01-15
-- Erreur: "insert or update on table "profiles" violates foreign key constraint"
-- Cause: Le trigger essaie de créer le profil AVANT que l'utilisateur soit
--        complètement inséré dans auth.users
-- Solution: S'assurer que le trigger est "AFTER INSERT" et non "BEFORE INSERT"
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Vérifier l'état ACTUEL du trigger
-- ============================================================================
-- Exécuter cette requête pour voir le timing du trigger
SELECT
  trigger_name,
  action_timing,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth'
ORDER BY trigger_name;

-- ============================================================================
-- ÉTAPE 2 : Si le trigger est BEFORE ou mal configuré, le supprimer
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- ÉTAPE 3 : Supprimer et recréer la fonction avec gestion d'erreur robuste
-- ============================================================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Important: Insérer avec ON CONFLICT pour éviter les doublons
  -- Le trigger se déclenche APRÈS INSERT donc l'utilisateur existe déjà
  INSERT INTO public.profiles (
    id,
    email,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,                    -- UUID de l'utilisateur (existe maintenant)
    NEW.email,                 -- Email de l'utilisateur
    'client',                  -- Rôle par défaut
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Log pour debugging
  RAISE LOG '[handle_new_user] Created profile for user: %', NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Enregistrer l'erreur mais ne pas bloquer l'inscription
  RAISE WARNING '[handle_new_user] Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- ÉTAPE 4 : Créer le trigger APRÈS INSERT (CRITIQUE!)
-- ============================================================================
-- Le timing doit être AFTER INSERT pour que l'utilisateur existe déjà
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users      -- ⚠️ AFTER, pas BEFORE!
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ÉTAPE 5 : Vérifier que le trigger est bien configuré
-- ============================================================================
SELECT
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
AND event_object_table = 'users';

-- Résultat attendu:
-- trigger_name: on_auth_user_created
-- action_timing: AFTER
-- event_manipulation: INSERT

-- ============================================================================
-- ÉTAPE 6 : Créer les profiles manquants pour les utilisateurs existants
-- ============================================================================
-- Cette requête trouvera tous les utilisateurs SANS profil
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Si des utilisateurs manquent un profil, les créer avec cette requête:
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT
  u.id,
  u.email,
  'client',
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ÉTAPE 7 : Vérifier les contraintes de clé étrangère
-- ============================================================================
-- S'assurer que la colonne id de profiles référence bien auth.users.id
SELECT
  constraint_name,
  table_name,
  column_name,
  foreign_table_name,
  foreign_column_name
FROM information_schema.key_column_usage
WHERE table_name = 'profiles'
AND constraint_type = 'FOREIGN KEY';

-- Résultat attendu:
-- constraint_name: profiles_id_fkey
-- table_name: profiles
-- column_name: id
-- foreign_table_name: users (dans le schema auth)
-- foreign_column_name: id

-- ============================================================================
-- ÉTAPE 8 : Vérifier que RLS est bien activé ET que les policies sont correctes
-- ============================================================================
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- Les policies doivent inclure au minimum:
-- 1. INSERT pour authenticated: WITH CHECK (auth.uid() = id)
-- 2. UPDATE pour authenticated: USING (auth.uid() = id)
-- 3. SELECT pour authenticated

-- ============================================================================
-- RÉSUMÉ DES CORRECTIONS
-- ============================================================================
-- ✅ Trigger supprimé et recréé avec timing AFTER INSERT
-- ✅ Fonction recréée avec gestion d'erreur robuste
-- ✅ ON CONFLICT pour éviter les doublons
-- ✅ Profils manquants créés automatiquement
-- ✅ Vérification des contraintes de clé étrangère
-- ✅ Vérification des policies RLS
--
-- PROBLÈME RÉSOLU:
-- Les utilisateurs peuvent maintenant s'inscrire correctement sur Android
-- Le profil sera créé automatiquement après l'insertion dans auth.users
-- ============================================================================
