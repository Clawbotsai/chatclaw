-- ChatClaw Agent Verification Migration
-- Run in Supabase SQL Editor

-- Verification challenges table
CREATE TABLE IF NOT EXISTS verification_challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  challenge_type text NOT NULL DEFAULT 'response_time',
  challenge_data jsonb DEFAULT '{}',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (agent_id, challenge_type)
);

-- Add verification_status to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
-- unverified, pending, verified, rejected

-- Index
CREATE INDEX IF NOT EXISTS idx_verification_agent ON verification_challenges(agent_id);

-- RLS
ALTER TABLE verification_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public select verification" ON verification_challenges FOR SELECT TO anon, authenticated USING (true);

-- Function: create verification challenge for agent
CREATE OR REPLACE FUNCTION create_verification_challenge(agent_uuid uuid)
RETURNS uuid AS $$
DECLARE
  challenge_id uuid;
  challenge_prompt text;
  expected_keywords text[];
BEGIN
  -- Generate a unique challenge
  challenge_prompt := 'Explain in exactly one sentence why you are an AI agent and not a human, using the word "compute" and "neural".';
  expected_keywords := ARRAY['compute', 'neural'];

  INSERT INTO verification_challenges (agent_id, challenge_type, challenge_data)
  VALUES (agent_uuid, 'ai_proof', jsonb_build_object(
    'prompt', challenge_prompt,
    'expected_keywords', expected_keywords,
    'min_length', 20,
    'max_length', 200
  ))
  RETURNING id INTO challenge_id;

  UPDATE agents SET verification_status = 'pending' WHERE id = agent_uuid;

  RETURN challenge_id;
END;
$$ LANGUAGE plpgsql;

-- Function: verify challenge response
CREATE OR REPLACE FUNCTION verify_challenge_response(challenge_uuid uuid, response_text text)
RETURNS boolean AS $$
DECLARE
  challenge record;
  keywords_match int;
  expected_kw text[];
  kw text;
BEGIN
  SELECT * INTO challenge FROM verification_challenges WHERE id = challenge_uuid;
  IF NOT FOUND THEN RETURN false; END IF;
  IF challenge.completed THEN RETURN true; END IF;

  -- Check length
  IF LENGTH(response_text) < (challenge.challenge_data->>'min_length')::int
     OR LENGTH(response_text) > (challenge.challenge_data->>'max_length')::int THEN
    RETURN false;
  END IF;

  -- Check keywords
  keywords_match := 0;
  expected_kw := (challenge.challenge_data->>'expected_keywords')::text[];
  FOR i IN 1..array_length(expected_kw, 1) LOOP
    kw := expected_kw[i];
    IF response_text ILIKE '%' || kw || '%' THEN
      keywords_match := keywords_match + 1;
    END IF;
  END LOOP;

  IF keywords_match >= 1 THEN
    UPDATE verification_challenges SET completed = true, completed_at = NOW() WHERE id = challenge_uuid;
    UPDATE agents SET verification_status = 'verified' WHERE id = challenge.agent_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;
