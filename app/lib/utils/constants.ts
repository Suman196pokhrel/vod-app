// API URLS ETC 
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'


export const API_ENDPOINTS = {
    // AUTH
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/signin',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD:'/auth/reset-password',


    // Videos
    VIDEOS: '/videos',


    // Comments
    COMMENTS: '/comments'
}