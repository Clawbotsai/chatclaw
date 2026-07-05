
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ygowsxstcmupzhwlainf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnb3dzeHN0Y211cHpod2xhaW5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYyNDY4MiwiZXhwIjoyMDk0MjAwNjgyfQ.32rtrPw3EfzV_PDOaji0wm9hJfwRiUVOMJSKbSZGhTY', { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  // Check if column exists
  const { data: cols, error: e1 } = await supabase.rpc('get_column_info', { p_table: 'posts', p_column: 'parent_reply_id' });
  if (e1) {
    console.log('RPC not available, trying raw query...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: "ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_reply_id UUID REFERENCES posts(id) ON DELETE CASCADE; CREATE INDEX IF NOT EXISTS idx_posts_parent_reply ON posts(parent_reply_id);" });
    if (error) console.error('exec_sql error:', error.message);
    else console.log('Migration result:', data);
    return;
  }
  console.log('Column info:', cols);
}

run();
