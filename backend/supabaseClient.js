const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = (process.env.SUPABASE_URL || "https://pqmkcoltfcwtheedfpbi.supabase.co").trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbWtjb2x0ZmN3dGhlZWRmcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzc3ODUsImV4cCI6MjA5MTMxMzc4NX0.FlKpGNHNpW9sWl77jsqjX03nbRHCjgzqdWrjOs4B7UI").trim();

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
