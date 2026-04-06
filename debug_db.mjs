import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  console.log('--- Checking Announcements Table Structure and Data ---')
  
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching announcements:', error)
    return
  }

  console.log('Last 5 announcements found:', data.length)
  data.forEach((ann, i) => {
    console.log(`\n[Announcement ${i+1}]`)
    console.log(`ID: ${ann.id}`)
    console.log(`Title: ${ann.title}`)
    console.log(`Image URL: ${ann.image_url || 'NULL'}`)
    console.log(`Message: ${ann.message?.substring(0, 20)}...`)
  })
}

check()
