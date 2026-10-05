"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Leaf, LogOut } from "lucide-react";
import { browserSupabase } from "@/lib/browser";
import RainScene from "@/components/rain-scene";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const client = browserSupabase();
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => { if (active) setSignedIn(!!data.session); });
    const { data } = client.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <main className="login-page">
    <div className="login-art">
      <Link className="brand" href="/">fkcyn<span className="brand-dot" /></Link>
      <div className="login-sculpture"><Leaf size={100} strokeWidth={.8} /></div>

      <h1>พื้นที่ของเรา<span>.</span></h1>
      <p>ฝนและอากาศ ในที่เดียว</p>
      <div className="login-rain-art"><RainScene state="recent" /></div>
    </div>
    <section className="login-panel card">
      <Link className="text-link login-back" href="/"><ArrowLeft size={16} />หน้าหลัก</Link>

      <h2>เข้าสู่ระบบ</h2>
      <p>ดูข้อมูลเซ็นเซอร์ของคุณ</p>
      <form onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError("");
        try {
          const client = browserSupabase();
          if (!client) throw new Error("การเข้าสู่ระบบยังไม่พร้อม กลับไปดูข้อมูลตัวอย่างก่อนได้ค่ะ");
          const { error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบริการยังไม่พร้อม");
          window.location.href = "/";
        } catch (e) { setError((e as Error).message); }
        finally { setBusy(false); }
      }}>
        <label>อีเมล<input type="email" autoComplete="username" autoCapitalize="none" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>รหัสผ่าน<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></label>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        <button type="submit" className="primary-button" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}<ArrowRight size={18} /></button>
      </form>
      {signedIn && <button className="text-link logout-button" onClick={async () => { await browserSupabase()?.auth.signOut(); window.location.href = "/"; }}><LogOut size={15} />ออกจากบัญชีบนเครื่องนี้</button>}

    </section>
  </main>;
}
