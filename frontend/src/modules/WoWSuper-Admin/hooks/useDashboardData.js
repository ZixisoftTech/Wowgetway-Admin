import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = 'https://wow-getway-api.onrender.com/api/dashboard';

// Setup axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000
});

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const response = await api.get('/summary');
      return response.data;
    },
    refetchInterval: 30000 // Refetch every 30s for real-time update feel
  });
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: ['dashboardCharts'],
    queryFn: async () => {
      const response = await api.get('/charts');
      return response.data;
    }
  });
}

export function useEmployeePerformance() {
  return useQuery({
    queryKey: ['employeePerformance'],
    queryFn: async () => {
      const response = await api.get('/employees');
      return response.data;
    }
  });
}

export function useTopHomestays() {
  return useQuery({
    queryKey: ['topHomestays'],
    queryFn: async () => {
      const response = await api.get('/homestays');
      return response.data;
    }
  });
}
