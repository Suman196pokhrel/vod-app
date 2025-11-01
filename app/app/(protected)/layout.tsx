import React from "react"
import HomeNavbar from "./home/_components/HomeNavbar"
import HomeCarousel from "./home/_components/HomeCarousel"

type ProtectedLayoutProps = {
    children: React.ReactNode
} 



const ProtectedLayout = ({children}:ProtectedLayoutProps) => {
  return (
    <div className="w-full border px-10">
        <HomeNavbar />
          {children}
    </div>
  )
}

export default ProtectedLayout