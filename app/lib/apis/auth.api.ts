import api from "./client";

export const authAPI = {
  // signup
  signup: async (email: string, username: string, password: string) => {
    const response = await api.post("/auth/signup", {
      email,
      username,
      password,
    });

    return response.data;
  },

  // Login
  signin: async (email: string, password: string) => {
    const response = await api.post("/auth/signin", {
      email,
      password,
    });
    return response.data;
  },

  // Logout
  logout: async (refreshToken: string) => {
    await api.post("/auth/logout", {
      refresh_token: refreshToken,
    });
  },

  // Get current user profile. Only called from authStore's own
  // initialize()/refreshToken() flows, which already handle failure
  // gracefully — skipAuthRedirect prevents the axios interceptor from
  // racing that with its own hard redirect (would otherwise bounce an
  // expired-session visitor off public routes like `/` and `/watch/*`).
  getProfile: async () => {
    const response = await api.get("/user/profile", { skipAuthRedirect: true })
    return response.data
  },

  // Refresh. Same rationale as getProfile above — authStore.refreshToken()
  // owns the failure path (logout + clear tokens); it must not be raced by
  // the interceptor's own redirect-on-refresh-failure handling.
  refresh: async (refreshToken: string) => {
    const response = await api.post("/auth/refresh", {
      refresh_token: refreshToken,
    },
    { skipAuthRedirect: true }
  );
    return response.data;
  },

  // verify-email
  verifyEmail: async (token: string) => {
    const response = await api.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  // Resend Verification
  resendVerification: async (email: string) => {
    const response = await api.post("/auth/resend-verification", {
      email: email,
    });
    return response.data;
  },

  // forgot pw
  forgotPassword: async (email: string) => {
    const response = await api.post("/auth/forgot-password", {
      email: email,
    });
    return response.data;
  },

  // Reset password
  resetPassword: async (email: string, code: string, newPassword: string) => {
    const response = await api.post("/auth/reset-password", {
      email: email,
      code: code,
      new_password: newPassword,
    });

    return response.data;
  },
};

export default authAPI;
