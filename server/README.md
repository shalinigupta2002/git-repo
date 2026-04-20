# B2B Ecommerce API

Production-oriented REST API: **Express**, **PostgreSQL**, **Prisma**, **JWT** auth (roles: `BUYER`, `SELLER`, `ADMIN`).

## Setup

1. **PostgreSQL** — create a database (e.g. `b2b_ecommerce`).

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL`, `JWT_SECRET` (long random string), and optionally `PORT` / `CLIENT_URL`.

3. **Install & database**

   ```bash
   npm install
   npx prisma migrate dev --name init
   npm run db:seed
   ```

   Seed creates an admin user (only if missing): `admin@b2b.local` / `admin123` — **change or remove in production**.

4. **Run**

   ```bash
   npm run dev
   ```

   Default: `http://localhost:3001`

## API overview

Base URL: `/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness |
| POST | `/auth/register` | — | Register as `BUYER` or `SELLER` |
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/auth/me` | JWT | Current user |
| GET | `/products` | Optional | List products (pagination, `search`, `sellerId`, `mine`, `includeInactive` for seller/admin) |
| GET | `/products/:id` | Optional | Product detail |
| POST | `/products` | Seller / Admin | Create product (`sellerId` required if admin) |
| PATCH | `/products/:id` | Seller / Admin | Update product |
| DELETE | `/products/:id` | Seller / Admin | Delete product |
| POST | `/orders` | Buyer / Admin | Create order (single seller per order; `buyerId` if admin) |
| GET | `/orders` | JWT | Buyer: own orders; Seller: own orders; Admin: all |
| GET | `/orders/:id` | JWT | Order detail (participant or admin) |
| PATCH | `/orders/:id/status` | Seller / Admin | Update status |

Send JWT as: `Authorization: Bearer <token>`

## Error format

```json
{
  "success": false,
  "error": {
    "message": "…",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Validation failures (`code: VALIDATION_ERROR`) include Zod `details` in development-friendly shape.

---

## Catalog module (`/api/v1/products`)

A second, self-contained products module backed by **raw PostgreSQL** (`pg`) that powers
the storefront catalog with infinite-scroll, full-text search and category/brand filters.
It lives in its own PostgreSQL schema (`catalog`) so it does not collide with the Prisma
tables in `public`.

### Tables

All tables are created under the `catalog` schema.

| Table | Columns | Notes |
|-------|---------|-------|
| `catalog.categories` | `id SERIAL PK`, `name TEXT`, `slug TEXT UNIQUE`, `created_at TIMESTAMPTZ` | Category taxonomy |
| `catalog.brands`     | `id SERIAL PK`, `name TEXT UNIQUE`, `slug TEXT UNIQUE`, `created_at TIMESTAMPTZ` | Brand lookup |
| `catalog.products`   | `id BIGSERIAL PK`, `title TEXT`, `description TEXT`, `price NUMERIC(12,2)`, `image_url TEXT`, `category_id INT FK`, `brand_id INT FK`, `created_at TIMESTAMPTZ` | Indexed on `(created_at DESC, id DESC)` for cursor pagination, plus FKs |

### Setup

```bash
# run migrations only
npm run catalog:migrate

# run migrations + insert ~26 sample products across 7 categories and 10 brands
npm run catalog:seed
```

Uses the same `DATABASE_URL` as Prisma.

### Endpoint

`GET /api/v1/products`

| Query param | Type | Description |
|-------------|------|-------------|
| `q`         | string | Search keyword (case-insensitive, matches `title` and `description`) |
| `category`  | string | Category **slug** (e.g. `mobiles`, `laptops`) |
| `brand`     | string | Brand slug **or** name, case-insensitive (e.g. `apple`, `Samsung`) |
| `cursor`    | string | Opaque cursor returned by a previous call. Omit for page 1. |
| `limit`     | number | Items per page. Default `10`, max `50`. |

All filters can be combined. Results are sorted by latest `created_at DESC, id DESC`.

### Response format

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "iPhone 15 Pro",
      "description": "Apple flagship smartphone…",
      "price": 129900,
      "imageUrl": "https://…",
      "createdAt": "2026-04-20T10:27:00.000Z",
      "category": { "slug": "mobiles", "name": "Mobiles" },
      "brand":    { "slug": "apple",   "name": "Apple" }
    }
  ],
  "nextCursor": "MjAyNi0wNC0yMFQxMDoyMjowMC4wMDBafDIw"
}
```

When there are no more pages, `nextCursor` is `null`.

### Cursor-based pagination logic

- The cursor encodes the composite key `(created_at, id)` of the last row of the previous page as base64url.
- On each call the service fetches `limit + 1` rows with
  `WHERE (created_at, id) < ($cursorTs, $cursorId) ORDER BY created_at DESC, id DESC LIMIT $limit+1`.
- If `limit + 1` rows come back, the last extra row is dropped and its predecessor
  becomes `nextCursor`; otherwise `nextCursor` is `null`.
- Using the `(created_at, id)` tuple ensures pagination is deterministic even when
  multiple products share the same `created_at`.

### Example requests

```bash
# 1) First page – latest 10 products
curl "http://localhost:3001/api/v1/products"

# 2) Custom page size
curl "http://localhost:3001/api/v1/products?limit=5"

# 3) Infinite scroll – use the returned nextCursor
curl "http://localhost:3001/api/v1/products?limit=5&cursor=MjAyNi0wNC0yMFQxMDoxMjowMC4wMDBafDIy"

# 4) Search (case-insensitive, matches title or description)
curl "http://localhost:3001/api/v1/products?q=iphone"

# 5) Category filter (by slug)
curl "http://localhost:3001/api/v1/products?category=laptops"

# 6) Brand filter (slug or name)
curl "http://localhost:3001/api/v1/products?brand=samsung"
curl "http://localhost:3001/api/v1/products?brand=Apple"

# 7) Combine filters + pagination
curl "http://localhost:3001/api/v1/products?q=pro&category=laptops&brand=apple&limit=5"
```

### Code layout

```
server/src/
├── db/
│   ├── pool.js                        # pg Pool (re-uses DATABASE_URL)
│   ├── migrate.js                     # CLI: runs migrations (+ optional --seed)
│   ├── migrations/001_catalog.sql     # catalog schema + indexes
│   └── seeds/catalog_seed.sql         # sample data (~26 products)
├── services/catalogProductService.js  # SQL + cursor encode/decode
├── controllers/catalogProductController.js
└── routes/
    ├── catalogProduct.routes.js
    └── v1.routes.js                   # mounted at /api/v1
```

