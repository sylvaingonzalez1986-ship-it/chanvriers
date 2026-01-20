-- ============================================================================
-- FONCTIONS RGPD - Les Chanvriers Unis
-- ============================================================================
-- Version: 1.0
-- Date: 2026-01-14
--
-- Ce fichier contient:
-- 1. Fonction d'export des données utilisateur (droit d'accès)
-- 2. Fonction de suppression du compte (droit à l'oubli)
-- 3. Table de demandes RGPD pour audit
-- 4. Anonymisation des données liées
--
-- IMPORTANT: Exécuter ce fichier dans Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. TABLE DE DEMANDES RGPD (pour audit et traçabilité)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rgpd_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  request_type text NOT NULL CHECK (request_type IN ('export', 'delete', 'rectification')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  notes text,
  export_url text, -- URL temporaire pour télécharger l'export
  export_expires_at timestamptz
);

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_user_id ON rgpd_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_status ON rgpd_requests(status);

-- RLS
ALTER TABLE rgpd_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "rgpd_requests_select_own"
ON rgpd_requests FOR SELECT
USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer des demandes pour eux-mêmes
CREATE POLICY "rgpd_requests_insert_own"
ON rgpd_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Seuls les admins peuvent modifier les demandes
CREATE POLICY "rgpd_requests_update_admin"
ON rgpd_requests FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================================
-- 2. FONCTION D'EXPORT DES DONNÉES UTILISATEUR
-- ============================================================================

/**
 * Exporte toutes les données personnelles d'un utilisateur
 * Conforme à l'article 15 du RGPD (droit d'accès)
 *
 * @returns JSON contenant toutes les données de l'utilisateur
 */
CREATE OR REPLACE FUNCTION export_user_data()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_export_data jsonb;
  v_profile_data jsonb;
  v_orders_data jsonb;
  v_products_data jsonb;
  v_lots_data jsonb;
  v_audit_data jsonb;
  v_request_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur authentifié
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Non authentifié');
  END IF;

  -- Récupérer l'email
  SELECT email INTO v_user_email FROM profiles WHERE id = v_user_id;

  -- 1. Données du profil
  SELECT to_jsonb(p.*) - 'id' INTO v_profile_data
  FROM profiles p
  WHERE p.id = v_user_id;

  -- 2. Historique des commandes (anonymiser les données de paiement)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'order_id', o.id,
      'created_at', o.created_at,
      'status', o.status,
      'total', o.total,
      'items_count', jsonb_array_length(o.items),
      'delivery_address', o.delivery_address,
      'delivery_city', o.delivery_city,
      'delivery_postal_code', o.delivery_postal_code
    )
    ORDER BY o.created_at DESC
  ), '[]'::jsonb) INTO v_orders_data
  FROM orders o
  WHERE o.customer_email = v_user_email
     OR o.user_id = v_user_id;

  -- 3. Produits créés (si producteur)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'product_id', prod.id,
      'name', prod.name,
      'category', prod.category,
      'price', prod.price,
      'status', prod.status,
      'created_at', prod.created_at
    )
    ORDER BY prod.created_at DESC
  ), '[]'::jsonb) INTO v_products_data
  FROM products prod
  JOIN producers pr ON prod.producer_id = pr.id
  WHERE pr.profile_id = v_user_id;

  -- 4. Lots gagnés
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'lot_name', ul.lot_name,
      'won_at', ul.won_at,
      'used', ul.used,
      'used_at', ul.used_at
    )
    ORDER BY ul.won_at DESC
  ), '[]'::jsonb) INTO v_lots_data
  FROM user_lots ul
  WHERE ul.user_id = v_user_id
     OR ul.user_code = (SELECT user_code FROM profiles WHERE id = v_user_id);

  -- 5. Historique des actions (audit log limité)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'action', al.action,
      'table_name', al.table_name,
      'created_at', al.created_at
    )
    ORDER BY al.created_at DESC
    LIMIT 100
  ), '[]'::jsonb) INTO v_audit_data
  FROM audit_log_entries al
  WHERE al.user_id = v_user_id;

  -- Enregistrer la demande d'export
  INSERT INTO rgpd_requests (user_id, request_type, status, processed_at)
  VALUES (v_user_id, 'export', 'completed', now())
  RETURNING id INTO v_request_id;

  -- Construire l'export final
  v_export_data := jsonb_build_object(
    'export_info', jsonb_build_object(
      'generated_at', now(),
      'request_id', v_request_id,
      'user_email', v_user_email,
      'data_controller', 'SASU Les Champs Bretons',
      'contact', '60 rue François 1er, 75008 Paris'
    ),
    'profile', v_profile_data,
    'orders', v_orders_data,
    'products_created', v_products_data,
    'lots_won', v_lots_data,
    'activity_log', v_audit_data
  );

  RETURN v_export_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. FONCTION DE SUPPRESSION DU COMPTE (DROIT À L'OUBLI)
-- ============================================================================

/**
 * Initie la suppression d'un compte utilisateur
 * Conforme à l'article 17 du RGPD (droit à l'effacement)
 *
 * Cette fonction:
 * - Anonymise les données dans les commandes (conservation légale)
 * - Supprime les données personnelles du profil
 * - Supprime les produits créés (si producteur)
 * - Supprime les lots gagnés
 * - Archive l'action dans les logs RGPD
 *
 * @param p_confirmation_text - Doit être 'SUPPRIMER MON COMPTE' pour confirmer
 * @returns JSON avec le statut de la suppression
 */
CREATE OR REPLACE FUNCTION delete_user_account(
  p_confirmation_text text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_user_code text;
  v_producer_id text;
  v_request_id uuid;
  v_orders_count int;
  v_products_count int;
BEGIN
  -- Vérification de la confirmation
  IF p_confirmation_text != 'SUPPRIMER MON COMPTE' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Confirmation invalide. Veuillez saisir exactement: SUPPRIMER MON COMPTE'
    );
  END IF;

  -- Récupérer l'ID de l'utilisateur authentifié
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Récupérer les infos utilisateur
  SELECT email, user_code INTO v_user_email, v_user_code
  FROM profiles WHERE id = v_user_id;

  -- Vérifier si l'utilisateur est un producteur
  SELECT id INTO v_producer_id
  FROM producers WHERE profile_id = v_user_id;

  -- Enregistrer la demande de suppression
  INSERT INTO rgpd_requests (user_id, request_type, status)
  VALUES (v_user_id, 'delete', 'processing')
  RETURNING id INTO v_request_id;

  -- 1. Anonymiser les commandes (conservation légale 10 ans)
  UPDATE orders
  SET
    customer_name = 'Utilisateur supprimé',
    customer_email = 'deleted-' || v_user_id || '@anonymized.local',
    customer_phone = NULL,
    delivery_address = 'Adresse supprimée',
    delivery_name = NULL,
    notes = NULL,
    user_id = NULL
  WHERE customer_email = v_user_email
     OR user_id = v_user_id;

  GET DIAGNOSTICS v_orders_count = ROW_COUNT;

  -- 2. Supprimer les produits du producteur (si applicable)
  IF v_producer_id IS NOT NULL THEN
    DELETE FROM products WHERE producer_id = v_producer_id;
    GET DIAGNOSTICS v_products_count = ROW_COUNT;

    -- Supprimer le producteur
    DELETE FROM producers WHERE id = v_producer_id;
  ELSE
    v_products_count := 0;
  END IF;

  -- 3. Supprimer les lots gagnés
  DELETE FROM user_lots
  WHERE user_id = v_user_id
     OR user_code = v_user_code;

  -- 4. Supprimer le profil
  DELETE FROM profiles WHERE id = v_user_id;

  -- 5. Mettre à jour la demande RGPD
  UPDATE rgpd_requests
  SET
    status = 'completed',
    processed_at = now(),
    notes = format('Commandes anonymisées: %s, Produits supprimés: %s', v_orders_count, v_products_count)
  WHERE id = v_request_id;

  -- Note: La suppression de auth.users doit être faite via l'API Supabase Admin
  -- côté client après cette fonction

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Compte supprimé avec succès',
    'request_id', v_request_id,
    'details', jsonb_build_object(
      'orders_anonymized', v_orders_count,
      'products_deleted', v_products_count,
      'note', 'Veuillez vous déconnecter. Votre compte sera définitivement supprimé.'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. FONCTION DE VÉRIFICATION AVANT SUPPRESSION
-- ============================================================================

/**
 * Vérifie ce qui sera supprimé avant la suppression du compte
 * Permet à l'utilisateur de voir un résumé avant de confirmer
 */
CREATE OR REPLACE FUNCTION preview_account_deletion()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_orders_count int;
  v_products_count int;
  v_lots_count int;
  v_is_producer boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Non authentifié');
  END IF;

  SELECT email INTO v_user_email FROM profiles WHERE id = v_user_id;

  -- Compter les commandes
  SELECT COUNT(*) INTO v_orders_count
  FROM orders
  WHERE customer_email = v_user_email OR user_id = v_user_id;

  -- Vérifier si producteur et compter les produits
  SELECT EXISTS(SELECT 1 FROM producers WHERE profile_id = v_user_id) INTO v_is_producer;

  IF v_is_producer THEN
    SELECT COUNT(*) INTO v_products_count
    FROM products p
    JOIN producers pr ON p.producer_id = pr.id
    WHERE pr.profile_id = v_user_id;
  ELSE
    v_products_count := 0;
  END IF;

  -- Compter les lots
  SELECT COUNT(*) INTO v_lots_count
  FROM user_lots
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'email', v_user_email,
    'is_producer', v_is_producer,
    'data_to_delete', jsonb_build_object(
      'profile', true,
      'orders_to_anonymize', v_orders_count,
      'products_to_delete', v_products_count,
      'lots_to_delete', v_lots_count
    ),
    'warning', CASE
      WHEN v_is_producer THEN 'Attention: En tant que producteur, tous vos produits seront supprimés.'
      ELSE 'Vos données personnelles seront supprimées. Les commandes seront anonymisées pour conformité légale.'
    END,
    'confirmation_required', 'SUPPRIMER MON COMPTE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION export_user_data TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION preview_account_deletion TO authenticated;

-- ============================================================================
-- INSTRUCTIONS D'UTILISATION
-- ============================================================================
--
-- Export des données:
-- const { data, error } = await supabase.rpc('export_user_data');
-- // data contient toutes les données de l'utilisateur en JSON
--
-- Aperçu avant suppression:
-- const { data } = await supabase.rpc('preview_account_deletion');
-- // Afficher à l'utilisateur ce qui sera supprimé
--
-- Suppression du compte:
-- const { data } = await supabase.rpc('delete_user_account', {
--   p_confirmation_text: 'SUPPRIMER MON COMPTE'
-- });
-- if (data.success) {
--   // Déconnecter l'utilisateur
--   await supabase.auth.signOut();
-- }
-- ============================================================================
