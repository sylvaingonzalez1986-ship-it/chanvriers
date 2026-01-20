-- ============================================================================
-- FIX: Créer la table audit_log_entries manquante
-- ============================================================================
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================================================

-- Créer la table audit_log_entries
CREATE TABLE IF NOT EXISTS audit_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log_entries(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log_entries(action);

-- Activer RLS
ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
DROP POLICY IF EXISTS "audit_log_select_own" ON audit_log_entries;
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log_entries;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log_entries;

-- SELECT: Utilisateurs voient leurs propres logs
CREATE POLICY "audit_log_select_own"
ON audit_log_entries FOR SELECT
USING (auth.uid() = user_id);

-- SELECT: Admins voient tous les logs
CREATE POLICY "audit_log_select_admin"
ON audit_log_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- INSERT: Utilisateurs authentifiés peuvent insérer
CREATE POLICY "audit_log_insert"
ON audit_log_entries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Vérification
SELECT 'Table audit_log_entries créée avec succès!' as status;
