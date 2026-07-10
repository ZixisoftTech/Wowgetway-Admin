import { configureStore } from '@reduxjs/toolkit';
import superAdminAuthReducer from '../modules/WoWSuper-Admin/store/superAdminAuthSlice.js';
import dashboardReducer from '../modules/WoWSuper-Admin/store/dashboardSlice.js';
import homestayOwnerAuthReducer from '../modules/Homestay-Owner-Admin/store/homestayOwnerAuthSlice.js';

export const store = configureStore({
  reducer: {
    superAdminAuth: superAdminAuthReducer,
    dashboard: dashboardReducer,
    homestayOwnerAuth: homestayOwnerAuthReducer
  }
});
