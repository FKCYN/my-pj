import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "fkcyn — a little closer to home", description: "พื้นที่เล็ก ๆ สำหรับติดตามฝนและสภาพอากาศ พร้อมบันทึกจากเซ็นเซอร์ของคุณ" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="th"><body>{children}</body></html>;
}
