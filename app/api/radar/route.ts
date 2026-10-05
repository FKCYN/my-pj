import { parseRadarManifest } from "@/lib/radar";

export async function GET() {
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", { next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("RADAR_PROVIDER_ERROR");
    const data = parseRadarManifest(await response.json());
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "ข้อมูลเรดาร์ยังไม่พร้อม กรุณาลองอีกครั้ง" }, { status: 502 });
  }
}
