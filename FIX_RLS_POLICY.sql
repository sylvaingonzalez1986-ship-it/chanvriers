-- ============================================================
-- CORRECTION DES POLITIQUES RLS POUR L'AJOUT D'UTILISATEURS
-- ============================================================
-- Exécute ce script dans Supabase Dashboard > SQL Editor
-- ============================================================

-- OPTION 1: Permettre aux admins d'insérer des profils (plus sécurisé)
-- Assurez-vous d'abord que votre compte a le rôle 'admin'

-- Étape 1: Mettre à jour le rôle de l'admin principal
UPDATE profiles
SET role = 'admin'
WHERE email = 'leschanvriersbretons@gmail.com';

-- Étape 2: Recréer la politique d'insertion pour les admins
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

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

-- ============================================================
-- OU OPTION 2: Permettre à tous les utilisateurs authentifiés
-- d'insérer des profils (moins sécurisé mais plus simple)
-- ============================================================
-- Décommentez les lignes ci-dessous si l'Option 1 ne fonctionne pas:

-- DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
-- DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profiles;

-- CREATE POLICY "Authenticated users can insert profiles"
--   ON profiles
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- ============================================================
-- VÉRIFICATION: Liste tous les admins
-- ============================================================
SELECT id, email, role, full_name FROM profiles WHERE role = 'admin';
