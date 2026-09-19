import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://nzuadqnfoswrimfakdsv.supabase.co';
const supabaseKey = 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky';
const adminAuthClient = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await adminAuthClient.auth.admin.createUser({
    email: 'test_admin_create_' + Date.now() + '@example.com',
    password: 'password123',
    email_confirm: true
  });
  console.log(error ? 'Error: ' + error.message : 'Success!');
}
run();
