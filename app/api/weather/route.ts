import { json } from "@/lib/server";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const lat = Number(p.get("lat") ?? "13.75"), lon = Number(p.get("lon") ?? "100.5");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return json({ error: "พิกัดไม่ถูกต้อง" }, 400);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({ latitude: lat.toFixed(3), longitude: lon.toFixed(3), current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m", hourly: "temperature_2m,precipitation_probability,precipitation,weather_code", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max", forecast_days: "7", timezone: "Asia/Bangkok" }).toString();
  try {
    const response = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("PROVIDER_ERROR");
    const data = await response.json();
    if (!data.current || !data.hourly || !data.daily) throw new Error("INVALID_PROVIDER_DATA");
    return json({ ...data, provider: "Open-Meteo", attribution: "https://open-meteo.com/", fetchedAt: new Date().toISOString(), location: { lat, lon } });
  } catch { return json({ error: "ผู้ให้บริการอากาศไม่ตอบกลับ กรุณาลองอีกครั้ง" }, 502); }
}
