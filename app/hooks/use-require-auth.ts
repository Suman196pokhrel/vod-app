"use client"

import { useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import { buildSignInUrl } from "@/lib/utils/safeNextPath"

/**
 * Gate for interactions that require auth (like, comment, subscribe, save).
 * Controls stay rendered for everyone; activating one while logged out
 * routes to sign-in with `?next=` back to the current page instead of
 * running the action.
 */
export function useRequireAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const requireAuth = useCallback(
    (action: () => void) => {
      if (!isAuthenticated) {
        router.push(buildSignInUrl(pathname))
        return
      }
      action()
    },
    [isAuthenticated, pathname, router]
  )

  return { isAuthenticated, requireAuth }
}
