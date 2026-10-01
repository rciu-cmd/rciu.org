// Both values are safe to ship in client code: the URL is public and the
// publishable (anon) key only grants access allowed by Row Level Security
// policies defined in the database. Kept apart from ./supabase so build-time
// code (src/lib/share-data.ts) can use them without creating a client.
export const SUPABASE_URL = "https://mdfexlubrbvkdtyqvvtc.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NZzjfPA3P5vKeIAtXOxekg_EgzYLCId";
