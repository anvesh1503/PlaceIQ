const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY"
  );
}

let parsedSupabaseUrl;
try {
  parsedSupabaseUrl = new URL(supabaseUrl);
} catch (err) {
  throw new Error(`Invalid SUPABASE_URL format: ${supabaseUrl}`);
}

console.log(`[supabase] Using URL: ${parsedSupabaseUrl.origin}`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
