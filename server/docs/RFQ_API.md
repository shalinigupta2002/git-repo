# RFQ Enhancement API (Phase 2A — Backend)

Base path: `/api/quote-requests`  
Authentication: JWT cookie (`auth_token`) on all routes.

Phase 2A extends the existing `QuoteRequest` model — no new entity replaces it. Multiple sellers in one buyer submission share `rfqGroupId` and `rfqNumber`.

---

## Schema changes

| Field | Type | Description |
|-------|------|-------------|
| `rfqGroupId` | UUID | Groups seller-specific rows from one submission |
| `rfqNumber` | string | Readable number, e.g. `RFQ-2026-000001` (shared per group) |
| `deliveryLocation` | string | Required on create |
| `expectedDeliveryDate` | ISO date | Required on create |
| `attachments` | JSON array | Optional file metadata `{ name, url, mimeType?, sizeBytes? }` |

Apply schema:

```bash
cd server
npm run db:migrate:deploy   # production / CI
npm run db:migrate          # development (creates migration + applies)
npm run db:generate
```

See also: [DEPLOYMENT.md](./DEPLOYMENT.md) for migration strategy and CI.

---

## Create RFQ (single or multi-seller)

**`POST /api/quote-requests`**  
Auth: Buyer workspace + active Buyer subscription

### Body

```json
{
  "productTitle": "Industrial Valve 2in",
  "productId": "uuid-optional",
  "catalogProductId": "optional",
  "sellerId": "uuid-optional",
  "sellerIds": ["seller-uuid-1", "seller-uuid-2"],
  "productCategory": "Plumbing",
  "brandName": "Acme",
  "quantity": 100,
  "targetPrice": 450,
  "message": "Need GST invoice",
  "deliveryLocation": "Mumbai, Maharashtra",
  "expectedDeliveryDate": "2026-08-15",
  "attachments": [
    {
      "name": "spec-sheet.pdf",
      "url": "https://cdn.example.com/spec.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 204800
    }
  ]
}
```

### Seller resolution (priority)

1. `sellerIds[]` (deduplicated)
2. `sellerId`
3. `productId` → product owner seller

At least one seller is required.

### Behaviour

- Allocates one readable `rfqNumber` per submission (yearly counter: `RFQ-YYYY-NNNNNN`)
- Creates **one `QuoteRequest` row per seller** with the same `rfqGroupId` and `rfqNumber`

### Response `201`

```json
{
  "success": true,
  "data": {
    "group": {
      "rfqGroupId": "uuid",
      "rfqNumber": "RFQ-2026-000001",
      "rfqRef": "RFQ-2026-000001",
      "requests": [ /* sanitized QuoteRequest[] */ ]
    },
    "request": { /* first row — backward compatible */ }
  }
}
```

---

## Flat list (existing)

**`GET /api/quote-requests?viewAs=buyer|seller`**

Unchanged flat per-row listing. Buyer/seller party fields remain masked (`id` + `city` only).

---

## Grouped list (buyer)

**`GET /api/quote-requests/groups`**  
Auth: Buyer workspace

### Query

| Param | Description |
|-------|-------------|
| `page` | Page number (default 1) |
| `limit` | Page size 1–100 (default 20) |
| `status` | `all`, `PENDING`, `RESPONDED`, `ACCEPTED`, `DECLINED` |
| `q` | Search product title, RFQ number, category, brand, delivery location |
| `expired` | `true` to filter groups with expired quotations |

### Response `200`

```json
{
  "success": true,
  "data": {
    "hasFullAccess": true,
    "items": [
      {
        "rfqGroupId": "uuid",
        "rfqNumber": "RFQ-2026-000001",
        "rfqRef": "RFQ-2026-000001",
        "productTitle": "Industrial Valve 2in",
        "quantity": 100,
        "deliveryLocation": "Mumbai, Maharashtra",
        "expectedDeliveryDate": "2026-08-15T00:00:00.000Z",
        "attachments": [],
        "aggregateStatus": "RESPONDED",
        "hasExpiredQuotation": false,
        "sellerCount": 3,
        "quotations": [ /* per-seller summary */ ],
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
  }
}
```

Legacy rows without `rfqGroupId` are treated as single-row groups.

---

## Comparison (buyer)

**`GET /api/quote-requests/groups/:rfqGroupId`**  
Auth: Buyer workspace + subscription for full comparison

