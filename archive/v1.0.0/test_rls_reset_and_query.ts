import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseAdminKey = "sb_secret_fen7yFNGihYfCuW2VJCf-Q__b-NnIlS";
const supabasePublishableKey = "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";

async function run() {
  const adminClient = createClient(supabaseUrl, supabaseAdminKey);
  const publicClient = createClient(supabaseUrl, supabasePublishableKey);

  const testUserId = "8a61bdab-438a-4a02-869e-0607a85fe424"; // sales@nesta.com
  const testEmail = "sales@nesta.com";
  const tempPassword = "TempPassword123!";

  console.log(`[Admin] Resetting password for ${testEmail}...`);
  const { error: resetError } = await adminClient.auth.admin.updateUserById(testUserId, {
    password: tempPassword
  });

  if (resetError) {
    console.error("[Admin] Failed to reset password:", resetError.message);
    return;
  }
  console.log("[Admin] Password reset successfully!");

  console.log(`[Client] Logging in as ${testEmail}...`);
  const { data: authData, error: loginError } = await publicClient.auth.signInWithPassword({
    email: testEmail,
    password: tempPassword
  });

  if (loginError) {
    console.error("[Client] Login failed:", loginError.message);
    return;
  }
  console.log("[Client] Login successful! Session user ID:", authData.user?.id);

  console.log("[Client] Querying customers under RLS...");
  const { data: customers, error: custError } = await publicClient.from("customers").select("*").limit(5);

  if (custError) {
    console.error("[Client] Failed to query customers:", custError.code, "-", custError.message);
  } else {
    console.log("[Client] Successfully queried customers! Count:", customers.length);
    console.log("Sample rows:", customers);
  }

  console.log("[Client] Querying sales under RLS...");
  const { data: sales, error: salesError } = await publicClient.from("sales").select("*").limit(5);

  if (salesError) {
    console.error("[Client] Failed to query sales:", salesError.code, "-", salesError.message);
  } else {
    console.log("[Client] Successfully queried sales! Count:", sales.length);
  }
}

run();
