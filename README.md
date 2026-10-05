# fkcyn

แดชบอร์ดส่วนตัวสำหรับเซ็นเซอร์ฝน ประวัติรายวัน/ช่วงเวลา และข้อมูลพยากรณ์อากาศ โทน sage / cream / amber แบบ soft 3D ใช้ Next.js + TypeScript + Supabase รองรับ Vercel

## เริ่มบนเครื่อง

```powershell
cd C:\project\fkcyn
npm ci
node scripts/setup-local.mjs
npm run dev
```

เปิด http://127.0.0.1:3000 เว็บมี 3 แหล่งข้อมูลแยกกัน:

- **ตัวอย่าง**: สร้างบนหน้าเว็บเพื่อดูดีไซน์ ไม่บันทึกลงฐานข้อมูล
- **เซ็นเซอร์จริง**: รับข้อมูล `room-01` เท่านั้น
- **Postman**: รับข้อมูล `test-01` เท่านั้น

`.env.local` สร้างกุญแจอุปกรณ์สุ่มแยกกัน ไม่มีรหัสจริงใน source หรือ Postman export ใน development ที่ตั้ง `LOCAL_STORE=true` API จะเก็บข้อมูลใน `.data/readings.json` แบบถาวรข้ามการรีสตาร์ท ใช้สำหรับพัฒนาบนเครื่องเท่านั้น ไม่ใช่ production storage ระบบ local เปิดอ่านข้อมูลได้เฉพาะ dev server ที่ bind 127.0.0.1 ตาม npm script และจะไม่ทำงานบน Vercel/production ห้ามเปลี่ยน dev host เป็น public

## เชื่อม Supabase ที่มีอยู่

1. ตรวจไฟล์ `supabase/schema.sql` แล้วรันใน SQL Editor ไฟล์ใช้ตารางใหม่ `fkcyn_devices` และ `fkcyn_readings` ไม่แก้ตารางอื่น ถ้ามี schema ของโปรเจกต์นี้อยู่แล้ว ให้ตรวจความเข้ากันก่อนรัน (create-if-not-exists ไม่ใช่ migration สำหรับเปลี่ยนคอลัมน์เดิม)
2. เพิ่มใน `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
DASHBOARD_USER_ID=YOUR_AUTH_USER_UUID
```

3. ใน Supabase Auth สร้างผู้ใช้ส่วนตัวหนึ่งบัญชี เก็บ UUID เป็น `DASHBOARD_USER_ID` ไม่เปิด signup ในเว็บ
4. รีสตาร์ท dev server แล้วเข้าสู่ระบบที่ `/login` จากนั้นเลือก **เซ็นเซอร์จริง** หรือ **Postman**

เมื่อมี URL กับ secret key ระบบใช้ Supabase โดยอัตโนมัติ ถ้าตั้งค่าบางส่วนไม่ครบจะไม่ fallback ไป local เงียบ ๆ กุญแจ `SUPABASE_SECRET_KEY` อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามใส่ prefix `NEXT_PUBLIC_` และห้ามใส่ในบอร์ด

เปิด RLS และไม่มี public read/write policies: API ฝั่งเซิร์ฟเวอร์ตรวจ `DASHBOARD_USER_ID` ก่อนอ่านข้อมูล และตรวจ token ของอุปกรณ์ก่อนเขียน กุญแจ secret ข้าม RLS จึงตรวจสิทธิ์ใน route ทุกครั้ง

เอกสาร: https://supabase.com/docs/guides/getting-started/api-keys

## Postman

Import สองไฟล์ใน `postman/` แล้วเลือก environment `fkcyn · local`:

- `deviceToken`: ใส่ `TEST_DEVICE_TOKEN` จาก `.env.local` ใน **local value** ของ Postman
- `dashboardToken`: ใส่ `DASHBOARD_API_TOKEN` สำหรับอ่านบน Vercel/Supabase (local development ไม่ต้องใช้)
- `baseUrl`: URL เครื่องหรือ production เช่น `https://YOUR_APP.vercel.app`
- `from`, `to`: เว้นว่างเพื่อใช้วันนี้ตามเวลาไทย หรือระบุ `YYYY-MM-DD` ย้อนหลัง รวมไม่เกิน 31 วัน

### ส่งค่าหนึ่งครั้ง

```http
POST /api/readings
Authorization: Bearer <TEST_DEVICE_TOKEN>
Content-Type: application/json
```

```json
{
  "eventId": "unique-per-report",
  "deviceId": "test-01",
  "sensorType": "rain",
  "wet": true,
  "observedAt": "2026-10-05T14:00:00+07:00"
}
```

