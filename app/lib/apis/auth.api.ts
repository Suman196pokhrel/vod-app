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

  // Refresh
  refresh: async (refreshToken:string)=>{
    const response = await api.post("/auth/refresh",{
        refresh_token:refreshToken,
    });
    return response.data
  },

  // verify-email
  verifyEmail:async(token:string)=>{
    const response = await api.get(`/auth/verify-email?token=${token}`)
    return response.data
  },

  // Resend Verification
  resendVerification: async(email:string)=>{
    const response = await api.post("/auth/resend-verification",{
        email:email
    });
    return response.data
  },


  // forgot pw
  forgotPassword: async(email:string)=>{
    const response = await api.post("/auth/forgot-password",{
        email:email
    });
    return response.data
  },

  // Reset password
  resetPassword: async(email:string, code:string, newPassword:string)=>{
    const response = await api.post("/auth/reset-password",{
        email:email,
        code:code,
        new_password: newPassword
    })

    return response.data
  }



};



export default authAPI;