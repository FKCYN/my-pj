import { CSSProperties } from "react";
export function Bone({ width = "100%", height = 16 }: { width?: string; height?: number }) {
  return <span className="skeleton-bone" aria-hidden="true" style={{ width, height } as CSSProperties} />;
}
export function LoadingCard({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <section className={`card loading-card ${className}`} aria-busy="true" aria-label={label}><span className="sr-only" role="status">{label}</span><div aria-hidden="true">{children}</div></section>;
}
export function HistorySkeleton() {
  return <div className="history-loading" aria-busy="true" aria-label="กำลังโหลดประวัติฝน"><span className="sr-only" role="status">กำลังโหลดประวัติฝน</span><div aria-hidden="true">
    <div className="stats-grid">{[0,1,2].map(i=><div className="card stat-card" key={i}><Bone width="35px" height={35}/><Bone width="70%"/><Bone width="65%" height={32}/></div>)}</div>
    <div className="journal-grid"><div className="card loading-card"><Bone width="40%" height={24}/><Bone width="60%"/><div className="skeleton-calendar">{Array.from({length:35},(_,i)=><Bone key={i} height={34}/>)}</div></div><div className="card loading-card"><Bone width="45%" height={24}/><Bone width="40%" height={48}/><div className="skeleton-chart">{Array.from({length:24},(_,i)=><Bone key={i} height={24+(i%5)*19}/>)}</div><Bone/></div></div>
    <div className="card loading-card history-card"><Bone width="40%" height={24}/>{[0,1,2,3].map(i=><Bone key={i} height={38}/>)}</div>
  </div></div>;
}
export function WeatherSkeleton() {
  return <div className="weather-loading"><LoadingCard label="กำลังโหลดสภาพอากาศ"><Bone width="35%" height={24}/><Bone width="40%" height={70}/><Bone width="60%"/></LoadingCard>{[0,1].map(i=><LoadingCard key={i} label="กำลังโหลดพยากรณ์อากาศ"><Bone width="40%" height={24}/><div className="skeleton-forecast">{[0,1,2,3,4,5,6].map(n=><Bone key={n} height={120}/>)}</div></LoadingCard>)}</div>;
}
