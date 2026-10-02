# RFQ ↔ Auction Portal Integration Test Data

This document catalogs the official test users configured in the integration testing environment (Neon Postgres database). All passwords in the testing environment are standard defaults.

---

## 1. Test Users & Expected Behaviours

| User Email | Portal User ID | Password | Active Status | Buyer Sub | Seller Sub | Sub Expiry | Expected Integration Behaviour |
|---|---|---|---|---|---|---|---|
| **buyer.premium1@test.com** | `USR-DEMO-000001` | `Buyer@123` | `ACTIVE` | `ACTIVE` | `INACTIVE` | None (Lifetime) | ✓ Can create RFQ<br>✓ Can host Auctions<br>✗ Invisible in Eligible Sellers API |
| **buyer.premium2@test.com** | `USR-DEMO-000003` | `Buyer@123` | `ACTIVE` | `ACTIVE` | `INACTIVE` | None (Lifetime) | ✓ Can create RFQ<br>✓ Can host Auctions<br>✗ Invisible in Eligible Sellers API |
| **seller.premium1@test.com** | `USR-DEMO-000002` | `Seller@123` | `ACTIVE` | `INACTIVE` | `ACTIVE` | None (Lifetime) | ✓ Visible in Eligible Sellers API<br>✓ Can receive Auction Invitation<br>✓ Can participate in Auctions<br>✓ Profile accessible after negotiation starts |
| **seller.premium2@test.com** | `USR-DEMO-000004` | `Seller@123` | `ACTIVE` | `INACTIVE` | `ACTIVE` | None (Lifetime) | ✓ Visible in Eligible Sellers API<br>✓ Can receive Auction Invitation<br>✓ Can participate in Auctions<br>✓ Profile accessible after negotiation starts |
| **seller2@test.com** | `USR-DEMO-000005` | `Ks9#mPq2vWx7nRj4` | `ACTIVE` | `INACTIVE` | `ACTIVE` | None (Lifetime) | ✓ Visible in Eligible Sellers API<br>✓ Can receive Auction Invitation<br>✓ Can participate in Auctions<br>✓ Profile accessible after negotiation starts |
| **seller3@test.com** | `USR-DEMO-000006` | `Ln8@wYb5Fc3hKm9` | `ACTIVE` | `INACTIVE` | `ACTIVE` | None (Lifetime) | ✓ Visible in Eligible Sellers API<br>✓ Can receive Auction Invitation<br>✓ Can participate in Auctions<br>✓ Profile accessible after negotiation starts |
| **qa_user1@test.com** | `USR-QA-000001` | `Buyer@123` | `ACTIVE` | `ACTIVE` | `ACTIVE` | None (Lifetime) | ✓ Can create RFQ & host Auctions<br>✓ Visible in Eligible Sellers API<br>✓ Can participate in Auctions |
| **qa_user2@test.com** | `USR-QA-000002` | `Buyer@123` | `ACTIVE` | `ACTIVE` | `ACTIVE` | None (Lifetime) | ✓ Can create RFQ & host Auctions<br>✓ Visible in Eligible Sellers API<br>✓ Can participate in Auctions |
| **qa-both-lifetime@b2b-qa.test** | `USR-QA-000003` | `Buyer@123` | `ACTIVE` | `ACTIVE` | `ACTIVE` | None (Lifetime) | ✓ Can create RFQ & host Auctions<br>✓ Visible in Eligible Sellers API<br>✓ Can participate in Auctions |
| **buyer1@test.com** | `null` | `Buyer@123` | `ACTIVE` | `INACTIVE` | `INACTIVE` | `null` | ✗ Cannot create RFQ<br>✗ Invisible in Eligible Sellers API<br>✗ Cannot participate in Auctions |
| **buyer2@test.com** | `null` | `Buyer@123` | `ACTIVE` | `INACTIVE` | `INACTIVE` | `null` | ✗ Cannot create RFQ<br>✗ Invisible in Eligible Sellers API<br>✗ Cannot participate in Auctions |
| **buyer3@test.com** | `null` | `Buyer@123` | `ACTIVE` | `INACTIVE` | `INACTIVE` | `null` | ✗ Cannot create RFQ<br>✗ Invisible in Eligible Sellers API<br>✗ Cannot participate in Auctions |
| **seller1@test.com** | `null` | `Seller@123` | `ACTIVE` | `INACTIVE` | `INACTIVE` | `null` | ✗ Invisible in Eligible Sellers API<br>✗ Cannot participate in Auctions |
| **buyer5@test.com** | `null` | `Buyer@123` | `INACTIVE` | `INACTIVE` | `INACTIVE` | `null` | ✗ Account de-activated: Login blocked (403 Account Deactivated) |
| **qa-both-monthly-330@b2b-qa.test**| `null` | `Buyer@123` | `INACTIVE` | `EXPIRED` | `EXPIRED` | 2026-06-01 | ✗ Account de-activated: Login blocked (403 Account Deactivated) |
| **qa-both-monthly@b2b-qa.test** | `null` | `Buyer@123` | `ACTIVE` | `EXPIRED` | `EXPIRED` | 2026-06-01 | ✗ Subscription Validation returns isExpired = true<br>✗ Invisible in Eligible Sellers API |
| **qa-both-monthly-expiry@b2b-qa.test**| `USR-QA-000004`| `Buyer@123` | `ACTIVE` | `ACTIVE` | `EXPIRED` | 2026-06-01 (Seller) | ✓ Can create RFQ & host Auctions<br>✗ Invisible in Eligible Sellers API (expired plan) |

---

## 2. Test Catalog Master Data

A total of 20 premium products are pre-loaded in the B2B catalog `public.products` table for testing. 

*   **Categories Available:** Electronics, Laptops, Cookware & Dining, Fitness Equipment, Industrial Supplies
*   **Brands Available:** Samsung, Apple, Dell, Prestige, Nike, Bosch
*   **Standard UOMs:** `PCS` (Pieces), `SET` (Sets), `PAIR` (Pairs), `PACK` (Packs)

All product images return the actual seeded URLs pointing to static assets (no dynamic placeholders generated).
