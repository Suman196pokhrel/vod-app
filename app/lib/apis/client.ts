import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// simple axios instance
const api = axios.create({
    baseURL: API_URL
})



// Add accesstoken to request headers if it exists
api.interceptors.request.use((config)=> {
    const token = localStorage.getItem("access_token");
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
})



export default api
