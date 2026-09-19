import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://nzuadqnfoswrimfakdsv.supabase.co';
const supabaseKey = 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("1. Creating user...");
  const email = `test_emp_${Date.now()}@nesta.com`;
  const password = 'TestPassword123!';
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (signUpError) {
    console.error("Signup failed:", signUpError.message);
    return;
  }
  
  console.log("Signup success:", signUpData.user?.id);
  
  // Create profile
  console.log("2. Creating profile...");
  const profile = {
    id: signUpData.user.id,
    name: "Test Employee",
    email: email,
    role: "sales",
    allowedCompanyIds: ["comp-newhouse"],
    active: true
  };
  
  const { error: dbError } = await supabase.from('users').insert([profile]);
  if (dbError) {
    console.error("Profile creation failed:", dbError.message);
    return;
  }
  console.log("Profile created.");
  
  // Login
  console.log("3. Logging in...");
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (loginError) {
    console.error("Login failed:", loginError.message);
    return;
  }
  console.log("Login success! Session token:", loginData.session?.access_token ? "Exists" : "None");
  
  // Logout
  console.log("4. Logging out...");
  const { error: logoutError } = await supabase.auth.signOut();
  if (logoutError) {
    console.error("Logout failed:", logoutError.message);
    return;
  }
  console.log("Logout success.");
}
run();
