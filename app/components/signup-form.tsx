"use client"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/lib/store"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function SignupForm() {
  const router = useRouter()
  const signup = useAuthStore((state) => state.signup)

  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [errors, setErrors] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): boolean => {
    return password.length >= 8
  }

  const validateForm = (): boolean => {
    const newErrors = { userName: '', email: '', password: '', confirmPassword: '' }
    let isValid = true

    if (!userName.trim()) {
      newErrors.userName = 'Username is required'
      isValid = false
    } else if (userName.trim().length < 3) {
      newErrors.userName = 'Username must be at least 3 characters'
      isValid = false
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
      isValid = false
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
      isValid = false
    }

    if (!password) {
      newErrors.password = 'Password is required'
      isValid = false
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters'
      isValid = false
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
      isValid = false
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({ userName: '', email: '', password: '', confirmPassword: '' })

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsLoading(true)

    try {
      await signup(email, userName, password)
      toast.success('Account created! Please check your email to verify.')
      setTimeout(() => {
        router.push('/auth/sign-in')
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-scale">
      <div className="rounded-2xl bg-white px-8 py-9 shadow-[0_24px_80px_rgba(15,23,42,0.09)] ring-1 ring-slate-200/70">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 shadow-[0_4px_14px_rgba(99,75,229,0.38)]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-6 15c0-3.314 2.686-5 6-5s6 1.686 6 5H4z" fill="white" fillOpacity="0.9"/>
              <path d="M17 7v2m0 2v2" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M16 9h2" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Free forever. No credit card required.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700">
              Username
            </label>
            <Input
              id="username"
              type="text"
              placeholder="johndoe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/20"
            />
            {errors.userName && (
              <p className="text-xs text-rose-600">{errors.userName}</p>
            )}
          </div>

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
              disabled={isLoading}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/20"
            />
            {errors.email && (
              <p className="text-xs text-rose-600">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/20"
            />
            {errors.password && (
              <p className="text-xs text-rose-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/20"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-rose-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.38)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(79,70,229,0.5)] disabled:opacity-60 disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            ) : (
              "Create account"
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
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-800 disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.29a3.67 3.67 0 0 1-1.59 2.41v2h2.57c1.5-1.38 2.37-3.42 2.37-5.87z" fill="#4285F4"/>
              <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2c-.71.48-1.63.76-2.72.76-2.09 0-3.86-1.41-4.49-3.31H.85v2.06A8 8 0 0 0 8 16z" fill="#34A853"/>
              <path d="M3.51 9.51A4.8 4.8 0 0 1 3.26 8c0-.53.09-1.04.25-1.51V4.43H.85A8 8 0 0 0 0 8c0 1.29.31 2.51.85 3.57l2.66-2.06z" fill="#FBBC05"/>
              <path d="M8 3.18c1.18 0 2.23.41 3.06 1.2l2.3-2.3A8 8 0 0 0 .85 4.43L3.51 6.5C4.14 4.59 5.91 3.18 8 3.18z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
