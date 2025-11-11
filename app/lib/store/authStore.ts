import { create } from "zustand";
import { devtools } from "zustand/middleware";
import authAPI from "../apis/auth.api";
import { tokenManager } from "../utils/tokenManager";
import { AuthStore } from "../types/auth";

/**
 * ZUSTAND AUTH STORE - Quick Reference for Developers
 *
 * SYNTAX EXPLANATION:
 * - create<AuthStore>()(...) - Double parentheses needed when using middleware
 * - devtools(...) - Middleware that connects to Redux DevTools for debugging (optional)
 * - set - Function to UPDATE state. Usage: set({ user: newUser })
 * - get - Function to READ current state inside actions. Usage: get().user
 *
 * HOW IT WORKS:
 * 1. Define your state interface (AuthStore)
 * 2. Use 'set' to update state in actions
 * 3. Use 'get' to access current state within actions (e.g., calling other actions)
 * 4. Export and use in components: const { user, signin } = useAuthStore()
 *
 * COMMON PATTERNS:
 * - Simple update: set({ isAuthenticated: true })
 * - Update based on previous state: set((state) => ({ count: state.count + 1 }))
 * - Call another action: await get().refreshToken()
 * - Access current state: const currentUser = get().user
 *
 * NOTE: Tokens are stored in localStorage via tokenManager utility.
 * For production, consider httpOnly cookies for better security.
 */

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,

      // Initialize auth state
      initialize: async () => {
        try {
          console.log("🔐 Initializing auth...");
          const { accessToken, refreshToken } = await tokenManager.getTokens();

          if (!accessToken || !refreshToken) {
            console.log("❌ No tokens found");
            set({
              isLoading: false,
              isAuthenticated: false,
            });
            return;
          }

          // Try to get profile (verifies access token)
          try {
            console.log("✅ Verifying access token...");
            const user = await authAPI.getProfile();

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            console.log("✅ Auth initialized successfully");
          } catch (profileError: any) {
            console.log("⚠️ Access token invalid, trying refresh...");

            // Access token invalid, try refresh
            if (profileError.response?.status === 401) {
              try {
                await get().refreshToken();
                console.log("✅ Token refreshed successfully");
              } catch (refreshError) {
                console.log("❌ Refresh failed, clearing tokens");
                // Refresh failed, clear everything
                tokenManager.clearTokens();
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
              }
            } else {
              // Some other error
              throw profileError;
            }
          }
        } catch (error) {
          console.error("❌ Initialize error:", error);
          tokenManager.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // Refresh Access token
      refreshToken: async () => {
        try {
          const { refreshToken } = await tokenManager.getTokens();
          if (!refreshToken) throw new Error("No refresh token");

          const data = await authAPI.refresh(refreshToken);

          tokenManager.setTokens(data.access_token, refreshToken);

        // We need to fetch user data separately since backend doesn't return it
            try {
            const user = await authAPI.getProfile();
            set({
                user,
                isAuthenticated: true
            });
            } catch (error) {
            // If we can't get profile, just update auth status
            set({
                isAuthenticated: true
            });
            }

          return data.access_token;
        } catch (error: any) {
          await get().logout();
          throw error;
        }
      },

      // signin
      signin: async (email: string, password: string) => {
        try {
          const data = await authAPI.signin(email, password);

          tokenManager.setTokens(data.access_token, data.refresh_token);

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          throw new Error(error.response?.data?.detail || "Login failed");
        }
      },

      // signup
      signup: async (email: string, username: string, password: string) => {
        try {
          const data = await authAPI.signup(email, username, password);
        } catch (error: any) {
          throw new Error(error.response?.data?.detail || "Signup failed");
        }
      },

      // Logout
      logout: async () => {
        try {
          const { refreshToken } = await tokenManager.getTokens();
          if (refreshToken) {
            await authAPI.logout(refreshToken);
          }
        } catch (error: any) {
          console.error("Logout error:", error);
        } finally {
          tokenManager.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      // Update user profile in state
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),

    // For Dev tools
    { name: "AuthStore" }
  )
);
