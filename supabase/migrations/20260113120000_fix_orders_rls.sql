-- Migration: Sécurisation des politiques RLS de la table orders
-- Date: 2026-01-13
-- Description: Protège les données personnelles des clients (noms, emails, adresses, téléphones)

-- Désactive temporairement RLS
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Supprime toutes les anciennes politiques dangereuses
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

-- Réactive RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Politique 1 : Les clients voient UNIQUEMENT leurs propres commandes
-- Les admins peuvent voir toutes les commandes
CREATE POLICY "orders_select_own" ON orders
FOR SELECT
TO authenticated
USING (
  customer_email = auth.email()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Politique 2 : Les clients créent des commandes avec leur propre email uniquement
CREATE POLICY "orders_insert_own" ON orders
FOR INSERT
TO authenticated
WITH CHECK (
  customer_email = auth.email()
);

-- Politique 3 : Les clients modifient uniquement leurs propres commandes
-- Les admins peuvent modifier toutes les commandes
CREATE POLICY "orders_update_own" ON orders
FOR UPDATE
TO authenticated
USING (
  customer_email = auth.email()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Politique 4 : Seuls les admins peuvent supprimer des commandes
CREATE POLICY "orders_delete_admin" ON orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
