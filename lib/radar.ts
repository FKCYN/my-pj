export type RadarFrame = { time: number; path: string };
export type RadarManifest = { host: string; generated: number; frames: RadarFrame[] };

// Only the documented provider host/paths reach the client; no arbitrary tile URLs.
export function parseRadarManifest(value: unknown): RadarManifest {
  if (!value || typeof value !== "object") throw new Error("INVALID_RADAR_DATA");
  const data = value as { host?: unknown; generated?: unknown; radar?: { past?: unknown } };
  if (data.host !== "https://tilecache.rainviewer.com" || !Number.isSafeInteger(data.generated) || Number(data.generated) <= 0 || !Array.isArray(data.radar?.past)) throw new Error("INVALID_RADAR_DATA");
  const unique = new Map<number, RadarFrame>();
  for (const item of data.radar.past) {
    if (!item || !Number.isSafeInteger(item.time) || item.time <= 0 || typeof item.path !== "string" || !/^\/v2\/radar\/[A-Za-z0-9_-]{1,80}$/.test(item.path)) throw new Error("INVALID_RADAR_DATA");
    unique.set(item.time, { time: item.time, path: item.path });
  }
  const frames = [...unique.values()].sort((a, b) => a.time - b.time).slice(-13);
  if (!frames.length) throw new Error("NO_RADAR_FRAMES");
  return { host: data.host, generated: Number(data.generated), frames };
}
