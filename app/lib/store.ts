import {create} from "zustand";
import authAPI from "./apis/auth.api";
import { AuthState } from "./types/auth";






export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Login action
  signin: async (email, password) => {
    try {
      const data = await authAPI.signin(email, password);
      
      // Save tokens
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      // Update state
      set({
        user: data.user,
        isAuthenticated: true,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  // Signup action
  signup: async (email, username, password) => {
    try {
      await authAPI.signup(email, username, password);
      // Don't auto-login, user needs to verify email
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Signup failed');
    }
  },

  // Logout action
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and state
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },


 

}));