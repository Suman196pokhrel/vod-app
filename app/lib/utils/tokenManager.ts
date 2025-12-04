

const TOKEN_KEY='access_token'
const REFRESH_KEY='refresh_token'


export const tokenManager = {
    getTokens:async ()=>({
        accessToken: await localStorage.getItem(TOKEN_KEY),
        refreshToken: await localStorage.getItem(REFRESH_KEY)
    }),


    setTokens:(accessToken:string, refreshToken:string)=>{
        localStorage.setItem(TOKEN_KEY, accessToken)
        localStorage.setItem(REFRESH_KEY, refreshToken)
    },

    clearTokens:()=>{
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
    },


    getAccessToken:()=>localStorage.getItem(TOKEN_KEY),

    getRefreshToken: ()=>localStorage.getItem(REFRESH_KEY)
}



// Helper function to determine if we should attempt token refresh
export function shouldAttemptTokenRefresh(error: any): boolean {
  const detail = error.response?.data?.detail.toLowerCase();
  
  // Only refresh for expired tokens
  if (detail === "Token expired") {
    return true;
  }
  
  // Don't refresh for these cases:
  const noRefreshMessages = [
    "invalid token",
    "user not found", 
    "invalid credentials",
    "email not verified",
    "account suspended"
  ];
  if (noRefreshMessages.includes(detail)) {
    return false;
  }
  
  // Default: try refresh (for backward compatibility)
  return true;
}