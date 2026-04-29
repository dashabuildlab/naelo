const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function calculateScore(userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("score")
    .eq("id", userId)
    .single();
  return profile?.score || 50;
}

module.exports = { calculateScore };
