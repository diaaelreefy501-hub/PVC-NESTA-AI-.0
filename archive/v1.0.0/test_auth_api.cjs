const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nzuadqnfoswrimfakdsv.supabase.co',
  'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky'
);

async function runTests() {
  console.log("=== 1. Test Wrong Email ===");
  const res1 = await supabase.auth.signInWithPassword({
    email: 'nonexistent_test_user_12345@domain.com',
    password: 'somepassword123'
  });
  console.log("Wrong Email Error:", res1.error ? res1.error.message : "No error");

  console.log("\n=== 2. Test Wrong Password ===");
  const res2 = await supabase.auth.signInWithPassword({
    email: 'diaaelreefy501@gmail.com',
    password: 'wrong_password_99999'
  });
  console.log("Wrong Password Error:", res2.error ? res2.error.message : "No error");

  console.log("\n=== 3. Test Empty Password ===");
  const res3 = await supabase.auth.signInWithPassword({
    email: 'diaaelreefy501@gmail.com',
    password: ''
  });
  console.log("Empty Password Error:", res3.error ? res3.error.message : "No error");
}

runTests();
