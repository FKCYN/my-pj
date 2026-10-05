# 2026-10-05 — fkcyn v1

User goal: see when rain was detected at home, test the same API via Postman before hardware arrives, and view external forecasts. Keep the name broad enough for later sensors.

Approved stack: Next.js / TypeScript on Vercel; existing Supabase project pending credentials/schema review. No cloud mutations or deployment performed.

Visual reference: https://www.pinterest.com/pin/1148277236264535217/ — sage, cream and warm amber, soft shadows, matte sculptural forms. Reinterpreted using CSS and SVG rather than copying artwork. Responsive dashboard, rain archive/calendar, external weather and device/API menus.

Device sends wet every minute and may remain silent when dry. Silence also means possible connectivity failure. This is an invariant: absence of wet reports MUST NOT be labelled no rain or online. Three-minute grouping is an adjustable heuristic; endpoint +1 minute is explicitly estimated. Optional dry report gives a sensor-confirmed dry endpoint only when the gap is small. We track detected minutes, not true continuous duration or rainfall volume.

Data sources are separate: client-only sample data, test-01/Postman, room-01/real sensor. Server assigns source from authorized device token. Unique device + event id is idempotent; different body with the same id is a conflict. Raw readings are retained and sessions derived to support out-of-order arrivals.

Local store is strictly development-only, persistently serialized JSON for integration testing. Production requires Supabase. Supabase tables use project-prefixed names, RLS with no browser policies, and server API authorization against a single Auth user UUID. No filesystem storage on Vercel.

External provider: Open-Meteo forecast model, explicitly labelled separately from sensor records. TMD not yet integrated. Bangkok coordinates are an example until the user chooses a location.
