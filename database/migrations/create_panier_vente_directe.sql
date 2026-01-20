-- Table pour le panier de vente directe
CREATE TABLE IF NOT EXISTS panier_vente_directe (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  producer_id text NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_panier_directe_user ON panier_vente_directe(user_id);
CREATE INDEX IF NOT EXISTS idx_panier_directe_producer ON panier_vente_directe(producer_id);
CREATE INDEX IF NOT EXISTS idx_panier_directe_product ON panier_vente_directe(product_id);

-- Activer RLS
ALTER TABLE panier_vente_directe ENABLE ROW LEVEL SECURITY;

-- Policy : Les utilisateurs ne voient que leur propre panier
CREATE POLICY "Users can view own cart" ON panier_vente_directe
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent insérer leurs propres items
CREATE POLICY "Users can insert own cart items" ON panier_vente_directe
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent modifier leurs propres items
CREATE POLICY "Users can update own cart items" ON panier_vente_directe
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent supprimer leurs propres items
CREATE POLICY "Users can delete own cart items" ON panier_vente_directe
  FOR DELETE
  USING (auth.uid() = user_id);
