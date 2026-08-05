# 06 — Video Walkthrough Script (คำต่อคำ, ภาษาไทย)

**ความยาวเป้าหมาย:** 3:30–4:30 นาที (อยู่ในกรอบ 3-5 นาทีที่ JD กำหนด)
**รูปแบบการอ่าน:** อ่านคอลัมน์ "คำพูด" ตามลำดับ พร้อมทำ "Action หน้าจอ" คู่กันไปทีละบรรทัด — ไม่ต้องท่องจำ อ่านจากสคริปต์นี้ตรงๆ ได้เลย
**เตรียมก่อนอัด:**
- เปิดแท็บไว้ล่วงหน้า: (1) `https://jenosize-crm-ai.vercel.app/login`, (2) LINE app บนมือถือ (คุยกับ OA "Jenosize AI CRM" ค้างไว้), (3) VS Code เปิด repo `Jenosize` ไว้ที่หน้า `docs/`
- Login ค้างไว้ล่วงหน้าด้วย 2 บัญชี ถ้าเป็นไปได้ (เช่น browser 1 = `rep1@jenosize.demo`, browser 2 = `admin@jenosize.demo`) เพื่อสลับโชว์ RBAC ได้ไว
- ปิดการแจ้งเตือน (notification) บนเครื่องและมือถือก่อนอัด

---

## ฉากที่ 1 — Intro / Architecture (0:00–0:45)

| เวลา | Action หน้าจอ | คำพูด |
|---|---|---|
| 0:00 | หน้าจอว่าง หรือหน้า README บน GitHub | "สวัสดีค่ะ นี่คือ Jenosize AI CRM — ระบบ CRM ที่มี AI Copilot และเชื่อมกับ LINE Official Account จริง ทำขึ้นสำหรับ Test Assignment ตำแหน่ง Lead AI Software Engineer ของ Jenosize" |
| 0:08 | เปิด `docs/02-ARCHITECTURE-SA.md` ใน VS Code เลื่อนให้เห็นหัวข้อ Layered Architecture | "สถาปัตยกรรมเป็น Next.js 14 App Router ทั้งฝั่งหน้าเว็บและ API ต่อกับฐานข้อมูล PostgreSQL ผ่าน Prisma แบ่งเป็น 4 ชั้น คือ Presentation, BFF, Service, และ Repository — แยกชัดเจนไม่ปนกัน" |
| 0:20 | เลื่อนไปหัวข้อ ERD/Entities | "ข้อมูลหลักมี 7 ตาราง คือ User, Company, Contact, Lead, Activity, Message และ AuditLog — ทุกการเปลี่ยนแปลงข้อมูลจะถูกบันทึกลง AuditLog แบบ append-only ตรวจสอบย้อนหลังได้ทุกจุด" |
| 0:33 | เปิดแท็บ `https://jenosize-crm-ai.vercel.app` | "ระบบ deploy จริงอยู่บน Vercel เชื่อมกับฐานข้อมูล Postgres จริงบน Neon ไม่ใช่ mock data ค่ะ ข้อมูล seed มีจริง 2,000 contacts และ 300 leads ตามโจทย์" |

---

## ฉากที่ 2 — RBAC / Pipeline (0:45–1:30)

| เวลา | Action หน้าจอ | คำพูด |
|---|---|---|
| 0:45 | อยู่หน้า `/login` กรอก `rep1@jenosize.demo` / `Passw0rd!` กด Sign in | "ลอง login ด้วยบัญชี Sales Rep คนหนึ่งก่อนนะค่ะ" |
| 0:52 | เข้าหน้า `/leads` แสดง "Pipeline — my leads" | "จะเห็นว่าหัวข้อบอกว่า 'my leads' เท่านั้น — Sales Rep แต่ละคนเห็นแค่ lead ของตัวเอง เป็น RBAC ที่บังคับที่ฝั่ง server ไม่ใช่แค่ซ่อนใน UI" |
| 1:00 | พิมพ์ในช่องค้นหา หรือเลือก filter stage | "ระบบมี search และ filter ตาม stage ได้ ข้อมูลจริง 300 leads ก็ยังลื่นอยู่" |
| 1:08 | คลิกเข้า lead ใดก็ได้ 1 รายการ | "เข้าไปดู lead detail — ตรงนี้จะเห็น timeline รวมทั้ง Activity และข้อความ LINE เรียงตามเวลาในที่เดียว" |
| 1:16 | ชี้ปุ่ม pipeline stage (NEW/QUALIFIED/PROPOSAL/WON/LOST) กดเปลี่ยน stage 1 ครั้ง | "เปลี่ยน stage ได้ตรงนี้เลย เช่นเลื่อนจาก NEW ไป QUALIFIED — และถ้า lead ถูกปิดเป็น WON หรือ LOST แล้ว Sales Rep จะย้อนกลับไม่ได้ ต้องให้ Admin เท่านั้นที่เปิดใหม่ได้ กันข้อมูลรายงานเพี้ยน" |
| 1:26 | Logout แล้ว login ใหม่ด้วย `admin@jenosize.demo` (หรือสลับไปแท็บที่ login ไว้ล่วงหน้า) | "สลับมาเป็น Admin ดูบ้าง — Admin จะเห็น pipeline ทั้งทีมได้" |

