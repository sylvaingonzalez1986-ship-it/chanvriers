-- Migration: Add direct farm sales support to products table
-- Date: 2026-01-14

-- Add column for direct farm sales availability
ALTER TABLE products
ADD COLUMN IF NOT EXISTS disponible_vente_directe BOOLEAN DEFAULT false;

-- Create index for filtering products available for direct sales
CREATE INDEX IF NOT EXISTS idx_products_disponible_vente_directe
ON products(producer_id, disponible_vente_directe)
WHERE disponible_vente_directe = true;

-- ============================================================================
-- TRIGGER FUNCTION: Sync vente_directe_ferme with products
-- ============================================================================
-- When a producer disables vente_directe_ferme in their profile,
-- automatically set disponible_vente_directe to false for all their products

CREATE OR REPLACE FUNCTION sync_direct_sales_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- If vente_directe_ferme is being set to false
  IF NEW.vente_directe_ferme = false AND OLD.vente_directe_ferme = true THEN
    -- Find the producer linked to this profile
    UPDATE products
    SET disponible_vente_directe = false
    WHERE producer_id IN (
      SELECT id FROM producers WHERE profile_id = NEW.id
    );

    RAISE NOTICE 'Direct sales disabled for all products of user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_direct_sales_availability ON profiles;

-- Create trigger on profiles table
CREATE TRIGGER trigger_sync_direct_sales_availability
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_direct_sales_availability();

-- ============================================================================
-- RLS POLICY for products table - Direct sales field
-- ============================================================================
-- Producers can only modify disponible_vente_directe if they own the product

DROP POLICY IF EXISTS "products_update_direct_sales" ON products;

CREATE POLICY "products_update_direct_sales"
ON products FOR UPDATE
USING (
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
)
WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- SELECT id, disponible_vente_directe FROM products WHERE disponible_vente_directe = true;
-- SELECT id, vente_directe_ferme FROM profiles WHERE vente_directe_ferme = true;
