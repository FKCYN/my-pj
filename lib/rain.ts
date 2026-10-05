export type Source = "real" | "test";
export type Reading = {
  eventId: string; deviceId: string; sensorType: "rain"; wet: boolean;
  observedAt: string; receivedAt: string; source: Source;
};
export type RainSession = {
  deviceId: string; start: string; lastWet: string; end: string | null;
  endKind: "dry" | "estimated" | "ongoing"; samples: number;
};
export const GAP_MS = 3 * 60_000;
export function thaiDay(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function thaiTime(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
export function thaiDate(value: string, short = false): string {
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: short ? "short" : "long", year: short ? undefined : "numeric" }).format(new Date(value.length === 10 ? `${value}T12:00:00+07:00` : value));
}
export function shiftDay(day: string, offset: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
}
export function dateRange(from: string, to: string) {
  return { from: `${from}T00:00:00+07:00`, to: `${shiftDay(to, 1)}T00:00:00+07:00` };
}
// No reports never proves dry: a dry-only-on-change device has no heartbeat.
export function latestState(readings: Reading[], now = Date.now()): "wet" | "last-dry" | "unknown" | "empty" {
  const last = [...readings].sort((a, b) => a.observedAt.localeCompare(b.observedAt)).at(-1);
  if (!last) return "empty";
  if (now - Date.parse(last.observedAt) > GAP_MS) return "unknown";
  return last.wet ? "wet" : "last-dry";
}
export function sessions(readings: Reading[], now = Date.now()): RainSession[] {
  const groups = new Map<string, Reading[]>();
  for (const r of readings) groups.set(r.deviceId, [...(groups.get(r.deviceId) ?? []), r]);
  const result: RainSession[] = [];
  for (const [deviceId, rows] of groups) {
    rows.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.eventId.localeCompare(b.eventId));
    let current: RainSession | null = null;
    const finishEstimated = () => {
      if (current) { current.end = new Date(Date.parse(current.lastWet) + 60_000).toISOString(); current.endKind = "estimated"; result.push(current); current = null; }
    };
    for (const r of rows) {
      if (current && Date.parse(r.observedAt) - Date.parse(current.lastWet) > GAP_MS) finishEstimated();
      if (r.wet) {
        if (!current) current = { deviceId, start: r.observedAt, lastWet: r.observedAt, end: null, endKind: "ongoing", samples: 0 };
        current.lastWet = r.observedAt;
        current.samples++;
      } else if (current) { current.end = r.observedAt; current.endKind = "dry"; result.push(current); current = null; }
    }
    if (current) { if (now - Date.parse(current.lastWet) > GAP_MS) finishEstimated(); else result.push(current); }
  }
  return result.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
}
// Deduplicate device + minute: these are minutes WITH a detection, not rainfall volume or continuous duration.
export function wetMinutes(rows: Reading[]): number {
  return new Set(rows.filter(r => r.wet).map(r => `${r.deviceId}:${Math.floor(Date.parse(r.observedAt) / 60_000)}`)).size;
}
export function validateReading(body: unknown, now = Date.now()): Omit<Reading, "receivedAt" | "source"> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("ข้อมูลต้องเป็น JSON object");
  const b = body as Record<string, unknown>;
  const id = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
  if (typeof b.eventId !== "string" || !id.test(b.eventId)) throw new Error("eventId ต้องเป็นตัวอักษร ตัวเลข - หรือ _ ไม่เกิน 96 ตัว");
  if (typeof b.deviceId !== "string" || !id.test(b.deviceId)) throw new Error("deviceId ไม่ถูกต้อง");
  if (b.sensorType !== "rain" || typeof b.wet !== "boolean") throw new Error("sensorType ต้องเป็น rain และ wet ต้องเป็น boolean");
  if (typeof b.observedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(b.observedAt)) throw new Error("observedAt ต้องเป็น ISO 8601 พร้อม timezone");
  const parts = b.observedAt.slice(0, 10).split('-').map(Number);
  const calendar = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (calendar.getUTCFullYear() !== parts[0] || calendar.getUTCMonth() !== parts[1] - 1 || calendar.getUTCDate() !== parts[2]) throw new Error("วันที่ตรวจวัดไม่มีอยู่จริง");
  const clock = b.observedAt.slice(11, 19).split(':').map(Number);
  if (clock[0] > 23 || clock[1] > 59 || clock[2] > 59) throw new Error("เวลาตรวจวัดไม่ถูกต้อง");
  const t = Date.parse(b.observedAt);
  if (!Number.isFinite(t) || t > now + 120_000 || t < Date.parse("2020-01-01T00:00:00Z")) throw new Error("เวลาตรวจวัดไม่ถูกต้องหรืออยู่ในอนาคต");
  return { eventId: b.eventId, deviceId: b.deviceId, sensorType: "rain", wet: b.wet, observedAt: new Date(t).toISOString() };
}
