import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './dashboardSlice.js';
import authReducer from './authSlice.js';

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    auth: authReducer
  }
});
