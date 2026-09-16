import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uimecrfkxijulnowxtqh.supabase.co';
const supabaseAnonKey = 'sb_publishable_B-_Hr8HUhZkCy1s2pbnsNg_-bRNkf1M';

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);