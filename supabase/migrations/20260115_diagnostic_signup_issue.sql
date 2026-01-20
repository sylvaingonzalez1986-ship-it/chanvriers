-- ============================================================================
-- DIAGNOSTIC: Problème d'inscription Android - Le profil ne se crée pas
-- ============================================================================
-- Build Expo Android: https://expo.dev/accounts/les-champs-bretons/projects/les-chanvriers-unis/builds/79cdfe89-fdab-4af2-a965-61b765e4355d
-- Problème: Après inscription, le profil utilisateur n'est pas créé
--
-- EXÉCUTEZ LES REQUÊTES CI-DESSOUS POUR DIAGNOSTIQUER
-- ============================================================================

-- ============================================================================
-- 1. VÉRIFIER L'ÉTAT DU TRIGGER on_auth_user_created
-- ============================================================================
-- Cette requête affiche l'état du trigger pour créer automatiquement un profil
-- Résultat attendu: 1 ligne avec trigger_name='on_auth_user_created', action_timing='AFTER', event_manipulation='INSERT'

SELECT
  trigger_name,
  event_object_schema,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
AND event_object_table = 'users'
AND event_object_schema = 'auth';

-- ============================================================================
-- 2. VÉRIFIER LA FONCTION handle_new_user
-- ============================================================================
-- Affiche la fonction qui crée les profils
-- Doit retourner le source de la fonction

SELECT
  routine_name,
  routine_schema,
  routine_type,
  external_language,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- ============================================================================
-- 3. VÉRIFIER LES POLICIES (RLS) SUR LA TABLE profiles
-- ============================================================================
-- Affiche les row-level security policies
-- Doit avoir au moins une policy INSERT pour les utilisateurs authentifiés

SELECT
  schemaname,
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

-- ============================================================================
-- 4. VÉRIFIER QUE RLS EST ACTIVÉ
-- ============================================================================
-- Affiche l'état du RLS sur la table profiles
-- Résultat attendu: relrowsecurity = true

SELECT
  schemaname,
  tablename,
  relrowsecurity
FROM pg_class
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
WHERE relname = 'profiles'
AND schemaname = 'public';

-- ============================================================================
-- 5. VÉRIFIER LES PERMISSIONS SUR LA TABLE profiles
-- ============================================================================
-- Vérifie les permissions par défaut

SELECT
  table_name,
  privilege_type,
  grantee
FROM information_schema.role_table_grants
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- 6. TESTER MANUELLEMENT - Chercher les utilisateurs SANS profil
-- ============================================================================
-- Affiche les utilisateurs créés mais SANS profil
-- Un profil devrait être créé automatiquement par le trigger

SELECT
  u.id,
  u.email,
  u.created_at,
  CASE WHEN p.id IS NULL THEN 'MISSING PROFILE' ELSE 'Has profile' END AS status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC;

-- ============================================================================
-- 7. VÉRIFIER LES ERREURS DANS LES LOGS (si disponibles)
-- ============================================================================
-- Affiche les logs des trigger failures (si la table audit existe)

SELECT
  id,
  user_id,
  action,
  error_message,
  created_at
FROM public.audit_log_entries
WHERE action LIKE 'trigger%'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 8. TEST MANUEL - Créer un profil directement
-- ============================================================================
-- AVANT DE LANCER CETTE REQUÊTE:
-- 1. Copiez un user_id de la requête #6 (un utilisateur SANS profil)
-- 2. Remplacez 'YOUR_USER_ID_HERE' par cet ID
-- 3. Exécutez UNIQUEMENT cette requête pour vérifier si l'insertion fonctionne

-- EXEMPLE (à adapter):
-- INSERT INTO public.profiles (id, email, role, created_at, updated_at)
-- VALUES ('YOUR_USER_ID_HERE', 'user@example.com', 'client', NOW(), NOW());

-- ============================================================================
-- 9. VÉRIFIER LA STRUCTURE DE LA TABLE profiles
-- ============================================================================
-- Affiche la structure exacte de la table

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 10. VÉRIFIER LES ERREURS AUTH RÉCENTES
-- ============================================================================
-- Affiche les erreurs des 24 dernières heures liées à l'authentification
-- Remarque: Les logs Supabase ont une rétention limitée

SELECT
  created_at,
  message,
  instance_id
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '24 hours'
AND message LIKE '%profiles%'
OR message LIKE '%error%'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- RÉSUMÉ DES VÉRIFICATIONS
-- ============================================================================
--
-- CHECKLIST À FAIRE:
-- ✅ 1. Trigger on_auth_user_created existe et est ENABLED
-- ✅ 2. Fonction handle_new_user compile sans erreur
-- ✅ 3. Policy INSERT existe pour les utilisateurs authentifiés
-- ✅ 4. RLS est ACTIVÉ sur profiles (relrowsecurity = true)
-- ✅ 5. Permissions OK pour authenticated role
-- ✅ 6. Chercher des utilisateurs SANS profil dans les 7 derniers jours
-- ✅ 7. Si des erreurs dans les logs, les corriger
-- ✅ 8. Tester une insertion manuelle pour confirmer
-- ✅ 9. Vérifier la structure de la table
-- ✅ 10. Vérifier les logs d'authentification
--
-- PROBLÈMES POSSIBLES:
-- ❌ Trigger désactivé -> Activer le trigger
-- ❌ Policy INSERT manquante -> Créer la policy
-- ❌ RLS désactivé -> Activer RLS
-- ❌ Fonction cassée -> Recréer la fonction
-- ❌ URL Supabase différente sur Android -> Vérifier .env
-- ============================================================================
