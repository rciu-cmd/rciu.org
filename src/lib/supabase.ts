import { createClient } from "@supabase/supabase-js";

// Both values are safe to ship in client code: the URL is public and the
// publishable (anon) key only grants access allowed by Row Level Security
// policies defined in the database.
const SUPABASE_URL = "https://mdfexlubrbvkdtyqvvtc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NZzjfPA3P5vKeIAtXOxekg_EgzYLCId";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