Returns group detail plus `comparison[]` for side-by-side quotation review:

```json
{
  "comparison": [
    {
      "quotationId": "uuid",
      "sellerId": "uuid",
      "sellerCity": "Delhi",
      "status": "RESPONDED",
      "expired": false,
      "finalUnitPrice": "950.00",
      "currency": "INR",
      "deliveryTime": "Freight note text",
      "validity": "2026-12-31T00:00:00.000Z",
      "remarks": "Exclusions note",
      "taxNote": "GST extra",
      "respondedAt": "..."
    }
  ]
}
```

---

## Stats

**`GET /api/quote-requests/stats?viewAs=buyer|seller`**

### Buyer buckets

| Key | Meaning |
|-----|---------|
| `myRfqs` | Distinct RFQ groups |
| `pending` | Groups with aggregate status PENDING |
| `sellerResponses` | Groups with at least one RESPONDED quotation |
| `accepted` | Groups with an accepted quotation |
| `rejected` | Groups where all quotations are declined |
| `expired` | Groups with at least one expired responded quotation |
| `totalQuotations` | Total seller rows |

### Seller buckets

| Key | Meaning |
|-----|---------|
| `incoming` | Total RFQs received |
| `pendingResponses` | Status PENDING |
| `responded` | Status RESPONDED |
| `acceptedDeals` | Status ACCEPTED |
| `rejected` | Status DECLINED |
| `notSelected` | Status NOT_SELECTED (buyer accepted another seller in the group) |
| `expired` | RESPONDED past `quoteValidUntil` |

---

## Accept quotation (enhanced)

**`PATCH /api/quote-requests/:id/accept`**  
Auth: Buyer + subscription

Existing behaviour preserved:

- Validates RESPONDED status and quote validity
- Creates an `Order` via `createOrderFromQuote()` (deal tracking)

**New behaviour (multi-seller RFQ group):**

- Inside a DB transaction, all **other** rows in the same `rfqGroupId` with status `PENDING` or `RESPONDED` are set to **`NOT_SELECTED`** (not `DECLINED`)
- Only one quotation per RFQ group can be accepted; a second accept returns **409**
- Notifications: accepted seller, not-selected sellers, and buyer (polling feed)

### Response `200`

```json
{
  "success": true,
  "data": {
    "request": { /* accepted QuoteRequest */ },
    "order": { /* created Order */ },
    "notSelectedSiblingCount": 2
  }
}
```

Buyer-facing list/comparison payloads include `expired`, `buyerDisplayStatus`, and `actionsLocked` on non-winning quotations after acceptance.

---

## Other routes

| Method | Path | Role |
|--------|------|------|
| `GET` | `/:id` | Buyer or seller party |
| `PATCH` | `/:id/respond` | Seller — submit or revise quotation |
| `PATCH` | `/:id/reject` | Buyer — reject one quotation |
| `PATCH` | `/:id/cancel` | Buyer — cancel pending per-seller RFQ |
| `PATCH` | `/:id/seller-reject` | Seller — decline RFQ |
| `GET` | `/groups` | Buyer — grouped RFQ list |
| `GET` | `/groups/:rfqGroupId` | Buyer — quotation comparison |
| `GET` | `/stats` | Buyer or seller stats |
| `GET` | `/notifications` | Polling notification feed |
| `PATCH` | `/notifications/read` | Mark notifications read |
| `GET` | `/confirmed-buyers` | Seller — confirmed buyer list |

---

## Out of scope (Phase 2A)

- Deal Charge module
- Marketplace Buyer/Seller IDs
- Contact unlock timing changes
- Frontend changes
- File upload endpoint (attachments accept metadata URLs only)

---

## Files touched

| Area | Path |
|------|------|
| Schema | `server/prisma/schema.prisma` |
| RFQ number allocator | `server/src/services/rfqNumberService.js` |
| Grouping / stats | `server/src/services/quoteGroupService.js` |
| Controller | `server/src/controllers/quoteRequestController.js` |
| Validators | `server/src/validators/quoteRequest.validator.js` |
| Routes | `server/src/routes/quoteRequest.routes.js` |
| Tests | `server/tests/api/quote-requests.test.js` |

---

## Test run

```bash
cd server
npm test
```

Result: **123 tests passed** (server Jest suite).
