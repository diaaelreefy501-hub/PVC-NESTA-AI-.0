import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
let supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

let supabaseUrl = rawUrl.startsWith("http") ? rawUrl : "https://nzuadqnfoswrimfakdsv.supabase.co";

// If the user accidentally swapped keys in environment variables, use the correct known ones as fallback
if (!supabaseKey.startsWith("sb_publishable_") && supabaseKey !== "") {
  supabaseKey = "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";
}
if (!supabaseKey) {
  supabaseKey = "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";
}


export const supabase = createClient(supabaseUrl, supabaseKey || "dummy", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
