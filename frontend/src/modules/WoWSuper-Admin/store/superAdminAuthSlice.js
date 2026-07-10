import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('superAdminToken');
const userStr = localStorage.getItem('superAdminUser');

let initialUser = null;
try {
  initialUser = userStr ? JSON.parse(userStr) : null;
} catch (e) {
  initialUser = null;
}

const initialState = {
  isAuthenticated: !!token,
  user: initialUser,
  loading: false,
  error: null
};

const superAdminAuthSlice = createSlice({
  name: 'superAdminAuth',
  initialState,
  reducers: {
    authStart(state) {
      state.loading = true;
      state.error = null;
    },
    authSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user || action.payload;
      
      const tok = action.payload.token || 'mock-token';
      const usr = action.payload.user || action.payload;
      localStorage.setItem('superAdminToken', tok);
      localStorage.setItem('superAdminUser', JSON.stringify(usr));
    },
    authFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdminUser');
    },
    clearError(state) {
      state.error = null;
      state.loading = false;
    }
  }
});

export const { authStart, authSuccess, authFailure, logout, clearError } = superAdminAuthSlice.actions;
export default superAdminAuthSlice.reducer;
