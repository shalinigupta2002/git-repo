/** Credentials from server/prisma/seed.js — Playwright uses PREMIUM_AUTOMATION group. */
export const TEST_USERS = {
  buyer: {
    email: 'buyer.premium1@test.com',
    password: 'Buyer@123',
  },
  seller: {
    email: 'seller.premium1@test.com',
    password: 'Seller@123',
  },
  admin: {
    email: 'admin@b2b.local',
    password: 'Admin@123',
  },
}

/** PREMIUM_QA_USERS — subscribed fresh accounts for manual workflow testing */
export const PREMIUM_QA_USERS = {
  buyer: { email: 'buyer.premium2@test.com', password: 'Buyer@123' },
  seller: { email: 'seller.premium2@test.com', password: 'Seller@123' },
}

/** MANUAL_ONBOARDING_USERS — no subscription, test onboarding from scratch */
export const MANUAL_ONBOARDING_USERS = {
  buyer: { email: 'buyer1@test.com', password: 'Buyer@123' },
  seller: { email: 'seller1@test.com', password: 'Seller@123' },
}

/** @deprecated use MANUAL_ONBOARDING_USERS */
export const MANUAL_TEST_USERS = MANUAL_ONBOARDING_USERS
