"use client"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/lib/store"
import { useState, Suspense } from "react"
import { getSafeNextPath } from "@/lib/utils/safeNextPath"

function LoginFormInner({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
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
      router.push(getSafeNextPath(searchParams.get("next")))
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-sm animate-fade-in-scale", className)} {...props}>
      <div className="rounded-md border border-border bg-card px-8 py-9">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-foreground">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c-5.333 0-8 2-8 3v1h16v-1c0-1-2.667-3-8-3z"
                style={{ fill: "var(--background)" }}
              />
            </svg>
          </div>
          <h1 className="text-xl text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-md border-border bg-background text-sm text-foreground shadow-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Link
                href="/auth/forgot-pw"
                className="text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors duration-(--duration-fast) hover:text-foreground hover:decoration-foreground"
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
              className="h-11 rounded-md border-border bg-background text-sm text-foreground shadow-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity duration-(--duration-base) hover:opacity-90 disabled:opacity-60"
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
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}

export function LoginForm(props: React.ComponentProps<"div">) {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <LoginFormInner {...props} />
    </Suspense>
  )
}