ตัวอย่าง body ในหน้าอุปกรณ์ใช้ `{{$guid}}` และ `{{$isoTimestamp}}` ของ Postman เพื่อสร้าง ID และเวลาจริงตอนกด Send ไม่ต้องคัดลอกเวลาเก่า

Collection สร้าง eventId และเวลาปัจจุบันใหม่ทุกคำขอ เพื่อทดสอบ retry ให้ใส่ eventId กับ observedAt เดิมเป็นค่าคงที่ใน body ไม่ใช้ตัวแปรสุ่ม

`201` = บันทึกใหม่, `200 + duplicate:true` = รับซ้ำแต่ไม่เพิ่มข้อมูล, `409` = eventId เดิมแต่ payload ต่างกัน, `400` = ข้อมูลไม่ถูกต้อง, `401` = token ผิด/อุปกรณ์ไม่ตรง, `503` = storage ยังไม่พร้อม แหล่งข้อมูล real/test กำหนดจาก token ที่เซิร์ฟเวอร์ ไม่เชื่อ `source` จาก body

บอร์ดจริงใช้ `deviceId: room-01` กับ `ROOM_DEVICE_TOKEN` ทั้งสาม token ต้องสุ่มและยาวอย่างน้อย 24 ตัว ใช้ `crypto.randomBytes(32)` ห้ามนำ token ไปแชร์กับผู้อื่น

## ความหมายประวัติฝน

- รับรายงานทุก 1 นาทีขณะเซ็นเซอร์เปียก รองรับไม่ส่งอะไรตอนแห้งตาม requirement
- รายงานห่างเกิน 3 นาทีแยกเป็นช่วงใหม่ สิ้นสุดประมาณการ = รายงานเปียกล่าสุด + 1 นาที แสดงป้าย **ประมาณการ** เสมอ ไม่อ้างว่าเป็นเวลาฝนหยุดจริง
- ถ้าส่ง `wet:false` ภายใน 3 นาทีหลังรายงานเปียกล่าสุด แสดงจบช่วงจากสัญญาณแห้ง หากมาช้ามาก จะคงประมาณการไว้
- สถานะหน้าแรกแยกจากการจัดกลุ่มประวัติ: รายงานเปียกอายุน้อยกว่า 1 นาทีแสดงฉากฝน, 1–9 นาทีแสดง “พบฝนล่าสุด … นาทีที่แล้ว”, ตั้งแต่ 10 นาทีแสดง “ไม่มีรายงานฝนใหม่ใน 10 นาที” และหยุดเอฟเฟกต์ ไม่สรุปว่าแห้งหรือออนไลน์จากความเงียบ
- รายงาน `wet:false` ล่าสุดที่ยังอยู่ในช่วง 10 นาทีหยุดฉากฝนทันที รายงานเปียกใหม่เริ่มนับเวลาใหม่ ระบบอ่านสถานะปัจจุบันจาก `latestReading` แยกจากวันที่เลือกดูย้อนหลัง
- “นาทีที่ตรวจพบ” นับ device + minute ที่มี wet report ไม่ใช่ระยะเวลาฝนจริง และไม่ใช่ปริมาณน้ำฝน
- เซ็นเซอร์แผ่นเปียกอาจยังเปียกหลังฝนหยุด ต้องตีความเป็น “ตรวจพบน้ำ”
- เก็บ observedAt และ receivedAt แยกกัน เรียงตามเวลาตรวจวัดเพื่อรองรับคำขอมาถึงผิดลำดับ
- เวลาเก็บเป็น UTC แสดงและกรองเป็น Asia/Bangkok กราฟรายวันไม่บังคับว่าช่วงข้ามคืนต้องอยู่ในวันเดียว
- ช่วงข้อมูลย้อนหลังถูกจำกัดตามวันที่เลือก จุดเริ่มที่อยู่ก่อนขอบเขตจึงอาจไม่ครบ และตารางบอกข้อจำกัดนี้ไว้

## สภาพอากาศ

`/api/weather` ใช้ Open-Meteo ผ่าน HTTPS ตั้ง timeout 10 วินาทีและ cache 15 นาที หน้าเว็บ refresh 15 นาที แสดงพื้นที่/แหล่งที่มาและเวลาแบบจำลอง หากผู้ให้บริการล่มแสดง error ไม่แทนที่ด้วยข้อมูลปลอม

ค่าเริ่มต้นกรุงเทพฯ เป็นพื้นที่ตัวอย่าง ไม่ใช่ตำแหน่งจริงของผู้ใช้ เปลี่ยนจังหวัดตัวอย่างหรือระบุพิกัดเองได้ พิกัดใช้ขอข้อมูลจาก Open-Meteo ไม่ใช้ตำแหน่งอัตโนมัติ

