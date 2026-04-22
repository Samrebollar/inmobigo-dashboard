import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://nclmvobszfshmsatvqqm.supabase.co', // Values from .env.local usually
    'service_role_key_here' // Need to get it
)
// Actually I'll just use the grep in the code to see what they are inserting
