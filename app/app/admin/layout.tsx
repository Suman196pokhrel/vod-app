import React from "react"
import AdminSidebar from "./_components/AdminSidebar"  
import AdminHeader from "./_components/AdminHeader"    

type AdminLayoutProps = {
  children: React.ReactNode
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <div className="flex flex-col flex-1">
        <AdminHeader />
        <main className="flex-1 p-6 bg-muted/10">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout