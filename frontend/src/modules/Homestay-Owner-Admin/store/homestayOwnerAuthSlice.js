import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('homestayOwnerToken');
const userStr = localStorage.getItem('homestayOwnerUser');

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

const homestayOwnerAuthSlice = createSlice({
  name: 'homestayOwnerAuth',
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
      localStorage.setItem('homestayOwnerToken', tok);
      localStorage.setItem('homestayOwnerUser', JSON.stringify(usr));
    },
    authFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem('homestayOwnerToken');
      localStorage.removeItem('homestayOwnerUser');
    },
    clearError(state) {
      state.error = null;
      state.loading = false;
    }
  }
});

export const { authStart, authSuccess, authFailure, logout, clearError } = homestayOwnerAuthSlice.actions;
export default homestayOwnerAuthSlice.reducer;
