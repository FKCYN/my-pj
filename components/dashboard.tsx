"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Cloud, CloudDrizzle, CloudRain, Code2, Droplets, History, House, Leaf, MapPin, RefreshCw, Radio, Settings2, Sun, Wind, LogIn, Info, Copy, X } from "lucide-react";
import { demoReadings } from "@/lib/demo";
import { Reading, sessions, thaiDay, thaiDate, thaiTime, shiftDay, latestState, rainTotals, dateRange } from "@/lib/rain";
import { authHeaders, browserSupabase } from "@/lib/browser";
type View = "overview" | "history" | "weather" | "devices";
type Mode = "demo" | "real" | "test";
type Config = { storage: "local" | "supabase" | "unconfigured"; requiresLogin: boolean; loginConfigured: boolean };
type Weather = {
  current: { time: string; temperature_2m: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: number[]; precipitation: number[]; weather_code: number[] };
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; weather_code: number[] };
  provider: string; fetchedAt: string;
};
const nav: { key: View; label: string; english: string; icon: typeof House }[] = [
  { key: "overview", label: "ภาพรวม", english: "Overview", icon: House },
  { key: "history", label: "ประวัติฝน", english: "Rain journal", icon: CalendarDays },
  { key: "weather", label: "สภาพอากาศ", english: "Weather", icon: Cloud },
  { key: "devices", label: "อุปกรณ์", english: "Devices & API", icon: Radio },
];
const places = [{ name: "กรุงเทพมหานคร", lat: 13.75, lon: 100.5 }, { name: "เชียงใหม่", lat: 18.79, lon: 98.98 }, { name: "ภูเก็ต", lat: 7.88, lon: 98.39 }];
const condition = (code: number) => code === 0 ? "ท้องฟ้าแจ่มใส" : code <= 3 ? "มีเมฆบางส่วน" : code <= 48 ? "มีหมอก" : code <= 67 ? "มีฝน" : code <= 77 ? "มีหิมะ" : code <= 82 ? "ฝนเป็นช่วง ๆ" : code <= 86 ? "มีหิมะโปรย" : "ฝนฟ้าคะนอง";
const RainIcon = ({ code, size = 24 }: { code: number; size?: number }) => code >= 51 ? <CloudRain size={size} /> : code === 0 ? <Sun size={size} /> : <Cloud size={size} />;
export default function Dashboard() {
  const [view, setView] = useState<View>("overview");
  const [mode, setMode] = useState<Mode>("demo");
  const [now, setNow] = useState(() => Date.now());
  const today = thaiDay(new Date(now));
  const [end, setEnd] = useState(() => thaiDay(new Date()));
  const [windowDays, setWindowDays] = useState(30);
  const from = shiftDay(end, -(windowDays - 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [rows, setRows] = useState<Reading[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [customPlace, setCustomPlace] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationError, setLocationError] = useState("");
  const [copied, setCopied] = useState(false);
  const [readVersion, setReadVersion] = useState(0);
  const [weatherVersion, setWeatherVersion] = useState(0);
  const place = customPlace ?? places[placeIndex];
  const load = useCallback(async (signal?: AbortSignal) => {
    if (mode === "demo") { setRows(demoReadings()); setError(""); setFetched(new Date().toISOString()); return; }
    setLoading(true); setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/readings?from=${from}&to=${end}&source=${mode}`, { headers, cache: "no-store", signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!signal?.aborted) { setRows(data.readings); setFetched(data.fetchedAt); if (data.truncated) setError("ข้อมูลเกิน 50,000 รายการ กรุณาลดช่วงวันที่เพื่อดูข้อมูลครบ"); }
    } catch (e) { if (!signal?.aborted) { setRows([]); setError((e as Error).message); setFetched(null); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [mode, from, end]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/config", { signal: controller.signal }).then(r => r.json()).then(setConfig).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setRows([]); setFetched(null); void load(controller.signal);
    const timer = setInterval(() => { setNow(Date.now()); void load(controller.signal); }, 15_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [load, readVersion]);
  const loadWeather = useCallback(async (signal?: AbortSignal) => {
    setWeatherLoading(true); setWeatherError(""); setWeather(null);
    try {
      const res = await fetch(`/api/weather?lat=${place.lat}&lon=${place.lon}`, { signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!signal?.aborted) setWeather(data);
    } catch (e) { if (!signal?.aborted) setWeatherError((e as Error).message); }
    finally { if (!signal?.aborted) setWeatherLoading(false); }
  }, [place.lat, place.lon]);
  useEffect(() => {
    const controller = new AbortController(); void loadWeather(controller.signal);
    const timer = setInterval(() => void loadWeather(controller.signal), 900_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [loadWeather, weatherVersion]);
  const filtered = useMemo(() => {
    const range = dateRange(from, end);
    const start = Date.parse(range.from), finish = Date.parse(range.to);
    return rows.filter(r => { const time = Date.parse(r.observedAt); return time >= start && time < finish; });
  }, [rows, from, end]);
  const totals = useMemo(() => rainTotals(filtered), [filtered]);
  const periodSessions = useMemo(() => sessions(filtered, now), [filtered, now]);
  const displaySessions = useMemo(() => selectedDay ? periodSessions.filter(s => thaiDay(s.start) <= selectedDay && thaiDay(s.lastWet) >= selectedDay) : periodSessions, [periodSessions, selectedDay]);
  const currentRows = useMemo(() => rows.filter(r => thaiDay(r.observedAt) === today), [rows, today]);
  const state = useMemo(() => latestState(currentRows, now), [currentRows, now]);
  const labels = { wet: "ตรวจพบน้ำล่าสุด", "last-dry": "ล่าสุดเซ็นเซอร์แห้ง", unknown: "ยังไม่ทราบสถานะปัจจุบัน", empty: "รอข้อมูลจากเซ็นเซอร์" };
  const last = useMemo(() => [...filtered].sort((a, b) => a.observedAt.localeCompare(b.observedAt)).at(-1), [filtered]);
  const wetDays = totals.wetDays;
  const days = useMemo(() => Array.from({ length: windowDays }, (_, i) => shiftDay(from, i)), [windowDays, from]);
  const currentHourlyIndex = weather ? Math.max(0, weather.hourly.time.findIndex(t => Date.parse(`${t}:00+07:00`) >= now)) : 0;
  const sampleBody = JSON.stringify({ eventId: "postman-unique-id", deviceId: "test-01", sensorType: "rain", wet: true, observedAt: new Date(now).toISOString() }, null, 2);
  const chooseView = (key: View) => { setView(key); setSelectedDay(null); };
  return <div className="app-shell">
    <aside className="sidebar">
      <a href="/" className="brand" aria-label="fkcyn หน้าหลัก">fkcyn<span className="brand-dot" /></a>
      <p className="brand-caption">a little closer to home.</p>
      <div className="workspace-label">YOUR SPACE <span>01</span></div>
      <nav aria-label="เมนูหลัก">{nav.map(n => <button key={n.key} onClick={() => chooseView(n.key)} className={`nav-item ${view === n.key ? "active" : ""}`} aria-current={view === n.key ? "page" : undefined}><n.icon size={20} strokeWidth={1.6} /><span>{n.label}<small>{n.english}</small></span>{view === n.key && <span className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-note"><div className="leaf-medallion"><Leaf size={27} strokeWidth={1.2} /></div><h3>Small things.<br />A clearer picture.</h3><p>ค่อย ๆ รู้จักพื้นที่ของเรา<br />ผ่านข้อมูลในแต่ละวัน</p><span className="tiny-label">MADE FOR YOUR EVERYDAY</span></div>
      <div className="sidebar-bottom"><span className="profile-mark">fk</span><div><b>พื้นที่ส่วนตัว</b><small>Bangkok time · UTC+7</small></div><Settings2 size={17} /></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb">my space <span>/</span> {nav.find(n => n.key === view)?.english.toLowerCase()}</div><div className="top-actions"><span className="today"><CalendarDays size={15} />{thaiDate(today, true)}</span><Link href="/login" className="icon-button" aria-label="เข้าสู่ระบบ"><LogIn size={18} /></Link></div></header>
      <section className="page-heading"><div><p className="eyebrow">{view === "overview" ? "A MOMENT AT HOME" : view === "history" ? "EVERY DROP HAS A STORY" : view === "weather" ? "A LOOK AT THE SKY" : "CONNECTED TO YOUR SPACE"}</p><h1>{view === "overview" ? "วันนี้ ที่บ้านเรา" : view === "history" ? "บันทึกวันฝนพรำ" : view === "weather" ? "ท้องฟ้าในแต่ละวัน" : "อุปกรณ์ของเรา"}<span className="heading-dot">.</span></h1><p className="heading-description">{view === "overview" ? "ฝน ท้องฟ้า และเรื่องเล็ก ๆ รอบตัว — อยู่ที่นี่แล้ว" : view === "history" ? "ย้อนดูว่าเซ็นเซอร์ตรวจพบน้ำเมื่อไหร่ ในแต่ละวัน" : view === "weather" ? "ข้อมูลพยากรณ์ในพื้นที่ที่เลือก จาก Open-Meteo" : "เตรียมรับข้อมูลจริง หรือเริ่มต้นด้วย Postman"}</p></div><button className="location-chip" onClick={() => setLocationOpen(true)}><MapPin size={16} />{place.name}<ChevronRight size={14} /></button></section>
      {view !== "weather" && <div className="data-toolbar"><div className="segmented" aria-label="แหล่งข้อมูล">{([{ key: "demo", label: "ตัวอย่าง" }, { key: "real", label: "เซ็นเซอร์จริง" }, { key: "test", label: "Postman" }] as const).map(m => <button aria-pressed={mode === m.key} key={m.key} className={mode === m.key ? "selected" : ""} onClick={() => { setMode(m.key); setSelectedDay(null); }}>{m.label}</button>)}</div><span className={`mode-note ${mode === "demo" ? "" : "live"}`}><span className="status-dot" />{mode === "demo" ? "ข้อมูลจำลองสำหรับดูรูปแบบเว็บ" : config?.storage === "local" ? "ข้อมูลบนเครื่อง · ยังไม่เชื่อม Supabase" : config?.storage === "supabase" ? "ข้อมูลจาก Supabase" : "รอตั้งค่า Supabase"}</span><button className="refresh-button" onClick={() => setReadVersion(v => v + 1)} disabled={loading} aria-label="รีเฟรชข้อมูล"><RefreshCw size={16} className={loading ? "spinning" : ""} /></button></div>}
      {error && view !== "weather" && <div className="notice error-notice"><Info size={18} /><span>{error}</span>{config?.requiresLogin && <Link href="/login">เข้าสู่ระบบ <ArrowRight size={14} /></Link>}</div>}
      {(view === "overview" || view === "history") && <>
        {view === "overview" && <div className="hero-grid"><section className={`card rain-hero ${state === "wet" ? "wet-hero" : ""}`}><div className="card-kicker"><span className="small-orb" /> AT HOME <span className="quiet-tag">{mode === "demo" ? "DEMO SENSOR" : "RAIN SENSOR"}</span></div><div className="hero-content"><span className="pill"><Droplets size={13} />{labels[state]}</span><h2>{state === "wet" ? <>มีฝนแวะมา<br />ที่ห้องเรา</> : <>เก็บทุกหยดฝน<br />ไว้ในความทรงจำ</>}</h2><p>{last ? `ตรวจวัดล่าสุด ${thaiDate(last.observedAt, true)} · ${thaiTime(last.observedAt)} น.` : "เมื่อเซ็นเซอร์ส่งข้อมูล เรื่องราวจะเริ่มที่นี่"}</p><button className="text-link" onClick={() => chooseView("history")}>เปิดบันทึกฝน <ArrowUpRight size={16} /></button></div><div className="landscape" aria-hidden="true"><div className="sun-orb" /><div className="cloud-sculpture"><i /><i /><i /></div><div className="hill hill-back" /><div className="hill hill-middle" /><div className="hill hill-front" /><div className="hill hill-near" /></div></section><section className="card weather-preview"><div className="card-kicker"><span className="small-orb amber" /> OUTSIDE <button className="icon-button" onClick={() => chooseView("weather")} aria-label="ดูสภาพอากาศ"><ArrowUpRight size={18} /></button></div><div className="weather-art" aria-hidden="true"><div className="weather-sun" /><div className="weather-cloud"><i /><i /><i /></div></div>{weather ? <><div className="weather-temp">{Math.round(weather.current.temperature_2m)}<span>°</span></div><p className="weather-condition">{condition(weather.current.weather_code)}</p><div className="weather-preview-bottom"><span><MapPin size={13} />{place.name}</span><span>พยากรณ์ · Open-Meteo</span></div></> : <div className="weather-placeholder"><p>{weatherLoading ? "กำลังมองท้องฟ้า…" : "ข้อมูลอากาศยังไม่พร้อม"}</p><button className="text-link" onClick={() => setWeatherVersion(v => v + 1)}>ลองอีกครั้ง <RefreshCw size={14} /></button></div>}</section></div>}
        <div className="section-title"><div><span className="eyebrow">RAIN JOURNAL</span><h2>{view === "overview" ? "เรื่องราวช่วงที่ผ่านมา" : "สำรวจช่วงเวลา"}</h2></div><div className="range-controls"><div className="segmented compact">{[7, 30].map(n => <button key={n} className={windowDays === n ? "selected" : ""} onClick={() => { setWindowDays(n); setSelectedDay(null); }}>{n} วัน</button>)}</div><label className="date-input"><CalendarDays size={14} /><input aria-label="วันสุดท้ายของช่วง" type="date" value={end} max={today} min="2020-01-01" onChange={e => { if (e.target.value) { setEnd(e.target.value); setSelectedDay(null); } }} /></label></div></div>
        <div className="stats-grid"><section className="card stat-card"><span className="stat-icon sage"><CloudDrizzle size={22} /></span><div><p>วันที่ตรวจพบฝน</p><strong>{wetDays}<small> / {windowDays} วัน</small></strong></div><span className="stat-foot">เฉพาะวันที่มีข้อมูลเปียก</span></section><section className="card stat-card"><span className="stat-icon peach"><History size={22} /></span><div><p>ช่วงที่ตรวจพบ</p><strong>{periodSessions.length}<small> ช่วง</small></strong></div><span className="stat-foot">เว้นห่างเกิน 3 นาที แยกเป็นช่วงใหม่</span></section><section className="card stat-card"><span className="stat-icon cream"><Droplets size={22} /></span><div><p>นาทีที่ตรวจพบ</p><strong>{totals.wetMinutes}<small> นาที</small></strong></div><span className="stat-foot">นับนาทีที่มีรายงาน ไม่ใช่ระยะเวลาฝนทั้งหมด</span></section></div>
        <div className="journal-grid"><section className="card calendar-card"><div className="card-heading"><div><p className="eyebrow">LITTLE MOMENTS</p><h3>ปฏิทินฝน</h3></div><div className="calendar-pager"><button aria-label="ช่วงก่อนหน้า" onClick={() => { setEnd(shiftDay(end, -windowDays)); setSelectedDay(null); }}><ChevronLeft size={17} /></button><button aria-label="ช่วงถัดไป" disabled={end >= today} onClick={() => { setEnd(shiftDay(end, windowDays) > today ? today : shiftDay(end, windowDays)); setSelectedDay(null); }}><ChevronRight size={17} /></button></div></div><p className="period-label">{thaiDate(from, true)} — {thaiDate(end, true)}</p><div className="calendar-weekdays">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(d => <span key={d}>{d}</span>)}</div><div className="calendar-grid">{Array.from({ length: (new Date(`${from}T12:00:00+07:00`).getUTCDay() + 6) % 7 }, (_, i) => <span key={`blank-${i}`} />)}{days.map(day => { const count = (totals.byDay.get(day) ?? 0); return <button key={day} onClick={() => setSelectedDay(selectedDay === day ? null : day)} aria-label={`${thaiDate(day)} ${count ? `ตรวจพบน้ำ ${count} นาที` : "ไม่มีรายงานเปียก"}`} aria-pressed={selectedDay === day} className={`calendar-day ${count ? "rainy" : ""} ${selectedDay === day ? "picked" : ""} ${day === today ? "is-today" : ""}`}><span>{Number(day.slice(8))}</span>{count ? <span className="rain-dot" /> : <span className="no-dot" />}</button>; })}</div><div className="calendar-legend"><span><i />มีรายงานเปียก</span><span><i />ไม่มีรายงานเปียก</span></div><p className="micro-note">ไม่มีรายงาน ≠ ยืนยันว่าไม่มีฝน</p></section><section className="card activity-card"><div className="card-heading"><div><p className="eyebrow">A DAY IN DROPS</p><h3>{thaiDate(selectedDay ?? end, true)}</h3></div><span className="quiet-tag">UTC+7</span></div><div className="activity-total"><strong>{(totals.byDay.get(selectedDay ?? end) ?? 0)}</strong><span>นาทีที่ตรวจพบน้ำ<br /><small>จากรายงานของเซ็นเซอร์</small></span></div><div className="hour-chart" aria-label="กราฟจำนวนรายงานเปียกแยกตามชั่วโมง">{Array.from({ length: 24 }, (_, hour) => { const count = totals.byHour.get(selectedDay ?? end)?.[hour] ?? 0; return <div className="hour-column" key={hour} title={`${String(hour).padStart(2, "0")}:00 — ${count} นาทีที่ตรวจพบ`}><div className={`hour-bar ${count ? "has-rain" : ""}`} style={{ height: `${Math.max(4, count / 60 * 100)}%` }} /></div>; })}</div><div className="hour-labels"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div><div className="activity-bottom"><Droplets size={15} /><p>รายงานทุก 1 นาทีขณะเปียก<br /><span>จุดสิ้นสุดที่ไม่มีสัญญาณแห้งเป็นเพียงประมาณการ</span></p></div></section></div>
        <section className="card history-card"><div className="card-heading"><div><p className="eyebrow">THE RAIN ARCHIVE</p><h3>ช่วงที่ตรวจพบฝน{selectedDay ? ` · ${thaiDate(selectedDay, true)}` : ""}</h3></div>{selectedDay ? <button className="text-link" onClick={() => setSelectedDay(null)}>ดูทั้งหมด <X size={14} /></button> : <span className="quiet-tag">{displaySessions.length} EVENTS</span>}</div><p className="micro-note table-note">ช่วงที่เริ่มก่อนวันที่เลือกอาจถูกตัดตามขอบเขตข้อมูล · ตรวจพบเปียกไม่ได้ยืนยันว่าฝนยังตกตลอดช่วง</p>{displaySessions.length ? <div className="table-scroll"><table><thead><tr><th>วันที่ / อุปกรณ์</th><th>เริ่มตรวจพบ</th><th>สิ้นสุดช่วง</th><th>รายงานเปียก</th><th>สถานะจุดสิ้นสุด</th></tr></thead><tbody>{displaySessions.slice(0, view === "overview" ? 5 : 100).map(s => <tr key={`${s.deviceId}-${s.start}`}><td><span className="table-icon"><CloudRain size={17} /></span><span>{thaiDate(s.start, true)}<small>{s.deviceId}</small></span></td><td>{thaiTime(s.start)} น.</td><td>{s.end ? `${thaiTime(s.end)} น.${thaiDay(s.end) !== thaiDay(s.start) ? ` (${thaiDate(s.end, true)})` : ""}` : "ยังอยู่ในช่วงรับข้อมูล"}</td><td>{s.samples} ครั้ง</td><td><span className={`event-badge ${s.endKind}`}>{s.endKind === "dry" ? "เซ็นเซอร์กลับมาแห้ง" : s.endKind === "estimated" ? "ประมาณการ" : "รับข้อมูลต่อเนื่อง"}</span></td></tr>)}</tbody></table>{displaySessions.length > (view === "overview" ? 5 : 100) && <p className="micro-note table-note">แสดง {view === "overview" ? 5 : 100} จาก {displaySessions.length} ช่วง{view === "overview" && <button className="text-link" onClick={() => chooseView("history")}>ดูประวัติฝน <ArrowRight size={13} /></button>}</p>}</div> : <div className="empty-state"><CloudDrizzle size={34} strokeWidth={1.2} /><h4>{loading ? "กำลังอ่านบันทึก…" : "ยังไม่มีช่วงที่ตรวจพบฝน"}</h4><p>เลือกข้อมูลตัวอย่าง หรือส่งข้อมูลจาก Postman เพื่อเริ่มบันทึก</p></div>}</section>
      </>}
      {view === "weather" && <>
        <div className="weather-source-note"><Info size={16} /><p>ข้อมูลจากแบบจำลองอากาศของ Open-Meteo สำหรับ <b>{place.name}</b> · ไม่ใช่ผลตรวจจากเซ็นเซอร์ที่ห้อง</p><button className="refresh-button" disabled={weatherLoading} onClick={() => setWeatherVersion(v => v + 1)} aria-label="รีเฟรชสภาพอากาศ"><RefreshCw size={16} className={weatherLoading ? "spinning" : ""} /></button></div>
        {weatherError && <div className="notice error-notice"><Info size={18} /><span>{weatherError}</span><button onClick={() => setWeatherVersion(v => v + 1)}>ลองอีกครั้ง</button></div>}
        {weather ? <><div className="weather-detail-grid"><section className="card current-weather"><div className="card-kicker"><span className="small-orb amber" /> CURRENT MODEL</div><RainIcon code={weather.current.weather_code} size={68} /><h2>{Math.round(weather.current.temperature_2m)}°<small>C</small></h2><h3>{condition(weather.current.weather_code)}</h3><p><MapPin size={14} />{place.name}</p><span className="micro-note">เวลาแบบจำลอง {thaiTime(`${weather.current.time}:00+07:00`)} น.</span></section><div className="weather-measures"><section className="card measurement"><Droplets /><div><p>ความชื้นสัมพัทธ์</p><strong>{weather.current.relative_humidity_2m}<small>%</small></strong></div></section><section className="card measurement"><Wind /><div><p>ความเร็วลม</p><strong>{weather.current.wind_speed_10m}<small>km/h</small></strong></div></section><section className="card measurement"><CloudRain /><div><p>โอกาสฝนในชั่วโมงถัดไป</p><strong>{weather.hourly.precipitation_probability[currentHourlyIndex] ?? "—"}<small>%</small></strong></div></section></div></div><section className="card forecast-card"><div className="card-heading"><div><p className="eyebrow">THE NEXT LITTLE WHILE</p><h3>พยากรณ์ 24 ชั่วโมงถัดไป</h3></div><span className="quiet-tag">FORECAST</span></div><div className="hourly-forecast">{weather.hourly.time.slice(currentHourlyIndex, currentHourlyIndex + 24).map((t, i) => <div className="forecast-hour" key={t}><span>{thaiTime(`${t}:00+07:00`)}</span><RainIcon code={weather.hourly.weather_code?.[currentHourlyIndex + i] ?? 3} size={21} /><b>{Math.round(weather.hourly.temperature_2m[currentHourlyIndex + i])}°</b><span className="chance">{weather.hourly.precipitation_probability[currentHourlyIndex + i]}%</span><small>{weather.hourly.precipitation[currentHourlyIndex + i]} mm</small></div>)}</div></section><section className="card forecast-card"><div className="card-heading"><div><p className="eyebrow">A WEEK AHEAD</p><h3>ท้องฟ้า 7 วัน</h3></div></div><div className="daily-forecast">{weather.daily.time.map((d, i) => <div className="forecast-day" key={d}><span>{i === 0 ? "วันนี้" : thaiDate(d, true)}</span><RainIcon code={weather.daily.weather_code[i]} size={27} /><b>{Math.round(weather.daily.temperature_2m_max[i])}° <small>/ {Math.round(weather.daily.temperature_2m_min[i])}°</small></b><span><Droplets size={13} />{weather.daily.precipitation_probability_max[i]}%</span></div>)}</div></section><p className="provider-credit">ข้อมูลจาก <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · CC BY 4.0 · ข้อมูลแบบจำลองไม่ใช่การตรวจวัดที่ห้อง · ดึงข้อมูล {thaiTime(weather.fetchedAt)} น.</p></> : !weatherError && <div className="card empty-state"><Cloud size={40} /><h3>กำลังอ่านสภาพอากาศ…</h3></div>}
      </>}
      {view === "devices" && <><div className="device-grid">{[{ id: "room-01", label: "เซ็นเซอร์ฝนที่ห้อง", subtitle: "ESP32 · Rain detector", source: "real", icon: Radio }, { id: "test-01", label: "พื้นที่ทดลอง", subtitle: "Postman · Same API, separate data", source: "test", icon: Code2 }].map(d => <section key={d.id} className="card device-card"><span className={`device-orb ${d.source}`}><d.icon size={32} strokeWidth={1.5} /></span><span className="quiet-tag">{d.source === "real" ? "REAL DEVICE" : "TEST DEVICE"}</span><h3>{d.label}</h3><p>{d.subtitle}</p><code>{d.id}</code><div className="device-bottom"><span>ส่งทุกนาทีขณะเปียก</span><button className="text-link" onClick={() => { setMode(d.source as Mode); setView("history"); }}>ดูข้อมูล <ArrowUpRight size={15} /></button></div></section>)}</div><section className="card api-card"><div className="card-heading"><div><p className="eyebrow">READY WHEN YOU ARE</p><h3>เริ่มส่งข้อมูลด้วย Postman</h3></div><Code2 size={24} /></div><p>ใช้ endpoint เดียวกับ ESP32 เปลี่ยน eventId ทุกครั้งที่เป็นการตรวจวัดใหม่</p><div className="api-endpoint"><span>POST</span><code>/api/readings</code></div><div className="code-header"><span>JSON BODY</span><button className="text-link" onClick={async () => { try { await navigator.clipboard.writeText(sampleBody); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "คัดลอกแล้ว" : "คัดลอก"}</button></div><pre>{sampleBody}</pre><div className="api-instructions"><p><b>Headers</b><code>Content-Type: application/json</code><code>Authorization: Bearer &lt;TEST_DEVICE_TOKEN&gt;</code></p><p><b>ฐานข้อมูล</b>{config?.storage === "local" ? "ขณะนี้เก็บข้อมูลทดสอบบนเครื่องใน .data/readings.json" : config?.storage === "supabase" ? "ตั้งค่าเชื่อม Supabase แล้ว — ต้องรัน schema.sql ก่อนส่งข้อมูล" : "ตั้งค่า Supabase ใน .env.local และบน Vercel ก่อนส่งข้อมูล"}</p></div><div className="notice"><Info size={18} /><span>ไม่ส่งข้อมูลตอนแห้งได้ แต่จะยืนยันเวลาหยุดฝนไม่ได้ หากส่ง wet: false หนึ่งครั้ง ระบบจะบันทึกจุดจบจากสัญญาณแห้ง</span></div></section><section className="card coming-next"><Leaf size={25} /><div><h3>พื้นที่สำหรับสิ่งต่อไป</h3><p>เพิ่มอุณหภูมิ ความชื้น หรือเซ็นเซอร์อื่นในอนาคตได้ · API รุ่นแรกเปิดรับเฉพาะ rain</p></div></section></>}
      <footer className="footer"><span>fkcyn <i /> made for your everyday</span><span>{mode === "demo" && view !== "weather" ? "ตัวอย่างจำลอง · ไม่ใช่ข้อมูลจริง" : fetched ? `อ่านข้อมูลล่าสุด ${thaiTime(fetched)} น.` : "เวลาทั้งหมดเป็นเวลาไทย"}<span className="footer-dot">·</span>Asia/Bangkok</span></footer>
    </main>
    {locationOpen && <div className="modal-backdrop" onClick={() => setLocationOpen(false)}><section className="location-modal card" role="dialog" aria-modal="true" aria-labelledby="location-title" onClick={e => e.stopPropagation()}><div className="card-heading"><h3 id="location-title">เลือกพื้นที่พยากรณ์</h3><button className="icon-button" aria-label="ปิด" onClick={() => setLocationOpen(false)}><X size={19} /></button></div><p className="micro-note">พื้นที่พยากรณ์ไม่เปลี่ยนตำแหน่งเซ็นเซอร์ · ค่าเริ่มต้นกรุงเทพฯ เป็นตัวอย่าง</p><div className="place-options">{places.map((p, i) => <button key={p.name} onClick={() => { setPlaceIndex(i); setCustomPlace(null); setLocationOpen(false); }}><MapPin size={15} />{p.name}{!customPlace && placeIndex === i && <Check size={15} />}</button>)}</div><form onSubmit={e => { e.preventDefault(); const lat = Number(latitude), lon = Number(longitude); if (!latitude || !longitude || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { setLocationError("กรุณาระบุพิกัดที่ถูกต้อง"); return; } setCustomPlace({ name: locationName.trim() || "พื้นที่ของฉัน", lat, lon }); setLocationOpen(false); setLocationError(""); }}><label>ชื่อพื้นที่<input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="เช่น ย่านที่พัก" /></label><div className="coordinate-fields"><label>Latitude<input value={latitude} onChange={e => setLatitude(e.target.value)} type="number" step="any" min="-90" max="90" required /></label><label>Longitude<input value={longitude} onChange={e => setLongitude(e.target.value)} type="number" step="any" min="-180" max="180" required /></label></div><p className="micro-note">พิกัดนี้จะส่งให้ Open-Meteo เพื่อขอข้อมูลพยากรณ์</p>{locationError && <p className="form-error">{locationError}</p>}<button className="primary-button" type="submit">ใช้พื้นที่นี้ <ArrowRight size={15} /></button></form></section></div>}
  </div>;
}
