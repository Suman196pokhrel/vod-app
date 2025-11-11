

const TOKEN_KEY='access_token'
const REFRESH_KEY='refresh_token'


export const tokenManager = {
    getTokens:()=>({
        accessToken: localStorage.getItem(TOKEN_KEY),
        refreshToken: localStorage.getItem(REFRESH_KEY)
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