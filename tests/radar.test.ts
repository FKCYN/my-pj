import test from "node:test";
import assert from "node:assert/strict";
import { parseRadarManifest } from "../lib/radar";
const value = { host: "https://tilecache.rainviewer.com", generated: 1791214824, radar: { past: [{ time: 1791214800, path: "/v2/radar/3fa6fe14b782" }, { time: 1791214200, path: "/v2/radar/af56d57342fc" }] } };
test("radar manifest orders past frames, removes duplicates and accepts current hashed paths", () => {
  const data = parseRadarManifest({ ...value, radar: { past: [...value.radar.past, value.radar.past[0]] } });
  assert.equal(data.frames.length, 2);
  assert.equal(data.frames[0].time, 1791214200);
  assert.equal(data.frames.at(-1)?.path, "/v2/radar/3fa6fe14b782");
});
test("radar rejects unrelated hosts, path injection, empty and malformed frames", () => {
  for (const invalid of [null, { ...value, host: "https://example.com" }, { ...value, generated: "now" }, { ...value, radar: { past: [] } }, { ...value, radar: { past: [{ time: 1, path: "/v2/radar/../../private" }] } }, { ...value, radar: { past: [{ time: "bad", path: "/v2/radar/valid" }] } }]) assert.throws(() => parseRadarManifest(invalid));
});
