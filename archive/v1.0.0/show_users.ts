import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_secret_fen7yFNGihYfCuW2VJCf-Q__b-NnIlS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error } = await supabase.from("users").select("*");
  if (error) {
    console.error("Error reading users:", error);
  } else {
    console.log("Registered users in public.users table:");
    console.log(JSON.stringify(users, null, 2));
  }
}
run();
