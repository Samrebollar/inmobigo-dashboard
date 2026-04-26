import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    const key = match[1]
    let value = match[2] || ''
    if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1)
    }
    env[key] = value.trim()
  }
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY']

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const email = 'tramitessam27@gmail.com'
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users.users.find(u => u.email === email)

  const { data: resident } = await supabase
    .from('residents')
    .select('id, condominiums(organization_id)')
    .eq('user_id', user.id)
    .maybeSingle()

  const orgId = resident?.condominiums?.organization_id

  const { data: org } = await supabase
    .from('organizations')
    .select('business_type')
    .eq('id', orgId)
    .maybeSingle()

  console.log("=== Organizations Table Lookup ===")
  console.log(org)
}

run()
