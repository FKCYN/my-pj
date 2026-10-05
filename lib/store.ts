import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Reading, newestReading } from "./rain";
import { storageMode, supabaseAdmin } from "./server";
const file = path.join(process.cwd(), ".data", "readings.json");
const localState = globalThis as typeof globalThis & { fkcynWriteQueue?: Promise<unknown> };
async function localRows(): Promise<Reading[]> {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
function same(a: Reading, b: Reading) { return a.deviceId === b.deviceId && a.eventId === b.eventId && a.wet === b.wet && a.observedAt === b.observedAt && a.source === b.source && a.sensorType === b.sensorType; }
function dbRow(r: Reading) { return { device_id: r.deviceId, event_id: r.eventId, sensor_type: r.sensorType, wet: r.wet, observed_at: r.observedAt, received_at: r.receivedAt, source: r.source }; }
function fromDb(r: Record<string, unknown>): Reading {
  return { deviceId: String(r.device_id), eventId: String(r.event_id), sensorType: "rain", wet: Boolean(r.wet), source: r.source as Reading["source"], observedAt: new Date(String(r.observed_at)).toISOString(), receivedAt: new Date(String(r.received_at)).toISOString() };
}
export async function saveReading(r: Reading): Promise<{ duplicate: boolean }> {
  if (storageMode() === "local") {
    const task = (localState.fkcynWriteQueue ?? Promise.resolve()).catch(() => {}).then(async () => {
      const rows = await localRows();
      const old = rows.find(x => x.deviceId === r.deviceId && x.eventId === r.eventId);
      if (old) { if (!same(old, r)) throw new Error("EVENT_CONFLICT"); return { duplicate: true }; }
      rows.push(r);
      await fs.mkdir(path.dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(rows), "utf8");
      await fs.rename(temporary, file);
      return { duplicate: false };
    });
    localState.fkcynWriteQueue = task;
    return task;
  }
  const db = supabaseAdmin();
  const { error } = await db.from("fkcyn_readings").insert(dbRow(r));
  if (!error) return { duplicate: false };
  if (error.code !== "23505") throw new Error("STORAGE_ERROR");
  const { data, error: readError } = await db.from("fkcyn_readings").select("*").eq("device_id", r.deviceId).eq("event_id", r.eventId).single();
  if (readError || !data) throw new Error("STORAGE_ERROR");
  if (!same(fromDb(data), r)) throw new Error("EVENT_CONFLICT");
  return { duplicate: true };
}
export async function listReadings(from: string, to: string, source: string): Promise<{ readings: Reading[]; truncated: boolean }> {
  if (storageMode() === "local") {
    const readings = (await localRows()).filter(r => Date.parse(r.observedAt) >= Date.parse(from) && Date.parse(r.observedAt) < Date.parse(to) && (source === "all" || r.source === source));
    return { readings: readings.sort((a, b) => a.observedAt.localeCompare(b.observedAt)), truncated: false };
  }
  const readings: Reading[] = [];
  const db = supabaseAdmin();
  // Default Supabase API page size is 1000. Never silently return only the first page.
  for (let offset = 0; offset < 50_000; offset += 1000) {
    let query = db.from("fkcyn_readings").select("*").gte("observed_at", from).lt("observed_at", to).order("observed_at").order("device_id").order("event_id").range(offset, offset + 999);
    if (source !== "all") query = query.eq("source", source);
    const { data, error } = await query;
    if (error) throw new Error("STORAGE_ERROR");
    readings.push(...(data ?? []).map(fromDb));
    if (!data || data.length < 1000) return { readings, truncated: false };
  }
  return { readings, truncated: true };
}

// Current status must not depend on the dates selected in the rain archive.
export async function latestReading(source: string): Promise<Reading | null> {
  if (storageMode() === "local") {
    const readings = (await localRows()).filter(r => source === "all" || r.source === source);
    return newestReading(readings);
  }
  let query = supabaseAdmin().from("fkcyn_readings").select("*").order("observed_at", { ascending: false }).order("received_at", { ascending: false }).limit(1);
  if (source !== "all") query = query.eq("source", source);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("STORAGE_ERROR");
  return data ? fromDb(data) : null;
}
