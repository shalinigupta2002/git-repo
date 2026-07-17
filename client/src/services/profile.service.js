import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

/**
 * Read-only profile view — integration point for Main Portal APIs.
 * @returns {Promise<{ profile: object }>}
 */
export async function fetchProfileView() {
  try {
    const { data } = await api.get('/profile')
    if (!data.success) throw new Error(data.error?.message || 'Failed to load profile')
    return data.data.profile
  } catch (e) {
    throwFriendly(e, 'Could not load profile')
  }
}
