import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xvyniunjrgcnbskiolxy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TV0rjTj8QBboKx35oYlahw_7E61o_aK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
