-- Migration: Add direct farm sales field to products table
-- Date: 2026-01-14

-- Add column for direct farm sales availability on products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS disponible_vente_directe BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_vente_directe ON products(disponible_vente_directe, producer_id);

-- Create trigger function to disable direct sales when producer disables it
CREATE OR REPLACE FUNCTION disable_product_direct_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- If producer disables vente_directe_ferme, disable it for all their products
  IF NEW.vente_directe_ferme = false AND OLD.vente_directe_ferme = true THEN
    UPDATE products
    SET disponible_vente_directe = false, updated_at = now()
    WHERE producer_id IN (
      SELECT id FROM producers WHERE profile_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS trigger_disable_product_direct_sales ON profiles;
CREATE TRIGGER trigger_disable_product_direct_sales
AFTER UPDATE OF vente_directe_ferme ON profiles
FOR EACH ROW
EXECUTE FUNCTION disable_product_direct_sales();

-- Update RLS policy for products to allow producers to update disponible_vente_directe
-- The existing policies should already cover this, but verify they include disponible_vente_directe

-- Verification query
-- SELECT id, name, producer_id, disponible_vente_directe
-- FROM products
-- WHERE disponible_vente_directe = true;