ข้อมูลพยากรณ์แยกจากเซ็นเซอร์ ไม่ใช้เติมช่องว่างในประวัติเซ็นเซอร์ Open-Meteo มีเงื่อนไขสำหรับ non-commercial use และ attribution CC BY 4.0:

- https://open-meteo.com/en/docs
- https://open-meteo.com/en/terms
- https://open-meteo.com/en/pricing

TMD เป็นทางเลือกเพิ่มเติมในอนาคต ยังไม่ได้เชื่อม API กรมอุตุนิยมวิทยาในรุ่นนี้: https://www.tmd.go.th/service/tmdData

## เรดาร์ฝนและเวลาไทย

เมนูสภาพอากาศมีแผนที่ Leaflet + OpenStreetMap พร้อมชั้นฝน RainViewer ย้อนหลังประมาณ 2 ชั่วโมงทีละ 10 นาที แสดงเวลาเฟรมแบบ Asia/Bangkok และเครดิตทั้งสองแหล่ง มีปุ่มเล่น/หยุด แถบเลือกเวลา และลิงก์เรดาร์ทางการ กทม. เรดาร์ไม่ใช้แทนผลตรวจเซ็นเซอร์ และสีเทาจาก coverage mask อาจหมายถึงไม่มีข้อมูลเรดาร์

/api/radar ดึงเฉพาะ public manifest ของ RainViewer ผ่าน HTTPS, timeout 10 วินาที, cache 5 นาที ตรวจ host และ path ก่อนส่งไป client แผนที่โหลดเฉพาะเมื่อเปิดเมนูสภาพอากาศ ไม่ต้องเพิ่ม API key ใหม่ เล่นย้อนหลังช้าเพื่อจำกัดการโหลด tile และหยุดเมื่อเกิดข้อผิดพลาด/หน้าเว็บอยู่เบื้องหลัง

RainViewer public API สำหรับการใช้งานส่วนตัว/การศึกษา: สี Universal Blue, zoom สูงสุด 7, จำกัด 100 requests/IP/minute และไม่มี nowcast ใน API ตั้งแต่ 2026-01-01 ไม่ควรตีความเวลาเฟรมเป็นเวลาตรวจวัดตรงที่ห้อง

- https://www.rainviewer.com/api/weather-maps-api.html
- https://www.rainviewer.com/api/transition-faq.html
- https://operations.osmfoundation.org/policies/tiles/
- https://weather.bangkok.go.th/radar/

นาฬิกาด้านบนแสดงเวลาปัจจุบันไทย HH:mm แยกจากเวลาตรวจวัด observedAt และเวลาเฟรมเรดาร์ เว็บจำเฉพาะแหล่งข้อมูลที่เลือกใน localStorage ฉากฝนรองรับ prefers-reduced-motion และฟอร์มมือถือใช้ input 16px พร้อมพื้นที่เผื่อ safe area

## Deploy Vercel

1. นำโฟลเดอร์นี้เข้า repository แล้ว import ใน Vercel เลือก framework Next.js
2. เพิ่ม env ทั้ง Supabase 4 ค่า กับ `TEST_DEVICE_TOKEN`, `ROOM_DEVICE_TOKEN`, `DASHBOARD_API_TOKEN` (ใช้ค่าที่สุ่มใหม่สำหรับ production)
3. ไม่ตั้ง `LOCAL_STORE` ใน production และไม่ upload `.data`, `.env.local` หรือ Postman environment ที่มี local secrets
4. รัน SQL ที่ตรวจแล้วและสร้าง Auth user ก่อนทดสอบบน production
5. deploy แล้วเข้าสู่ระบบเพื่ออ่านข้อมูล ส่วน ESP32/Postman เรียก POST ด้วย token เฉพาะอุปกรณ์

Vercel ไม่ต้องมี server process เปิดรอตลอดวัน API ทำงานเมื่อมี request ใช้ Supabase เก็บข้อมูลถาวร ตรวจ env และ schema ของ deployment ให้ตรงกับโปรเจกต์ก่อนใช้งาน

## ตรวจงาน

```powershell
npm run test
npm run typecheck
npm run build
# เปิด npm run dev อีก terminal ก่อน
npm run test:api
```

API smoke test ทำงานเฉพาะ local development storage และเขียนเฉพาะอุปกรณ์ test-01 ไม่เขียนฐานข้อมูล Supabase ทดสอบรหัสผิด validation duplicate conflict device scope และการแยก real/test

## โครงสร้าง

`app/` หน้า/API, `components/dashboard.tsx` UI, `lib/rain.ts` ความหมายช่วงฝน, `lib/store.ts` storage adapter, `supabase/schema.sql` schema, `postman/` collection, `tests/` domain scenarios
