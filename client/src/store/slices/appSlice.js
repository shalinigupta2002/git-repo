import { createSlice } from '@reduxjs/toolkit'

/**
 * Optional global UI state. Pages should prefer local loading state unless
 * the spinner truly needs to span the whole app (e.g. during initial boot).
 */
const initialState = {
  booting: true,
  globalLoading: false,
  globalError: null,
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setBooting(state, action) {
      state.booting = Boolean(action.payload)
    },
    setGlobalLoading(state, action) {
      state.globalLoading = Boolean(action.payload)
    },
    setGlobalError(state, action) {
      state.globalError = action.payload ?? null
    },
    clearGlobalError(state) {
      state.globalError = null
    },
  },
})

export const { setBooting, setGlobalLoading, setGlobalError, clearGlobalError } =
  appSlice.actions

export const appReducer = appSlice.reducer

export const selectBooting = (s) => s.app.booting
export const selectGlobalLoading = (s) => s.app.globalLoading
export const selectGlobalError = (s) => s.app.globalError
