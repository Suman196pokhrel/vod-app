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
      <div className="rounded-md border border-landing-border bg-landing-elevated px-8 py-9">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-landing-fg">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c-5.333 0-8 2-8 3v1h16v-1c0-1-2.667-3-8-3z" fill="#0a0a0a" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-landing-fg">Welcome back</h1>
          <p className="mt-1 text-sm text-landing-muted">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-landing-fg">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-md border-landing-border bg-landing-bg text-sm text-landing-fg shadow-none placeholder:text-landing-muted focus-visible:border-landing-fg focus-visible:ring-2 focus-visible:ring-landing-fg/20"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-landing-fg">
                Password
              </label>
              <Link
                href="/auth/forgot-pw"
                className="text-xs font-medium text-landing-muted underline decoration-landing-border underline-offset-4 hover:text-landing-fg hover:decoration-landing-fg"
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
              className="h-11 rounded-md border-landing-border bg-landing-bg text-sm text-landing-fg shadow-none placeholder:text-landing-muted focus-visible:border-landing-fg focus-visible:ring-2 focus-visible:ring-landing-fg/20"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-400">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-md bg-landing-fg px-4 py-2.5 text-sm font-semibold text-landing-bg transition-opacity duration-200 hover:opacity-80 disabled:opacity-60"
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
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-landing-muted">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-landing-fg underline decoration-landing-border underline-offset-4 hover:decoration-landing-fg">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
