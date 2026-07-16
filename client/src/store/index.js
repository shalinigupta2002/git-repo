import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from './slices/authSlice.js'
import { appReducer } from './slices/appSlice.js'
import { subscriptionReducer } from './slices/subscriptionSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    app: appReducer,
    subscription: subscriptionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})
