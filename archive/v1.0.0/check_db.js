import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://nzuadqnfoswrimfakdsv.supabase.co', 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky');
async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log(data, error);
}
run();
