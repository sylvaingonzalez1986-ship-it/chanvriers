-- =============================================================================
-- Migration: Fix Security Definer Views and RLS on allowed_mime_types
-- Date: 2026-01-15
-- Description: Addresses 3 security issues detected by Supabase Database Linter
-- =============================================================================

-- =============================================================================
-- ANALYSE DES RISQUES
-- =============================================================================
--
-- PROBLÈME 1 & 2: SECURITY DEFINER Views
-- ---------------------------------------
-- Risque: Les views avec SECURITY DEFINER s'exécutent avec les privilèges du
-- créateur (souvent postgres/superuser), pas de l'utilisateur courant.
--
-- Conséquences potentielles:
-- - Bypass complet des politiques RLS sur les tables sous-jacentes
-- - Un utilisateur malveillant pourrait voir des données non autorisées
-- - Escalade de privilèges si la view accède à des tables sensibles
--
-- Exemple d'attaque: Un client pourrait voir les prix pro via products_for_pros
-- si la view est accessible, car RLS est ignoré avec SECURITY DEFINER.
--
-- PROBLÈME 3: RLS Disabled sur allowed_mime_types
-- ------------------------------------------------
-- Risque: Sans RLS, TOUS les utilisateurs authentifiés peuvent:
-- - Lire tous les enregistrements (SELECT)
-- - Potentiellement modifier/supprimer si des GRANTS existent
--
-- Impact: Faible pour cette table (données non sensibles), mais mauvaise
-- pratique car un attaquant pourrait potentiellement injecter des types
-- MIME malveillants si INSERT/UPDATE sont autorisés.
-- =============================================================================

-- =============================================================================
-- CORRECTION 1: Recréer products_for_clients sans SECURITY DEFINER
-- =============================================================================

DROP VIEW IF EXISTS public.products_for_clients;

CREATE VIEW public.products_for_clients
WITH (security_invoker = true)
AS
SELECT
    id,
    producer_id,
    name,
    type,
    cbd_percent,
    thc_percent,
    price_public AS price,
    weight,
    image,
    images,
    description,
    stock,
    is_on_promo,
    promo_percent,
    tva_rate
FROM products
WHERE status = 'published'::product_status
  AND visible_for_clients = true;

GRANT SELECT ON public.products_for_clients TO authenticated;

COMMENT ON VIEW public.products_for_clients IS
'Vue des produits pour les clients - affiche uniquement le prix public.
Utilise SECURITY INVOKER pour respecter RLS sur la table products.';


-- =============================================================================
-- CORRECTION 2: Recréer products_for_pros sans SECURITY DEFINER
-- =============================================================================

DROP VIEW IF EXISTS public.products_for_pros;

CREATE VIEW public.products_for_pros
WITH (security_invoker = true)
AS
SELECT
    id,
    producer_id,
    name,
    type,
    cbd_percent,
    thc_percent,
    price_public,
    price_pro,
    COALESCE(price_pro, price_public) AS price,
    weight,
    image,
    images,
    description,
    stock,
    is_on_promo,
    promo_percent,
    tva_rate
FROM products
WHERE status = 'published'::product_status
  AND visible_for_pros = true;

GRANT SELECT ON public.products_for_pros TO authenticated;

COMMENT ON VIEW public.products_for_pros IS
'Vue des produits pour les professionnels - inclut prix pro.
Utilise SECURITY INVOKER pour respecter RLS sur la table products.';


-- =============================================================================
-- CORRECTION 3: Activer RLS sur allowed_mime_types
-- =============================================================================

ALTER TABLE public.allowed_mime_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_mime_types FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des types MIME autorisés" ON public.allowed_mime_types;
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les types MIME" ON public.allowed_mime_types;

CREATE POLICY "Lecture publique des types MIME autorisés"
ON public.allowed_mime_types
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Seuls les admins peuvent modifier les types MIME"
ON public.allowed_mime_types
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

COMMENT ON TABLE public.allowed_mime_types IS
'Types MIME autorisés pour les uploads. RLS activé: lecture publique,
modification réservée aux admins.';
