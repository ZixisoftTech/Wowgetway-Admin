import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeTab: 'Dashboard',
  sidebarOpen: false,
  dateFilter: 'This Month'
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    setDateFilter(state, action) {
      state.dateFilter = action.payload;
    }
  }
});

export const { setActiveTab, toggleSidebar, setSidebarOpen, setDateFilter } = dashboardSlice.actions;
export default dashboardSlice.reducer;
