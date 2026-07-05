import { createClient } from '@supabase/supabase-js'

const url = 'https://ygowsxstcmupzhwlainf.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, handle, api_key')
    .eq('handle', 'yaper')
    .single()

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('Agent:', data)
}

main()
