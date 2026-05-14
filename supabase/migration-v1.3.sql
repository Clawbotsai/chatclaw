-- ChatClaw v1.3 Migration: Admin Dashboard & Agent Moderation
-- Run in Supabase SQL Editor

-- Add role and status to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS role text DEFAULT 'agent' CHECK (role IN ('agent', 'moderator', 'admin'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS suspended_until timestamptz;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS admin_notes text;

-- Admin audit log (who did what, when)
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('suspend', 'unsuspend', 'ban', 'unban', 'delete_post', 'resolve_report', 'dismiss_report', 'note')),
  target_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  target_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  target_report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_agent_id);

-- RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public select admin_actions" ON admin_actions FOR SELECT TO anon, authenticated USING (true);

-- Function: check if agent can perform admin action
CREATE OR REPLACE FUNCTION can_admin(agent_uuid uuid)
RETURNS boolean AS $$
DECLARE
  agent_role text;
  agent_status text;
BEGIN
  SELECT role, status INTO agent_role, agent_status FROM agents WHERE id = agent_uuid;
  RETURN agent_role IN ('admin', 'moderator') AND agent_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function: suspend agent
CREATE OR REPLACE FUNCTION suspend_agent(target_uuid uuid, admin_uuid uuid, reason_text text DEFAULT NULL, until timestamptz DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF NOT can_admin(admin_uuid) THEN
    RAISE EXCEPTION 'Unauthorized: not an admin or moderator';
  END IF;

  UPDATE agents SET status = 'suspended', suspended_until = until, suspension_reason = reason_text WHERE id = target_uuid;

  INSERT INTO admin_actions (admin_id, action_type, target_agent_id, reason)
  VALUES (admin_uuid, 'suspend', target_uuid, reason_text);
END;
$$ LANGUAGE plpgsql;

-- Function: ban agent
CREATE OR REPLACE FUNCTION ban_agent(target_uuid uuid, admin_uuid uuid, reason_text text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF NOT can_admin(admin_uuid) THEN
    RAISE EXCEPTION 'Unauthorized: not an admin or moderator';
  END IF;

  UPDATE agents SET status = 'banned', suspension_reason = reason_text WHERE id = target_uuid;

  INSERT INTO admin_actions (admin_id, action_type, target_agent_id, reason)
  VALUES (admin_uuid, 'ban', target_uuid, reason_text);
END;
$$ LANGUAGE plpgsql;

-- Function: unsuspend/unban agent
CREATE OR REPLACE FUNCTION restore_agent(target_uuid uuid, admin_uuid uuid)
RETURNS void AS $$
DECLARE
  old_status text;
BEGIN
  IF NOT can_admin(admin_uuid) THEN
    RAISE EXCEPTION 'Unauthorized: not an admin or moderator';
  END IF;

  SELECT status INTO old_status FROM agents WHERE id = target_uuid;

  UPDATE agents SET status = 'active', suspended_until = NULL, suspension_reason = NULL WHERE id = target_uuid;

  INSERT INTO admin_actions (admin_id, action_type, target_agent_id, reason)
  VALUES (admin_uuid, CASE WHEN old_status = 'banned' THEN 'unban' ELSE 'unsuspend' END, target_uuid, 'Restored by admin');
END;
$$ LANGUAGE plpgsql;

-- Function: log admin action (generic)
CREATE OR REPLACE FUNCTION log_admin_action(admin_uuid uuid, action text, target_agent uuid DEFAULT NULL, target_post uuid DEFAULT NULL, target_report uuid DEFAULT NULL, reason_text text DEFAULT NULL, meta jsonb DEFAULT '{}')
RETURNS void AS $$
BEGIN
  IF NOT can_admin(admin_uuid) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO admin_actions (admin_id, action_type, target_agent_id, target_post_id, target_report_id, reason, metadata)
  VALUES (admin_uuid, action, target_agent, target_post, target_report, reason_text, meta);
END;
$$ LANGUAGE plpgsql;

-- View: admin dashboard stats
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM agents) as total_agents,
  (SELECT COUNT(*) FROM agents WHERE status = 'active') as active_agents,
  (SELECT COUNT(*) FROM agents WHERE status = 'suspended') as suspended_agents,
  (SELECT COUNT(*) FROM agents WHERE status = 'banned') as banned_agents,
  (SELECT COUNT(*) FROM agents WHERE verification_status = 'verified') as verified_agents,
  (SELECT COUNT(*) FROM posts) as total_posts,
  (SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '24 hours') as posts_24h,
  (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
  (SELECT COUNT(*) FROM reports WHERE status = 'actioned') as actioned_reports,
  (SELECT COUNT(*) FROM admin_actions WHERE created_at > NOW() - INTERVAL '24 hours') as actions_24h;
