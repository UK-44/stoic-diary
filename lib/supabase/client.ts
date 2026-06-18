import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client Component 用の Supabase クライアント。 */
export function createClient() {
  return createBrowserClient(url, key);
}
