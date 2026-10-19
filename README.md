# 🎓 edu-mvp-platform

MVP منصة ويب تعليمية: تسجيل دخول بالإيميل أو **QR**، رفع كتب **PDF**، قراءتها داخل المتصفح،
وتهيئة worker لاستخراج النص وتوليد الامتحانات (لاحقًا).

**الأدوار:** student · parent · admin · teacher (لاحقًا)

> الواجهة بالعربي (RTL) — الكود بالإنجليزي. التخزين المحلي في `backend/uploads`
> (يُستبدل لاحقًا بـ Supabase/S3 بدون تغيير الـ API).

---

## 🧱 البنية

```
edu-mvp-platform/
├─ prisma/                  # schema.prisma + migration أولي (مشترك)
├─ backend/                 # Express + TypeScript + Prisma + BullMQ worker
│  ├─ src/routes/auth.ts    # register / login / qr/create / qr/confirm / qr/status / logout
│  ├─ src/routes/books.ts   # upload / list / details / process (worker stub)
│  ├─ src/workers/pdfWorker.ts  # طابور BullMQ (Redis) — skeleton
│  └─ uploads/              # ملفات PDF المحلية
├─ frontend/                # Next.js (pages router) + RTL + PWA-ready
├─ scripts/                 # smoke.sh + smoke.ps1 + مولّد PDF تجريبي
├─ docker-compose.yml       # postgres + redis + backend + frontend
└─ .github/workflows/ci.yml # بناء backend + frontend على كل push
```

### API

| Method | Endpoint | الوصف |
|---|---|---|
| GET  | `/api/health` | فحص الصحة |
| POST | `/api/auth/register` | إنشاء حساب (bcrypt) |
| POST | `/api/auth/login` | دخول → `{ token, user }` (token = mobile JWT، والكوكي يتحط كمان) |
| POST | `/api/auth/qr/create` | إنشاء جلسة QR → `{ token, expiresAt }` (صالح دقيقتين، مرة واحدة) |
| POST | `/api/auth/qr/confirm` | `Authorization: Bearer <mobile JWT>` + `{ token }` → يعيد `Set-Cookie: token` (HttpOnly) |
| GET  | `/api/auth/qr/status?token=` | `pending` \| `confirmed` (+user) \| `expired` |
| POST | `/api/auth/logout` | مسح كوكي الجلسة |
| GET  | `/api/me` | المستخدم الحالي (كوكي أو Bearer) |
| POST | `/api/books/upload` | رفع PDF (multipart: `file` + `title` اختياري) |
| GET  | `/api/books` | قائمة الكتب |
| GET  | `/api/books/:id` | تفاصيل كتاب |
| POST | `/api/books/:id/process` | يبدأ استخراج النص عبر الـ worker (يحتاج Redis) |
| GET  | `/uploads/:file` | عرض ملف الـPDF نفسه |

**ملاحظات أمنية (MVP):** JWT لمدة ساعة · كلمات السر bcrypt · QR token one-time وصلاحية ٢ دقيقة ·
كوكي الجلسة `HttpOnly + SameSite=Lax`.

---

## 🐳 التشغيل بـ Docker (الأسهل)

```bash
docker compose up -d
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:4000/api/health
- المigrations بتتطبّق تلقائيًا عند تشغيل الـ backend (`prisma migrate deploy`).
- خدمة `worker` بتشتغل المستهلك بتاع طابور استخراج الـPDF (`npm run worker` محليًا).

> ملف الرفع volume اسمه `uploads` — يفضل استخدام `docker compose down` بدون `-v` عشان الكتب تفضل موجودة.

## 💻 التشغيل المحلي بدون Docker (للتطوير)

المتطلبات: Node 18+، PostgreSQL، Redis (Redis اختياري لحد ما تستخدم `:process`).

```bash
# 1) قاعدة البيانات
createdb edudb   # أو استخدم أي Postgres عندك

# 2) Backend
cd backend
npm install
npx prisma migrate dev --name init      # يطبّق migration ويولّد الـ client
npm run dev                             # http://localhost:4000

# (اختياري) Worker منفصل في تيرمنال تاني:
npm run worker

