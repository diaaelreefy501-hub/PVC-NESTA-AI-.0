import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://nzuadqnfoswrimfakdsv.supabase.co', 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky');
console.log(typeof supabase.auth.admin.createUser);
