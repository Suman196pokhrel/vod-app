"use client"
import React, { useEffect } from "react"
import HomeNavbar from "./home/_components/HomeNavbar"
import HomeCarousel from "./home/_components/HomeCarousel"
import { useAuthStore } from "@/lib/store"

type ProtectedLayoutProps = {
    children: React.ReactNode
} 



const ProtectedLayout = ({children}:ProtectedLayoutProps) => {

  const initialized = useAuthStore((state)=>state.initialize)
  
  useEffect(()=>{
    initialized()
  },[])

  return (
    <div className="w-full border ">
        <HomeNavbar />
          {children}
    </div>
  )
}

export default ProtectedLayout