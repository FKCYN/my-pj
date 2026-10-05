"use client";
import { CSSProperties, useId } from "react";
import type { RainStatus } from "@/lib/rain";

export default function RainScene({ state }: { state: RainStatus["kind"] }) {
  const id = useId().replace(/:/g, "");
  const rainy = state === "fresh" || state === "recent";
  return <div className={`rain-scene scene-${state}`} aria-hidden="true">
    <div className="scene-halo" />
    {state === "dry" && <div className="scene-sun" />}
    <div className="scene-cloud cloud-far"><i /><i /><i /></div>
    <div className="scene-cloud cloud-main"><i /><i /><i /><b /></div>
    {rainy && <>
      <div className="scene-rain">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ "--x": `${8 + (i * 17 % 85)}%`, "--y": `${i * 13 % 80}%`, "--delay": `${-(i * .31)}s`, "--duration": `${.9 + (i % 5) * .15}s` } as CSSProperties} />)}</div>
      <div className="scene-puddle"><i /><i /><i /></div>
      <svg className="scene-umbrella" viewBox="0 0 240 240">
        <defs>
          <linearGradient id={`${id}-canopy`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9cba0" /><stop offset=".5" stopColor="#d2aa76" /><stop offset="1" stopColor="#b58b5f" /></linearGradient>
          <linearGradient id={`${id}-shaft`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7d968c" /><stop offset="1" stopColor="#405d52" /></linearGradient>
        </defs>
        <path d="M120 31v135c0 29 39 28 39 5" fill="none" stroke={`url(#${id}-shaft)`} strokeWidth="7" strokeLinecap="round" />
        <path d="M22 109C29 49 75 33 120 33s92 18 99 76c-12-14-28-14-41 0-19-16-38-15-58 0-20-15-39-16-58 0-14-14-27-14-40 0Z" fill={`url(#${id}-canopy)`} />
        <path d="M120 33C88 46 74 76 62 109M120 33c32 13 46 43 58 76" fill="none" stroke="#f8dfbb" strokeWidth="2" opacity=".7" />
        <path d="M120 33v76" stroke="#b58b5f" strokeWidth="2" opacity=".65" />
        <path d="M27 100c9-37 36-59 73-64" fill="none" stroke="#fff0d4" strokeWidth="4" strokeLinecap="round" opacity=".7" />
      </svg>
    </>}
    <div className="scene-ground" />
    {!rainy && <div className="scene-leaf"><i /><i /></div>}
  </div>;
}
