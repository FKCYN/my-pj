import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "fkcyn — a little closer to home", description: "พื้นที่เล็ก ๆ สำหรับติดตามฝนและสภาพอากาศ พร้อมบันทึกจากเซ็นเซอร์ของคุณ" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#eeeee6" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="th"><body>{children}</body></html>;
}
