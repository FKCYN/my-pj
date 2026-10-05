import { Reading, shiftDay, thaiDay } from "./rain";
export function demoReadings(now = Date.now()): Reading[] {
  const rows: Reading[] = [];
  const today = thaiDay(new Date(now));
  for (let i = 29; i >= 0; i--) {
    if ([1, 4, 7, 10, 13, 16, 20, 24, 27].includes(i)) continue;
    const day = shiftDay(today, -i);
    const bouts = i % 3 === 0 ? 2 : 1;
    for (let j = 0; j < bouts; j++) {
      const start = Date.parse(`${day}T${j ? "18" : "09"}:12:00+07:00`);
      const count = 12 + ((i * 7 + j * 13) % 45);
      for (let m = 0; m <= count; m++) {
        const t = start + m * 60_000;
        if (t > now) continue;
        const time = new Date(t).toISOString();
        rows.push({ eventId: `demo-${i}-${j}-${m}`, deviceId: "demo-01", sensorType: "rain", wet: m < count, observedAt: time, receivedAt: time, source: "test" });
      }
    }
  }
  return rows;
}
