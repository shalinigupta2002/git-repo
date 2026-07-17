import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRfqNotifications, markRfqNotificationsRead } from '../services/quoteRequest.service.js'

const POLL_MS = 30_000

/**
 * Polling-based RFQ notification feed.
 * Transport-agnostic: swap the service implementation for WebSocket/SSE later.
 */
export function useRfqNotifications({ enabled = true, pollMs = POLL_MS } = {}) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const sinceRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const data = await fetchRfqNotifications({
        unreadOnly: false,
        since: sinceRef.current || undefined,
        limit: 30,
      })
      setUnreadCount(data?.unreadCount ?? 0)
      const incoming = Array.isArray(data?.notifications) ? data.notifications : []
      if (incoming.length) {
        sinceRef.current = incoming[0]?.createdAt || sinceRef.current
        setNotifications((prev) => {
          const seen = new Set(prev.map((item) => item.id))
          const merged = [...incoming.filter((item) => !seen.has(item.id)), ...prev]
          return merged.slice(0, 50)
        })
      }
    } catch {
      // Polling should fail silently in the UI chrome.
    } finally {
      setLoading(false)
    }
  }, [enabled])

  const markAllRead = useCallback(async () => {
    await markRfqNotificationsRead({ markAll: true })
    setUnreadCount(0)
    setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    refresh()
    const timer = setInterval(refresh, pollMs)
    return () => clearInterval(timer)
  }, [enabled, pollMs, refresh])

  return {
    unreadCount,
    notifications,
    loading,
    refresh,
    markAllRead,
  }
}
