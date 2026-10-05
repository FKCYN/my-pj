"use client";
import { useEffect, useState } from "react";
import { thaiTime } from "@/lib/rain";

export default function ThaiClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setTime(new Date().toISOString());
    update();
    const timer = setInterval(update, 1_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return <span className="thai-clock"><time dateTime={time ?? undefined}>{time ? thaiTime(time) : "—:—"}</time><small>เวลาไทย</small></span>;
}
