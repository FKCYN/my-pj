import "server-only";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function storageMode(): "supabase" | "local" | "unconfigured" {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) return "supabase";
  if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SECRET_KEY) return "unconfigured";
  return process.env.NODE_ENV === "development" && process.env.LOCAL_STORE === "true" ? "local" : "unconfigured";
}
export function secretMatches(actual: string, expected?: string): boolean {
  if (!expected || expected.length < 24) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function bearer(request: Request): string { return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""; }
export async function canRead(request: Request): Promise<boolean> {
  if (storageMode() === "local") return true;
  const token = bearer(request);
  if (secretMatches(token, process.env.DASHBOARD_API_TOKEN)) return true;
  if (!token || !process.env.DASHBOARD_USER_ID) return false;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  return !error && data.user?.id === process.env.DASHBOARD_USER_ID;
}
export function authorizedDevice(request: Request, id: string): "test" | "real" | null {
  const token = bearer(request);
  if (id === "test-01" && secretMatches(token, process.env.TEST_DEVICE_TOKEN)) return "test";
  if (id === "room-01" && secretMatches(token, process.env.ROOM_DEVICE_TOKEN)) return "real";
  return null;
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
