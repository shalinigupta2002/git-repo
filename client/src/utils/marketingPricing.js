import { useCallback, useEffect, useState } from 'react'

export const DEFAULT_MARKETING_PRICING = {
  sellerMonthly: '₹999',
  sellerAnnual: '₹9,999',
  sellerLifetime: '₹49,999',
  buyerMonthly: '₹999',
  buyerAnnual: '₹9,999',
  buyerLifetime: '₹49,999',
  bothMonthly: '₹1,699',
  bothAnnual: '₹16,999',
  bothLifetime: '₹79,999',
  // Legacy backward compatibility fallbacks
  buyerOneTime: '₹9,999',
  sellerMonth: '₹999',
  bothStandardMonth: '₹1,699',
  bothLifetimeLifetime: '₹79,999',
  bothLifetimeMonth: '₹54,999',
  bothStandardLifetime: '₹54,999',
}

export const DEFAULT_PLAN_AMOUNTS = {
  sellerMonthly: 999,
  sellerAnnual: 9999,
  sellerLifetime: 49999,
  buyerMonthly: 999,
  buyerAnnual: 9999,
  buyerLifetime: 49999,
  bothMonthly: 1699,
  bothAnnual: 16999,
  bothLifetime: 79999,
}

export function formatInr(amount) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(amount) || 0)}`
}

/** Resolve display amounts for pricing cards (labels + numeric totals). */
export function getPlanAmounts(pricing = getMarketingPricing()) {
  const buyerAnnual = parseInrAmount(pricing.buyerOneTime) ?? DEFAULT_PLAN_AMOUNTS.buyerAnnual
  const buyerLifetime = parseInrAmount(pricing.buyerLifetime) ?? DEFAULT_PLAN_AMOUNTS.buyerLifetime
  const sellerAnnual = parseInrAmount(pricing.sellerMonth) ?? DEFAULT_PLAN_AMOUNTS.sellerAnnual
  const sellerLifetime = parseInrAmount(pricing.sellerLifetime) ?? DEFAULT_PLAN_AMOUNTS.sellerLifetime

  return {
    buyerAnnual,
    buyerLifetime,
    sellerAnnual,
    sellerLifetime,
    bothStandardMonth: parseInrAmount(pricing.bothStandardMonth) ?? (buyerAnnual + sellerAnnual),
    bothLifetimeLifetime: parseInrAmount(pricing.bothLifetimeLifetime) ?? (buyerLifetime + sellerLifetime),
    bothLifetimeMonth: parseInrAmount(pricing.bothLifetimeMonth) ?? (buyerLifetime + sellerAnnual),
    bothStandardLifetime: parseInrAmount(pricing.bothStandardLifetime) ?? (buyerAnnual + sellerLifetime),
  }
}

function parseInrAmount(label) {
  if (typeof label !== 'string') return null
  const digits = label.replace(/[^\d]/g, '')
  if (!digits) return null
  return Number(digits)
}

const STORAGE_KEY = 'b2b_marketing_pricing_v1'

const PRICING_EVENT = 'b2b-pricing-updated'

function mergeWithDefaults(raw) {
  const d = DEFAULT_MARKETING_PRICING
  return {
    buyerOneTime:
      typeof raw?.buyerOneTime === 'string' && raw.buyerOneTime.trim()
        ? raw.buyerOneTime.trim()
        : d.buyerOneTime,
    buyerLifetime:
      typeof raw?.buyerLifetime === 'string' && raw.buyerLifetime.trim()
        ? raw.buyerLifetime.trim()
        : d.buyerLifetime,
    sellerMonth:
      typeof raw?.sellerMonth === 'string' && raw.sellerMonth.trim()
        ? raw.sellerMonth.trim()
        : d.sellerMonth,
    sellerLifetime:
      typeof raw?.sellerLifetime === 'string' && raw.sellerLifetime.trim()
        ? raw.sellerLifetime.trim()
        : d.sellerLifetime,
    bothStandardMonth:
      typeof raw?.bothStandardMonth === 'string' && raw.bothStandardMonth.trim()
        ? raw.bothStandardMonth.trim()
        : d.bothStandardMonth,
    bothLifetimeLifetime:
      typeof raw?.bothLifetimeLifetime === 'string' && raw.bothLifetimeLifetime.trim()
        ? raw.bothLifetimeLifetime.trim()
        : d.bothLifetimeLifetime,
    bothLifetimeMonth:
      typeof raw?.bothLifetimeMonth === 'string' && raw.bothLifetimeMonth.trim()
        ? raw.bothLifetimeMonth.trim()
        : d.bothLifetimeMonth,
    bothStandardLifetime:
      typeof raw?.bothStandardLifetime === 'string' && raw.bothStandardLifetime.trim()
        ? raw.bothStandardLifetime.trim()
        : d.bothStandardLifetime,
  }
}

/**
 * Current marketing prices (buyer one-time & lifetime, seller monthly & lifetime).
 * Reads from localStorage in the browser; falls back to defaults.
 */
export function getMarketingPricing() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_MARKETING_PRICING }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_MARKETING_PRICING }
    return mergeWithDefaults(JSON.parse(stored))
  } catch {
    return { ...DEFAULT_MARKETING_PRICING }
  }
}

/** Persist overrides and notify listeners (same tab + other tabs via storage event). */
export function saveMarketingPricing(next) {
  const merged = mergeWithDefaults(next)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  window.dispatchEvent(new CustomEvent(PRICING_EVENT, { detail: merged }))
  return merged
}

export function resetMarketingPricing() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(PRICING_EVENT))
}

/** Subscribe to pricing changes in React components. */
export function useMarketingPricing() {
  const [pricing, setPricing] = useState(getMarketingPricing)

  const refresh = useCallback(() => {
    setPricing(getMarketingPricing())
  }, [])

  useEffect(() => {
    const onUpdate = () => refresh()
    window.addEventListener(PRICING_EVENT, onUpdate)
    window.addEventListener('storage', onUpdate)
    return () => {
      window.removeEventListener(PRICING_EVENT, onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [refresh])

  return pricing
}

/** @deprecated Use getMarketingPricing().buyerOneTime or useMarketingPricing() */
export const BUYER_ONE_TIME_LABEL = DEFAULT_MARKETING_PRICING.buyerOneTime
/** @deprecated Use getMarketingPricing().sellerMonth or useMarketingPricing() */
export const SELLER_ONE_MONTH_LABEL = DEFAULT_MARKETING_PRICING.sellerMonth
/** @deprecated Use getMarketingPricing().sellerLifetime or useMarketingPricing() */
export const SELLER_LIFETIME_LABEL = DEFAULT_MARKETING_PRICING.sellerLifetime
