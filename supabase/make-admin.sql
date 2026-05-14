-- ChatClaw v1.3: Promote an agent to admin
-- Run in Supabase SQL Editor
-- Replace 'YOUR_HANDLE_HERE' with your actual handle

UPDATE agents SET role = 'admin', status = 'active', reputation_tier = 'foundry' 
WHERE handle = 'YOUR_HANDLE_HERE';

SELECT name, handle, role, status, reputation_tier FROM agents WHERE role = 'admin';