# 3) Frontend
cd ../frontend
npm install
npm run dev                             # http://localhost:3000
```

لو بتستخدم Docker لـ Postgres/Redis بس:

```bash
docker compose up -d db redis
cd backend && npm install && npx prisma migrate dev --name init && npm run dev
```

**متغيرات البيئة** — انسخ `.env.example` إلى `.env` وعدّل القيم:
`DATABASE_URL` · `JWT_SECRET` · `REDIS_URL` · `NEXT_PUBLIC_API_URL` · `CORS_ORIGIN` · `UPLOAD_DIR`.

> محليًا غيّر `DATABASE_URL` إلى `postgresql://postgres:postgres@localhost:5432/edudb`
> و`REDIS_URL` إلى `redis://localhost:6379`.

> ⚠️ **تنبيه:** الكونتينرات بتاخذ البورتات 3000/4000 — لو هتشغّل `npm run dev` محليًا،
> وقّف كونتينرات backend/frontend الأول واستخدم `docker compose up -d db redis` بس.

---

## 🧪 الاختبار (curl)

بعد التشغيل:

```bash
# Health
curl http://localhost:4000/api/health
# {"ok":true}

# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"mobile","email":"m@t.com","password":"pass1234","role":"student"}'

# Login → احفظ الـ token (ده الـ mobile JWT)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"m@t.com","password":"pass1234"}'
# → { "token": "<MOBILE_JWT>", "user": {...} }

# Create QR → خُد qr_token
curl -X POST http://localhost:4000/api/auth/qr/create
# → { "token": "<QR_TOKEN>", "expiresAt": "..." }

# الحالة قبل التأكيد
curl "http://localhost:4000/api/auth/qr/status?token=<QR_TOKEN>"
# → { "status": "pending" }

# تأكيد QR من "الموبايل" — لاحظ Set-Cookie: token=...; HttpOnly
curl -i -X POST http://localhost:4000/api/auth/qr/confirm \
  -H "Authorization: Bearer <MOBILE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"token":"<QR_TOKEN>"}'

# /api/me بالكوكي اللي رجع
curl http://localhost:4000/api/me -H "Cookie: token=<WEB_JWT>"

# رفع PDF (ولّد ملف تجريبي الأول)
node scripts/make-fixture-pdf.mjs .tmp/sample.pdf
curl -X POST http://localhost:4000/api/books/upload \
  -H "Authorization: Bearer <MOBILE_JWT>" \
  -F "file=@.tmp/sample.pdf;type=application/pdf" -F "title=MyBook"
# → { "book": { "id": 1, "pdfUrl": "/uploads/....pdf", ... } }

# المكتبة + تفاصيل الكتاب + عرض الـPDF
curl http://localhost:4000/api/books -H "Cookie: token=<WEB_JWT>"
curl http://localhost:4000/api/books/1 -H "Cookie: token=<WEB_JWT>"
curl -I http://localhost:4000/uploads/<filename>.pdf
```

### سكربت الاختبار الآلي (الأسهل)

يعمل كل سيناريوهات القبول فوق تلقائيًا:

```bash
# Linux / macOS / Git Bash
bash scripts/smoke.sh
```

```powershell
# Windows
.\scripts\smoke.ps1
```

---

## 🧩 تجربة QR من المتصفح

1. سجّل دخول من `/login` (بيحفظ الـ mobile JWT في localStorage للتجربة).
2. افتح `/login-qr` — هيعرض QR + عدّاد تنازلي للصلاحية.
3. اضغط **"تأكيد من الموبايل (تجريبي)"** (أو نفّذ أمر `qr/confirm` بـ curl زي فوق) →
   السيرفر يبعت `Set-Cookie: token` (HttpOnly) والصفحة تحوّل لـ `/dashboard`.

## 📦 الـ Worker (skeleton)

`backend/src/workers/pdfWorker.ts` — طابور BullMQ على Redis (اسم الطابور `pdf-processing`):

```bash
cd backend && npm run worker    # يشغل المستهلك
```

من الـ API: `POST /api/books/:id/process` → يضيف job (الآن stub يسجّل بس؛ المطلوب لاحقًا:
استخراج نص بـ pdf-parse → حفظ الفصول → توليد أسئلة → تعليم `textExtracted`).
بدون Redis، الـ API يشتغل عادي ويرجع `503 queue_unavailable` لعمليات `:process` بس.

## 🚀 خطوات تالية (خارج MVP)

- تبديل التخزين المحلي بـ Supabase/S3.
- توليد الامتحانات من النص المستخرج (LLM أو قواعد).
- ربط حسابات أولياء الطلاب (`ParentLink`) ودور المدرّس.
- تحسين الأمان: rate limiting، تقييد الرفع للأدوار المناسبة، كوكي `Secure` على HTTPS.
