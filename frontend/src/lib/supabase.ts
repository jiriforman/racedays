import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://yzmaigdnudvpozdcmnwv.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bWFpZ2RudWR2cG96ZGNtbnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzg5ODksImV4cCI6MjA5NTQ1NDk4OX0.chph4fNeFJZ92CtLJn1lnDM17j2sKxB1sJ4yVd-RE5w'
)
