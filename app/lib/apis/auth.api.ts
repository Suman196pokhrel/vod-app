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


};



export default authAPI;