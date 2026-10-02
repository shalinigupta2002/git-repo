# RFQ Portal ↔ Auction Portal Integration Contract

**Version:** 1.1.0  
**Status:** APPROVED  
**API Namespace:** `/api/v1`

This document defines the REST APIs, data contracts, and security rules established between the **RFQ Portal** and the **Auction Portal**.

---

## 1. System Architecture & Boundaries

*   **Main Portal:** Owns user registration, credentials, core company identity, profile details, and KYC status.
*   **RFQ Portal:** Owns the product master database, supplier listings, buyer/seller subscriptions, and transaction logging.
*   **Auction Portal:** Owns the reverse auction bidding logs, live countdowns, and award outcomes.
*   *Rule:* Auction Portal never keeps a duplicate copy of catalog products or suppliers. It queries the RFQ Portal.

---

## 2. API Contract Endpoints

### 2.1 Unified Product Catalog
*   **Route:** `GET /api/v1/products`
*   **Query Parameters:**
    *   `q` (optional, search keyword)
    *   `sku` (optional, filter by exact SKU)
    *   `category` (optional, filter by category)
    *   `brand` (optional, filter by brand)
    *   `page` / `limit` (pagination)
    *   `sortBy` / `sortOrder` (sorting options: `price`, `moq`, `createdAt`)
*   **Response Payload Structure:**
    ```json
    {
      "success": true,
      "message": "Products retrieved successfully.",
      "data": [
        {
          "productId": "UUID",
          "productName": "String",
          "sku": "String",
          "brand": "String or null",
          "category": "String or null",
          "subcategory": "String or null",
          "uom": "String or null",
          "moq": 1,
          "price": 0.0,
          "images": [],
          "isActive": true,
          "specifications": "String"
        }
      ],
      "meta": {
        "pagination": { "page": 1, "limit": 10, "total": 26, "totalPages": 3 }
      },
      "errors": null
    }
    ```

---

### 2.2 Product-to-Sellers Mapping (Pre-negotiation)
*   **Route:** `GET /api/v1/products/:productId/eligible-sellers`
*   **Access:** Gated by user authentication.
*   **Fields Returned:** Returns only pre-negotiation fields. Company Name, GST, Email, Phone, and Address are **masked**.
*   **Response Payload Structure:**
    ```json
    {
      "success": true,
      "message": "Eligible sellers for product retrieved successfully.",
      "data": [
        {
          "supplierId": "UUID",
          "companyId": "UUID",
          "city": "String or null",
          "verificationStatus": "VERIFIED/PENDING",
          "rating": 4.5,
          "companyLogo": "String or null"
        }
      ],
      "meta": null,
      "errors": null
    }
    ```

---

### 2.3 Subscription Validation
*   **Route:** `POST /api/v1/subscriptions/validate`
*   **Payload:**
    ```json
    {
      "userId": "UUID",
      "requiredType": "BUYER/SELLER/ANY"
    }
    ```
*   **Response Payload Structure:**
    ```json
    {
      "success": true,
      "message": "Subscription validation completed.",
      "data": {
        "userId": "UUID",
        "buyerSubscription": { "status": "ACTIVE/INACTIVE/EXPIRED", "plan": "String or null", "activatedAt": "DateString" },
        "sellerSubscription": { "status": "ACTIVE/INACTIVE/EXPIRED", "plan": "String or null", "activatedAt": "DateString" },
        "status": "ACTIVE/INACTIVE",
        "planType": "BUYER/SELLER/BOTH/NONE",
        "startDate": "DateString or null",
        "expiryDate": "DateString or null",
        "isExpired": false
      },
      "meta": null,
      "errors": null
    }
    ```

---

### 2.4 Secure Supplier PII Profile
*   **Route:** `GET /api/v1/suppliers/:supplierId/profile`
*   **Access Requirements:**
    *   Requires a valid user session.
    *   Requires the `X-Auction-Context-Id` header.
    *   Gated by **S2S Context Verification**: The RFQ Portal validates with the Auction Portal backend that the buyer and supplier are participants in an active negotiation before releasing PII.
*   **Response Payload Structure:**
    ```json
    {
      "success": true,
      "message": "Supplier profile details fetched successfully.",
      "data": {
        "companyName": "String",
        "contactPerson": "String",
        "phone": "String or null",
        "email": "String",
        "gst": "String",
        "address": {
          "street": "String or null",
          "city": "String or null",
          "state": "String or null",
          "zipCode": "String or null",
          "country": "India"
        }
      },
      "meta": null,
      "errors": null
    }
    ```

---

## 3. Database Indexes

To prevent full table scans and support scalability, the following index structures must be maintained:
*   `public.users(is_active, seller_subscription_status)`
*   `public.users(is_active, buyer_subscription_status)`
*   `public.products(is_active, sku)`
