"use client"
import React, { useEffect } from "react"
import HomeNavbar from "@/components/navbar/HomeNavbar"
import { useAuthStore } from "@/lib/store"

type BrowseLayoutProps = {
  children: React.ReactNode
}

const BrowseLayout = ({ children }: BrowseLayoutProps) => {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return (
    <div className="w-full">
      <HomeNavbar />
      {children}
    </div>
  )
}

export default BrowseLayout
