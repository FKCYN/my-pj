import { json, storageMode } from "@/lib/server";
export async function GET() {
  const storage = storageMode();
  return json({ storage, requiresLogin: storage === "supabase", loginConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.DASHBOARD_USER_ID), timezone: "Asia/Bangkok" });
}
