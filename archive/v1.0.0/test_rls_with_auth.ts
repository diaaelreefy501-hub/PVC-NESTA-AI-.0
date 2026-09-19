import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log("Attempting to log in as sales@nesta.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "sales@nesta.com",
    password: "Password123!" // Let's try some dummy/default password first or see if we can sign in.
  });

  if (authError) {
    console.log("Could not log in with password. Let's try to authenticate with a valid token or check user details.");
    console.error("Auth Error:", authError.message);
    return;
  }

  console.log("Login successful! Session user role/id:", authData.user?.id);
  
  console.log("Querying customers under authenticated session...");
  const { data: customers, error: custError } = await supabase.from("customers").select("*").limit(5);
  
  if (custError) {
    console.error("Failed to query customers:", custError.code, "-", custError.message);
  } else {
    console.log("Successfully queried customers! Count:", customers.length);
  }
}
run();
