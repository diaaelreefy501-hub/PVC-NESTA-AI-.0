const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nzuadqnfoswrimfakdsv.supabase.co';
const supabaseKey = 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('companies').upsert([{
    id: "comp-123",
    name: "Test Co",
    badgeBg: "#fff"
  }]);
  console.log('Upsert Error:', error);
}
test();
