"use client"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/lib/store"
import { useState } from "react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const login = useAuthStore((state) => state.signin)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      toast.success("Logged in successfully")
      router.push("/home")
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-sm animate-fade-in-scale", className)} {...props}>
      <div className="rounded-2xl bg-white px-8 py-9 shadow-[0_24px_80px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/70">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 shadow-[0_4px_14px_rgba(99,75,229,0.38)]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c-5.333 0-8 2-8 3v1h16v-1c0-1-2.667-3-8-3z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/20"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <Link
                href="/auth/forgot-pw"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/20"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 ring-1 ring-rose-200">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.38)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(79,70,229,0.5)] disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>

          {/* Divider */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">or continue with</span>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-800 disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.29a3.67 3.67 0 0 1-1.59 2.41v2h2.57c1.5-1.38 2.37-3.42 2.37-5.87z" fill="#4285F4"/>
              <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2c-.71.48-1.63.76-2.72.76-2.09 0-3.86-1.41-4.49-3.31H.85v2.06A8 8 0 0 0 8 16z" fill="#34A853"/>
              <path d="M3.51 9.51A4.8 4.8 0 0 1 3.26 8c0-.53.09-1.04.25-1.51V4.43H.85A8 8 0 0 0 0 8c0 1.29.31 2.51.85 3.57l2.66-2.06z" fill="#FBBC05"/>
              <path d="M8 3.18c1.18 0 2.23.41 3.06 1.2l2.3-2.3A8 8 0 0 0 .85 4.43L3.51 6.5C4.14 4.59 5.91 3.18 8 3.18z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
