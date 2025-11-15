"use client"
import React from "react"
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./_components/AdminSidebar"  
import AdminHeader from "./_components/AdminHeader"    
import { useAuthStore } from "@/lib/store";

type AdminLayoutProps = {
  children: React.ReactNode
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Wait for auth to initialize
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/sign-in");
      } else if (user?.role !== "admin") {
        // Not admin, redirect to home
        router.push("/home");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);


    // Show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }


    // Check authorization
  if (!isAuthenticated || user?.role !== "admin") {
    return null; // Redirect will happen in useEffect
  }

  
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