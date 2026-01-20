#!/bin/bash
# ============================================================================
# INSTRUCTIONS RAPIDES - Problème Inscription Android
# ============================================================================
# Étape 1: Copier-coller le contenu SQL ci-dessous dans Supabase SQL Editor
# Étape 2: Exécuter
# Étape 3: Tester une nouvelle inscription sur Android
# ============================================================================

cat << 'EOF'
=============================================================================
ÉTAPE 1: OUVRIR SUPABASE SQL EDITOR
=============================================================================
1. Aller à https://app.supabase.com
2. Sélectionner votre projet "les-chanvriers-unis"
3. Cliquer sur "SQL Editor" (menu à gauche)
4. Cliquer sur "New Query"

=============================================================================
ÉTAPE 2: COPIER-COLLER LE CONTENU CI-DESSOUS
=============================================================================

Copier TOUT le texte entre "BEGIN SQL" et "END SQL"

BEGIN SQL
╔══════════════════════════════════════════════════════════════════════════╗
║ CORRECTION CRITIQUE: Foreign Key Trigger Timing                         ║
║ Cette migration fixe le problème d'inscription Android                  ║
╚══════════════════════════════════════════════════════════════════════════╝

-- Étape 1: Vérifier l'état actuel
SELECT
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth'
AND trigger_name = 'on_auth_user_created';

-- Étape 2: Supprimer le trigger existant
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Étape 3: Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Étape 4: Créer la fonction corrigée
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'client',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RAISE LOG '[handle_new_user] Created profile for user: %', NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[handle_new_user] Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Étape 5: Créer le trigger avec timing APRÈS INSERT (CORRECT!)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Étape 6: Vérifier que le trigger est bien AFTER INSERT
SELECT
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
AND event_object_table = 'users';

-- Étape 7: Créer les profils manquants pour les utilisateurs existants
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

-- Étape 8: Vérifier qu'aucun utilisateur n'est sans profil
SELECT
  u.id,
  u.email,
  CASE WHEN p.id IS NULL THEN 'MISSING PROFILE' ELSE 'OK' END AS status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Résultat attendu: 0 lignes

END SQL

=============================================================================
ÉTAPE 3: EXÉCUTER
=============================================================================
1. Coller le contenu SQL dans Supabase SQL Editor
2. Cliquer sur le bouton "▶ Run" (ou Ctrl+Enter)
3. Attendre que tout s'exécute sans erreur

Résultat attendu:
- Pas d'erreur
- Messages de succès
- "action_timing" = "AFTER"
- "status" = "OK" pour tous les utilisateurs

=============================================================================
ÉTAPE 4: TESTER UNE NOUVELLE INSCRIPTION
=============================================================================
1. Ouvrir l'app sur Android
2. Aller à l'écran d'inscription
3. Remplir le formulaire d'inscription
4. Cliquer "Créer mon compte"
5. Vérifier que vous accédez à l'app (pas d'erreur)

Vérifier dans Supabase:
- SQL Editor → Nouvelle requête
- Exécuter: SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 1;
  → Vous devez voir votre nouvel utilisateur

- SQL Editor → Nouvelle requête
- Exécuter: SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
  → Vous devez voir votre nouveau profil avec role = 'client'

=============================================================================
LOGS À VÉRIFIER
=============================================================================
Ouvrir Vibecode App → LOGS tab

Chercher les lignes avec:
  [Signup] selectedRole: client
  [Auth] updateProfile: userId = ...
  [Auth] updateProfile: response status = 201
  [Auth] updateProfile: SUCCESS

Si vous voyez ces logs, l'inscription fonctionne!

=============================================================================
AIDE & TROUBLESHOOTING
=============================================================================

❌ Erreur "permission denied"
→ Vérifier que les policies RLS existent pour INSERT

❌ Erreur "relation does not exist"
→ Vérifier que la table "profiles" existe

❌ Trigger n'est pas AFTER
→ Vérifier que la première requête DELETE a bien supprimé le trigger

✅ Tout fonctionne?
→ Félicitations! Le problème est résolu.

=============================================================================
FICHIERS DE RÉFÉRENCE
=============================================================================
- RESUME_SOLUTION.md - Explique ce qui a été fait
- SOLUTION_FK_TRIGGER.md - Explication technique détaillée
- DEBUG_SIGNUP_ISSUE.md - Guide complet de dépannage
- README.md - Section "Diagnostic & Solution"

=============================================================================
EOF

# Afficher les commandes de vérification rapide
cat << 'EOF'

=============================================================================
COMMANDES DE VÉRIFICATION RAPIDE
=============================================================================

Vérifier le timing du trigger (doit être AFTER):
┌─────────────────────────────────────────────────────────────────────────┐
│ SELECT action_timing FROM information_schema.triggers                   │
│ WHERE trigger_name = 'on_auth_user_created';                           │
│                                                                         │
│ Résultat attendu: AFTER                                                │
└─────────────────────────────────────────────────────────────────────────┘

Vérifier qu'aucun utilisateur n'est sans profil:
┌─────────────────────────────────────────────────────────────────────────┐
│ SELECT COUNT(*) FROM auth.users u                                       │
│ LEFT JOIN public.profiles p ON u.id = p.id                             │
│ WHERE p.id IS NULL;                                                     │
│                                                                         │
│ Résultat attendu: 0                                                     │
└─────────────────────────────────────────────────────────────────────────┘

Voir le nouvel utilisateur et son profil:
┌─────────────────────────────────────────────────────────────────────────┐
│ SELECT u.email, p.role, p.created_at                                   │
│ FROM auth.users u                                                       │
│ LEFT JOIN public.profiles p ON u.id = p.id                             │
│ WHERE u.email = 'votre-email@example.com';                             │
│                                                                         │
│ Remplacez 'votre-email@example.com' par l'email du testeur             │
└─────────────────────────────────────────────────────────────────────────┘

=============================================================================
EOF
