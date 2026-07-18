'use strict'

/**
 * Demo profile catalog — sole source of demo profile fields.
 * Main Portal will replace this provider; marketplace never owns these fields.
 *
 * Lookup key: login email (authenticated identity link only).
 */

const DEMO_PROFILES_BY_EMAIL = {
  'admin@b2b.local': {
    portalUserId: null,
    email: 'admin@b2b.local',
    fullName: 'Platform Administrator',
    phone: '9800000001',
    company: 'B2B Marketplace Platform',
    gst: '07AABCB0000A1Z5',
    address: 'Tower A, Business District, Connaught Place',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    kycStatus: 'Verified',
    profilePhoto: null,
  },
  'buyer.premium1@test.com': {
    portalUserId: 'USR-DEMO-000001',
    email: 'buyer.premium1@test.com',
    fullName: 'Ananya Mehta',
    phone: '9876510001',
    company: 'Premium Automation Buyer',
    gst: '19AABCU9603R1ZM',
    address: '12, Automation Trade Centre, Park Street Area',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    kycStatus: 'Verified',
    profilePhoto: null,
  },
  'seller.premium1@test.com': {
    portalUserId: 'USR-DEMO-000002',
    email: 'seller.premium1@test.com',
    fullName: 'Vikram Desai',
    phone: '9876510002',
    company: 'Premium Automation Seller',
    gst: '29AADCV1234E1Z8',
    address: '45, Automation Industrial Hub, Peenya Phase 2',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    kycStatus: 'Verified',
    profilePhoto: null,
  },
  'buyer.premium2@test.com': {
    portalUserId: 'USR-DEMO-000003',
    email: 'buyer.premium2@test.com',
    fullName: 'Priya Sharma',
    phone: '9876520001',
    company: 'Premium QA Buyer',
    gst: '07AAECP1234F1Z9',
    address: '88, QA Business Park, Connaught Place',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    kycStatus: 'Verified',
    profilePhoto: null,
  },
  'seller.premium2@test.com': {
    portalUserId: 'USR-DEMO-000004',
    email: 'seller.premium2@test.com',
    fullName: 'Rahul Kulkarni',
    phone: '9876520002',
    company: 'Premium QA Seller',
    gst: '27AABCR5678G1Z2',
    address: '19, QA Logistics Hub, Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    kycStatus: 'Verified',
    profilePhoto: null,
  },
  'seller2@test.com': {
    portalUserId: 'USR-DEMO-000005',
    email: 'seller2@test.com',
    fullName: 'Arjun Singh',
    phone: '9876530002',
    company: 'Test Seller 2',
    gst: '09AABCS2345H1Z3',
    address: '22, QA Seller Hub Block B, Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    country: 'India',
    kycStatus: 'Verified',
    profilePhoto: null,
  },
  'seller3@test.com': {
    portalUserId: 'USR-DEMO-000006',
    email: 'seller3@test.com',
    fullName: 'Karan Reddy',
    phone: '9876530003',
    company: 'Test Seller 3',
    gst: '36AABCT6789J1Z4',
    address: '9, QA Seller Logistics Park, HITEC City',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    kycStatus: 'Verified',
    profilePhoto: null,
  },
  'buyer1@test.com': {
    portalUserId: null,
    email: 'buyer1@test.com',
    fullName: 'Neha Agarwal',
    phone: '9876541001',
    company: 'Northwind Retail Pvt Ltd',
    gst: '09AAACN1234K1Z5',
    address: '101, Trade Park Phase 1, Industrial Area',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    kycStatus: 'Pending verification',
    profilePhoto: null,
  },
  'seller1@test.com': {
    portalUserId: null,
    email: 'seller1@test.com',
    fullName: 'Mohit Patel',
    phone: '9876542001',
    company: 'Alpha Industrial Co.',
    gst: '24AABCA5678L1Z6',
    address: '102, Trade Park Phase 2, Industrial Area',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    kycStatus: 'Pending verification',
    profilePhoto: null,
  },
}

function titleCase(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * @param {string} email Authenticated identity link — used only to derive demo values.
 */
function buildGeneratedDemoProfile(email) {
  const localPart = email.split('@')[0] || 'user'
  const readableName = titleCase(localPart.replace(/[._-]+/g, ' '))

  return {
    portalUserId: null,
    email,
    fullName: readableName,
    phone: null,
    company: `${readableName} Trading Co.`,
    gst: null,
    address: null,
    city: null,
    state: null,
    country: 'India',
    kycStatus: 'Pending verification',
    profilePhoto: null,
  }
}

/**
 * Resolve demo profile from catalog/generator.
 * Only marketplace identity link fields may be merged: portalUserId (and email as lookup key).
 *
 * @param {{ email: string, portalUserId?: string|null, userId?: string }} link
 */
function resolveDemoProfile(link) {
  const catalogEntry = DEMO_PROFILES_BY_EMAIL[link.email]
  const base = catalogEntry ? { ...catalogEntry } : buildGeneratedDemoProfile(link.email)

  if (link.portalUserId) {
    base.portalUserId = link.portalUserId
  }

  return base
}

module.exports = {
  DEMO_PROFILES_BY_EMAIL,
  resolveDemoProfile,
  buildGeneratedDemoProfile,
}
