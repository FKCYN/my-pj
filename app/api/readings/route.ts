import { authorizedDevice, canRead, json, storageMode } from "@/lib/server";
import { listReadings, saveReading } from "@/lib/store";
import { validateReading, dateRange } from "@/lib/rain";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  if (storageMode() === "unconfigured") return json({ error: "ยังไม่ได้ตั้งค่าฐานข้อมูล" }, 503);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "ใช้ Content-Type: application/json" }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return json({ error: "ข้อมูลใหญ่เกินกำหนด" }, 413);
  let value;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 4096) return json({ error: "ข้อมูลใหญ่เกินกำหนด" }, 413);
    value = validateReading(JSON.parse(text));
  } catch (error) { return json({ error: error instanceof SyntaxError ? "JSON ไม่ถูกต้อง" : (error as Error).message }, 400); }
  const source = authorizedDevice(request, value.deviceId);
  if (!source) return json({ error: "รหัสอุปกรณ์ไม่ถูกต้อง" }, 401);
  try {
    const result = await saveReading({ ...value, source, receivedAt: new Date().toISOString() });
    return json({ ok: true, ...result, eventId: value.eventId, source }, result.duplicate ? 200 : 201);
  } catch (error) {
    if ((error as Error).message === "EVENT_CONFLICT") return json({ error: "eventId นี้มีข้อมูลต่างกันอยู่แล้ว" }, 409);
    return json({ error: "บันทึกไม่ได้ กรุณาตรวจการเชื่อมต่อและ SQL schema" }, 503);
  }
}
export async function GET(request: Request) {
  if (storageMode() === "unconfigured") return json({ error: "ยังไม่ได้ตั้งค่าฐานข้อมูล" }, 503);
  try {
    if (!await canRead(request)) return json({ error: "กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาต" }, 401);
    const url = new URL(request.url), from = url.searchParams.get("from") ?? "", to = url.searchParams.get("to") ?? "", source = url.searchParams.get("source") ?? "real";
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    const duration = Date.parse(to) - Date.parse(from);
    const validDay = (day: string) => pattern.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
    if (!validDay(from) || !validDay(to) || !Number.isFinite(duration) || duration < 0 || duration > 30 * 86_400_000 || !["real", "test", "all"].includes(source)) return json({ error: "ระบุ from/to เป็น YYYY-MM-DD ไม่เกิน 31 วัน และ source เป็น real/test/all" }, 400);
    const range = dateRange(from, to);
    const data = await listReadings(range.from, range.to, source);
    return json({ ...data, storage: storageMode(), fetchedAt: new Date().toISOString() });
  } catch { return json({ error: "อ่านข้อมูลไม่ได้ กรุณาตรวจการเชื่อมต่อและ SQL schema" }, 503); }
}
