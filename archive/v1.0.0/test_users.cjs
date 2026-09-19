const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nzuadqnfoswrimfakdsv.supabase.co', 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky');

async function check() {
  const { data, error } = await supabase.from('users').select('*');
  console.log('Users:', JSON.stringify(data, null, 2), 'Error:', error?.message);
}
check();
