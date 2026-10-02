# RFQ Portal Integration API Sample Responses

Every integration endpoint returns a unified response envelope:
```json
{
  "success": true,
  "message": "Detailed action-specific description.",
  "data": {},
  "meta": null,
  "errors": null
}
```

---

## 1. Unified Product Catalog (`GET /api/v1/products`)
```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": [
    {
      "productId": "02a41116-13b7-4b31-bf6a-30451f5e8f53",
      "productName": "Apple iPhone 15 Pro — Smartphones",
      "sku": "E2E-MOB-002",
      "brand": "Apple",
      "category": "Electronics",
      "subcategory": "Smartphones",
      "uom": "PCS",
      "moq": 2,
      "price": 119900,
      "images": [
        "https://picsum.photos/seed/e2e-e2e-mob-002/700/700"
      ],
      "isActive": true,
      "specifications": "Apple iPhone 15 Pro for Smartphones in Electronics.\n\nSpecifications:\n- Category: Electronics\n- Subcategory: Smartphones\n- Brand: Apple\n- Origin: India\n- Warranty: 12 months (B2B standard)\n- Packaging: Export-grade carton\n\nE2E automation listing — for Playwright and manual QA flows."
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 26,
      "totalPages": 3
    }
  },
  "errors": null
}
```

---

## 2. Product Details (`GET /api/v1/products/{productId}`)
```json
{
  "success": true,
  "message": "Product details retrieved successfully.",
  "data": {
    "productId": "02a41116-13b7-4b31-bf6a-30451f5e8f53",
    "productName": "Apple iPhone 15 Pro — Smartphones",
    "sku": "E2E-MOB-002",
    "brand": "Apple",
    "category": "Electronics",
    "subcategory": "Smartphones",
    "uom": "PCS",
    "moq": 2,
    "price": 119900,
    "images": [
      "https://picsum.photos/seed/e2e-e2e-mob-002/700/700"
    ],
    "isActive": true,
    "specifications": "Apple iPhone 15 Pro for Smartphones in Electronics.\n\nSpecifications:\n- Category: Electronics\n- Subcategory: Smartphones\n- Brand: Apple\n- Origin: India\n- Warranty: 12 months (B2B standard)\n- Packaging: Export-grade carton\n\nE2E automation listing — for Playwright and manual QA flows."
  },
  "meta": null,
  "errors": null
}
```

---

## 3. Product-to-Sellers Mapping (`GET /api/v1/products/{productId}/eligible-sellers`)
```json
{
  "success": true,
  "message": "Eligible sellers for product retrieved successfully.",
  "data": [
    {
      "supplierId": "5ddb17da-c0e0-4271-81d0-0c19d531d0bb",
      "companyId": "5ddb17da-c0e0-4271-81d0-0c19d531d0bb",
      "city": "Bengaluru",
      "verificationStatus": "VERIFIED",
      "rating": 4.9,
      "companyLogo": null
    }
  ],
  "meta": null,
  "errors": null
}
```

---

## 4. Product Categories Flat List (`GET /api/v1/categories`)
```json
{
  "success": true,
  "message": "Categories fetched successfully.",
  "data": [
    {
      "id": 4,
      "name": "Audio",
      "slug": "audio",
      "parentId": null
    },
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "parentId": null
    }
  ],
  "meta": null,
  "errors": null
}
```

---

## 5. Eligible Users (`GET /api/v1/users/eligible`)
```json
{
  "success": true,
  "message": "Eligible users retrieved successfully.",
  "data": [
    {
      "userId": "93a16b56-a695-424a-821f-dd2837d0af87",
      "company": {
        "id": "93a16b56-a695-424a-821f-dd2837d0af87",
        "name": "Premium Automation Buyer"
      },
      "city": "Kolkata",
      "state": "West Bengal",
      "verificationStatus": "VERIFIED",
      "userStatus": "ACTIVE",
      "subscriptionSummary": {
        "hasBuyerSubscription": true,
        "hasSellerSubscription": false,
        "expiryDate": null
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 22,
      "totalPages": 2
    }
  },
  "errors": null
}
```

---

## 6. Eligible Sellers (`GET /api/v1/sellers/eligible`)
```json
{
  "success": true,
  "message": "Eligible sellers fetched successfully.",
  "data": [
    {
      "supplierId": "5ddb17da-c0e0-4271-81d0-0c19d531d0bb",
      "companyId": "5ddb17da-c0e0-4271-81d0-0c19d531d0bb",
      "city": "Bengaluru",
      "rating": 4.9,
      "verificationStatus": "VERIFIED",
      "companyLogo": null
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  },
  "errors": null
}
```

---

## 7. Subscription Validation (`POST /api/v1/subscriptions/validate`)
```json
{
  "success": true,
  "message": "Subscription validation completed.",
  "data": {
    "userId": "ebfbe645-bcf5-4410-b4b3-18556ebc9c28",
    "buyerSubscription": {
      "status": "INACTIVE",
      "plan": null,
      "activatedAt": null
    },
    "sellerSubscription": {
      "status": "INACTIVE",
      "plan": null,
      "activatedAt": null
    },
    "status": "INACTIVE",
    "planType": "BUYER",
    "startDate": null,
    "expiryDate": null,
    "isExpired": true
  },
  "meta": null,
  "errors": null
}
```

---

## 8. Basic User Profile (`GET /api/v1/users/{userId}/profile`)
```json
{
  "success": true,
  "message": "User profile fetched successfully.",
  "data": {
    "userId": "ebfbe645-bcf5-4410-b4b3-18556ebc9c28",
    "name": "qa-no-subscription",
    "companyName": "Standard Partner",
    "role": "BUYER",
    "status": "ACTIVE"
  },
  "meta": null,
  "errors": null
}
```

---

## 9. Secure Supplier Profile PII (`GET /api/v1/suppliers/{supplierId}/profile`)
```json
{
  "success": true,
  "message": "Supplier profile details fetched successfully.",
  "data": {
    "companyName": "Standard Supplier Corp",
    "contactPerson": "QA-BOTH-LIFETIME",
    "phone": null,
    "email": "qa-both-lifetime@b2b-qa.test",
    "gst": "27AAAAA5649307914",
    "address": {
      "street": null,
      "city": null,
      "state": null,
      "zipCode": null,
      "country": "India"
    }
  },
  "meta": null,
  "errors": null
}
```
