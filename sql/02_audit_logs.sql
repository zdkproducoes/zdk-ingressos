-- =====================================================================
-- SACODE — Migration 02: Audit Logs
-- =====================================================================
-- Como rodar:
--   1. Abra Supabase > SQL Editor > New query
--   2. Cole este arquivo inteiro e execute

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_resource_type text,
  target_resource_id text,
  ip text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON audit_logs(actor_id);

-- RLS: tabela só acessível via service_role (supabaseAdmin)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Sem policies = ninguém com anon/authenticated pode ler/escrever; só service_role bypassa RLS
