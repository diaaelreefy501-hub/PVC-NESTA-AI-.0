const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nzuadqnfoswrimfakdsv.supabase.co', 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky');

async function test() {
  const comp = {
    id: 'comp-test',
    name: 'Test Co',
    nameEn: 'Test Co',
    color: '#000',
    badgeBg: '#fff',
    badgeText: '#000',
    phone: '123',
    monthlyTarget: 1000,
    active: true,
    logoText: 'TC'
  };
  const { data, error } = await supabase.from('companies').upsert([comp]).select();
  console.log('Upsert company:', data, error);
}
test();
