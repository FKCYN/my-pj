import test from "node:test";
import assert from "node:assert/strict";
import { dateRange, latestState, Reading, sessions, thaiDay, validateReading, wetMinutes, rainTotals, thaiTime, thaiDate } from "../lib/rain";
const now = Date.parse("2026-10-05T10:00:00Z");
const row = (time: string, wet = true, deviceId = "room-01"): Reading => ({ eventId: `${deviceId}-${time.replace(/\W/g, "")}`, deviceId, sensorType: "rain", source: "real", wet, observedAt: time, receivedAt: time });
test("silence never confirms dry or online", () => {
  assert.equal(latestState([], now), "empty");
  assert.equal(latestState([row("2026-10-05T09:50:00Z")], now), "unknown");
  assert.equal(latestState([row("2026-10-05T09:59:00Z", false)], now), "last-dry");
  assert.equal(latestState([row("2026-10-05T09:59:00Z")], now), "wet");
});
test("wet-only events produce an explicitly estimated endpoint", () => {
  const list = sessions([row("2026-10-05T09:00:00Z"), row("2026-10-05T09:01:00Z")], now);
  assert.equal(list.length, 1); assert.equal(list[0].endKind, "estimated");
  assert.equal(list[0].end, "2026-10-05T09:02:00.000Z");
});
test("dry event closes a session; a delayed dry cannot confirm the earlier gap", () => {
  assert.equal(sessions([row("2026-10-05T09:00:00Z"), row("2026-10-05T09:01:00Z", false)], now)[0].endKind, "dry");
  assert.equal(sessions([row("2026-10-05T09:00:00Z"), row("2026-10-05T09:30:00Z", false)], now)[0].endKind, "estimated");
});
test("out-of-order reports, gaps and multiple devices stay separate", () => {
  const rows = [row("2026-10-05T09:20:00Z"), row("2026-10-05T09:01:00Z"), row("2026-10-05T09:00:00Z"), row("2026-10-05T09:00:00Z", true, "test-01")];
  const list = sessions(rows, now); assert.equal(list.length, 3);
  assert.equal(list.find(s => s.start === "2026-10-05T09:00:00Z" && s.deviceId === "room-01")?.samples, 2);
});
test("midnight is interpreted in Bangkok, and no false duration from duplicate minute", () => {
  assert.equal(thaiDay("2026-10-05T17:01:00Z"), "2026-10-06");
  assert.equal(wetMinutes([row("2026-10-05T09:00:00Z"), row("2026-10-05T09:00:20Z"), row("2026-10-05T09:01:00Z", false)]), 1);
  assert.deepEqual(dateRange("2026-10-05", "2026-10-05"), { from: "2026-10-05T00:00:00+07:00", to: "2026-10-06T00:00:00+07:00" });
});
test("accepts zoned timestamps and rejects invalid booleans, future and missing timezone", () => {
  const valid = { eventId: "one", deviceId: "test-01", sensorType: "rain", wet: true, observedAt: "2026-10-05T16:00:00+07:00" };
  assert.equal(validateReading(valid, now).observedAt, "2026-10-05T09:00:00.000Z");
  for (const bad of [{ ...valid, wet: "true" }, { ...valid, observedAt: "2026-10-05T16:00:00" }, { ...valid, observedAt: "2026-10-06T16:00:00+07:00" }, { ...valid, deviceId: "../bad" }, { ...valid, sensorType: "temperature" }]) assert.throws(() => validateReading(bad, now));
});

test("rejects nonexistent calendar dates", () => {
  assert.throws(() => validateReading({ eventId: "bad-date", deviceId: "test-01", sensorType: "rain", wet: true, observedAt: "2026-02-31T10:00:00Z" }, now));
});

test("rejects normalized 24:00 timestamps", () => {
  assert.throws(() => validateReading({ eventId: "bad-clock", deviceId: "test-01", sensorType: "rain", wet: true, observedAt: "2026-10-04T24:00:00Z" }, now));
});

test("daily/hourly totals deduplicate each device minute and ignore dry reports", () => {
  const readings = [row("2026-10-05T09:00:00Z"), row("2026-10-05T09:00:20Z"), row("2026-10-05T09:00:00Z", true, "test-01"), row("2026-10-05T09:01:00Z", false), row("2026-10-05T10:00:00Z")];
  const totals = rainTotals(readings);
  assert.equal(totals.wetMinutes, 3);
  assert.equal(totals.wetDays, 1);
  assert.equal(totals.byDay.get("2026-10-05"), 3);
  const hours = totals.byHour.get("2026-10-05")!;
  assert.equal(hours.length, 24);
  assert.equal(hours[16], 2);
  assert.equal(hours[17], 1);
  assert.equal(hours.reduce((sum, count) => sum + count, 0), 3);
});

test("totals keep Bangkok midnight and hour boundaries even for out-of-order zoned reports", () => {
  const totals = rainTotals([row("2026-10-06T01:00:00+07:00"), row("2026-10-05T16:59:59Z"), row("2026-10-05T17:00:00Z"), row("2026-10-06T00:00:30+07:00")]);
  assert.equal(totals.wetMinutes, 3);
  assert.equal(totals.wetDays, 2);
  assert.equal(totals.byDay.get("2026-10-05"), 1);
  assert.equal(totals.byDay.get("2026-10-06"), 2);
  assert.equal(totals.byHour.get("2026-10-05")?.[23], 1);
  assert.equal(totals.byHour.get("2026-10-06")?.[0], 1);
  assert.equal(totals.byHour.get("2026-10-06")?.[1], 1);
  assert.equal(thaiTime("2026-10-05T17:00:00Z"), "00:00");
  assert.equal(thaiDate("2026-10-06", true), thaiDate("2026-10-05T17:00:00Z", true));
});

test("empty and dry-only reports never add wet days or chart minutes", () => {
  for (const readings of [[], [row("2026-10-05T09:00:00Z", false)]]) {
    const totals = rainTotals(readings);
    assert.equal(totals.wetMinutes, 0);
    assert.equal(totals.wetDays, 0);
    assert.equal(totals.byDay.size, 0);
    assert.equal(totals.byHour.size, 0);
  }
});
