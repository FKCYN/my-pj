"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CloudRain, MapPin, Pause, Play, RefreshCw } from "lucide-react";
import type { Map as LeafletMap, TileLayer, CircleMarker } from "leaflet";
import type { RadarManifest } from "@/lib/radar";
import { thaiDate, thaiTime } from "@/lib/rain";
import "leaflet/dist/leaflet.css";

export default function RadarMap({ place }: { place: { name: string; lat: number; lon: number } }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const visibleLayer = useRef<TileLayer | null>(null);
  const marker = useRef<CircleMarker | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<RadarManifest | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [tileError, setTileError] = useState("");
  const [loading, setLoading] = useState(true);
  const [frameLoading, setFrameLoading] = useState(false);
  const [displayedTime, setDisplayedTime] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const initialPlace = useRef(place);

  useEffect(() => {
    let cancelled = false;
    let instance: LeafletMap | null = null;
    let resize: ResizeObserver | null = null;
    void import("leaflet").then(L => {
      if (cancelled || !container.current) return;
      instance = L.map(container.current, { minZoom: 3, maxZoom: 7, scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([initialPlace.current.lat, initialPlace.current.lon], 7);
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 7, keepBuffer: 0, updateWhenIdle: true }).on("tileerror", () => setTileError("แผนที่บางส่วนโหลดไม่ได้ ลองเปิดเรดาร์ทางการด้านล่าง")).addTo(instance);
      L.tileLayer("https://tilecache.rainviewer.com/v2/coverage/0/512/{z}/{x}/{y}/0/0_0.png", { tileSize: 512, zoomOffset: -1, maxNativeZoom: 7, opacity: .22, keepBuffer: 0, updateWhenIdle: true, zIndex: 3 }).addTo(instance);
      resize = new ResizeObserver(() => instance?.invalidateSize());
      resize.observe(container.current);
      setReady(true);
    }).catch(() => setError("เปิดแผนที่ไม่ได้ กรุณาโหลดหน้าเว็บอีกครั้ง"));
    return () => { cancelled = true; resize?.disconnect(); instance?.remove(); map.current = null; visibleLayer.current = null; marker.current = null; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/radar", { signal: controller.signal });
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        if (!controller.signal.aborted) { setData(value); setIndex(value.frames.length - 1); setPlaying(false); setError(""); setCheckedAt(Date.now()); }
      } catch (e) { if (!controller.signal.aborted) { setError((e as Error).message); setPlaying(false); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 300_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [version]);

  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    let cancelled = false;
    instance.setView([place.lat, place.lon], 7, { animate: false });
    void import("leaflet").then(L => {
      if (cancelled || map.current !== instance) return;
      if (marker.current) instance.removeLayer(marker.current);
      marker.current = L.circleMarker([place.lat, place.lon], { radius: 7, fillColor: "#d6a16a", fillOpacity: 1, color: "#fff", weight: 3 }).bindTooltip(place.name).addTo(instance);
    });
    return () => { cancelled = true; };
  }, [ready, place.lat, place.lon, place.name]);

  useEffect(() => {
    if (!ready || !map.current || !data) return;
    const instance = map.current;
    const frame = data.frames[index];
    if (!frame) return;
    let cancelled = false;
    let next: TileLayer | null = null;
    let failed = false;
    setFrameLoading(true);
    void import("leaflet").then(L => {
      if (cancelled || map.current !== instance) return;
      next = L.tileLayer(`${data.host}${frame.path}/512/{z}/{x}/{y}/2/1_0.png`, { tileSize: 512, zoomOffset: -1, maxNativeZoom: 7, opacity: .7, zIndex: 5, keepBuffer: 0, updateWhenIdle: true });
      next.on("tileerror", () => { failed = true; if (!cancelled) { setTileError("ภาพฝนบางส่วนโหลดไม่ได้ ยังยืนยันสภาพฝนจากภาพนี้ไม่ได้"); setPlaying(false); } });
      next.on("load", () => {
        if (cancelled || !next) return;
        setFrameLoading(false);
        if (!failed) {
          if (visibleLayer.current && visibleLayer.current !== next) instance.removeLayer(visibleLayer.current);
          visibleLayer.current = next;
          setDisplayedTime(frame.time);
          setTileError("");
        } else if (visibleLayer.current !== next) instance.removeLayer(next);
      });
      next.addTo(instance);
    });
    return () => { cancelled = true; if (next && visibleLayer.current !== next) instance.removeLayer(next); };
  }, [ready, data, index, place.lat, place.lon, version]);

  useEffect(() => {
    if (!playing || !data || frameLoading) return;
    // Slow playback keeps on-demand tiles within the provider's public API limit.
    const timer = setTimeout(() => {
      if (document.hidden) setPlaying(false);
      else setIndex(i => (i + 1) % data.frames.length);
    }, 6_000);
    return () => clearTimeout(timer);
  }, [playing, data, index, frameLoading]);

  const time = displayedTime ? new Date(displayedTime * 1000).toISOString() : null;
  const delayed = !!(data && checkedAt && checkedAt - data.frames.at(-1)!.time * 1000 > 30 * 60_000);
  return <section className="card radar-card">
    <div className="card-heading"><div><h2>เรดาร์ฝน</h2></div><button className="icon-button" aria-label="รีเฟรชเรดาร์" disabled={loading} onClick={() => setVersion(v => v + 1)}><RefreshCw size={17} className={loading ? "spinning" : ""} /></button></div>
    <p className="radar-description"><MapPin size={14} />{place.name}<span>ย้อนหลัง 2 ชม.</span></p>
    <div className="radar-map-wrap"><div ref={container} className="radar-map" role="region" aria-label={`แผนที่เรดาร์ฝนบริเวณ${place.name}`} />{(!ready || !data) && <div className="radar-placeholder"><CloudRain size={34} /><p>{error || "กำลังเปิดแผนที่ฝน…"}</p></div>}<span className="radar-time">เวลาเฟรม {time ? `${thaiDate(time, true)} · ${thaiTime(time)}` : "—"} น. {frameLoading && <small>กำลังโหลด…</small>}</span></div>
    {(error || tileError || delayed) && <p className="radar-error" role="status">{error || tileError || "ข้อมูลเรดาร์ล่าสุดล่าช้ากว่า 30 นาที กรุณาตรวจเวลาเฟรมก่อนใช้งาน"}</p>}
    {data && <div className="radar-controls"><button className="radar-play" aria-label={playing ? "หยุดเรดาร์ย้อนหลัง" : "เล่นเรดาร์ย้อนหลัง"} onClick={() => setPlaying(v => !v)} disabled={!!error}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><div className="radar-timeline"><input aria-label="เลือกเวลาเรดาร์ย้อนหลัง" type="range" min={0} max={data.frames.length - 1} value={index} onChange={e => { setPlaying(false); setIndex(Number(e.target.value)); }} /><div><span>{thaiTime(new Date(data.frames[0].time * 1000).toISOString())}</span><span>{thaiTime(new Date(data.frames.at(-1)!.time * 1000).toISOString())} · ล่าสุด</span></div></div><button className="text-link" onClick={() => { setPlaying(false); setIndex(data.frames.length - 1); }}>ล่าสุด</button></div>}
    <div className="radar-legend"><span>กลุ่มฝน</span><i /><span>เบา → เข้ม</span><small>พื้นที่สีเทาอาจไม่มีข้อมูลเรดาร์</small></div>
    <div className="radar-bottom"><p>Weather data by <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a></p><a className="text-link" href="https://weather.bangkok.go.th/radar/" target="_blank" rel="noreferrer">เรดาร์ กทม. <ArrowUpRight size={15} /></a></div>
  </section>;
}
