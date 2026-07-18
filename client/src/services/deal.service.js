import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

const BUYER_BASE = '/v1/deals'
const SELLER_BASE = '/v1/seller/deals'
const ADMIN_BASE = '/v1/admin'

async function unwrap(request, fallbackMessage) {
  try {
    const { data } = await request
    if (!data?.success) {
      throw new Error(data?.error?.message || fallbackMessage)
    }
    return data.data
  } catch (error) {
    throwFriendly(error, fallbackMessage)
  }
}

export async function listBuyerDeals(params = {}) {
  return unwrap(api.get(BUYER_BASE, { params }), 'Failed to load deals')
}

export async function getBuyerDeal(dealId) {
  return unwrap(api.get(`${BUYER_BASE}/${dealId}`), 'Failed to load deal')
}

export async function payBuyerDeal(dealId) {
  return unwrap(api.post(`${BUYER_BASE}/${dealId}/pay`), 'Payment failed')
}

export async function listSellerDeals(params = {}) {
  return unwrap(api.get(SELLER_BASE, { params }), 'Failed to load deals')
}

export async function getSellerDeal(dealId) {
  return unwrap(api.get(`${SELLER_BASE}/${dealId}`), 'Failed to load deal')
}

export async function paySellerDeal(dealId) {
  return unwrap(api.post(`${SELLER_BASE}/${dealId}/pay`), 'Payment failed')
}

export async function listAdminDeals(params = {}) {
  return unwrap(api.get(`${ADMIN_BASE}/deals`, { params }), 'Failed to load deals')
}

export async function getAdminDeal(dealId) {
  return unwrap(api.get(`${ADMIN_BASE}/deals/${dealId}`), 'Failed to load deal')
}

export async function listDealChargeConfigs() {
  return unwrap(
    api.get(`${ADMIN_BASE}/deal-charge-configs`),
    'Failed to load deal charge configs',
  )
}

export async function updateDealChargeConfig(id, body) {
  return unwrap(
    api.put(`${ADMIN_BASE}/deal-charge-configs/${id}`, body),
    'Failed to update deal charge config',
  )
}