---

## ฉากที่ 3 — LINE OA Live Demo + AI Copilot (1:30–3:00)

| เวลา | Action หน้าจอ | คำพูด |
|---|---|---|
| 1:30 | สลับไปมือถือ เปิดแชท LINE OA "Jenosize AI CRM" | "ส่วนที่สำคัญที่สุดของ Part 2 คือการเชื่อมกับ LINE OA จริง ไม่ใช่ mock — ลองพิมพ์ข้อความจากมือถือเข้าไปเลยนะครับ/คะ" |
| 1:36 | พิมพ์ข้อความ เช่น "สนใจสอบถามราคาสินค้าครับ" ส่ง | (พิมพ์ข้อความ ไม่ต้องพูดระหว่างพิมพ์) |
| 1:45 | สลับกลับมาที่เบราว์เซอร์ ไปหน้า `/leads` กด refresh หรือ filter stage=NEW | "รอสักครู่ ข้อความนี้จะถูกยิงผ่าน LINE Webhook เข้าระบบเรา — ตรวจสอบลายเซ็น (signature) ก่อนทุกครั้งว่ามาจาก LINE จริง แล้วค่อยสร้าง Lead ใหม่อัตโนมัติ" |
| 1:55 | ชี้ lead ใหม่ที่เพิ่งขึ้น (ชื่อ "LINE User ...") คลิกเข้าไปดู | "นี่ค่ะ Lead ใหม่ที่มาจาก LINE โดยอัตโนมัติ พร้อมข้อความที่เพิ่งส่งเข้ามาอยู่ใน timeline แล้ว" |
| 2:05 | คลิกปุ่ม "Ask AI Copilot" | "ตอนนี้ลองใช้ AI Copilot วิเคราะห์ lead นี้ดู" |
| 2:12 | รอผลลัพธ์ AI Copilot แสดงบนหน้าจอ ชี้แต่ละส่วน (Summary / Score / Next action / Draft reply) | "AI จะสรุปให้ 4 อย่าง คือ Summary ไม่เกิน 3 bullet, คะแนนความน่าสนใจของ lead 0 ถึง 100 พร้อมเหตุผล, Next-best action ว่าควรทำอะไรต่อ และร่างข้อความตอบกลับ LINE ให้พร้อมส่ง" |
| 2:28 | ติ๊กช่อง "Simulate AI outage (demo)" กดปุ่ม Ask AI Copilot อีกครั้ง | "และถ้า AI provider ล่มขึ้นมา ระบบจะไม่ค้าง แต่ fallback ไปใช้กฎสำรอง (heuristic) แทนทันที ลองจำลองดูตรงนี้" |
| 2:38 | ชี้ป้าย "Fallback result" สีเหลืองที่ขึ้นมา | "จะเห็น badge สีเหลืองบอกชัดเจนว่านี่คือคำตอบจาก fallback ไม่ใช่ AI จริง เพื่อให้ Sales Rep รู้ตัวว่าต้องตรวจสอบเองมากขึ้น" |
| 2:48 | ยกเลิกติ๊ก simulate แล้วกด Ask AI Copilot ใหม่ให้ได้ผลจริง จากนั้นกด "Approve & Send" | "สุดท้าย ถ้าพอใจกับ draft ที่ AI เสนอ ก็กด Approve & Send — ข้อความจะถูกส่งออกไปทาง LINE จริง และบันทึกลง Audit Log ว่ามนุษย์เป็นคนอนุมัติ ไม่ใช่ AI ส่งเองอัตโนมัติ" |

