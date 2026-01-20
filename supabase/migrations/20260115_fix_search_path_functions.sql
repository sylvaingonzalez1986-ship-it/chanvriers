-- =============================================================================
-- Migration: Fix mutable search_path on 20 functions
-- Date: 2026-01-15
-- Description: Addresses "role mutable search_path" security vulnerability
-- =============================================================================
--
-- RISQUE DE SÉCURITÉ:
-- Les fonctions SECURITY DEFINER sans search_path fixe sont vulnérables aux
-- attaques d'injection SQL. Un attaquant peut créer un schema malveillant
-- avec des objets du même nom et manipuler search_path pour exécuter son code
-- avec les privilèges élevés de la fonction.
--
-- SOLUTION:
-- Fixer search_path = '' (vide) force l'utilisation de noms qualifiés (schema.table)
-- ce qui empêche toute injection via search_path.
-- =============================================================================

-- Fonction utilitaire: auth (Supabase)
ALTER FUNCTION public.get_current_user_email() SET search_path = '';
ALTER FUNCTION public.get_current_profile() SET search_path = '';

-- Fonctions de vérification de rôle
ALTER FUNCTION public.auth_is_admin() SET search_path = '';
ALTER FUNCTION public.auth_is_pro() SET search_path = '';
ALTER FUNCTION public.auth_is_producer() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.is_producer() SET search_path = '';

-- Fonctions de gestion des producteurs
ALTER FUNCTION public.get_my_producer_id() SET search_path = '';
-- NOTE: link_producer_to_profile() n'existe pas dans la base - ligne supprimée
ALTER FUNCTION public.sync_direct_sales_availability() SET search_path = '';

-- Fonctions de gestion des utilisateurs
ALTER FUNCTION public.update_profiles_updated_at() SET search_path = '';
ALTER FUNCTION public.create_user_data() SET search_path = '';
ALTER FUNCTION public.link_user_code() SET search_path = '';
ALTER FUNCTION public.create_user_code_mapping() SET search_path = '';
ALTER FUNCTION public.add_user_lot() SET search_path = '';

-- Fonctions RGPD (export/suppression données)
ALTER FUNCTION public.export_user_data() SET search_path = '';
ALTER FUNCTION public.preview_account_deletion() SET search_path = '';
ALTER FUNCTION public.delete_user_account() SET search_path = '';

-- Fonctions de validation et audit
ALTER FUNCTION public.validate_file_upload() SET search_path = '';
ALTER FUNCTION public.audit_trigger_func() SET search_path = '';

-- =============================================================================
-- IMPORTANT: Après cette migration, les fonctions doivent utiliser des noms
-- pleinement qualifiés (ex: public.profiles au lieu de profiles).
-- Si une fonction échoue, vérifiez qu'elle utilise bien les noms qualifiés.
-- =============================================================================
