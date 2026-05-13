# Chatinmuebles — Plataforma inmobiliaria con IA

Plataforma SaaS de búsqueda y gestión de propiedades para Colombia, USA, México, Argentina y Chile. Los buscadores describen lo que quieren en lenguaje natural y la IA (Claude de Anthropic) encuentra las propiedades que más se ajustan.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Auth & DB | Supabase (Auth + PostgreSQL) |
| ORM | Prisma 7 |
| Pagos | Stripe (suscripciones mensuales) |
| IA | Anthropic Claude (búsqueda por lenguaje natural) |
| CSS | Tailwind CSS v4 |
| Tests | Vitest |
| Deploy | Vercel |

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `SEARCHER` | Búsqueda con IA, propiedades guardadas |
| `REALTOR` | Dashboard, CRUD propiedades, CSV, API keys, highlights |
| `ADMIN` | Panel completo: usuarios, realtors, propiedades |

El rol se almacena en `user_metadata.role` de Supabase Auth.

---

## Arquitectura de rutas

```
src/app/
├── (auth)/          → login, signup, reset-password
├── (searcherApp)/   → /search, /saved
├── (realtorApp)/    → /dashboard, /properties, /subscription, /analytics, /api-docs
└── (adminApp)/      → /admin, /admin/users, /admin/realtors, /admin/properties

src/app/api/
├── auth/            → callback de Supabase
├── admin/           → stats, users, realtors, properties (solo ADMIN)
├── properties/      → CRUD, export CSV, import CSV
├── highlights/      → activar/desactivar propiedades destacadas
├── search/          → crear búsqueda IA, resultados, guardar
├── api-keys/        → gestión de API keys del realtor
├── v1/              → API pública REST (autenticada por API key)
├── subscriptions/   → estado y portal de Stripe
└── stripe/          → webhooks
```

El middleware de Next.js vive en `src/proxy.ts` (Next.js 16 usa `proxy.ts` en lugar de `middleware.ts`).

---

## Planes de suscripción (Stripe)

| Plan | Precio | Propiedades |
|------|--------|------------|
| STARTER | $29/mes | 20 |
| GROWTH | $60/mes | 50 |
| EMPIRE | $120/mes | 100 |

---

## API pública v1

Autenticación: `Authorization: Bearer chat_sk_<key>`

```
GET /api/v1/properties          → lista propiedades activas del realtor
GET /api/v1/properties/:id      → detalle de una propiedad
```

Las API keys se gestionan en `/api-docs` dentro del dashboard del realtor.

---

## Configuración local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Crea un archivo `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Base de datos (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:<password>@db.<proyecto>.supabase.co:5432/postgres

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_EMPIRE=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Migrar base de datos

```bash
npm run db:migrate     # aplica migraciones pendientes
npm run db:seed        # inserta países, ciudades y datos iniciales
```

### 4. Correr en desarrollo

```bash
npm run dev
```

---

## Scripts disponibles

```bash
npm run dev          # servidor de desarrollo (Turbopack)
npm run build        # prisma generate + next build
npm run start        # servidor de producción
npm test             # tests unitarios con Vitest
npm run test:watch   # tests en modo watch
npm run lint         # ESLint
npm run db:migrate   # migración de Prisma
npm run db:generate  # genera el cliente de Prisma
npm run db:seed      # seed de datos iniciales
npm run db:studio    # Prisma Studio (explorador visual de DB)
```

---

## Tests

```bash
npm test
```

Cobertura actual:

| Módulo | Tests |
|--------|-------|
| `src/lib/api-key.ts` | generateApiKey, hashKey, validateApiKey (mock Prisma) |
| `src/lib/csv.ts` | parseCSV, toCSV — casos normales, comillas, Windows CRLF, round-trip |

---

## Estructura de datos clave

```
User (Supabase Auth)
  └── RealtorProfile      → propiedades, suscripción, API keys
       └── Property        → highlights, photos (Supabase Storage)
            └── Highlight  → destaque 30 días en resultados de búsqueda

User (SEARCHER)
  └── Search              → parámetros de búsqueda IA
       └── SearchMatch    → propiedades matcheadas con relevancia
  └── SavedSearch         → búsquedas guardadas
```

---

## Despliegue

El proyecto se despliega automáticamente en Vercel al hacer push a `main`.

Variables de entorno configuradas en Vercel → Settings → Environment Variables.

El build incluye `prisma generate` automáticamente (`"build": "prisma generate && next build"`).