---

## ฉากที่ 4 — Handover / QA (3:00–4:00)

| เวลา | Action หน้าจอ | คำพูด |
|---|---|---|
| 3:00 | สลับไป VS Code เปิด `e2e/` folder ให้เห็นรายชื่อไฟล์ทั้ง 4 | "ในแง่คุณภาพงาน มี automated test ครอบคลุม 3 เรื่องหลักที่โจทย์ขอ คือ Core CRM flow, AI fallback, และ LINE webhook security/idempotency บวกเพิ่มอีกชุดสำหรับ RBAC" |
| 3:12 | เปิด terminal รันคำสั่ง (หรือโชว์ผลลัพธ์ที่รันไว้ล่วงหน้า) `npm run test:e2e` ให้เห็นบรรทัด "14 passed" | "รันได้ผ่านครบ 14 เทสต์บน local ส่วนที่ยิงซ้ำกับ production จริงบน Vercel ได้ 13 ผ่านและ 1 skip โดยตั้งใจ เพราะเทสนั้นต้องพึ่ง test hook ที่เราปิดไว้ใน production ด้วยเหตุผลความปลอดภัย — เป็นพฤติกรรมที่ถูกต้อง ไม่ใช่บั๊ก" |
| 3:24 | เปิด `docs/04-TEST-REPORT-QA.md` เลื่อนให้เห็นตาราง "Bugs found and fixed during QA" | "ระหว่างทดสอบเจอบั๊กจริงด้วย เช่นมีการหลุดของ password hash ออกไปใน API response ก็แก้ไปพร้อมบันทึกไว้ในเอกสารนี้ทั้งหมด" |
| 3:36 | เปิด `docs/01-REQUIREMENTS-BA.md` → `02` → `03` → `04` สลับให้เห็นชื่อไฟล์เร็วๆ | "เอกสารส่งมอบครบตาม pipeline BA, SA, PM, DEV, QA อยู่ในโฟลเดอร์ docs/ ทั้งหมด รวมถึง AI-usage log ที่บันทึกว่า prompt ไหนใช้ทำอะไร และรีวิวโค้ด AI แล้วแก้อะไรไปบ้าง" |
| 3:50 | เปิด `README.md` เลื่อนให้เห็นหัวข้อ "Known limitations" | "ส่วนข้อจำกัดที่ยังไม่ทำ เช่น SSO, rate limiting แบบ distributed ก็ระบุไว้ตรงๆ ในเอกสารเช่นกัน ไม่ปิดบัง" |
| 4:05 | กลับมาหน้า `/leads` ของเว็บที่ deploy จริง | "ในการออกแบบ MVP ครั้งนี้ ดิฉันมุ่งเน้นที่ Vertical Slice ที่สมบูรณ์ ปลอดภัย และใช้งานได้จริงบน Production โดยให้ความสำคัญกับ RBAC Security, Audit Logging พร้อม PII Masking, Connection Pooling บน Neon, Prompt Injection Guardrails แบบ Defense-in-Depth และ E2E Test Suite รวม 14 Scenarios ส่วนระบบ Async Queue สำหรับ LINE Webhook ถูกระบุไว้ใน Known Limitations ของ README เพื่อเตรียมพร้อมสเกลสู่ Production ต่อไปค่ะ" |
| 4:20 | หน้าจอนิ่ง หรือโชว์ URL repo | "ขอบคุณที่รับชมค่ะ" |

---

## หมายเหตุการอัด

- ถ้าเวลาเกิน 4:30 ให้ตัดฉากที่ 4 ส่วน 3:36–3:50 (เอกสาร BA/SA/PM) ออกก่อน เพราะ README/QA report พูดถึงไปแล้วบางส่วน
- ถ้า LINE OA ตอบช้ากว่าที่คาด (webhook อาจใช้เวลา 2-5 วินาที) ให้ตัดต่อ (cut) แทนการรอสดในคลิป เพื่อไม่ให้จังหวะขาด
- Data ที่ใช้ทั้งหมดเป็น synthetic/demo — พูดย้ำได้ถ้าต้องการ แต่ไม่บังคับ เพราะ README มีระบุไว้ชัดแล้ว
