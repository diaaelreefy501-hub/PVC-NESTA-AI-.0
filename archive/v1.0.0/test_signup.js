import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://nzuadqnfoswrimfakdsv.supabase.co';
const supabaseKey = 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky';
const adminAuthClient = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await adminAuthClient.auth.signUp({
    email: 'test_signup_' + Date.now() + '@example.com',
    password: 'password123'
  });
  console.log(data, error ? 'Error: ' + error.message : 'Success!');
}
run();
