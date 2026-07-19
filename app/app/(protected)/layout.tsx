"use client"
import React, { useEffect } from "react"
import HomeNavbar from "@/components/navbar/HomeNavbar"
import { useAuthStore } from "@/lib/store"
import { useRouter, usePathname } from "next/navigation"
import { buildSignInUrl } from "@/lib/utils/safeNextPath"

type ProtectedLayoutProps = {
    children: React.ReactNode
}



const ProtectedLayout = ({children}:ProtectedLayoutProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const {isAuthenticated, isLoading, user,initialize} = useAuthStore()
  
  useEffect(()=>{
    initialize()
  },[])


  // show loading while checking auth
  if(isLoading){
    return(
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }


  // Redirect to signin if not authenticate
  if (!isAuthenticated) {
    router.push(buildSignInUrl(pathname));
    return null;
  }

  // If authenticated , render protected route
  return (
    <div className="w-full border ">
        <HomeNavbar />
          {children}
    </div>
  )
}

export default ProtectedLayout