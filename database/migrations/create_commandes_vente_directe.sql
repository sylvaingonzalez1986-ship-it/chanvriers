-- Créer l'enum pour les statuts de commande
CREATE TYPE commande_status AS ENUM ('en_attente', 'confirmee', 'prete', 'recuperee', 'annulee');

-- Table pour les commandes de vente directe
CREATE TABLE IF NOT EXISTS commandes_vente_directe (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_id text NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  total numeric NOT NULL CHECK (total >= 20),
  statut commande_status DEFAULT 'en_attente',
  adresse_retrait text NOT NULL,
  horaires_retrait text NOT NULL,
  instructions_retrait text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table pour les lignes de commande
CREATE TABLE IF NOT EXISTS lignes_commande_vente_directe (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id uuid NOT NULL REFERENCES commandes_vente_directe(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantite integer NOT NULL CHECK (quantite > 0),
  prix_unitaire numeric NOT NULL CHECK (prix_unitaire > 0),
  sous_total numeric NOT NULL CHECK (sous_total > 0),
  created_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_commandes_user ON commandes_vente_directe(user_id);
CREATE INDEX IF NOT EXISTS idx_commandes_producer ON commandes_vente_directe(producer_id);
CREATE INDEX IF NOT EXISTS idx_commandes_status ON commandes_vente_directe(statut);
CREATE INDEX IF NOT EXISTS idx_lignes_commande ON lignes_commande_vente_directe(commande_id);

-- Activer RLS
ALTER TABLE commandes_vente_directe ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_commande_vente_directe ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour commandes_vente_directe
-- Les utilisateurs voient leurs propres commandes
CREATE POLICY "Users can view own orders" ON commandes_vente_directe
  FOR SELECT
  USING (auth.uid() = user_id);

-- Les producteurs voient les commandes qui les concernent
CREATE POLICY "Producers can view their orders" ON commandes_vente_directe
  FOR SELECT
  USING (
    producer_id IN (SELECT id FROM producers WHERE profile_id = auth.uid())
  );

-- Les admins voient tout
CREATE POLICY "Admins can view all orders" ON commandes_vente_directe
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Les utilisateurs peuvent créer leurs propres commandes
CREATE POLICY "Users can create own orders" ON commandes_vente_directe
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les admins peuvent modifier les statuts
CREATE POLICY "Admins can update orders" ON commandes_vente_directe
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies pour lignes_commande_vente_directe
-- Les utilisateurs voient les lignes de leurs commandes
CREATE POLICY "Users can view own order lines" ON lignes_commande_vente_directe
  FOR SELECT
  USING (
    commande_id IN (
      SELECT id FROM commandes_vente_directe WHERE user_id = auth.uid()
    )
  );

-- Les producteurs voient les lignes de leurs commandes
CREATE POLICY "Producers can view their order lines" ON lignes_commande_vente_directe
  FOR SELECT
  USING (
    commande_id IN (
      SELECT id FROM commandes_vente_directe
      WHERE producer_id IN (SELECT id FROM producers WHERE profile_id = auth.uid())
    )
  );

-- Les admins voient tout
CREATE POLICY "Admins can view all order lines" ON lignes_commande_vente_directe
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Les utilisateurs peuvent créer les lignes de leurs commandes
CREATE POLICY "Users can create own order lines" ON lignes_commande_vente_directe
  FOR INSERT
  WITH CHECK (
    commande_id IN (
      SELECT id FROM commandes_vente_directe WHERE user_id = auth.uid()
    )
  );
