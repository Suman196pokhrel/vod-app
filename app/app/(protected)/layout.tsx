import React from "react"

type ProtectedLayoutProps = {
    children: React.ReactNode
} 



const ProtectedLayout = ({children}:ProtectedLayoutProps) => {
  return (
    <div>
        <div>NAVBAR</div>
        <div>SIDEBAR</div>
        <div>{children}</div>
    </div>
  )
}

export default ProtectedLayout