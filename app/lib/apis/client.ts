import axios from "axios"
import { shouldAttemptTokenRefresh } from "../utils/tokenManager";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// simple axios instance
const api = axios.create({
    baseURL: API_URL,
    headers:{
        "Content-Type":"application/json"
    }
})



// Request interceptor - add token to every request
api.interceptors.request.use(
    (config)=> {
    const token = localStorage.getItem("access_token");
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
    },


    (error)=>{
        return Promise.reject(error)
    }


)

// Response interceptor - handle 401 errors
/**
 * RESPONSE INTERCEPTOR - Auto Token Refresh
 * 
 * Catches 401 errors and automatically refreshes the access token.
 * If refresh succeeds: Retries the original request with new token (seamless UX)
 * If refresh fails: Redirects user to login page
 * 
 * Flow: Request fails (401) → Refresh token → Retry request → Success ✅
 * 
 * The _retry flag prevents infinite loops if refresh also returns 401.
 */
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only attempt for specific conditions
    if (error.response?.status === 401 && 
      !originalRequest._retry &&
      shouldAttemptTokenRefresh(error)
    ) {
      originalRequest._retry = true;

      try {
        const { useAuthStore } = await import("@/lib/store");
        const newAccessToken = await useAuthStore.getState().refreshToken();
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          window.location.href = "/auth/signin";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api
